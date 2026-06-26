importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

// Firebase config is intentionally public — security is enforced via Firebase Security Rules,
// not by hiding this config. See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: 'AIzaSyAf6a4Z6eyjt4svQDgCglP_xdCtUsozV2w',
  authDomain: 'candle-bfce9.firebaseapp.com',
  projectId: 'candle-bfce9',
  storageBucket: 'candle-bfce9.firebasestorage.app',
  messagingSenderId: '712132485233',
  appId: '1:712132485233:web:1d160ba1748475bd103bd0',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler — shows notification when app is not in focus
messaging.onBackgroundMessage((payload) => {
  const { title = '알림', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: payload.data,
  });
});
