// Firebase Cloud Messaging Service Worker
// Handles background and closed-app push notifications (including Android PWA)

// ── Install: skip waiting so new SW activates immediately ──
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// ── Activate: claim all clients immediately ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      // Try to register background sync when SW first activates
      try {
        self.registration.sync.register("check-notifications").catch(() => {});
      } catch (_) {}
      return loadAndFireDueNotifications();
    }),
  );
});

// ── Firebase SDK ──
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

let messaging = null;

try {
  firebase.initializeApp({
    apiKey: "AIzaSyACeYwNljzgrk8WAywxKSHoj_juuk2rPbg",
    authDomain: "insti-flow.firebaseapp.com",
    projectId: "insti-flow",
    storageBucket: "insti-flow.firebasestorage.app",
    messagingSenderId: "439140382247",
    appId: "1:439140382247:web:08bdb56afb68e0a9014002",
  });

  messaging = firebase.messaging();

  // Handle FCM background messages via Firebase SDK
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title ?? "InstiFlow";
    const body = payload?.notification?.body ?? "";
    const tag =
      payload.collapseKey ??
      payload?.data?.tag ??
      `instiflow-fcm-${Date.now()}`;

    return showDeduplicatedNotification(title, body, tag, payload?.data ?? {});
  });
} catch (err) {
  console.error("[SW] Firebase init failed:", err);
}

// ── Explicit push event handler (for Android/Chrome PWA when app is closed) ──
self.addEventListener("push", (event) => {
  let title = "InstiFlow";
  let body = "";
  let tag = `instiflow-push-${Date.now()}`;
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload?.notification?.title ?? payload?.data?.title ?? "InstiFlow";
      body = payload?.notification?.body ?? payload?.data?.body ?? "";
      tag = payload?.data?.tag ?? payload.collapseKey ?? `instiflow-push-${Date.now()}`;
      data = payload?.data ?? {};
    } catch (_jsonErr) {
      try {
        const text = event.data.text();
        if (text) body = text;
      } catch (textErr) {
        console.error("[SW] push payload parse error:", textErr);
      }
    }
  }

  event.waitUntil(
    showDeduplicatedNotification(title, body, tag, data).catch((err) =>
      console.error("[SW] push showNotification failed:", err),
    ),
  );
});

// ── Notification click handler ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});

// ── IndexedDB helpers ──
const DB_NAME = "instiflow-notifs";
const DB_VERSION = 2;
const STORE_NAME = "scheduled";
const FIRED_STORE = "fired";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "tag" });
        store.createIndex("scheduledAt", "scheduledAt", { unique: false });
      }
      // Store for deduplication: key = tag, value = { tag, firedAt }
      if (!db.objectStoreNames.contains(FIRED_STORE)) {
        db.createObjectStore(FIRED_STORE, { keyPath: "tag" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Returns true if a notification with this tag was fired in the last 90 seconds */
async function wasFiredRecently(tag) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FIRED_STORE, "readonly");
      const req = tx.objectStore(FIRED_STORE).get(tag);
      req.onsuccess = (e) => {
        const record = e.target.result;
        if (!record) return resolve(false);
        const age = Date.now() - record.firedAt;
        resolve(age < 90 * 1000);
      };
      req.onerror = () => resolve(false);
    });
  } catch (_) {
    return false;
  }
}

async function markAsFired(tag) {
  try {
    const db = await openDB();
    const tx = db.transaction(FIRED_STORE, "readwrite");
    tx.objectStore(FIRED_STORE).put({ tag, firedAt: Date.now() });
    return new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (_) {}
}

/** Show a notification only if the same tag hasn't fired in the last 90s */
async function showDeduplicatedNotification(title, body, tag, data) {
  const recent = await wasFiredRecently(tag);
  if (recent) {
    console.log("[SW] Skipping duplicate notification:", tag);
    return;
  }
  await markAsFired(tag);
  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { ...(data ?? {}), url: data?.url ?? "/" },
    actions: [{ action: "open", title: "Open InstiFlow" }],
  });
}

async function saveNotifications(notifications) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const notif of notifications) {
      store.put(notif);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("[SW] saveNotifications failed:", err);
  }
}

async function loadAndFireDueNotifications() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();

    return new Promise((resolve) => {
      const getAllReq = store.getAll();
      getAllReq.onsuccess = async (e) => {
        const all = e.target.result ?? [];
        const promises = [];

        for (const notif of all) {
          const fireAt = new Date(notif.scheduledAt).getTime();
          const diff = fireAt - now;

          if (diff <= 0 && diff > -5 * 60 * 1000) {
            // Overdue by less than 5 minutes — fire now
            store.delete(notif.tag);
            promises.push(
              showDeduplicatedNotification(
                notif.title,
                notif.body,
                notif.tag ?? `instiflow-scheduled-${Date.now()}`,
                { url: "/" },
              ).catch((err) => console.error("[SW] show failed:", err)),
            );
          } else if (diff > 0 && diff <= 90 * 1000) {
            // Due within 90 seconds — use setTimeout
            promises.push(
              new Promise((res) => {
                setTimeout(async () => {
                  await showDeduplicatedNotification(
                    notif.title,
                    notif.body,
                    notif.tag ?? `instiflow-scheduled-${Date.now()}`,
                    { url: "/" },
                  ).catch((err) =>
                    console.error("[SW] setTimeout notif failed:", err),
                  );
                  try {
                    const db2 = await openDB();
                    const tx2 = db2.transaction(STORE_NAME, "readwrite");
                    tx2.objectStore(STORE_NAME).delete(notif.tag);
                  } catch (_) {}
                  res();
                }, diff);
              }),
            );
          }
        }

        await Promise.allSettled(promises);
        resolve();
      };
      getAllReq.onerror = () => resolve();
    });
  } catch (err) {
    console.error("[SW] loadAndFireDueNotifications failed:", err);
  }
}

// ── Polling: check due notifications every 30 seconds while SW is alive ──
setInterval(() => {
  loadAndFireDueNotifications().catch(() => {});
}, 30 * 1000);

// ── Handle SCHEDULE_NOTIFICATIONS message from NotificationManager ──
self.addEventListener("message", async (event) => {
  if (!event.data) return;

  if (event.data.type === "SCHEDULE_NOTIFICATIONS") {
    const notifications = event.data.notifications ?? event.data.schedule ?? [];
    const now = Date.now();

    const immediate = [];
    const persistent = [];

    for (const notif of notifications) {
      const fireAt = new Date(notif.scheduledAt).getTime();
      const delay = fireAt - now;
      if (delay <= 0) continue;
      if (delay <= 60 * 1000) {
        immediate.push({ ...notif, delay });
      } else if (delay < 7 * 24 * 60 * 60 * 1000) {
        persistent.push(notif);
      }
    }

    for (const notif of immediate) {
      setTimeout(async () => {
        await showDeduplicatedNotification(
          notif.title,
          notif.body,
          notif.tag ?? `instiflow-imm-${Date.now()}`,
          { url: "/" },
        ).catch((err) =>
          console.error("[SW] immediate notification failed:", err),
        );
      }, notif.delay);
    }

    if (persistent.length > 0) {
      await saveNotifications(persistent).catch(() => {});
    }
  }

  loadAndFireDueNotifications().catch(() => {});
});

// ── Background sync ──
self.addEventListener("sync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(loadAndFireDueNotifications());
  }
});

// ── Periodic background sync (Android PWA — fires even when app is closed) ──
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(loadAndFireDueNotifications());
  }
});

// ── Keep alive: trigger a check on navigation requests ──
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    loadAndFireDueNotifications().catch(() => {});
  }
  // Never intercept — let all requests pass through normally
});
