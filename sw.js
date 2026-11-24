// MetroChat service worker — офлайн-оболочка и контролируемое обновление.
// Версия кэша берётся из URL регистрации (index.html передаёт MC_VERSION),
// поэтому версия приложения и версия оболочки больше не расходятся.
const MC_SW_BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';
const MC_SHELL_CACHE = 'metrochat-shell-' + MC_SW_BUILD;
const MC_RUNTIME_CACHE = 'metrochat-runtime-' + MC_SW_BUILD;
const MC_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const MC_NETWORK_ONLY = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',
  'firebaseapp.com',
  'identitytoolkit',
  'securetoken',
  'api.openai.com'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(MC_SHELL_CACHE);
    // Кэшируем каждый файл отдельно: один недоступный ресурс не ломает установку.
    await Promise.all(MC_SHELL_ASSETS.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('metrochat-') && key !== MC_SHELL_CACHE && key !== MC_RUNTIME_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'MC_BUILD' && event.source) {
    event.source.postMessage({ type: 'MC_BUILD', build: MC_SW_BUILD });
  }
});

function mcIsNetworkOnly(url) {
  return MC_NETWORK_ONLY.some(part => url.indexOf(part) !== -1);
}

async function mcNetworkFirst(request) {
  const cache = await caches.open(MC_SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (_) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shell = await cache.match('./index.html');
    if (shell) return shell;
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>MetroChat — нет сети</title>' +
      '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e6edf7;font:16px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px">' +
      '<div><div style="font-size:48px">📡</div><h1 style="font-size:20px;margin:12px 0 6px">Нет подключения</h1>' +
      '<p style="opacity:.7;margin:0 0 18px">MetroChat не смог загрузить оболочку из кэша. Проверьте сеть и повторите.</p>' +
      '<button onclick="location.reload()" style="border:0;border-radius:12px;padding:12px 20px;background:#e63946;color:#fff;font:inherit;font-weight:600">Повторить</button></div>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function mcCacheFirst(request) {
  const cache = await caches.open(MC_RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(request, fresh.clone()).catch(() => {});
  return fresh;
}

async function mcStaleWhileRevalidate(request) {
  const cache = await caches.open(MC_RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (mcIsNetworkOnly(url.href)) return; // Firebase и внешние API — только сеть.

  if (request.mode === 'navigate') {
    event.respondWith(mcNetworkFirst(request));
    return;
  }
  // Firebase SDK нужен для запуска приложения офлайн — его кэшируем навсегда.
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) {
    event.respondWith(mcCacheFirst(request).catch(() => Response.error()));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(mcStaleWhileRevalidate(request));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const message = event.action === 'accept' ? { type: 'call-accept', callId: data.callId }
    : event.action === 'decline' ? { type: 'call-decline', callId: data.callId }
    : { type: 'open-chat', chatId: data.chatId };
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clientsList.find(item => 'focus' in item) || clientsList[0];
    if (client) { await client.focus(); client.postMessage(message); }
    else await self.clients.openWindow('./');
  })());
});
