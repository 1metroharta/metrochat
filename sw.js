// MetroChat service worker: показывает уведомления и открывает нужный чат по нажатию
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const msg = e.action === 'accept' ? { type: 'call-accept', callId: d.callId }
            : e.action === 'decline' ? { type: 'call-decline', callId: d.callId }
            : { type: 'open-chat', chatId: d.chatId };
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs[0]) { cs[0].focus(); cs[0].postMessage(msg); } else self.clients.openWindow('./');
  }));
});
