import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
} from "../types";
import { calcAttendance } from "../utils/attendance";
import { SLOT_OCCURRENCES } from "../utils/slots";

interface Props {
  courses: Course[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  examEntries?: ExamEntry[];
  semSettings?: SemSettings;
}

const isIOS =
  typeof navigator !== "undefined" &&
  /iP(hone|ad|od)/.test(navigator.userAgent) &&
  !(window as unknown as Record<string, unknown>).MSStream;

const isStandalone =
  typeof navigator !== "undefined" &&
  (navigator as unknown as Record<string, unknown>).standalone === true;

function toISO(date: Date): string {
  return date.toISOString();
}

function buildSchedule(
  courses: Course[],
  tasks: Task[],
  examEntries: ExamEntry[],
): Array<{ tag: string; title: string; body: string; scheduledAt: string }> {
  const now = new Date();
  const notifications: Array<{
    tag: string;
    title: string;
    body: string;
    scheduledAt: string;
  }> = [];

  // ── 7 AM daily summary ─────────────────────────────────────────────────────
  const dailySummaryDate = new Date(now);
  dailySummaryDate.setHours(7, 0, 0, 0);
  if (dailySummaryDate <= now) {
    dailySummaryDate.setDate(dailySummaryDate.getDate() + 1);
  }
  const summaryDay = dailySummaryDate.getDay(); // 0=Sun
  const iitmDay = summaryDay - 1; // 0=Mon, 4=Fri

  const todayCourseNames: string[] = [];
  if (iitmDay >= 0 && iitmDay <= 4) {
    for (const c of courses) {
      const occs = SLOT_OCCURRENCES[c.slot] ?? [];
      if (occs.some((o) => o.day === iitmDay)) {
        todayCourseNames.push(`${c.name} (${c.slot})`);
      }
    }
  }

  const summaryDateStr = dailySummaryDate.toISOString().split("T")[0];
  const tasksDueToday = tasks.filter(
    (t) => !t.completed && t.date === summaryDateStr,
  );
  const examsDueToday = examEntries.filter((e) => e.date === summaryDateStr);

  let summaryBody = "";
  if (todayCourseNames.length > 0) {
    summaryBody += todayCourseNames.slice(0, 3).join(", ");
    if (todayCourseNames.length > 3)
      summaryBody += ` +${todayCourseNames.length - 3} more`;
    summaryBody += ". ";
  } else {
    summaryBody += "No classes today. ";
  }
  if (tasksDueToday.length > 0) {
    summaryBody += `${tasksDueToday.length} task${tasksDueToday.length > 1 ? "s" : ""} due. `;
  }
  for (const ex of examsDueToday) {
    const course = courses.find((c) => c.id === ex.courseId);
    if (course) {
      summaryBody += `${course.name} ${ex.examType === "quiz1" ? "Quiz 1" : ex.examType === "quiz2" ? "Quiz 2" : "End Sem"} today! `;
    }
  }

  notifications.push({
    tag: `daily-summary-${summaryDateStr}`,
    title: "InstiFlow — Good Morning 📚",
    body: summaryBody.trim() || "Have a great day!",
    scheduledAt: toISO(dailySummaryDate),
  });

  // ── Exam alerts (1 week, 3 days, 1 day before) ──────────────────────────────
  for (const ex of examEntries) {
    const course = courses.find((c) => c.id === ex.courseId);
    if (!course || !ex.date) continue;
    const examDate = new Date(`${ex.date}T09:00:00`);
    const examLabel =
      ex.examType === "quiz1"
        ? "Quiz 1"
        : ex.examType === "quiz2"
          ? "Quiz 2"
          : "End Sem";
    const dateDisplay = examDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const body = `${course.name} ${examLabel} on ${dateDisplay}`;

    const offsets: Array<{ days: number; label: string; emoji: string }> = [
      { days: 7, label: "Exam in 1 Week ⏰", emoji: "⏰" },
      { days: 3, label: "Exam in 3 Days ⚠️", emoji: "⚠️" },
      { days: 1, label: "Exam Tomorrow 🔴", emoji: "🔴" },
    ];

    for (const { days, label } of offsets) {
      const alertTime = new Date(examDate);
      alertTime.setDate(alertTime.getDate() - days);
      alertTime.setHours(8, 0, 0, 0);
      if (alertTime > now) {
        notifications.push({
          tag: `exam-${ex.id}-${days}d`,
          title: `InstiFlow — ${label}`,
          body,
          scheduledAt: toISO(alertTime),
        });
      }
    }
  }

  // ── Task alerts ───────────────────────────────────────────────────────────
  for (const t of tasks) {
    if (t.completed || !t.date) continue;
    const dueDate = new Date(`${t.date}T09:00:00`);

    // 1 day before at 8 AM
    const dayBefore = new Date(dueDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(8, 0, 0, 0);
    if (dayBefore > now) {
      notifications.push({
        tag: `task-before-${t.id}`,
        title: "InstiFlow — Task Due Tomorrow 📋",
        body: t.title,
        scheduledAt: toISO(dayBefore),
      });
    }

    // Due date at 9 AM
    const dueDayAlert = new Date(dueDate);
    dueDayAlert.setHours(9, 0, 0, 0);
    if (dueDayAlert > now) {
      notifications.push({
        tag: `task-due-${t.id}`,
        title: "InstiFlow — Task Due Today 🔔",
        body: t.title,
        scheduledAt: toISO(dueDayAlert),
      });
    }

    // Overdue: day after at 8 AM
    const overdue = new Date(dueDate);
    overdue.setDate(overdue.getDate() + 1);
    overdue.setHours(8, 0, 0, 0);
    if (overdue > now) {
      notifications.push({
        tag: `task-overdue-${t.id}`,
        title: "InstiFlow — Overdue Task ❗",
        body: t.title,
        scheduledAt: toISO(overdue),
      });
    }
  }

  return notifications;
}

export function NotificationManager({
  courses,
  attendance,
  tasks,
  examEntries = [],
  semSettings: _semSettings,
}: Props) {
  const firedRef = useRef<Set<string>>(new Set());
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  // ── Permission request + iOS banner ─────────────────────────────────────────
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        setPermission(p);
      });
    }

    if (isIOS && !isStandalone && Notification.permission !== "granted") {
      setShowIOSBanner(true);
    }
  }, []);

  // ── Push schedule to SW ──────────────────────────────────────────────────────
  useEffect(() => {
    if (permission !== "granted") return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const schedule = buildSchedule(courses, tasks, examEntries);
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({
        type: "SCHEDULE_NOTIFICATIONS",
        notifications: schedule,
      });
    });
  }, [courses, tasks, examEntries, permission]);

  // ── In-app foreground notifications (interval-based) ─────────────────────────
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const today = now.toISOString().split("T")[0];
      const todayDay = now.getDay();
      const iitmDay = todayDay - 1;

      if (h === 7 && m < 5) {
        const todayCourses = courses.filter((c) => {
          const occs = SLOT_OCCURRENCES[c.slot] ?? [];
          return occs.some((o) => o.day === iitmDay);
        });
        for (const c of todayCourses) {
          const key = `class-${today}-${c.id}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            new Notification("InstiFlow — Class Today 📚", {
              body: `${c.name} (Slot ${c.slot})${
                c.venue ? ` · ${c.venue}` : ""
              }`,
              icon: "/icons/icon-192.png",
            });
          }
        }

        for (const c of courses) {
          const stats = calcAttendance(attendance, c.id);
          if (stats.percentage < 75 && stats.total > 0) {
            const key = `attn-warn-${today}-${c.id}`;
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              new Notification("InstiFlow — Attendance Warning ⚠️", {
                body: `${c.name}: ${stats.percentage}% (need ${stats.toReach75} more classes)`,
                icon: "/icons/icon-192.png",
              });
            }
          }
        }

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        for (const t of tasks) {
          if (t.completed) continue;
          if (t.date === today || t.date === tomorrowStr) {
            const key = `task-${today}-${t.id}`;
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              const label = t.date === today ? "Due Today" : "Due Tomorrow";
              new Notification(`InstiFlow — Task ${label} 📋`, {
                body: t.title,
                icon: "/icons/icon-192.png",
              });
            }
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [courses, attendance, tasks]);

  return (
    <>
      {/* iOS Add-to-Home-Screen banner */}
      <AnimatePresence>
        {showIOSBanner && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            style={{
              position: "fixed",
              bottom: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9000,
              width: "calc(100% - 32px)",
              maxWidth: 420,
            }}
            data-ocid="notifications.toast"
          >
            <div
              style={{
                background: "rgba(10, 10, 28, 0.88)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius: 18,
                border: "1.5px solid transparent",
                backgroundClip: "padding-box",
                boxShadow:
                  "0 8px 32px rgba(99,102,241,0.25), 0 2px 8px rgba(0,0,0,0.4)",
                padding: "14px 16px",
                position: "relative",
              }}
            >
              {/* Gradient border overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 18,
                  padding: "1.5px",
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(59,130,246,0.8))",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span style={{ fontSize: 22, lineHeight: 1.2 }}>📱</span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      color: "rgba(200, 210, 255, 0.95)",
                      fontSize: 13,
                      fontWeight: 600,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    Enable Home Screen Notifications
                  </p>
                  <p
                    style={{
                      color: "rgba(160, 170, 220, 0.8)",
                      fontSize: 12,
                      margin: "4px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    On iPhone, tap{" "}
                    <span
                      style={{
                        background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700,
                      }}
                    >
                      Share ⎋
                    </span>{" "}
                    then{" "}
                    <span
                      style={{
                        background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700,
                      }}
                    >
                      Add to Home Screen
                    </span>{" "}
                    to receive push notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSBanner(false)}
                  aria-label="Dismiss"
                  data-ocid="notifications.close_button"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(160,170,220,0.8)",
                    fontSize: 14,
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
