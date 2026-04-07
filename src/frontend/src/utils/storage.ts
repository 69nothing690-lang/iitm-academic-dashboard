// ── App version — bump this if localStorage schema changes ───────────────────────
const APP_VERSION = "69";
const VERSION_KEY = "instiflow_app_version";

/**
 * On first load after a version bump, clears all app data except the
 * auth keys (storage choice + user info) so incompatible cached data
 * never causes a crash.
 */
export function runVersionCheck(): void {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== APP_VERSION) {
      // Preserve auth state across version resets
      const authChoice = localStorage.getItem("instiflow_storage_choice");
      const authUser = localStorage.getItem("instiflow_user");

      // Clear all keys except auth
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key !== "instiflow_storage_choice" &&
          key !== "instiflow_user" &&
          key !== VERSION_KEY
        ) {
          keysToDelete.push(key);
        }
      }
      for (const k of keysToDelete) localStorage.removeItem(k);

      // Restore auth
      if (authChoice)
        localStorage.setItem("instiflow_storage_choice", authChoice);
      if (authUser) localStorage.setItem("instiflow_user", authUser);

      localStorage.setItem(VERSION_KEY, APP_VERSION);
      console.log(`[InstiFlow] Data migrated to version ${APP_VERSION}`);
    }
  } catch {
    // localStorage may be blocked (private browsing strict mode) — ignore
  }
}

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    const parsed = JSON.parse(stored) as T;
    // Guard against null stored as "null" string
    return parsed ?? defaultValue;
  } catch {
    // Corrupted JSON — remove the bad entry and return default
    try {
      localStorage.removeItem(key);
    } catch {}
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or security error — ignore silently
  }
}
