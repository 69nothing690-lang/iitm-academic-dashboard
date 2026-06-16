import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  getFCMToken,
  requestNotificationPermissionAndToken,
  setupForegroundNotifications,
} from "../lib/fcm";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
  TimetableEntry,
} from "../types";
import { cleanText } from "../utils/cleanText";
import { type NotifPrefs, getNotifPrefs } from "../utils/notifPrefs";
import { playNotificationChime } from "../utils/notificationSound";
import {
  EXTRA_SLOT_COL_INDEX,
  EXTRA_SLOT_TIME,
  SLOT_OCCURRENCES,
  TIME_COLUMNS,
  calcTotalClassHours,
  getClassesOnDayFromEntries,
  isLabSlot,
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

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
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

  // ── Class reminders for today AND tomorrow (so SW persists overnight reminders) ──
  if (prefs.classRemindersEnabled) {
    const reminderMinutes = prefs.classReminderMinutes ?? 10;
    // Schedule for today and tomorrow
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ...6=Sat
      const iitmDay = targetDayOfWeek - 1; // 0=Mon...4=Fri
      if (iitmDay < 0 || iitmDay > 4) continue; // Skip weekends

      const targetDateStr = targetDate.toISOString().split("T")[0];

      const todayEntries = timetableEntries.filter(
        (e) => e.day === iitmDay && e.slot !== "LUNCH",
      );
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
        const classStart = new Date(targetDate);
        classStart.setHours(h, m, 0, 0);
        const reminderTime = new Date(
          classStart.getTime() - reminderMinutes * 60 * 1000,
        );

        if (reminderTime <= now) continue; // Already past

        const tag = `class-${targetDateStr}-${item.slot}-${item.startTime}`;
        const timeStr = formatTime12(item.startTime);
        const bodyText = item.venue
          ? `${item.name} at ${timeStr}\n${item.venue}`
          : `${item.name} at ${timeStr}`;
        const slotLabel = isLabSlot(item.slot)
          ? `Lab Slot ${item.slot}`
          : item.slot === "EXTRA_6_8"
            ? "Extra Slot"
            : `Slot ${item.slot}`;

        notifications.push({
          tag,
          title: `Upcoming Class — ${slotLabel}`,
          body: bodyText,
          scheduledAt: toISO(reminderTime),
        });
      }
    }
  }

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

    const summaryLines: string[] = [];
    const seenCodes = new Set<string>();

    if (timetableEntries.length > 0) {
      const dayEntries = timetableEntries
        .filter((e) => e.day === iitmDay && e.slot !== "LUNCH")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (const e of dayEntries) {
        const key = `${e.courseCode || e.courseId}-${e.startTime}`;
        if (seenCodes.has(key)) continue;
        seenCodes.add(key);
        const timeStr = formatTime12(e.startTime);
        const venuePart = e.venue ? ` (${e.venue})` : " (No venue)";
        summaryLines.push(`• ${e.courseName} – ${timeStr}${venuePart}`);
      }
    } else if (iitmDay >= 0 && iitmDay <= 4) {
      for (const c of courses) {
        const occs =
          c.slot === "EXTRA_6_8"
            ? [{ day: iitmDay, col: EXTRA_SLOT_COL_INDEX }]
            : (SLOT_OCCURRENCES[c.slot] ?? []);
        if (occs.some((o) => o.day === iitmDay)) {
          const occ = occs.find((o) => o.day === iitmDay);
          const col = occ
            ? c.slot === "EXTRA_6_8"
              ? EXTRA_SLOT_TIME
              : TIME_COLUMNS[occ.col]
            : null;
          const timeStr = col ? formatTime12(col.start) : "";
          const venuePart = c.venue ? ` (${c.venue})` : "";
          summaryLines.push(`• ${c.name} – ${timeStr}${venuePart}`);
        }
      }
    }

    // Calculate total hours for summary
    const dayClassInfos =
      timetableEntries.length > 0
        ? getClassesOnDayFromEntries(iitmDay + 1, timetableEntries)
        : [];
    const { formatted: totalFormatted } = calcTotalClassHours(dayClassInfos);

    const classCount = summaryLines.length;
    let summaryBody = "";
    if (classCount > 0) {
      summaryBody = `You have ${classCount} class${classCount !== 1 ? "es" : ""} today (${totalFormatted})\n\n${summaryLines.join("\n")}`;
    } else {
      summaryBody = "No classes today. Have a great day!";
    }

    notifications.push({
      tag: `daily-summary-${summaryDateStr}`,
      title: "Today's Schedule — InstiFlow",
      body: summaryBody.trim(),
      scheduledAt: toISO(dailySummaryDate),
    });
  }

  // ── Exam alerts ──
  if (prefs.examRemindersEnabled) {
    let offsets: Array<{ days: number; label: string }> = [];
    if (prefs.examReminderTiming === "1d")
      offsets = [{ days: 1, label: "Exam Tomorrow" }];
    else if (prefs.examReminderTiming === "3d")
      offsets = [{ days: 3, label: "Exam in 3 Days" }];
    else if (prefs.examReminderTiming === "7d")
      offsets = [{ days: 7, label: "Exam in 1 Week" }];
    else
      offsets = [
        { days: 7, label: "Exam in 1 Week" },
        { days: 3, label: "Exam in 3 Days" },
        { days: 1, label: "Exam Tomorrow" },
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
            title: `InstiFlow — ${label}`,
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
            title: "InstiFlow — Task Due in 2 Days",
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
            title: "InstiFlow — Task Due Tomorrow",
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
          title: "InstiFlow — Task Due Today",
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
    setForegroundNotifs((prev) => [
      ...prev,
      { id, title: cleanText(title), body: cleanText(body) },
    ]);
    setTimeout(
      () => setForegroundNotifs((prev) => prev.filter((n) => n.id !== id)),
      6000,
    );
  };

  const showNotification = (title: string, body: string, tag?: string) => {
    const cleanTitle = cleanText(title);
    const cleanBody = cleanText(body);

    // Play chime sound
    playNotificationChime();

    // Vibrate on mobile (200ms, pause 100ms, 200ms)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignore if not supported
      }
    }

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification(cleanTitle, {
        body: cleanBody,
        icon: "/icons/icon-192.png",
        tag: tag,
      });
    }
    showForeground(cleanTitle, cleanBody);
  };

  // Expose showNotification globally for test button
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional stable ref
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__instiflowNotify =
      showNotification;
    return () => {
      (window as unknown as Record<string, unknown>).__instiflowNotify =
        undefined;
    };
  }, []);

  // Permission request + FCM token + iOS banner + periodic sync
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    const init = async () => {
      const token = await requestNotificationPermissionAndToken();
      if (token) {
        setPermission("granted");
        // Register periodic background sync for more reliable Android delivery
        try {
          const reg = await navigator.serviceWorker.ready;
          if ("periodicSync" in reg) {
            await (
              reg as unknown as {
                periodicSync: {
                  register: (
                    tag: string,
                    opts: { minInterval: number },
                  ) => Promise<void>;
                };
              }
            ).periodicSync.register("check-notifications", {
              minInterval: 60 * 1000,
            });
          }
        } catch {
          // Periodic sync not supported or permission denied — that's fine
        }
      } else if (Notification.permission !== "denied") {
        // Fallback: still try plain token fetch if already granted elsewhere
        if (Notification.permission === "granted") {
          getFCMToken().catch((e) =>
            console.warn("[FCM] Token fetch failed:", e),
          );
          setPermission("granted");
        }
      }
    };

    init();

    if (isIOS && !isStandalone && Notification.permission !== "granted") {
      setShowIOSBanner(true);
    }
  }, []);

  // Set up FCM foreground message listener
  // biome-ignore lint/correctness/useExhaustiveDependencies: showForeground is stable
  useEffect(() => {
    const unsubscribe = setupForegroundNotifications((payload) => {
      const title = payload.notification?.title ?? "InstiFlow";
      const body = payload.notification?.body ?? "";
      playNotificationChime();
      showForeground(title, body);
    });
    return unsubscribe;
  }, []);

  // Push schedule to SW — also refreshes on page visibility (re-open)
  useEffect(() => {
    if (permission !== "granted") return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const sendSchedule = async () => {
      const prefs = prefsRef.current;
      const schedule = buildSchedule(
        courses,
        timetableEntries,
        tasks,
        examEntries,
        prefs,
      );

      const message = {
        type: "SCHEDULE_NOTIFICATIONS",
        notifications: schedule,
      };

      try {
        // Try the active controller first (most direct path)
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(message);
        }

        // Also post to the ready SW (covers cases where controller differs)
        let reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("SW ready timeout")), 5000),
          ),
        ]);
        // If the ready SW is not the FCM one, try to get it explicitly
        if (!reg.active) {
          const existing = await navigator.serviceWorker.getRegistration(
            "/firebase-messaging-sw.js",
          );
          if (existing?.active) reg = existing;
        }
        if (reg.active) {
          reg.active.postMessage(message);
        }
      } catch (err) {
        console.warn("[Notif] Failed to post schedule to SW:", err);
        // Fallback: try all registrations
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            if (r.active) {
              r.active.postMessage(message);
            }
          }
        } catch (fallbackErr) {
          console.warn("[Notif] SW schedule fallback failed:", fallbackErr);
        }
      }
    };

    sendSchedule();

    // Re-send schedule every time the page becomes visible (user switches back to tab)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendSchedule();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [courses, timetableEntries, tasks, examEntries, permission]);

  // Class reminders — uses prefs.classReminderMinutes (default 10)
  // biome-ignore lint/correctness/useExhaustiveDependencies: showNotification is stable
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
    // Use user-configured reminder minutes (default 10)
    const reminderMinutes = prefs.classReminderMinutes ?? 10;

    // Use timetableEntries if available
    const todayEntries = timetableEntries.filter(
      (e) => e.day === iitmDay && e.slot !== "LUNCH",
    );
    const itemsToSchedule =
      todayEntries.length > 0
        ? todayEntries.map((e) => ({
            name: e.courseName,
            slot: e.slot,
            startTime: e.startTime,
            venue: e.venue,
            id: e.id,
            day: e.day,
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
                  day: iitmDay,
                };
              });
          });

    const todayDateStr = now.toISOString().split("T")[0];

    for (const item of itemsToSchedule) {
      const [h, m] = item.startTime.split(":").map(Number);
      const classStart = new Date(now);
      classStart.setHours(h, m, 0, 0);
      const reminderTime = new Date(
        classStart.getTime() - reminderMinutes * 60 * 1000,
      );
      const msUntil = reminderTime.getTime() - now.getTime();

      // Deduplication key: class-[date]-[slot]-[startTime]
      const dedupKey = `class-${todayDateStr}-${item.slot}-${item.startTime}`;

      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        if (firedRef.current.has(dedupKey)) continue;

        const timeStr = formatTime12(item.startTime);
        // Format: "CourseName at HH:MM AM/PM\nVenue"
        const bodyText = item.venue
          ? `${item.name} at ${timeStr}\n${item.venue}`
          : `${item.name} at ${timeStr}`;

        // For lab slots show proper label
        const slotLabel = isLabSlot(item.slot)
          ? `Lab Slot ${item.slot}`
          : item.slot === "EXTRA_6_8"
            ? "Extra Slot"
            : `Slot ${item.slot}`;

        const timer = setTimeout(() => {
          if (Notification.permission !== "granted") return;
          if (firedRef.current.has(dedupKey)) return;
          firedRef.current.add(dedupKey);
          showNotification(`Upcoming Class — ${slotLabel}`, bodyText, dedupKey);
        }, msUntil);
        timers.push(timer);
      }
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [courses, timetableEntries, permission]);

  // In-app foreground polling (daily summary, task reminders)
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
        const summaryKey = `daily-summary-${today}`;
        if (!firedRef.current.has(summaryKey)) {
          firedRef.current.add(summaryKey);
          const todayEntries = timetableEntries.filter(
            (e) => e.day === iitmDay && e.slot !== "LUNCH",
          );
          const summaryLines: string[] = [];
          const seenKeys = new Set<string>();

          if (todayEntries.length > 0) {
            const sorted = [...todayEntries].sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            );
            for (const e of sorted) {
              const key = `${e.courseCode || e.courseId}-${e.startTime}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);
              const timeStr = formatTime12(e.startTime);
              const venuePart = e.venue ? ` (${e.venue})` : " (No venue)";
              summaryLines.push(`• ${e.courseName} – ${timeStr}${venuePart}`);
            }
          } else if (iitmDay >= 0 && iitmDay <= 4) {
            for (const c of courses) {
              const occs =
                c.slot === "EXTRA_6_8"
                  ? [{ day: iitmDay }]
                  : (SLOT_OCCURRENCES[c.slot] ?? []);
              if (occs.some((o) => o.day === iitmDay)) {
                summaryLines.push(`• ${c.name}`);
              }
            }
          }

          // Calculate total hours
          const dayClassInfos =
            todayEntries.length > 0
              ? getClassesOnDayFromEntries(todayDay, timetableEntries)
              : [];
          const { formatted: totalFormatted } =
            calcTotalClassHours(dayClassInfos);

          const classCount = summaryLines.length;
          const summaryBody =
            classCount > 0
              ? `You have ${classCount} class${classCount !== 1 ? "es" : ""} today (${totalFormatted})\n\n${summaryLines.join("\n")}`
              : "No classes today. Have a great day!";

          showNotification("Today's Schedule — InstiFlow", summaryBody);
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
              showNotification(`InstiFlow — Task ${label}`, t.title);
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
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>🔔</span>
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
                      whiteSpace: "pre-line",
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
                      Share ⬆
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
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
