import { useEffect, useState } from "react";

/**
 * SplashScreen — shown for 1500ms on first app load.
 * Uses the exact same font, gradient, and text style as the
 * "InstiFlow" h1 on the landing page hero (className="landing-h1").
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Give a brief fade-out before calling onDone
      setTimeout(onDone, 350);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.35s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Exact replica of the landing hero h1 with className="landing-h1" */}
      <h1 className="landing-h1" style={{ margin: 0 }}>
        InstiFlow
      </h1>
    </div>
  );
}
