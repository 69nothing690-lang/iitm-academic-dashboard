import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "instiflow_install_dismissed";

// Detect iOS — `beforeinstallprompt` never fires on Safari/iOS
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isMobile =
  isIOS ||
  /android/i.test(navigator.userAgent) ||
  ("ontouchstart" in window && window.innerWidth < 900);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed or not on mobile → don't show
    if (localStorage.getItem(DISMISSED_KEY) === "1" || !isMobile) return;

    if (isIOS) {
      // Check not already running as standalone
      if ((navigator as { standalone?: boolean }).standalone) return;
      // Slight delay so landing page renders first
      const t = setTimeout(() => {
        setShowIOSHint(true);
        setVisible(true);
      }, 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  // Nothing to show
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          data-ocid="install.toast"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            width: "calc(100vw - 32px)",
            maxWidth: 420,
            background:
              "linear-gradient(135deg, rgba(15,15,28,0.96) 0%, rgba(12,12,22,0.96) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 18,
            padding: "16px 18px",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1), 0 0 40px rgba(99,102,241,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* App icon */}
          <div
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}
          >
            📚
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#E8EDFF",
                marginBottom: 3,
                lineHeight: 1.3,
              }}
            >
              Add InstiFlow to your home screen
            </div>
            {showIOSHint ? (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(160,170,210,0.7)",
                  lineHeight: 1.4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Tap
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    background: "rgba(99,102,241,0.2)",
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  ⎋
                </span>
                then{" "}
                <strong style={{ color: "#a78bfa" }}>Add to Home Screen</strong>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(160,170,210,0.7)",
                  lineHeight: 1.4,
                }}
              >
                Access your timetable &amp; attendance offline
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {!showIOSHint && (
              <motion.button
                type="button"
                data-ocid="install.primary_button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={install}
                style={{
                  padding: "7px 16px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                Add
              </motion.button>
            )}
            <motion.button
              type="button"
              data-ocid="install.close_button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={dismiss}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(160,170,200,0.6)",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              ×
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
