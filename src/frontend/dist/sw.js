const CACHE_NAME = 'instiflow-v3';

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
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Clear ALL old caches to prevent serving stale HTML for JS requests
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      self.clients.claim();

      // Re-schedule persisted notifications
      const saved = await loadSchedule();
      if (saved && saved.length > 0) {
        scheduleNotifications(saved);
      }
    })()
  );
});

// ── Fetch handler: NEVER cache JS/CSS/assets — only handle navigation ────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Do NOT intercept:
  // - Non-GET requests
  // - JS/CSS/font/image assets (let browser handle with correct MIME)
  // - External requests (Firebase, Spline, CDNs)
  // - API calls
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|json|map)$/.test(url.pathname)) return;
  if (url.pathname.startsWith('/api')) return;

  // For HTML navigation requests only, serve network-first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Only fall back to cache for offline HTML, never for assets
        return caches.match('/index.html');
      })
    );
  }
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
