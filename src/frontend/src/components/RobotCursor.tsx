import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function RobotCursor() {
  const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 });
  const robotRef = useRef<HTMLDivElement>(null);
  const [leftAngle, setLeftAngle] = useState(0);
  const [rightAngle, setRightAngle] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (!robotRef.current || mousePos.x === -9999) return;
    const rect = robotRef.current.getBoundingClientRect();

    // SVG is 88x110px, eyes are at roughly:
    // Left eye center: ~31% x, ~31% y of SVG
    // Right eye center: ~70% x, ~31% y of SVG
    const leftEyeX = rect.left + rect.width * 0.295;
    const leftEyeY = rect.top + rect.height * 0.308;
    // Use 0.705 (not 0.693 which approximates Math.LN2)
    const rightEyeX = rect.left + rect.width * 0.705;
    const rightEyeY = rect.top + rect.height * 0.308;

    setLeftAngle(Math.atan2(mousePos.y - leftEyeY, mousePos.x - leftEyeX));
    setRightAngle(Math.atan2(mousePos.y - rightEyeY, mousePos.x - rightEyeX));
  }, [mousePos]);

  // Pupils move max 5px from eye center within ~10px radius socket
  const R = 5;
  const lx = 26 + Math.cos(leftAngle) * R;
  const ly = 34 + Math.sin(leftAngle) * R;
  const rx = 62 + Math.cos(rightAngle) * R;
  const ry = 34 + Math.sin(rightAngle) * R;

  return (
    <motion.div
      ref={robotRef}
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed",
        bottom: "88px",
        left: "24px",
        zIndex: 50,
        width: "88px",
        height: "110px",
        pointerEvents: "none",
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 88 110"
        width="88"
        height="110"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        role="presentation"
        style={{
          overflow: "visible",
          filter: "drop-shadow(0 0 12px rgba(139,92,246,0.4))",
        }}
      >
        <defs>
          <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(30,22,60,0.97)" />
            <stop offset="100%" stopColor="rgba(15,10,35,0.97)" />
          </linearGradient>
          <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(40,28,80,0.98)" />
            <stop offset="100%" stopColor="rgba(20,15,50,0.98)" />
          </linearGradient>
          <radialGradient id="eyeSocketGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(8,6,22,1)" />
            <stop offset="100%" stopColor="rgba(15,10,40,1)" />
          </radialGradient>
          <radialGradient id="pupilGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4c1d95" />
          </radialGradient>
        </defs>

        {/* Neck */}
        <rect
          x="36"
          y="62"
          width="16"
          height="10"
          rx="3"
          fill="rgba(25,18,55,0.95)"
          stroke="rgba(99,102,241,0.35)"
          strokeWidth="1"
        />

        {/* Body */}
        <rect
          x="10"
          y="70"
          width="68"
          height="36"
          rx="10"
          fill="url(#bodyGrad)"
          stroke="rgba(99,102,241,0.45)"
          strokeWidth="1.5"
        />

        {/* Body panel lights */}
        <rect
          x="22"
          y="82"
          width="12"
          height="8"
          rx="4"
          fill="rgba(99,102,241,0.2)"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth="1"
        />
        <rect
          x="38"
          y="82"
          width="12"
          height="8"
          rx="4"
          fill="rgba(139,92,246,0.15)"
          stroke="rgba(139,92,246,0.4)"
          strokeWidth="1"
        />
        <rect
          x="54"
          y="82"
          width="12"
          height="8"
          rx="4"
          fill="rgba(99,102,241,0.2)"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth="1"
        />

        {/* Body vertical line */}
        <line
          x1="44"
          y1="73"
          x2="44"
          y2="103"
          stroke="rgba(99,102,241,0.2)"
          strokeWidth="1"
        />

        {/* Head */}
        <rect
          x="8"
          y="8"
          width="72"
          height="58"
          rx="14"
          fill="url(#headGrad)"
          stroke="rgba(139,92,246,0.5)"
          strokeWidth="1.5"
        />

        {/* Head top highlight */}
        <rect
          x="14"
          y="10"
          width="60"
          height="6"
          rx="4"
          fill="rgba(139,92,246,0.08)"
        />

        {/* Antenna base */}
        <rect
          x="40"
          y="4"
          width="8"
          height="6"
          rx="2"
          fill="rgba(25,18,55,0.95)"
          stroke="rgba(139,92,246,0.4)"
          strokeWidth="1"
        />

        {/* Antenna rod */}
        <line
          x1="44"
          y1="4"
          x2="44"
          y2="-4"
          stroke="rgba(139,92,246,0.7)"
          strokeWidth="1.5"
        />

        {/* Antenna ball */}
        <circle
          cx="44"
          cy="-7"
          r="4"
          fill="rgba(139,92,246,0.9)"
          filter="url(#eyeGlow)"
        />
        <circle cx="44" cy="-7" r="2" fill="rgba(200,185,255,0.9)" />

        {/* Left eye socket */}
        <circle
          cx="26"
          cy="34"
          r="12"
          fill="url(#eyeSocketGrad)"
          stroke="rgba(99,102,241,0.4)"
          strokeWidth="1"
        />

        {/* Right eye socket */}
        <circle
          cx="62"
          cy="34"
          r="12"
          fill="url(#eyeSocketGrad)"
          stroke="rgba(99,102,241,0.4)"
          strokeWidth="1"
        />

        {/* Left pupil glow ring */}
        <circle
          cx={lx}
          cy={ly}
          r="6"
          fill="rgba(139,92,246,0.2)"
          filter="url(#eyeGlow)"
        />

        {/* Left pupil */}
        <circle
          cx={lx}
          cy={ly}
          r="5"
          fill="url(#pupilGrad)"
          filter="url(#eyeGlow)"
        />

        {/* Left pupil highlight */}
        <circle
          cx={lx - 1.5}
          cy={ly - 1.5}
          r="1.5"
          fill="rgba(255,255,255,0.7)"
        />

        {/* Right pupil glow ring */}
        <circle
          cx={rx}
          cy={ry}
          r="6"
          fill="rgba(139,92,246,0.2)"
          filter="url(#eyeGlow)"
        />

        {/* Right pupil */}
        <circle
          cx={rx}
          cy={ry}
          r="5"
          fill="url(#pupilGrad)"
          filter="url(#eyeGlow)"
        />

        {/* Right pupil highlight */}
        <circle
          cx={rx - 1.5}
          cy={ry - 1.5}
          r="1.5"
          fill="rgba(255,255,255,0.7)"
        />

        {/* Mouth — subtle smile */}
        <path
          d="M32 52 Q44 60 56 52"
          stroke="rgba(139,92,246,0.55)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Ear bolts */}
        <circle
          cx="8"
          cy="30"
          r="3"
          fill="rgba(25,18,55,0.95)"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth="1"
        />
        <circle
          cx="80"
          cy="30"
          r="3"
          fill="rgba(25,18,55,0.95)"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth="1"
        />

        {/* Ear inner */}
        <circle cx="8" cy="30" r="1.2" fill="rgba(139,92,246,0.6)" />
        <circle cx="80" cy="30" r="1.2" fill="rgba(139,92,246,0.6)" />
      </svg>
    </motion.div>
  );
}
