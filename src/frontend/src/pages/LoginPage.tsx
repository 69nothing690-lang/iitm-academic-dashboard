import { ArrowLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

interface LoginPageProps {
  onLogin: (userId?: string, migrateLocal?: boolean) => void;
  onBack: () => void;
}

function GoogleIcon() {
  return (
    <svg
      role="img"
      aria-label="Google"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const { signInWithGoogle, isLoading, error } = useFirebaseAuth();
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleLocal = () => {
    localStorage.setItem("instiflow_storage_choice", "local");
    onLogin();
  };

  const LOCAL_DATA_KEYS = ["courses", "attendance", "tasks", "examEntries"];

  const hasLocalData = () =>
    LOCAL_DATA_KEYS.some((k) => {
      try {
        const v = localStorage.getItem(k);
        if (!v) return false;
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
      } catch {
        return false;
      }
    });

  const handleGoogleSync = async () => {
    try {
      await signInWithGoogle();
    } catch {
      return;
    }
    const stored = localStorage.getItem("instiflow_user");
    if (!stored) return;
    const userData = JSON.parse(stored);
    // Grab the uid from Firebase auth directly via the stored user info
    // We rely on useFirebaseAuth's onAuthStateChanged having set instiflow_user
    // The uid is not in instiflow_user — we need it from a different place.
    // Since signInWithGoogle sets state.user, we can't access it synchronously here.
    // Instead we'll read it from window.__instiflow_uid if set, or fall back to email.
    const uid =
      (window as { __instiflow_uid?: string }).__instiflow_uid ||
      userData.email ||
      "unknown";

    const wasLocal =
      localStorage.getItem("instiflow_storage_choice") === "local";
    if (wasLocal && hasLocalData()) {
      setPendingUserId(uid);
      setShowMigrationModal(true);
    } else {
      localStorage.setItem("instiflow_storage_choice", "sync");
      onLogin(uid, false);
    }
  };

  const handleKeepLocalAndUpload = () => {
    localStorage.setItem("instiflow_storage_choice", "sync");
    setShowMigrationModal(false);
    onLogin(pendingUserId ?? undefined, true);
  };

  const handleStartFreshFromCloud = () => {
    const LOCAL_DATA_KEYS_INNER = [
      "courses",
      "attendance",
      "tasks",
      "examEntries",
      "semSettings",
      "studentName",
    ];
    for (const k of LOCAL_DATA_KEYS_INNER) {
      localStorage.removeItem(k);
    }
    localStorage.setItem("instiflow_storage_choice", "sync");
    setShowMigrationModal(false);
    onLogin(pendingUserId ?? undefined, false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #060810 0%, #0c0e1a 50%, #090b16 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "24px",
      }}
      data-ocid="login.page"
    >
      {/* Ambient orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: "-200px",
          left: "-100px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "-150px",
          right: "-100px",
          pointerEvents: "none",
        }}
      />

      {/* Back button */}
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onBack}
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          padding: "8px 14px",
          color: "rgba(180,190,255,0.7)",
          cursor: "pointer",
          fontSize: "14px",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.97 }}
        data-ocid="login.back.button"
      >
        <ArrowLeft size={15} />
        Back
      </motion.button>

      <div
        style={{
          width: "100%",
          maxWidth: 680,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 36 }}
        >
          <div
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              boxShadow: "0 0 16px rgba(99,102,241,0.7)",
              marginBottom: 14,
            }}
          />
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 30px)",
              fontWeight: 800,
              background:
                "linear-gradient(135deg, #fff 0%, #a78bfa 50%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 10,
              lineHeight: 1.2,
            }}
          >
            How would you like to use InstiFlow?
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(160,170,200,0.7)",
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            Choose where your data is stored. You can change this later in
            Settings.
          </p>
        </motion.div>

        {/* Option cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {/* Card 1 — Stay Local */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            data-ocid="login.local.card"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            whileHover={{
              y: -4,
              boxShadow: "0 20px 60px rgba(99,102,241,0.15)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              💻
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#F0F4FF" }}
                >
                  Stay Local
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    color: "#818cf8",
                    letterSpacing: "0.03em",
                  }}
                >
                  Works immediately
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(150,165,200,0.75)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                No login needed. Your data lives{" "}
                <strong style={{ color: "#a78bfa" }}>
                  only on this device
                </strong>
                . Works offline. Perfect for single-device use.
              </p>
            </div>

            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {[
                "No account required",
                "Works offline",
                "100% private",
                "Instant setup",
              ].map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "rgba(160,175,210,0.7)",
                  }}
                >
                  <span
                    style={{ color: "#6366f1", fontWeight: 700, fontSize: 14 }}
                  >
                    ✓
                  </span>{" "}
                  {f}
                </li>
              ))}
            </ul>

            <motion.button
              type="button"
              data-ocid="login.local.primary_button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLocal}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "#a5b4fc",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Use This Device
            </motion.button>
          </motion.div>

          {/* Card 2 — Sync */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5 }}
            data-ocid="login.sync.card"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 20,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative",
              overflow: "hidden",
            }}
            whileHover={{
              y: -4,
              boxShadow: "0 20px 60px rgba(139,92,246,0.2)",
            }}
          >
            {/* Recommended badge */}
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 100,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Recommended
            </div>

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              ☁️
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#F0F4FF" }}
                >
                  Sync Across Devices
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(150,165,200,0.75)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Login with <strong style={{ color: "#a78bfa" }}>Google</strong>{" "}
                to back up and sync your timetable, attendance, and tasks across
                all devices — phone, laptop, lab computer.
              </p>
            </div>

            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {[
                "Syncs across all devices",
                "Automatic cloud backup",
                "Never lose your data",
                "Secure & private",
              ].map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "rgba(160,175,210,0.7)",
                  }}
                >
                  <span
                    style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14 }}
                  >
                    ✓
                  </span>{" "}
                  {f}
                </li>
              ))}
            </ul>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  data-ocid="login.sync.error_state"
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#f87171",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Google Sign-In button */}
            <motion.button
              type="button"
              data-ocid="login.sync.primary_button"
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.97 } : {}}
              onClick={handleGoogleSync}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 12,
                background: isLoading ? "rgba(240,240,240,0.85)" : "#ffffff",
                border: "1px solid rgba(0,0,0,0.12)",
                color: "#3c3c3c",
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: isLoading
                  ? "none"
                  : "0 1px 6px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={16}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </div>

        {/* Skip link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ textAlign: "center", marginTop: 24 }}
        >
          <button
            type="button"
            data-ocid="login.skip.button"
            onClick={handleLocal}
            style={{
              background: "none",
              border: "none",
              color: "rgba(140,155,190,0.5)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip for now — decide later
          </button>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Data Migration Modal ── */}
      <AnimatePresence>
        {showMigrationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-ocid="login.modal"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                background: "linear-gradient(135deg, #12142a 0%, #0d0f20 100%)",
                border: "1px solid rgba(139,92,246,0.4)",
                borderRadius: 20,
                padding: "36px 40px",
                maxWidth: 420,
                width: "100%",
                boxShadow:
                  "0 0 60px rgba(139,92,246,0.25), 0 20px 60px rgba(0,0,0,0.6)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>☁️</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#F0F4FF",
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                We found locally saved data
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#8B95B0",
                  marginBottom: 28,
                  lineHeight: 1.6,
                }}
              >
                You have timetable and attendance data on this device. Upload it
                to your Google account so it syncs everywhere?
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <motion.button
                  type="button"
                  data-ocid="login.confirm_button"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleKeepLocalAndUpload}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                    border: "none",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                  }}
                >
                  Yes, upload my data to Google
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      opacity: 0.8,
                      marginTop: 3,
                    }}
                  >
                    Keep everything, sync across devices
                  </div>
                </motion.button>
                <motion.button
                  type="button"
                  data-ocid="login.cancel_button"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleStartFreshFromCloud}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#C4C9D8",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  No, start fresh
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      opacity: 0.7,
                      marginTop: 3,
                    }}
                  >
                    Load data from my Google account
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
