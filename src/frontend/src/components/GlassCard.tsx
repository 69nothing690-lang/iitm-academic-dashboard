import { motion } from "motion/react";
import type React from "react";
import { useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function GlassCard({
  children,
  className = "",
  hover = false,
  onClick,
  style,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setGlowPos(null);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`glass-card shimmer-card p-5 ${className}`}
      style={{
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={
        hover
          ? {
              scale: 1.015,
              boxShadow:
                "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              borderColor: "rgba(139,92,246,0.25)",
              transition: { duration: 0.2 },
            }
          : {
              boxShadow:
                "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              borderColor: "rgba(139,92,246,0.25)",
              transition: { duration: 0.2 },
            }
      }
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      layout
    >
      {/* Cursor-tracking inner glow — indigo/violet tint */}
      {glowPos && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background: `radial-gradient(circle 180px at ${glowPos.x}px ${glowPos.y}px, rgba(99,102,241,0.12), transparent 70%)`,
            borderRadius: "inherit",
            transition: "background 0.05s",
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}
