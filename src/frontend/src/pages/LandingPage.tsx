import { motion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onEnter: () => void;
  onAdmin?: () => void;
}

export function LandingPage({ onEnter, onAdmin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 600], [1, 0.3]);

  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [splineLoaded, setSplineLoaded] = useState(false);

  // Load Spline viewer script dynamically
  useEffect(() => {
    // Check if already loaded
    if (customElements.get("spline-viewer")) {
      setSplineLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://unpkg.com/@splinetool/viewer@1.12.73/build/spline-viewer.js";
    script.onload = () => setSplineLoaded(true);
    document.head.appendChild(script);
    return () => {
      try {
        document.head.removeChild(script);
      } catch {}
    };
  }, []);

  // Fallback canvas particles (shown while Spline loads or if unavailable)
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    if (splineLoaded) return; // Spline is active, skip canvas
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    el.appendChild(canvas);

    const resize = () => {
      canvas.width = el.offsetWidth;
      canvas.height = el.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d")!;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
        ctx.fill();
      }
      // Draw subtle connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      if (el.contains(canvas)) el.removeChild(canvas);
    };
  }, [splineLoaded]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = (e.clientX / vw - 0.5) * 60;
    const dy = (e.clientY / vh - 0.5) * 40;
    if (orb1Ref.current) {
      orb1Ref.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    if (orb2Ref.current) {
      orb2Ref.current.style.transform = `translate(${-dx * 0.6}px, ${-dy * 0.6}px)`;
    }
  }, []);

  const stagger = (i: number) => ({
    delay: Math.max(0, 0.02 + i * 0.05) as number,
    duration: 0.35,
    ease: "easeOut" as const,
  });

  const handleAdminLogin = () => {
    if (adminUser === "BE24B034" && adminPass === "bobbe@2006") {
      setShowAdminModal(false);
      setAdminUser("");
      setAdminPass("");
      setAdminError("");
      if (onAdmin) onAdmin();
      else window.location.hash = "admin";
    } else {
      setAdminError("Invalid username or password.");
    }
  };

  const goToAdmin = () => {
    if (onAdmin) {
      onAdmin();
    } else {
      window.location.hash = "admin";
    }
  };

  return (
    <div
      className="landing-root"
      onMouseMove={handleMouseMove}
      style={{ position: "relative" }}
    >
      {/* Dark base */}
      <div className="landing-bg" />

      {/* Canvas particle animation — full page */}
      <motion.div
        style={{
          opacity: bgOpacity,
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {splineLoaded ? (
          <>
            {/* Watermark blocker — covers the Spline "Made with Spline" badge */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 200,
                height: 50,
                background: "#060810",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
            {/* @ts-ignore */}
            <spline-viewer
              url="https://prod.spline.design/atbUfD8ybgiIefp4/scene.splinecode"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
            />
          </>
        ) : (
          <div
            ref={canvasContainerRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
            }}
          />
        )}
      </motion.div>

      <div ref={orb1Ref} className="landing-orb landing-orb-1" />
      <div ref={orb2Ref} className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Dark overlay for text readability */}
      <div className="landing-spline-overlay" />

      {/* Bottom fade to features */}
      <div className="landing-spline-bottom-fade" />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}
        data-ocid="landing.nav"
      >
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-brand-dot" />
            <span className="landing-brand-name">InstiFlow</span>
          </div>
          <div className="landing-nav-links">
            <a
              href="#features"
              className="landing-nav-link"
              data-ocid="landing.features.link"
            >
              Features
            </a>
            <button
              type="button"
              className="landing-nav-link"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={onEnter}
              data-ocid="landing.dashboard.link"
            >
              Dashboard
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="glass-btn-accent glow-btn"
              style={{ padding: "8px 22px", fontSize: "14px" }}
              onClick={onEnter}
              data-ocid="landing.nav.primary_button"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="landing-hero-fullscreen"
        style={{ position: "relative", zIndex: 10 }}
      >
        <div className="landing-hero-text">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(0)}
            className="landing-badge"
          >
            <span className="landing-badge-dot" />
            Smart Academic Planner for IIT Madras
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(1)}
            className="landing-h1"
          >
            InstiFlow
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(1.5)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "100px",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              fontSize: "12px",
              fontWeight: 500,
              color: "rgba(180,190,255,0.8)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              letterSpacing: "0.04em",
            }}
          >
            Powered by{" "}
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>
              IITM BAZAAR
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(2)}
            className="landing-tagline"
          >
            Plan smarter.{" "}
            <span style={{ color: "rgba(168,139,250,0.9)" }}>Live better.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(3)}
            className="landing-subtitle"
            style={{
              textShadow:
                "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)",
            }}
          >
            Your complete academic companion — timetables, attendance, exams,
            tasks, all in one premium dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(4)}
            className="landing-ctas"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.96 }}
              className="landing-cta-primary glow-btn"
              onClick={onEnter}
              data-ocid="landing.get_started.primary_button"
            >
              Get Started →
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="landing-cta-outline"
              onClick={() => {
                setShowAdminModal(true);
                setAdminError("");
              }}
              data-ocid="landing.admin_login.secondary_button"
            >
              🛡️ Admin Login
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="landing-stats"
          >
            {[
              { label: "Modules", value: "6+" },
              { label: "Slots mapped", value: "25+" },
              { label: "100% Local", value: "Private" },
            ].map((s) => (
              <div key={s.label} className="landing-stat">
                <span className="landing-stat-value">{s.value}</span>
                <span className="landing-stat-label">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="landing-features"
        style={{ position: "relative", zIndex: 1 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="landing-section-title"
        >
          Everything you need
        </motion.h2>
        {/* Mobile horizontal scroll hint */}
        <div
          className="landing-features-scroll-hint"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 10,
            fontSize: 11,
            color: "rgba(167,139,250,0.7)",
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          <span>&#8592;</span>
          <span>Swipe to see all features</span>
          <span>&#8594;</span>
        </div>
        <div className="landing-features-grid">
          {[
            {
              icon: "⏱",
              title: "Smart Timetable",
              desc: "Auto-map IITM slots to your weekly schedule with color-coded cards.",
            },
            {
              icon: "📅",
              title: "Academic Calendar",
              desc: "Full semester view with holidays, Saarang, and exam periods pre-marked.",
            },
            {
              icon: "✅",
              title: "Attendance Tracker",
              desc: "Track attendance per course with circular progress and skip predictions.",
            },
            {
              icon: "📝",
              title: "Exam Scheduler",
              desc: "Quiz 1, Quiz 2, End Sem dates auto-generated from slot data.",
            },
            {
              icon: "🗂",
              title: "Task Manager",
              desc: "Notion-style cards with drag-and-drop, reminders, and priority labels.",
            },
            {
              icon: "🔔",
              title: "Smart Notifications",
              desc: "7am class alerts, attendance warnings, and upcoming exam countdowns.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="landing-feature-card glass-card shimmer-card"
            >
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="landing-final-cta"
        style={{ position: "relative", zIndex: 1 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="landing-final-card glass-card"
        >
          <h2 className="landing-final-title">Ready to take control?</h2>
          <p className="landing-final-subtitle">
            No sign-up required. Your data stays private, on your device.
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.06, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="landing-cta-primary glow-btn"
            onClick={onEnter}
            data-ocid="landing.final.primary_button"
          >
            Launch Dashboard →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span style={{ opacity: 0.4, fontSize: "13px", color: "#a9b8d0" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#a78bfa", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </span>
        <motion.button
          type="button"
          whileHover={{ opacity: 0.7 }}
          whileTap={{ scale: 0.97 }}
          onClick={goToAdmin}
          data-ocid="landing.admin.link"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#4A5270",
            fontSize: "12px",
            padding: 0,
            marginTop: 8,
            opacity: 0.5,
          }}
        >
          🛡️ Admin Login
        </motion.button>
      </footer>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowAdminModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAdminModal(false)}
          tabIndex={-1}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(10,12,28,0.95)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "20px",
              padding: "40px 36px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 0 60px rgba(139,92,246,0.2)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛡️</div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Admin Login
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                }}
              >
                Enter your credentials to access the admin panel
              </p>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <input
                type="text"
                placeholder="Username"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {adminError && (
                <p
                  style={{
                    color: "#f87171",
                    fontSize: "0.85rem",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {adminError}
                </p>
              )}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAdminLogin}
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                Login →
              </motion.button>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
