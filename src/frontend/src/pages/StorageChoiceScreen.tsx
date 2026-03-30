import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onChoice: (choice: "local" | "sync") => void;
}

export function StorageChoiceScreen({ onChoice }: Props) {
  const { login, isLoggingIn, isLoginSuccess, identity } =
    useInternetIdentity();
  const [loginStarted, setLoginStarted] = useState(false);

  const handleLocal = () => {
    localStorage.setItem("instiflow_storage_choice", "local");
    onChoice("local");
  };

  const handleSync = async () => {
    setLoginStarted(true);
    login();
  };

  // Once login succeeds, save choice and proceed
  if (loginStarted && (isLoginSuccess || identity)) {
    localStorage.setItem("instiflow_storage_choice", "sync");
    onChoice("sync");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
      transition={{ duration: 0.4 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #060810 0%, #0c0e1a 50%, #090b16 100%)",
        padding: "24px",
        overflow: "hidden",
      }}
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

      <div
        style={{
          width: "100%",
          maxWidth: 640,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              borderRadius: 100,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              fontSize: 12,
              color: "rgba(180,190,255,0.8)",
              marginBottom: 16,
              letterSpacing: "0.04em",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#a78bfa",
                display: "inline-block",
              }}
            />
            InstiFlow — First Time Setup
          </div>
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 34px)",
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
            Where should your data live?
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(160,170,200,0.7)",
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            Choose how InstiFlow stores your timetable, attendance, and tasks.
            You can change this later in Settings.
          </p>
        </motion.div>

        {/* Option cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {/* Option A — Local */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            data-ocid="storage.local.card"
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
              cursor: "pointer",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            whileHover={{
              y: -4,
              boxShadow: "0 20px 60px rgba(99,102,241,0.15)",
            }}
            whileTap={{ scale: 0.98 }}
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
                Your data lives{" "}
                <strong style={{ color: "#a78bfa" }}>
                  only on this device
                </strong>
                . No login needed. Works offline. Perfect if you're using one
                device.
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
              data-ocid="storage.local.primary_button"
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
                transition: "background 0.2s",
              }}
            >
              Use This Device
            </motion.button>
          </motion.div>

          {/* Option B — Sync */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            data-ocid="storage.sync.card"
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
                Login with{" "}
                <strong style={{ color: "#a78bfa" }}>Internet Identity</strong>{" "}
                to back up and sync your timetable, attendance, and tasks across
                all your devices — phone, laptop, lab computer.
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

            <motion.button
              data-ocid="storage.sync.primary_button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSync}
              disabled={isLoggingIn}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                background: isLoggingIn
                  ? "rgba(99,102,241,0.3)"
                  : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoggingIn ? "wait" : "pointer",
                fontFamily: "inherit",
                boxShadow: isLoggingIn
                  ? "none"
                  : "0 4px 20px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
              }}
            >
              {isLoggingIn ? "Connecting..." : "Login & Sync"}
            </motion.button>
          </motion.div>
        </div>

        {/* Skip option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: "center", marginTop: 24 }}
        >
          <button
            type="button"
            data-ocid="storage.skip.button"
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
    </motion.div>
  );
}
