import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { SemSettings } from "../types";
import { autoDetectSem } from "../utils/semester";

interface NotifPrefs {
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  examRemindersEnabled: boolean;
  taskRemindersEnabled: boolean;
  customReminders: Array<{
    id: string;
    date: string;
    time: string;
    description: string;
  }>;
}

const DEFAULT_PREFS: NotifPrefs = {
  dailySummaryEnabled: true,
  dailySummaryTime: "07:00",
  examRemindersEnabled: true,
  taskRemindersEnabled: true,
  customReminders: [],
};

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
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [savedMsg, setSavedMsg] = useState(false);
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
              <option value="even">Even (Jan–May)</option>
              <option value="odd">Odd (Jul–Nov)</option>
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
            ↺ Reset to auto-detect
          </motion.button>
        )}
      </GlassCard>

      {/* ── Notifications ── */}
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
            🔔 Notifications
          </div>
          {savedMsg && (
            <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
              Saved!
            </span>
          )}
        </div>

        {/* Daily Summary */}
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
              Daily Class Summary
            </div>
            <div style={{ fontSize: 11, color: "#6B7590" }}>
              Morning summary of today's classes, tasks & exams
            </div>
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
              checked={notifPrefs.dailySummaryEnabled}
              onChange={(e) =>
                updatePrefs({ dailySummaryEnabled: e.target.checked })
              }
              style={{ accentColor: "#a78bfa", width: 16, height: 16 }}
            />
          </label>
        </div>
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
              Notification Time
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

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            margin: "4px 0 14px",
          }}
        />

        {/* Exam Reminders */}
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
              Exam Reminders
            </div>
            <div style={{ fontSize: 11, color: "#6B7590" }}>
              Alerts 1 week, 3 days, 1 day before exams
            </div>
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
              checked={notifPrefs.examRemindersEnabled}
              onChange={(e) =>
                updatePrefs({ examRemindersEnabled: e.target.checked })
              }
              style={{ accentColor: "#a78bfa", width: 16, height: 16 }}
            />
          </label>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            margin: "4px 0 14px",
          }}
        />

        {/* Task Reminders */}
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
              Task Reminders
            </div>
            <div style={{ fontSize: 11, color: "#6B7590" }}>
              Alerts 2 days, 1 day, and on due date for tasks
            </div>
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
              checked={notifPrefs.taskRemindersEnabled}
              onChange={(e) =>
                updatePrefs({ taskRemindersEnabled: e.target.checked })
              }
              style={{ accentColor: "#a78bfa", width: 16, height: 16 }}
            />
          </label>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            margin: "4px 0 14px",
          }}
        />

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
                ×
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
          <span style={{ color: "#a78bfa", fontWeight: 700 }}>BHARATH</span> ·
          BE24
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
