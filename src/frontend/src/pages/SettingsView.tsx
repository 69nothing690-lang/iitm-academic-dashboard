import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { SemSettings } from "../types";
import { DEFAULT_NOTIF_PREFS, type NotifPrefs } from "../utils/notifPrefs";
import { autoDetectSem } from "../utils/semester";

interface Props {
  semSettings: SemSettings;
  onUpdateSem: (s: SemSettings) => void;
  studentName: string;
  onUpdateName: (n: string) => void;
}

export function SettingsView({
  semSettings,
  onUpdateSem,
  studentName,
  onUpdateName,
}: Props) {
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => {
    try {
      const saved = localStorage.getItem("instiflow_notif_prefs");
      return saved
        ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(saved) }
        : DEFAULT_NOTIF_PREFS;
    } catch {
      return DEFAULT_NOTIF_PREFS;
    }
  });
  const [savedMsg, setSavedMsg] = useState(false);
  const [testNotifMsg, setTestNotifMsg] = useState("");
  const [crDate, setCrDate] = useState("");
  const [crTime, setCrTime] = useState("08:00");
  const [crDesc, setCrDesc] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem("instiflow_notif_prefs", JSON.stringify(notifPrefs));
  }, [notifPrefs]);

  const updatePrefs = (patch: Partial<NotifPrefs>) => {
    setNotifPrefs((p) => ({ ...p, ...patch }));
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedMsg(true);
    savedTimer.current = setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleTestNotification = async () => {
    if (typeof Notification === "undefined") {
      setTestNotifMsg("\u274c Notifications not supported in this browser.");
      return;
    }
    if (Notification.permission === "denied") {
      setTestNotifMsg(
        "\u274c Notification permission denied. Please enable in browser settings.",
      );
      return;
    }
    const initialPerm = Notification.permission;
    let perm: NotificationPermission = initialPerm;
    if (initialPerm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm === "granted") {
      new Notification("Test Notification", {
        body: "InstiFlow is working",
        icon: "/icons/icon-192.png",
      });
      setTestNotifMsg("\u2705 Test notification sent!");
    } else {
      setTestNotifMsg("\u274c Permission not granted.");
    }
    setTimeout(() => setTestNotifMsg(""), 3000);
  };

  const addCustomReminder = () => {
    if (!crDate || !crTime) return;
    const reminder = {
      id: Date.now().toString(),
      date: crDate,
      time: crTime,
      description: crDesc.trim(),
    };
    updatePrefs({ customReminders: [...notifPrefs.customReminders, reminder] });
    setCrDate("");
    setCrTime("08:00");
    setCrDesc("");
  };

  const deleteCustomReminder = (id: string) => {
    updatePrefs({
      customReminders: notifPrefs.customReminders.filter((r) => r.id !== id),
    });
  };

  const clearAll = () => {
    if (
      confirm(
        "Are you sure? This will delete ALL your courses, attendance, tasks, and settings.",
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const resetToAutoDetect = () => {
    onUpdateSem({
      year: new Date().getFullYear(),
      semType: autoDetectSem(),
      overridden: false,
    });
  };

  const ToggleRow = ({
    label,
    subtitle,
    checked,
    onChange,
  }: {
    label: string;
    subtitle?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#D0D6F0", fontWeight: 600 }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: "#6B7590" }}>{subtitle}</div>
        )}
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          marginLeft: 12,
        }}
      >
        <input
          data-ocid="settings.toggle"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "#a78bfa", width: 16, height: 16 }}
        />
      </label>
    </div>
  );

  const Divider = () => (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        margin: "4px 0 14px",
      }}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px", maxWidth: 500 }}
    >
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
          color: "#F2F4FF",
        }}
      >
        Settings
      </h2>

      {/* Profile */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "#606880",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Profile
        </div>
        <label
          htmlFor="student-name"
          style={{
            fontSize: 13,
            color: "#A9B0C7",
            display: "block",
            marginBottom: 6,
          }}
        >
          Your Name
        </label>
        <input
          id="student-name"
          data-ocid="settings.input"
          className="glass-input"
          value={studentName}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder="Your name"
        />
      </GlassCard>

      {/* Semester Settings */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "#606880",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Semester Settings
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              htmlFor="sem-type"
              style={{
                fontSize: 13,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 6,
              }}
            >
              Semester Type
            </label>
            <select
              id="sem-type"
              data-ocid="settings.select"
              className="glass-input"
              value={semSettings.semType}
              onChange={(e) =>
                onUpdateSem({
                  ...semSettings,
                  semType: e.target.value as "even" | "odd",
                  overridden: true,
                })
              }
            >
              <option value="even">Even (Jan\u2013May)</option>
              <option value="odd">Odd (Jul\u2013Nov)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="sem-year"
              style={{
                fontSize: 13,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 6,
              }}
            >
              Year
            </label>
            <input
              id="sem-year"
              className="glass-input"
              type="number"
              value={semSettings.year}
              onChange={(e) =>
                onUpdateSem({
                  ...semSettings,
                  year:
                    Number.parseInt(e.target.value) || new Date().getFullYear(),
                  overridden: true,
                })
              }
            />
          </div>
        </div>
        {semSettings.overridden && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={resetToAutoDetect}
            style={{
              background: "none",
              border: "none",
              color: "#6366f1",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            \u21ba Reset to auto-detect
          </motion.button>
        )}
      </GlassCard>

      {/* Notifications */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#606880",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}
          >
            \ud83d\udd14 Notifications
          </div>
          {savedMsg && (
            <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
              Saved!
            </span>
          )}
        </div>

        {/* Test Notification Button */}
        <div style={{ marginBottom: 16 }}>
          <motion.button
            data-ocid="settings.submit_button"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            className="btn-gradient"
            style={{
              padding: "10px 20px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={handleTestNotification}
          >
            \ud83d\udd14 Test Notification
          </motion.button>
          {testNotifMsg && (
            <div
              style={{
                fontSize: 12,
                color: testNotifMsg.startsWith("\u2705")
                  ? "#4ade80"
                  : "rgba(255,122,89,0.9)",
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              {testNotifMsg}
            </div>
          )}
        </div>

        <Divider />

        {/* Class Reminders */}
        <ToggleRow
          label="Class Reminders"
          subtitle="Get a notification before each class starts"
          checked={notifPrefs.classRemindersEnabled}
          onChange={(v) => updatePrefs({ classRemindersEnabled: v })}
        />
        {notifPrefs.classRemindersEnabled && (
          <div style={{ marginBottom: 14, paddingLeft: 4 }}>
            <span
              style={{
                fontSize: 12,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 6,
              }}
            >
              Remind me before class:
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([5, 10, 15, 30] as const).map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => updatePrefs({ classReminderMinutes: min })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border:
                      notifPrefs.classReminderMinutes === min
                        ? "1.5px solid #a78bfa"
                        : "1px solid rgba(255,255,255,0.1)",
                    background:
                      notifPrefs.classReminderMinutes === min
                        ? "rgba(167,139,250,0.2)"
                        : "rgba(255,255,255,0.04)",
                    color:
                      notifPrefs.classReminderMinutes === min
                        ? "#c4b5fd"
                        : "#6B7590",
                    fontSize: 12,
                    fontWeight:
                      notifPrefs.classReminderMinutes === min ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>
        )}

        <Divider />

        {/* Daily Summary */}
        <ToggleRow
          label="Daily Class Summary"
          subtitle="Morning summary of today\u2019s classes, tasks & exams"
          checked={notifPrefs.dailySummaryEnabled}
          onChange={(v) => updatePrefs({ dailySummaryEnabled: v })}
        />
        {notifPrefs.dailySummaryEnabled && (
          <div style={{ marginBottom: 14, paddingLeft: 4 }}>
            <label
              htmlFor="daily-summary-time"
              style={{
                fontSize: 12,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 4,
              }}
            >
              Daily Summary Time
            </label>
            <input
              id="daily-summary-time"
              data-ocid="settings.input"
              className="glass-input"
              type="time"
              value={notifPrefs.dailySummaryTime}
              onChange={(e) =>
                updatePrefs({ dailySummaryTime: e.target.value })
              }
              style={{ width: "auto", minWidth: 120 }}
            />
          </div>
        )}

        <Divider />

        {/* Exam Reminders */}
        <ToggleRow
          label="Exam Reminders"
          subtitle="Alerts before upcoming exams"
          checked={notifPrefs.examRemindersEnabled}
          onChange={(v) => updatePrefs({ examRemindersEnabled: v })}
        />
        {notifPrefs.examRemindersEnabled && (
          <div style={{ marginBottom: 14, paddingLeft: 4 }}>
            <span
              style={{
                fontSize: 12,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 6,
              }}
            >
              Exam reminder timing:
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["1d", "3d", "7d", "all"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updatePrefs({ examReminderTiming: opt })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border:
                      notifPrefs.examReminderTiming === opt
                        ? "1.5px solid #a78bfa"
                        : "1px solid rgba(255,255,255,0.1)",
                    background:
                      notifPrefs.examReminderTiming === opt
                        ? "rgba(167,139,250,0.2)"
                        : "rgba(255,255,255,0.04)",
                    color:
                      notifPrefs.examReminderTiming === opt
                        ? "#c4b5fd"
                        : "#6B7590",
                    fontSize: 12,
                    fontWeight:
                      notifPrefs.examReminderTiming === opt ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {opt === "1d"
                    ? "1 day"
                    : opt === "3d"
                      ? "3 days"
                      : opt === "7d"
                        ? "1 week"
                        : "All (1w, 3d, 1d)"}
                </button>
              ))}
            </div>
          </div>
        )}

        <Divider />

        {/* Task Reminders */}
        <ToggleRow
          label="Task Reminders"
          subtitle="Alerts before task due dates"
          checked={notifPrefs.taskRemindersEnabled}
          onChange={(v) => updatePrefs({ taskRemindersEnabled: v })}
        />
        {notifPrefs.taskRemindersEnabled && (
          <div style={{ marginBottom: 14, paddingLeft: 4 }}>
            <span
              style={{
                fontSize: 12,
                color: "#A9B0C7",
                display: "block",
                marginBottom: 6,
              }}
            >
              Task reminder timing:
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["1d", "2d", "both"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updatePrefs({ taskReminderTiming: opt })}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border:
                      notifPrefs.taskReminderTiming === opt
                        ? "1.5px solid #a78bfa"
                        : "1px solid rgba(255,255,255,0.1)",
                    background:
                      notifPrefs.taskReminderTiming === opt
                        ? "rgba(167,139,250,0.2)"
                        : "rgba(255,255,255,0.04)",
                    color:
                      notifPrefs.taskReminderTiming === opt
                        ? "#c4b5fd"
                        : "#6B7590",
                    fontSize: 12,
                    fontWeight:
                      notifPrefs.taskReminderTiming === opt ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {opt === "1d"
                    ? "1 day before"
                    : opt === "2d"
                      ? "2 days before"
                      : "Both (2d & 1d)"}
                </button>
              ))}
            </div>
          </div>
        )}

        <Divider />

        {/* Custom Reminders */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 13,
              color: "#D0D6F0",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Custom Reminders
          </div>
          <div style={{ fontSize: 11, color: "#6B7590", marginBottom: 12 }}>
            Set a specific date and time reminder
          </div>
          {notifPrefs.customReminders.map((cr) => (
            <div
              key={cr.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "rgba(167,139,250,0.07)",
                border: "1px solid rgba(167,139,250,0.18)",
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 600 }}
                >
                  {cr.date} at {cr.time}
                </div>
                {cr.description && (
                  <div style={{ fontSize: 11, color: "#8A94B0" }}>
                    {cr.description}
                  </div>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => deleteCustomReminder(cr.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e05555",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                \u00d7
              </motion.button>
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                data-ocid="settings.input"
                className="glass-input"
                type="date"
                value={crDate}
                onChange={(e) => setCrDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="glass-input"
                type="time"
                value={crTime}
                onChange={(e) => setCrTime(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <input
              className="glass-input"
              placeholder="Reminder description (optional)"
              value={crDesc}
              onChange={(e) => setCrDesc(e.target.value)}
            />
            <motion.button
              data-ocid="settings.submit_button"
              whileTap={{ scale: 0.97 }}
              className="btn-gradient"
              style={{ padding: "9px 18px", fontSize: 13 }}
              onClick={addCustomReminder}
            >
              + Add Reminder
            </motion.button>
          </div>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard style={{ borderColor: "rgba(255,122,89,0.3)" }}>
        <div
          style={{
            fontSize: 11,
            color: "#FF7A59",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Danger Zone
        </div>
        <motion.button
          data-ocid="settings.delete_button"
          whileTap={{ scale: 0.97 }}
          className="glass-btn glass-btn-red"
          onClick={clearAll}
        >
          Clear All Data
        </motion.button>
      </GlassCard>

      {/* Footer branding */}
      <div style={{ marginTop: 32, textAlign: "center", padding: "16px 0" }}>
        <div
          style={{
            fontSize: 12,
            color: "#4A5270",
            fontWeight: 500,
            letterSpacing: "0.05em",
          }}
        >
          Created by{" "}
          <span style={{ color: "#a78bfa", fontWeight: 700 }}>BHARATH</span>{" "}
          \u00b7 BE24
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#3A4060",
            marginTop: 4,
            letterSpacing: "0.08em",
          }}
        >
          POWERED BY{" "}
          <span
            style={{
              color: "#818cf8",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            IITM BAZAAR
          </span>
        </div>
      </div>
    </motion.div>
  );
}
