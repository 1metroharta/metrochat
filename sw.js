// MetroChat 4.3 service worker
const MC_SW_VERSION = 'metrochat-shell-v4.3';
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('metrochat-') && key !== MC_SW_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
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
