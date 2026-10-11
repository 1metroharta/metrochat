importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDIpe10bCclSO4C3KmYWT6vseRdR5wOnRA",
  authDomain: "metrochatmetroharta-i89op.firebaseapp.com",
  databaseURL: "https://metrochatmetroharta-i89op-default-rtdb.firebaseio.com",
  projectId: "metrochatmetroharta-i89op",
  storageBucket: "metrochatmetroharta-i89op.firebasestorage.app",
  messagingSenderId: "140484380023",
  appId: "1:140484380023:web:725d1c7e921d05630d0d72"
});

const messaging = firebase.messaging();

// Уведомления приходят, когда приложение закрыто
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MetroChat';
  const options = {
    body: payload.notification?.body || 'Новое сообщение',
    icon: '/metrochat/icon-192.png',
    badge: '/metrochat/icon-192.png',
    tag: 'metrochat'
  };
  self.registration.showNotification(title, options);
});

// Клик по уведомлению — открыть приложение
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/metrochat/') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/metrochat/');
    })
  );
});

// Активация сразу, без ожидания
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));