import { motion } from "motion/react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { SemSettings } from "../types";
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
  const [notifPrefs, setNotifPrefs] = useState<Record<string, unknown>>(() => {
    try {
      return JSON.parse(localStorage.getItem("instiflow_notif_prefs") ?? "{}");
    } catch {
      return {};
    }
  });
  const saveNotifPrefs = (prefs: Record<string, unknown>) => {
    setNotifPrefs(prefs);
    localStorage.setItem("instiflow_notif_prefs", JSON.stringify(prefs));
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
          Notifications
        </div>
        {[
          {
            key: "dailySummary",
            label: "Daily Morning Summary",
            desc: "7 AM class & task summary",
          },
          {
            key: "examAlerts",
            label: "Exam Alerts",
            desc: "1 week, 3 days, 1 day before exams",
          },
          {
            key: "taskReminders",
            label: "Task Reminders",
            desc: "1 day before & on due date",
          },
        ].map(({ key, label, desc }) => {
          const isOn = notifPrefs[key] !== false;
          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 13, color: "#F0F4FF", fontWeight: 600 }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 12, color: "#6B7590", marginTop: 2 }}>
                  {desc}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => saveNotifPrefs({ ...notifPrefs, [key]: !isOn })}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: isOn
                    ? "linear-gradient(90deg, #a78bfa, #60a5fa)"
                    : "rgba(255,255,255,0.07)",
                  color: isOn ? "#fff" : "#6B7590",
                  transition: "all 0.2s",
                }}
              >
                {isOn ? "ON" : "OFF"}
              </motion.button>
            </div>
          );
        })}
        <div style={{ marginTop: 14 }}>
          <label
            htmlFor="summary-time"
            style={{
              fontSize: 13,
              color: "#A9B0C7",
              display: "block",
              marginBottom: 6,
            }}
          >
            Daily Summary Time
          </label>
          <input
            type="time"
            className="glass-input"
            value={(notifPrefs.summaryTime as string) ?? "07:00"}
            onChange={(e) =>
              saveNotifPrefs({ ...notifPrefs, summaryTime: e.target.value })
            }
            style={{ maxWidth: 160 }}
          />
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

      <div
        style={{
          marginTop: 32,
          textAlign: "center",
          padding: "16px 0",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 4,
          }}
        >
          Created by BHARATH — BE24
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#3D4460",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Powered by IITM BAZAAR
        </div>
      </div>
    </motion.div>
  );
}
