import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
  TimetableEntry,
} from "../types";
import { calcAttendance } from "../utils/attendance";
import {
  DEFAULT_NOTIF_PREFS,
  type NotifPrefs,
  getNotifPrefs,
} from "../utils/notifPrefs";
import {
  EXTRA_SLOT_COL_INDEX,
  EXTRA_SLOT_TIME,
  SLOT_OCCURRENCES,
  TIME_COLUMNS,
} from "../utils/slots";

interface Props {
  courses: Course[];
  timetableEntries?: TimetableEntry[];
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
  timetableEntries: TimetableEntry[],
  tasks: Task[],
  examEntries: ExamEntry[],
  prefs: NotifPrefs,
): Array<{ tag: string; title: string; body: string; scheduledAt: string }> {
  const now = new Date();
  const notifications: Array<{
    tag: string;
    title: string;
    body: string;
    scheduledAt: string;
  }> = [];

  // ── Daily summary ──
  if (prefs.dailySummaryEnabled) {
    const [sumH, sumM] = prefs.dailySummaryTime.split(":").map(Number);
    const dailySummaryDate = new Date(now);
    dailySummaryDate.setHours(sumH, sumM, 0, 0);
    if (dailySummaryDate <= now)
      dailySummaryDate.setDate(dailySummaryDate.getDate() + 1);

    const summaryDay = dailySummaryDate.getDay();
    const iitmDay = summaryDay - 1;
    const summaryDateStr = dailySummaryDate.toISOString().split("T")[0];

    // Use timetableEntries if available, otherwise fall back to courses
    const todayCourseNames: string[] = [];
    if (timetableEntries.length > 0) {
      const uniqueNames = new Set<string>();
      for (const e of timetableEntries) {
        if (e.day === iitmDay) uniqueNames.add(`${e.courseName} (${e.slot})`);
      }
      todayCourseNames.push(...uniqueNames);
    } else if (iitmDay >= 0 && iitmDay <= 4) {
      for (const c of courses) {
        const occs =
          c.slot === "EXTRA_6_8"
            ? [{ day: iitmDay, col: EXTRA_SLOT_COL_INDEX }]
            : (SLOT_OCCURRENCES[c.slot] ?? []);
        if (occs.some((o) => o.day === iitmDay))
          todayCourseNames.push(`${c.name} (${c.slot})`);
      }
    }

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
    if (tasksDueToday.length > 0)
      summaryBody += `${tasksDueToday.length} task${tasksDueToday.length > 1 ? "s" : ""} due. `;
    for (const ex of examsDueToday) {
      const course = courses.find((c) => c.id === ex.courseId);
      if (course)
        summaryBody += `${course.name} ${ex.examType === "quiz1" ? "Quiz 1" : ex.examType === "quiz2" ? "Quiz 2" : "End Sem"} today! `;
    }

    notifications.push({
      tag: `daily-summary-${summaryDateStr}`,
      title: "InstiFlow \u2014 Good Morning \ud83d\udcda",
      body: summaryBody.trim() || "Have a great day!",
      scheduledAt: toISO(dailySummaryDate),
    });
  }

  // ── Exam alerts ──
  if (prefs.examRemindersEnabled) {
    let offsets: Array<{ days: number; label: string }> = [];
    if (prefs.examReminderTiming === "1d")
      offsets = [{ days: 1, label: "Exam Tomorrow \ud83d\udd34" }];
    else if (prefs.examReminderTiming === "3d")
      offsets = [{ days: 3, label: "Exam in 3 Days \u26a0\ufe0f" }];
    else if (prefs.examReminderTiming === "7d")
      offsets = [{ days: 7, label: "Exam in 1 Week \u23f0" }];
    else
      offsets = [
        { days: 7, label: "Exam in 1 Week \u23f0" },
        { days: 3, label: "Exam in 3 Days \u26a0\ufe0f" },
        { days: 1, label: "Exam Tomorrow \ud83d\udd34" },
      ];

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
      for (const { days, label } of offsets) {
        const alertTime = new Date(examDate);
        alertTime.setDate(alertTime.getDate() - days);
        alertTime.setHours(8, 0, 0, 0);
        if (alertTime > now) {
          notifications.push({
            tag: `exam-${ex.id}-${days}d`,
            title: `InstiFlow \u2014 ${label}`,
            body,
            scheduledAt: toISO(alertTime),
          });
        }
      }
    }
  }

  // ── Task alerts ──
  if (prefs.taskRemindersEnabled) {
    for (const t of tasks) {
      if (t.completed || !t.date) continue;
      const dueDate = new Date(`${t.date}T09:00:00`);

      if (
        prefs.taskReminderTiming === "2d" ||
        prefs.taskReminderTiming === "both"
      ) {
        const twoDaysBefore = new Date(dueDate);
        twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
        twoDaysBefore.setHours(8, 0, 0, 0);
        if (twoDaysBefore > now) {
          notifications.push({
            tag: `task-2d-${t.id}`,
            title: "InstiFlow \u2014 Task Due in 2 Days \ud83d\udccb",
            body: t.title,
            scheduledAt: toISO(twoDaysBefore),
          });
        }
      }

      if (
        prefs.taskReminderTiming === "1d" ||
        prefs.taskReminderTiming === "both"
      ) {
        const dayBefore = new Date(dueDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(8, 0, 0, 0);
        if (dayBefore > now) {
          notifications.push({
            tag: `task-before-${t.id}`,
            title: "InstiFlow \u2014 Task Due Tomorrow \ud83d\udccb",
            body: t.title,
            scheduledAt: toISO(dayBefore),
          });
        }
      }

      const dueDayAlert = new Date(dueDate);
      dueDayAlert.setHours(9, 0, 0, 0);
      if (dueDayAlert > now) {
        notifications.push({
          tag: `task-due-${t.id}`,
          title: "InstiFlow \u2014 Task Due Today \ud83d\udd14",
          body: t.title,
          scheduledAt: toISO(dueDayAlert),
        });
      }
    }
  }

  return notifications;
}

// In-app foreground notification popup
interface ForegroundNotif {
  id: string;
  title: string;
  body: string;
}

export function NotificationManager({
  courses,
  timetableEntries = [],
  attendance,
  tasks,
  examEntries = [],
}: Props) {
  const firedRef = useRef<Set<string>>(new Set());
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const [foregroundNotifs, setForegroundNotifs] = useState<ForegroundNotif[]>(
    [],
  );
  const prefsRef = useRef<NotifPrefs>(getNotifPrefs());

  // Re-read prefs when they change
  useEffect(() => {
    const handler = () => {
      prefsRef.current = getNotifPrefs();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const showForeground = (title: string, body: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setForegroundNotifs((prev) => [...prev, { id, title, body }]);
    setTimeout(
      () => setForegroundNotifs((prev) => prev.filter((n) => n.id !== id)),
      6000,
    );
  };

  const showNotification = (title: string, body: string) => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
    showForeground(title, body);
  };

  // Expose showNotification globally for test button
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional stable ref
  useEffect(() => {
    (window as any).__instiflowNotify = showNotification;
    return () => {
      (window as any).__instiflowNotify = undefined;
    };
  }, []);

  // Permission request + iOS banner
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => setPermission(p));
    }
    if (isIOS && !isStandalone && Notification.permission !== "granted") {
      setShowIOSBanner(true);
    }
  }, []);

  // Push schedule to SW
  useEffect(() => {
    if (permission !== "granted") return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const prefs = prefsRef.current;
    const schedule = buildSchedule(
      courses,
      timetableEntries,
      tasks,
      examEntries,
      prefs,
    );
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({
        type: "SCHEDULE_NOTIFICATIONS",
        notifications: schedule,
      });
    });
  }, [courses, timetableEntries, tasks, examEntries, permission]);

  // Class reminders based on user timing pref
  // biome-ignore lint/correctness/useExhaustiveDependencies: showForeground is stable
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (permission !== "granted") return;
    const prefs = prefsRef.current;
    if (!prefs.classRemindersEnabled) return;

    const now = new Date();
    const todayDayOfWeek = now.getDay();
    const iitmDay = todayDayOfWeek - 1;
    if (iitmDay < 0 || iitmDay > 4) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const reminderMinutes = prefs.classReminderMinutes;

    // Use timetableEntries if available
    const todayEntries = timetableEntries.filter((e) => e.day === iitmDay);
    const itemsToSchedule =
      todayEntries.length > 0
        ? todayEntries.map((e) => ({
            name: e.courseName,
            slot: e.slot,
            startTime: e.startTime,
            venue: e.venue,
            id: e.id,
          }))
        : courses.flatMap((course) => {
            const occs =
              course.slot === "EXTRA_6_8"
                ? [{ day: iitmDay, col: EXTRA_SLOT_COL_INDEX }]
                : (SLOT_OCCURRENCES[course.slot] ?? []);
            return occs
              .filter((o) => o.day === iitmDay)
              .map((occ) => {
                const col =
                  course.slot === "EXTRA_6_8"
                    ? EXTRA_SLOT_TIME
                    : TIME_COLUMNS[occ.col];
                return {
                  name: course.name,
                  slot: course.slot,
                  startTime: col.start,
                  venue: course.venue,
                  id: course.id,
                };
              });
          });

    for (const item of itemsToSchedule) {
      const [h, m] = item.startTime.split(":").map(Number);
      const classStart = new Date(now);
      classStart.setHours(h, m, 0, 0);
      const reminderTime = new Date(
        classStart.getTime() - reminderMinutes * 60 * 1000,
      );
      const msUntil = reminderTime.getTime() - now.getTime();

      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        const tag = `class-reminder-${item.id}-${item.startTime}`;
        const timer = setTimeout(() => {
          if (Notification.permission !== "granted") return;
          new Notification(
            `InstiFlow \u2014 Class in ${reminderMinutes} Minutes \ud83d\udd14`,
            {
              body: `${item.name} (Slot ${item.slot}) at ${item.startTime}${item.venue ? ` \u00b7 ${item.venue}` : ""}`,
              icon: "/icons/icon-192.png",
              tag,
            },
          );
          showForeground(
            `Class in ${reminderMinutes} min`,
            `${item.name} at ${item.startTime}`,
          );
        }, msUntil);
        timers.push(timer);
      }
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [courses, timetableEntries, permission]);

  // In-app foreground polling (7am checks, attendance, tasks)
  // biome-ignore lint/correctness/useExhaustiveDependencies: showNotification is stable
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const prefs = prefsRef.current;
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const today = now.toISOString().split("T")[0];
      const todayDay = now.getDay();
      const iitmDay = todayDay - 1;

      const [sumH, sumM] = prefs.dailySummaryTime.split(":").map(Number);
      if (prefs.dailySummaryEnabled && h === sumH && m < sumM + 5) {
        const todayEntries = timetableEntries.filter((e) => e.day === iitmDay);
        const items =
          todayEntries.length > 0
            ? todayEntries
            : iitmDay >= 0 && iitmDay <= 4
              ? courses.filter((c) => {
                  const occs =
                    c.slot === "EXTRA_6_8"
                      ? [{ day: iitmDay }]
                      : (SLOT_OCCURRENCES[c.slot] ?? []);
                  return occs.some((o) => o.day === iitmDay);
                })
              : [];

        for (const item of items) {
          const name = (item as any).courseName ?? (item as any).name;
          const slot = (item as any).slot;
          const key = `class-${today}-${(item as any).courseId ?? (item as any).id}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            showNotification(
              "InstiFlow \u2014 Class Today \ud83d\udcda",
              `${name} (Slot ${slot})`,
            );
          }
        }

        for (const c of courses) {
          const stats = calcAttendance(attendance, c.id);
          if (stats.percentage < 75 && stats.total > 0) {
            const key = `attn-warn-${today}-${c.id}`;
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              showNotification(
                "InstiFlow \u2014 Attendance Warning \u26a0\ufe0f",
                `${c.name}: ${stats.percentage}% (need ${stats.toReach75} more classes)`,
              );
            }
          }
        }
      }

      if (prefs.taskRemindersEnabled) {
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
              showNotification(
                `InstiFlow \u2014 Task ${label} \ud83d\udccb`,
                t.title,
              );
            }
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [courses, timetableEntries, attendance, tasks]);

  return (
    <>
      {/* Foreground notification popups (glass UI) */}
      <div
        style={{
          position: "fixed",
          top: 80,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
          maxWidth: 320,
        }}
      >
        <AnimatePresence>
          {foregroundNotifs.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              style={{
                background: "rgba(10, 10, 28, 0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: 14,
                border: "1px solid rgba(139,92,246,0.35)",
                padding: "12px 16px",
                boxShadow:
                  "0 8px 32px rgba(99,102,241,0.2), 0 2px 8px rgba(0,0,0,0.4)",
                pointerEvents: "auto",
              }}
              data-ocid="notifications.toast"
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>
                  \ud83d\udd14
                </span>
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
                    {notif.title}
                  </p>
                  <p
                    style={{
                      color: "rgba(160, 170, 220, 0.8)",
                      fontSize: 12,
                      margin: "3px 0 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {notif.body}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
                <span style={{ fontSize: 22, lineHeight: 1.2 }}>
                  \ud83d\udcf1
                </span>
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
                      Share \u2b06
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
                  \u00d7
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
