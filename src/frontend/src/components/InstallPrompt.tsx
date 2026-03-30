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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Already dismissed or not on mobile → don't show
    if (localStorage.getItem(DISMISSED_KEY) === "1" || !isMobile) return;

    if (isIOS) {
      if ((navigator as { standalone?: boolean }).standalone) return;
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
    setExpanded(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setVisible(false);
    setExpanded(false);
    setDeferredPrompt(null);
  };

  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <AnimatePresence>
      {visible && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 16,
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {/* Expanded tooltip */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="tooltip"
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                data-ocid="install.toast"
                style={{
                  pointerEvents: "auto",
                  background:
                    "linear-gradient(135deg, rgba(15,15,28,0.97) 0%, rgba(12,12,22,0.97) 100%)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(99,102,241,0.35)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(99,102,241,0.1)",
                  width: 240,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#E8EDFF",
                    marginBottom: 6,
                  }}
                >
                  Add InstiFlow to Home Screen
                </div>
                {showIOSHint ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(160,170,210,0.75)",
                      lineHeight: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    Tap{" "}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 16,
                        height: 16,
                        background: "rgba(99,102,241,0.2)",
                        borderRadius: 4,
                        fontSize: 10,
                      }}
                    >
                      ⎋
                    </span>{" "}
                    then{" "}
                    <strong style={{ color: "#a78bfa" }}>
                      Add to Home Screen
                    </strong>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(160,170,210,0.75)",
                      lineHeight: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    Access your timetable &amp; attendance offline
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {!showIOSHint && (
                    <motion.button
                      type="button"
                      data-ocid="install.primary_button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={install}
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        border: "none",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Install
                    </motion.button>
                  )}
                  <motion.button
                    type="button"
                    data-ocid="install.close_button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={dismiss}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(160,170,200,0.7)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Dismiss
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAB button */}
          <motion.button
            key="fab"
            type="button"
            data-ocid="install.open_modal_button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setExpanded((v) => !v)}
            style={{
              pointerEvents: "auto",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              border: "none",
              boxShadow:
                "0 4px 20px rgba(99,102,241,0.5), 0 0 0 2px rgba(99,102,241,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            🏠
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
