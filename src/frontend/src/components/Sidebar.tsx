import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Home,
  LayoutGrid,
  Settings2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";

export type TabId =
  | "today"
  | "timetable"
  | "attendance"
  | "calendar"
  | "exams"
  | "tasks"
  | "settings";

export const NAV_ITEMS: {
  id: TabId;
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: "today", label: "Today", Icon: Home },
  { id: "timetable", label: "Timetable", Icon: LayoutGrid },
  { id: "attendance", label: "Attendance", Icon: BarChart3 },
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "exams", label: "Exams", Icon: BookOpen },
  { id: "tasks", label: "Tasks", Icon: CheckSquare },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

// Brand accent — matches landing page exactly
const BRAND_ACCENT = "#a78bfa";
const ACTIVE_BG = "rgba(99,102,241,0.15)";
const ACTIVE_BORDER = "rgba(99,102,241,0.4)";
const ACTIVE_COLOR = "#a78bfa";
const HOVER_BG = "rgba(99,102,241,0.08)";

interface Props {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  accentColor: string;
  /** Mobile only — controlled open state */
  isOpen?: boolean;
  /** Mobile only — close callback */
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  isMobile,
}: Props) {
  const handleNavClick = (id: TabId) => {
    onTabChange(id);
    if (isMobile && onClose) onClose();
  };

  const sidebarContent = (
    <aside
      className="glass-sidebar"
      style={{
        width: 230,
        minHeight: isMobile ? "100vh" : "100vh",
        height: isMobile ? "100%" : undefined,
        padding: "28px 12px",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
        overflowY: "auto",
      }}
    >
      {/* Mobile close button */}
      {isMobile && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 6,
            cursor: "pointer",
            color: "#7A8299",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          data-ocid="sidebar.close_button"
        >
          <X size={16} />
        </button>
      )}

      {/* Brand */}
      <div
        style={{
          marginBottom: 36,
          paddingLeft: 12,
          paddingRight: isMobile ? 40 : 0,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            background:
              "linear-gradient(135deg, #fff 40%, #a78bfa 70%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          InstiFlow
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#7A8299",
            marginTop: 3,
            letterSpacing: "0.02em",
            fontWeight: 500,
            fontStyle: "italic",
          }}
        >
          Plan smarter. Live better.
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#404860",
            marginTop: 2,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Smart Academic Planner
        </div>
        <div
          style={{
            marginTop: 10,
            height: 1,
            background:
              "linear-gradient(90deg, rgba(99,102,241,0.4), transparent)",
          }}
        />
      </div>

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          position: "relative",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const { Icon } = item;
          return (
            <motion.button
              key={item.id}
              data-ocid={`nav.${item.id}.link`}
              onClick={() => handleNavClick(item.id)}
              whileHover={
                !isActive
                  ? {
                      backgroundColor: HOVER_BG,
                      x: 2,
                      transition: { duration: 0.15 },
                    }
                  : undefined
              }
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                paddingLeft: "15px",
                borderRadius: 10,
                border: isActive
                  ? `1px solid ${ACTIVE_BORDER}`
                  : "1px solid transparent",
                borderLeft: isActive
                  ? `3px solid ${BRAND_ACCENT}`
                  : "3px solid transparent",
                cursor: "pointer",
                background: isActive ? ACTIVE_BG : "transparent",
                boxShadow: isActive
                  ? "0 0 0 1px rgba(99,102,241,0.25), 0 4px 24px rgba(99,102,241,0.15)"
                  : "none",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? ACTIVE_COLOR : "#7A8299",
                textAlign: "left",
                width: "100%",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
                willChange: "transform",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              <Icon size={16} style={{ position: "relative", flexShrink: 0 }} />
              <span style={{ position: "relative", flex: 1 }}>
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: "0 0 8px rgba(99,102,241,0.8)",
                    position: "relative",
                    animation: "pulseDot 2s ease-in-out infinite",
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingLeft: 12 }}>
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.04)",
            marginBottom: 12,
          }}
        />
        <div
          style={{ fontSize: 10, color: "#505870", letterSpacing: "0.04em" }}
        >
          IIT Madras · Even Sem 2026
        </div>
        <div style={{ fontSize: 9, color: "#353C52", marginTop: 3 }}>
          © {new Date().getFullYear()} InstiFlow
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#3A4258",
            marginTop: 3,
            letterSpacing: "0.04em",
          }}
        >
          Powered by IITM Bazaar
        </div>
      </div>
    </aside>
  );

  // Mobile: render as overlay drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
              data-ocid="sidebar.backdrop"
            />
            {/* Drawer */}
            <motion.div
              key="sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 201,
                width: 230,
              }}
              data-ocid="sidebar.panel"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: static layout
  return sidebarContent;
}
