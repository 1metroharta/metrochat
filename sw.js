/* MetroChat service worker · v21
   - уведомления: клик открывает нужный чат, кнопки «Ответить/Отклонить» для звонков
   - кэш: страница — сначала сеть (всегда свежая версия), офлайн — из кэша; библиотеки Firebase и картинки — из кэша */
const CACHE = 'metrochat-v21';
const STATIC = [/^https:\/\/www\.gstatic\.com\/firebasejs\//, /\/splash\/.+\.webp$/, /\/icon-(192|512)\.png$/];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('metrochat-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res && res.ok) { const c = await caches.open(CACHE); c.put('./', res.clone()).catch(() => {}); }
        return res;
      } catch (_) {
        const c = await caches.open(CACHE);
        return (await c.match('./')) || (await c.match(req)) || Response.error();
      }
    })());
    return;
  }
  if (STATIC.some(r => r.test(url))) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
      return res;
    })());
  }
});

self.addEventListener('notificationclick', e => {
  const n = e.notification; const d = n.data || {}; const action = e.action || '';
  n.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all.find(c => c.url.includes(self.registration.scope)) || all[0];
    let msg = null;
    if (action === 'call-accept' || (d.type === 'call' && !action)) msg = { type: action === 'call-accept' ? 'call-accept' : 'focus', callId: d.callId };
    else if (action === 'call-decline') msg = { type: 'call-decline', callId: d.callId };
    else if (d.chatId) msg = { type: 'open-chat', chatId: d.chatId };
    if (client) {
      if (action !== 'call-decline') { try { await client.focus(); } catch (_) {} }
      if (msg) client.postMessage(msg);
      return;
    }
    if (action === 'call-decline') return;
    const q = d.chatId ? '?chat=' + encodeURIComponent(d.chatId) : '';
    await self.clients.openWindow(self.registration.scope + q);
  })());
});
