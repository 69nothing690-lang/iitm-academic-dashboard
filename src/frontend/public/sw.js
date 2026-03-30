const CACHE_NAME = 'instiflow-v2';
const STATIC = ['/', '/index.html'];

// ── IndexedDB helpers ──────────────────────────────────────────────────────
const DB_NAME = 'instiflow-notif';
const STORE = 'schedule';
const RECORD_KEY = 'notif-schedule';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveSchedule(notifications) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(notifications, RECORD_KEY);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadSchedule() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(RECORD_KEY);
    req.onsuccess = (e) => resolve(e.target.result ?? []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function clearSchedule() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(RECORD_KEY);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ── Pending timeouts map ────────────────────────────────────────────────────
const pendingTimeouts = new Map();

function scheduleNotifications(notifications) {
  // Cancel existing
  for (const id of pendingTimeouts.values()) clearTimeout(id);
  pendingTimeouts.clear();

  const now = Date.now();
  for (const notif of notifications) {
    const at = new Date(notif.scheduledAt).getTime();
    const delay = at - now;
    if (delay < 0) continue; // past — skip

    const tid = setTimeout(() => {
      self.registration.showNotification(notif.title, {
        body: notif.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: notif.tag,
        requireInteraction: false,
      });
      pendingTimeouts.delete(notif.tag);
    }, delay);

    pendingTimeouts.set(notif.tag, tid);
  }
}

// ── SW lifecycle ─────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Clear old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      self.clients.claim();

      // Re-schedule persisted notifications
      const saved = await loadSchedule();
      if (saved && saved.length > 0) {
        scheduleNotifications(saved);
      }
    })()
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// ── Message handler ──────────────────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const notifications = e.data.notifications ?? [];
    saveSchedule(notifications).catch(() => {});
    scheduleNotifications(notifications);
  }

  if (e.data.type === 'CLEAR_NOTIFICATIONS') {
    clearSchedule().catch(() => {});
    for (const id of pendingTimeouts.values()) clearTimeout(id);
    pendingTimeouts.clear();
  }
});

// Notification click → focus app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
