import { getApps, initializeApp } from "firebase/app";
import {
  type MessagePayload,
  getMessaging,
  getToken,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyACeYwNljzgrk8WAywxKSHoj_juuk2rPbg",
  authDomain: "insti-flow.firebaseapp.com",
  projectId: "insti-flow",
  storageBucket: "insti-flow.firebasestorage.app",
  messagingSenderId: "439140382247",
  appId: "1:439140382247:web:08bdb56afb68e0a9014002",
};

const VAPID_KEY =
  "BH48ES0CysFWor829H1MDg3x167ZdTQvUjFKr4BY1QHO9ALnRnBumzsF3mlAi76QRjHg314vG3QdfR062iWaT5w";
const FCM_TOKEN_KEY = "instiflow_fcm_token";

function ensureApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

export async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/", updateViaCache: "none" },
    );
    console.log("[FCM] Service worker registered:", registration.scope);

    // Wait for the SW to become active so postMessage works immediately
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const sw = registration.installing!;
        sw.addEventListener("statechange", function onStateChange() {
          if (sw.state === "activated" || sw.state === "redundant") {
            sw.removeEventListener("statechange", onStateChange);
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (err) {
    console.error("[FCM] Service worker registration failed:", err);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  // Return cached token if available — FCM tokens are stable until explicitly revoked
  const cached = localStorage.getItem(FCM_TOKEN_KEY);
  if (cached) {
    console.log("[FCM] Reusing cached token");
    return cached;
  }

  try {
    const permission = Notification.permission;
    if (permission !== "granted") {
      console.log("[FCM] Notification permission not granted:", permission);
      return null;
    }

    const swReg = await registerFCMServiceWorker();
    if (!swReg) return null;

    const app = ensureApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log("[FCM] Token generated:", token);
      localStorage.setItem(FCM_TOKEN_KEY, token);
      return token;
    }
    return null;
  } catch (err) {
    console.error("[FCM] Token generation failed:", err);
    return null;
  }
}

/**
 * Requests notification permission and gets/refreshes the FCM token.
 * Safe to call on every app load — returns cached token if already available.
 */
export async function requestNotificationPermissionAndToken(): Promise<
  string | null
> {
  if (typeof Notification === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return null;
    return await getFCMToken();
  } catch (err) {
    console.error("[FCM] requestNotificationPermissionAndToken failed:", err);
    return null;
  }
}

export function setupForegroundNotifications(
  onNotification: (payload: MessagePayload) => void,
): () => void {
  try {
    const app = ensureApp();
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
      onNotification(payload);
    });
    return unsubscribe;
  } catch (err) {
    console.error("[FCM] Foreground listener setup failed:", err);
    return () => {};
  }
}

export function showLocalNotification(title: string, body: string): void {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
  }
}
