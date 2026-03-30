import { useEffect, useRef } from "react";

interface ColorBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  opacity: number;
  radius: number;
}

export function SplineBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Non-null typed refs used inside closures
    const c: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;

    let animId: number;
    let width = 0;
    let height = 0;

    const BLOB_COLORS = [
      "#7c3aed",
      "#2563eb",
      "#4f46e5",
      "#6d28d9",
      "#1d4ed8",
      "#5b21b6",
    ];

    let blobs: ColorBlob[] = [];
    let particles: Particle[] = [];

    function initBlobs() {
      blobs = BLOB_COLORS.map((color, i) => ({
        x: (width * (i + 1)) / (BLOB_COLORS.length + 1),
        y: height * (0.2 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.min(width, height) * (0.28 + Math.random() * 0.2),
        color,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function initParticles() {
      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(0.2 + Math.random() * 0.5),
        opacity: 0.2 + Math.random() * 0.4,
        radius: 1 + Math.random(),
      }));
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      c.width = width;
      c.height = height;
      initBlobs();
      initParticles();
    }

    function hexToRgb(hex: string): [number, number, number] {
      const n = Number.parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    let t = 0;

    function draw() {
      t += 0.006;
      g.clearRect(0, 0, width, height);

      // Dark base
      g.fillStyle = "#06080f";
      g.fillRect(0, 0, width, height);

      // Blobs
      for (const blob of blobs) {
        blob.x += blob.vx + Math.sin(t + blob.phase) * 0.4;
        blob.y += blob.vy + Math.cos(t * 0.7 + blob.phase) * 0.3;

        if (blob.x < -blob.r * 0.5) blob.x = width + blob.r * 0.5;
        if (blob.x > width + blob.r * 0.5) blob.x = -blob.r * 0.5;
        if (blob.y < -blob.r * 0.5) blob.y = height + blob.r * 0.5;
        if (blob.y > height + blob.r * 0.5) blob.y = -blob.r * 0.5;

        const [r, bv, bbl] = hexToRgb(blob.color);
        const grad = g.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.r,
        );
        grad.addColorStop(0, `rgba(${r},${bv},${bbl},0.22)`);
        grad.addColorStop(0.5, `rgba(${r},${bv},${bbl},0.09)`);
        grad.addColorStop(1, `rgba(${r},${bv},${bbl},0)`);

        g.beginPath();
        g.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        g.fillStyle = grad;
        g.fill();
      }

      // Particles
      for (const p of particles) {
        p.y += p.vy;
        if (p.y < -4) {
          p.y = height + 4;
          p.x = Math.random() * width;
        }
        g.beginPath();
        g.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        g.fillStyle = `rgba(200,210,255,${p.opacity})`;
        g.fill();
      }

      // Dot grid
      g.fillStyle = "rgba(255,255,255,0.04)";
      const step = 40;
      for (let gx = 0; gx < width; gx += step) {
        for (let gy = 0; gy < height; gy += step) {
          g.beginPath();
          g.arc(gx, gy, 1, 0, Math.PI * 2);
          g.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        willChange: "transform",
        display: "block",
      }}
    />
  );
}
