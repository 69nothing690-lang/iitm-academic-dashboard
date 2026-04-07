import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Home,
  LayoutGrid,
  Menu,
  Settings2,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { InstallPrompt } from "./components/InstallPrompt";
import { NotificationManager } from "./components/NotificationManager";
import { Sidebar, type TabId } from "./components/Sidebar";
import { TAB_THEMES, TabThemeContext } from "./contexts/TabTheme";
import { useAppData } from "./hooks/useAppData";
import { AdminPanel } from "./pages/AdminPanel";
import { AttendanceTracker } from "./pages/AttendanceTracker";
import { CalendarView } from "./pages/CalendarView";
import { ExamsView } from "./pages/ExamsView";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsView } from "./pages/SettingsView";
import { TasksView } from "./pages/TasksView";
import { Timetable } from "./pages/Timetable";
import { TodayDashboard } from "./pages/TodayDashboard";
import { runVersionCheck } from "./utils/storage";

// Run version/cache check immediately on load (before any rendering)
// Clears incompatible localStorage data that could cause crashes
try {
  runVersionCheck();
} catch {
  /* never crash on this */
}

const TAB_ORDER: TabId[] = [
  "today",
  "timetable",
  "attendance",
  "calendar",
  "exams",
  "tasks",
  "settings",
];

const TAB_LABELS: Record<TabId, string> = {
  today: "Today",
  timetable: "Timetable",
  attendance: "Attendance",
  calendar: "Calendar",
  exams: "Exams",
  tasks: "Tasks",
  settings: "Settings",
};

const BOTTOM_NAV_ITEMS = [
  { id: "today" as TabId, label: "Today", Icon: Home },
  { id: "timetable" as TabId, label: "Timetable", Icon: LayoutGrid },
  { id: "attendance" as TabId, label: "Attend", Icon: BarChart3 },
  { id: "calendar" as TabId, label: "Calendar", Icon: CalendarDays },
  { id: "exams" as TabId, label: "Exams", Icon: BookOpen },
  { id: "tasks" as TabId, label: "Tasks", Icon: CheckSquare },
  { id: "settings" as TabId, label: "Settings", Icon: Settings2 },
];

// ── Helpers to restore session from localStorage ────────────────────────
function getStoredChoice(): "local" | "sync" | null {
  try {
    return localStorage.getItem("instiflow_storage_choice") as
      | "local"
      | "sync"
      | null;
  } catch {
    return null;
  }
}

function getStoredUid(): string | undefined {
  try {
    const raw = localStorage.getItem("instiflow_user");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { uid?: string };
    return parsed?.uid || undefined;
  } catch {
    return undefined;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    try {
      return window.innerWidth < 768;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function App() {
  // ── Restore session on refresh ───────────────────────────────────────────
  // If user previously chose a storage mode, skip the landing/login flow.
  const choice = getStoredChoice();

  const [showLanding, setShowLanding] = useState(() => !choice);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isMobile = useIsMobile();

  // Sync state — restored from localStorage or set after login choice
  const [userId, setUserId] = useState<string | undefined>(() =>
    choice === "sync" ? getStoredUid() : undefined,
  );
  const [storageMode, setStorageMode] = useState<"local" | "sync">(() =>
    choice === "sync" ? "sync" : "local",
  );
  const [migrateLocal, setMigrateLocal] = useState(false);

  // For sync users, re-validate Firebase auth on mount (handles sign-out on other devices)
  useEffect(() => {
    if (getStoredChoice() !== "sync") return;

    let cancelled = false;
    import("./lib/firebase")
      .then(({ firebaseAuth }) => {
        import("firebase/auth").then(({ onAuthStateChanged }) => {
          const auth = firebaseAuth();
          const unsub = onAuthStateChanged(auth, (user) => {
            if (cancelled) return;
            unsub();
            if (user) {
              // Firebase confirms user is still logged in
              setUserId(user.uid);
              setStorageMode("sync");
              setShowLanding(false);
              setShowLogin(false);
            } else {
              // Firebase says session expired — ask to re-login
              try {
                localStorage.removeItem("instiflow_storage_choice");
                localStorage.removeItem("instiflow_user");
              } catch {
                /* ignore */
              }
              setShowLanding(false);
              setShowLogin(true);
            }
          });
        });
      })
      .catch((e) => {
        // Firebase failed to load (network or missing package) — fall back to local
        console.warn(
          "[InstiFlow] Firebase auth check failed, falling back to local:",
          e,
        );
        try {
          localStorage.removeItem("instiflow_storage_choice");
          localStorage.removeItem("instiflow_user");
        } catch {
          /* ignore */
        }
        setStorageMode("local");
        setShowLanding(false);
        setShowLogin(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useAppData({ userId, storageMode, migrateLocal });
  const theme = TAB_THEMES[activeTab];

  // ── Slide animation direction tracking ────────────────────────────────
  const prevTabRef = useRef<TabId>("today");
  const [slideDir, setSlideDir] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const orb1X = useTransform(mouseX, [0, 1440], [-30, 30]);
  const orb1Y = useTransform(mouseY, [0, 900], [-20, 20]);
  const orb2X = useTransform(mouseX, [0, 1440], [20, -20]);
  const orb2Y = useTransform(mouseY, [0, 900], [30, -30]);
  const orb3X = useTransform(mouseX, [0, 1440], [15, -15]);
  const orb3Y = useTransform(mouseY, [0, 900], [-15, 15]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    },
    [mouseX, mouseY],
  );

  // Touch tracking for swipe gestures
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;

      // Sidebar open gesture — edge swipe takes top priority
      if (touchStartX.current < 50 && dx > 50) {
        setSidebarOpen(true);
        return;
      }
      if (dx < -50 && sidebarOpen) {
        setSidebarOpen(false);
        return;
      }
    },
    [sidebarOpen],
  );

  const handleLogin = (uid?: string, migrate?: boolean) => {
    if (uid) {
      setUserId(uid);
      setStorageMode("sync");
      setMigrateLocal(migrate ?? false);
    } else {
      setStorageMode("local");
    }
    setShowLogin(false);
  };

  const handleTabChange = (t: TabId) => {
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current);
    const nextIdx = TAB_ORDER.indexOf(t);
    setSlideDir(nextIdx > prevIdx ? 1 : -1);
    prevTabRef.current = t;
    setActiveTab(t);
    if (isMobile) setSidebarOpen(false);
  };

  const renderContent = () => {
    try {
      switch (activeTab) {
        case "today":
          return (
            <TodayDashboard
              courses={data.courses}
              timetableEntries={data.timetableEntries}
              attendance={data.attendance}
              tasks={data.tasks}
              semSettings={data.semSettings}
              studentName={data.studentName}
              onTabChange={(t) => handleTabChange(t as TabId)}
            />
          );
        case "timetable":
          return (
            <Timetable
              courses={data.courses}
              onAddCourse={data.addCourse}
              onDeleteCourse={data.deleteCourse}
              timetableEntries={data.timetableEntries}
              onAddTimetableEntries={data.addTimetableEntries}
              onDeleteTimetableEntry={data.deleteTimetableEntry}
              onDeleteEntriesForCourse={data.deleteEntriesForCourse}
            />
          );
        case "attendance":
          return (
            <AttendanceTracker
              courses={data.courses}
              attendance={data.attendance}
              onAddAttendance={data.addAttendance}
              onUpdateAttendance={data.updateAttendance}
              onDeleteAttendance={data.deleteAttendance}
            />
          );
        case "calendar":
          return (
            <CalendarView
              courses={data.courses}
              tasks={data.tasks}
              semSettings={data.semSettings}
            />
          );
        case "exams":
          return (
            <ExamsView
              courses={data.courses}
              semSettings={data.semSettings}
              examEntries={data.examEntries}
              onSetExamOverride={data.setExamOverride}
              onClearExamOverride={data.clearExamOverride}
            />
          );
        case "tasks":
          return (
            <TasksView
              tasks={data.tasks}
              onAddTask={data.addTask}
              onDeleteTask={data.deleteTask}
              onToggleTask={data.toggleTask}
            />
          );
        case "settings":
          return (
            <SettingsView
              semSettings={data.semSettings}
              onUpdateSem={data.setSemSettings}
              studentName={data.studentName}
              onUpdateName={data.setStudentName}
            />
          );
        default:
          return null;
      }
    } catch (e) {
      console.error("[InstiFlow] Tab render error:", e);
      return (
        <div style={{ padding: 32, color: "#e2e8f0", textAlign: "center" }}>
          <p style={{ fontSize: 16, opacity: 0.7 }}>
            This section failed to load. Please try again or switch to another
            tab.
          </p>
        </div>
      );
    }
  };

  if (showAdmin) {
    return (
      <>
        <AdminPanel onBack={() => setShowAdmin(false)} />
        <InstallPrompt />
      </>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <LandingPage
              onEnter={() => {
                setShowLanding(false);
                setShowLogin(true);
              }}
              onAdmin={() => setShowAdmin(true)}
            />
          </motion.div>
        ) : showLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <LoginPage
              onLogin={handleLogin}
              onBack={() => {
                setShowLogin(false);
                setShowLanding(true);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <TabThemeContext.Provider value={theme}>
              <NotificationManager
                courses={data.courses}
                timetableEntries={data.timetableEntries}
                attendance={data.attendance}
                tasks={data.tasks}
                examEntries={data.examEntries}
                semSettings={data.semSettings}
              />
              <motion.div
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                animate={{ backgroundColor: theme.bg }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  minHeight: "100vh",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Cursor spotlight */}
                <motion.div
                  className="cursor-spotlight"
                  style={{
                    left: mouseX,
                    top: mouseY,
                    background: `radial-gradient(circle 300px at center, ${theme.accent}0d, transparent 70%)`,
                  }}
                />

                {/* Floating background orbs with mouse parallax */}
                <motion.div
                  className="bg-orb bg-orb-1"
                  animate={{ backgroundColor: theme.accent }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  style={{ x: orb1X, y: orb1Y }}
                />
                <motion.div
                  className="bg-orb bg-orb-2"
                  animate={{ backgroundColor: theme.accent }}
                  transition={{ duration: 1.4, ease: "easeInOut", delay: 0.1 }}
                  style={{ x: orb2X, y: orb2Y }}
                />
                <motion.div
                  className="bg-orb bg-orb-3"
                  animate={{ backgroundColor: theme.glow2 }}
                  transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
                  style={{ x: orb3X, y: orb3Y }}
                />

                {/* Animated gradient overlay that shifts per tab */}
                <motion.div
                  animate={{ opacity: 1 }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: theme.gradient,
                    pointerEvents: "none",
                    zIndex: 0,
                    transition: "background 0.6s ease",
                  }}
                />

                {/* Cloud sync loading overlay */}
                {data.isCloudLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 9998,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(6,8,16,0.85)",
                      backdropFilter: "blur(12px)",
                    }}
                    data-ocid="app.loading_state"
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          border: "3px solid rgba(99,102,241,0.2)",
                          borderTop: "3px solid #6366f1",
                          animation: "spin 0.8s linear infinite",
                          margin: "0 auto 16px",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 14,
                          color: "rgba(180,190,255,0.8)",
                          fontWeight: 500,
                        }}
                      >
                        Loading your cloud data…
                      </div>
                    </div>
                  </motion.div>
                )}

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    width: "100%",
                  }}
                >
                  {/* Desktop sidebar — static, always visible */}
                  {!isMobile && (
                    <Sidebar
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                      accentColor={theme.accent}
                      isMobile={false}
                    />
                  )}

                  {/* Mobile sidebar — overlay drawer */}
                  {isMobile && (
                    <Sidebar
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                      accentColor={theme.accent}
                      isMobile={true}
                      isOpen={sidebarOpen}
                      onClose={() => setSidebarOpen(false)}
                    />
                  )}

                  {/* Main content */}
                  <main
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      overflowX: "hidden",
                      paddingTop: isMobile ? 56 : 0,
                      paddingBottom: isMobile ? 72 : 0,
                    }}
                  >
                    <AnimatePresence mode="wait" custom={slideDir}>
                      <motion.div
                        key={activeTab}
                        custom={slideDir}
                        variants={{
                          initial: (dir: number) => ({
                            opacity: 0,
                            x: dir * 28,
                          }),
                          animate: {
                            opacity: 1,
                            x: 0,
                          },
                          exit: (dir: number) => ({
                            opacity: 0,
                            x: dir * -28,
                          }),
                        }}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{
                          duration: 0.32,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        style={{ width: "100%" }}
                      >
                        {renderContent()}
                      </motion.div>
                    </AnimatePresence>
                  </main>
                </div>

                {/* Mobile Top Navbar */}
                {isMobile && (
                  <motion.header
                    initial={{ y: -56 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 56,
                      zIndex: 100,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 16px",
                      background: "rgba(10,12,24,0.92)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                    data-ocid="nav.mobile.panel"
                  >
                    {/* Hamburger */}
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: "6px 8px",
                        cursor: "pointer",
                        color: "#a78bfa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      data-ocid="nav.sidebar.open_modal_button"
                    >
                      <Menu size={20} />
                    </button>

                    {/* Current page name */}
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "rgba(220,225,255,0.9)",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {TAB_LABELS[activeTab]}
                    </span>

                    {/* Brand */}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      InstiFlow
                    </span>
                  </motion.header>
                )}

                {/* Mobile Bottom Tab Bar */}
                {isMobile && (
                  <motion.nav
                    initial={{ y: 80 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 72,
                      zIndex: 100,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                      background: "rgba(10,12,24,0.96)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    }}
                    data-ocid="nav.bottom.panel"
                  >
                    {BOTTOM_NAV_ITEMS.map((item) => {
                      const isActive = activeTab === item.id;
                      const { Icon } = item;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-ocid={`nav.bottom.${item.id}.link`}
                          onClick={() => handleTabChange(item.id)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 3,
                            flex: 1,
                            padding: "6px 0",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: isActive ? "#a78bfa" : "#4A5270",
                            transition: "all 0.2s ease",
                            position: "relative",
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="bottomActiveTab"
                              style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: 12,
                                background: "rgba(99,102,241,0.12)",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 32,
                              }}
                            />
                          )}
                          <Icon
                            size={isActive ? 20 : 18}
                            style={{
                              position: "relative",
                              filter: isActive
                                ? "drop-shadow(0 0 6px rgba(167,139,250,0.8))"
                                : "none",
                              transition: "all 0.2s ease",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: isActive ? 700 : 400,
                              letterSpacing: "0.02em",
                              position: "relative",
                            }}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </motion.nav>
                )}
              </motion.div>
            </TabThemeContext.Provider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA install prompt — rendered outside page transitions */}
      <InstallPrompt />
    </>
  );
}
