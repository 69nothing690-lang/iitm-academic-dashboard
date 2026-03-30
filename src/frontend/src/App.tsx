import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useCallback, useState } from "react";
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

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("today");

  // Sync state — set after login choice
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [storageMode, setStorageMode] = useState<"local" | "sync">("local");
  const [migrateLocal, setMigrateLocal] = useState(false);

  const data = useAppData({ userId, storageMode, migrateLocal });
  const theme = TAB_THEMES[activeTab];

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

  const renderContent = () => {
    switch (activeTab) {
      case "today":
        return (
          <TodayDashboard
            courses={data.courses}
            attendance={data.attendance}
            tasks={data.tasks}
            semSettings={data.semSettings}
            studentName={data.studentName}
            onTabChange={(t) => setActiveTab(t as TabId)}
          />
        );
      case "timetable":
        return (
          <Timetable
            courses={data.courses}
            onAddCourse={data.addCourse}
            onDeleteCourse={data.deleteCourse}
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
                attendance={data.attendance}
                tasks={data.tasks}
                examEntries={data.examEntries}
                semSettings={data.semSettings}
              />
              <motion.div
                onMouseMove={handleMouseMove}
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
                  <Sidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    accentColor={theme.accent}
                  />
                  <main
                    style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
                  >
                    <AnimatePresence mode="wait">
                      <div key={activeTab}>{renderContent()}</div>
                    </AnimatePresence>
                  </main>
                </div>
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
