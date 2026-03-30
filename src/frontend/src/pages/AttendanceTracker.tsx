import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { ProgressBar } from "../components/ProgressBar";
import type { AttendanceRecord, Course } from "../types";
import { calcAttendance } from "../utils/attendance";
import { getSlotColor } from "../utils/slots";

interface Props {
  courses: Course[];
  attendance: AttendanceRecord[];
  onAddAttendance: (r: AttendanceRecord) => void;
  onUpdateAttendance: (
    id: string,
    status: "attended" | "absent" | "cancelled",
  ) => void;
  onDeleteAttendance: (id: string) => void;
}

interface ManualBase {
  attended: number;
  total: number;
}

function getManualBase(courseId: string): ManualBase | null {
  try {
    return JSON.parse(
      localStorage.getItem(`instiflow_manual_base_${courseId}`) || "null",
    );
  } catch {
    return null;
  }
}

function saveManualBase(courseId: string, base: ManualBase) {
  localStorage.setItem(
    `instiflow_manual_base_${courseId}`,
    JSON.stringify(base),
  );
}

function clearManualBase(courseId: string) {
  localStorage.removeItem(`instiflow_manual_base_${courseId}`);
}

export function AttendanceTracker({
  courses,
  attendance,
  onAddAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addPastOpen, setAddPastOpen] = useState<string | null>(null);
  const [pastDate, setPastDate] = useState("");
  const [pastStatus, setPastStatus] = useState<
    "attended" | "absent" | "cancelled"
  >("attended");

  // Manual entry state per course
  const [manualOpen, setManualOpen] = useState<string | null>(null);
  const [manualAttended, setManualAttended] = useState<Record<string, string>>(
    {},
  );
  const [manualTotal, setManualTotal] = useState<Record<string, string>>({});
  // force re-render when manual base changes
  const [manualBaseVersion, setManualBaseVersion] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const markAttendance = (
    courseId: string,
    status: "attended" | "absent" | "cancelled",
    date: string = today,
  ) => {
    onAddAttendance({
      id: Date.now().toString(),
      courseId,
      date,
      status,
    });
  };

  const handleAddPast = (courseId: string) => {
    if (!pastDate) return;
    markAttendance(courseId, pastStatus, pastDate);
    setPastDate("");
    setPastStatus("attended");
    setAddPastOpen(null);
  };

  const handleSaveManualBase = (courseId: string) => {
    const a = Number.parseInt(manualAttended[courseId] || "0", 10);
    const t = Number.parseInt(manualTotal[courseId] || "0", 10);
    if (Number.isNaN(a) || Number.isNaN(t) || t < 0 || a < 0) return;
    saveManualBase(courseId, { attended: a, total: t });
    setManualBaseVersion((v) => v + 1);
  };

  const handleClearManualBase = (courseId: string) => {
    clearManualBase(courseId);
    setManualBaseVersion((v) => v + 1);
  };

  const statusColor = (s: string) =>
    s === "attended"
      ? "#6366f1"
      : s === "absent"
        ? "rgba(255,122,89,0.85)"
        : "rgba(242,201,76,0.85)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px" }}
    >
      <h2
        className="page-heading-gradient"
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        Attendance Tracker
      </h2>
      <p style={{ fontSize: 13, color: "#6B7590", marginBottom: 24 }}>
        75% threshold required — track every class
      </p>

      {courses.length === 0 ? (
        <GlassCard>
          <div style={{ color: "#6B7590", fontSize: 14 }}>
            Add courses in the Timetable tab first.
          </div>
        </GlassCard>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {courses.map((c) => {
            const stats = calcAttendance(attendance, c.id);
            const manualBase = getManualBase(c.id);
            // suppress unused var warning
            void manualBaseVersion;
            const baseAttended = manualBase?.attended ?? 0;
            const baseTotal = manualBase?.total ?? 0;
            const adjAttended = stats.attended + baseAttended;
            const adjTotal = stats.total + baseTotal;
            const adjPct =
              adjTotal === 0 ? 0 : Math.round((adjAttended / adjTotal) * 100);
            const adjSafeSkip =
              adjPct > 75 ? Math.floor(adjAttended / 0.75 - adjTotal) : 0;
            const adjToReach75 =
              adjPct < 75 && adjTotal > 0
                ? Math.ceil((0.75 * adjTotal - adjAttended) / 0.25)
                : 0;

            const sc =
              adjPct >= 75
                ? "#06b6d4"
                : adjPct >= 65
                  ? "rgba(242,201,76,0.85)"
                  : "rgba(255,122,89,0.85)";
            const ringColor = "#6366f1";
            const courseColor = c.color ?? getSlotColor(c.slot);
            const hist = attendance
              .filter((r) => r.courseId === c.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15);
            const todayRecord = attendance.find(
              (r) => r.courseId === c.id && r.date === today,
            );

            // manual entry calc preview
            const mA = Number.parseInt(manualAttended[c.id] || "", 10);
            const mT = Number.parseInt(manualTotal[c.id] || "", 10);
            const mValid =
              !Number.isNaN(mA) && !Number.isNaN(mT) && mT > 0 && mA >= 0;
            const mPct = mValid ? Math.round((mA / mT) * 100) : null;
            const mSkip =
              mPct !== null && mPct > 75 ? Math.floor(mA / 0.75 - mT) : null;
            const mNeed =
              mPct !== null && mPct < 75
                ? Math.ceil((0.75 * mT - mA) / 0.25)
                : null;

            return (
              <GlassCard key={c.id} style={{ borderColor: `${sc}28` }}>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: courseColor,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${courseColor}88`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#F0F4FF",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7590",
                        paddingLeft: 16,
                      }}
                    >
                      {c.code && <span>{c.code} · </span>}
                      Slot {c.slot}
                      {c.venue && (
                        <span style={{ color: "#505870" }}> · {c.venue}</span>
                      )}
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: sc,
                      letterSpacing: "-0.5px",
                      flexShrink: 0,
                      textShadow: `0 0 16px ${sc}80`,
                    }}
                  >
                    {adjPct}%
                  </motion.div>
                </div>

                <ProgressBar percentage={adjPct} color={ringColor} />

                {/* Stats box */}
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#B0BAD0",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {adjAttended} classes attended out of {adjTotal} total
                  </div>

                  {manualBase && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(139,92,246,0.8)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      📊 Base: {manualBase.attended}/{manualBase.total} added
                      <button
                        type="button"
                        onClick={() => handleClearManualBase(c.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255,122,89,0.7)",
                          cursor: "pointer",
                          fontSize: 13,
                          lineHeight: 1,
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                        title="Clear manual base"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {adjTotal === 0 ? (
                    <div style={{ fontSize: 12, color: "#4A5270" }}>
                      No classes recorded yet
                    </div>
                  ) : adjPct > 75 ? (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#06b6d4",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>✓</span>
                      You can skip{" "}
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#22d3ee",
                          textShadow: "0 0 10px rgba(6,182,212,0.5)",
                        }}
                      >
                        {adjSafeSkip}
                      </span>{" "}
                      more {adjSafeSkip === 1 ? "class" : "classes"}
                    </div>
                  ) : adjPct === 75 ? (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "rgba(242,201,76,0.9)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span>⚠</span> You're at exactly 75% — attend all
                      remaining classes
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,122,89,0.9)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>⚠</span>
                      Attend{" "}
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#ff7a59",
                          textShadow: "0 0 10px rgba(255,122,89,0.5)",
                        }}
                      >
                        {adjToReach75}
                      </span>{" "}
                      more {adjToReach75 === 1 ? "class" : "classes"} to stay
                      safe
                    </div>
                  )}
                </div>

                {/* ── Manual Entry toggle ── */}
                <div style={{ marginBottom: 8 }}>
                  <motion.button
                    type="button"
                    data-ocid="attendance.toggle"
                    whileTap={{ scale: 0.96 }}
                    onClick={() =>
                      setManualOpen(manualOpen === c.id ? null : c.id)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        manualOpen === c.id
                          ? "#a78bfa"
                          : "rgba(139,92,246,0.6)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 0",
                      fontWeight: 500,
                    }}
                  >
                    ✏️ {manualOpen === c.id ? "Hide" : "Set manually"}
                  </motion.button>

                  <AnimatePresence>
                    {manualOpen === c.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          style={{
                            marginTop: 8,
                            padding: "12px",
                            background: "rgba(99,102,241,0.06)",
                            border: "1px solid rgba(99,102,241,0.2)",
                            borderRadius: 10,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(160,170,210,0.6)",
                              marginBottom: 2,
                            }}
                          >
                            Enter your existing class count to see attendance
                            stats
                          </div>

                          {/* Inputs row */}
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                              }}
                            >
                              <label
                                htmlFor={`manual-attended-${c.id}`}
                                style={{
                                  fontSize: 10,
                                  color: "rgba(140,155,195,0.6)",
                                }}
                              >
                                Classes attended
                              </label>
                              <input
                                id={`manual-attended-${c.id}`}
                                data-ocid="attendance.input"
                                type="number"
                                min="0"
                                className="glass-input"
                                style={{ fontSize: 13, padding: "6px 10px" }}
                                placeholder="e.g. 42"
                                value={manualAttended[c.id] ?? ""}
                                onChange={(e) =>
                                  setManualAttended((prev) => ({
                                    ...prev,
                                    [c.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                              }}
                            >
                              <label
                                htmlFor={`manual-total-${c.id}`}
                                style={{
                                  fontSize: 10,
                                  color: "rgba(140,155,195,0.6)",
                                }}
                              >
                                Total classes held
                              </label>
                              <input
                                id={`manual-total-${c.id}`}
                                data-ocid="attendance.input"
                                type="number"
                                min="0"
                                className="glass-input"
                                style={{ fontSize: 13, padding: "6px 10px" }}
                                placeholder="e.g. 55"
                                value={manualTotal[c.id] ?? ""}
                                onChange={(e) =>
                                  setManualTotal((prev) => ({
                                    ...prev,
                                    [c.id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          {/* Result preview */}
                          {mValid && mPct !== null && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                padding: "10px 12px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: 8,
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color:
                                    mPct >= 75
                                      ? "#06b6d4"
                                      : mPct >= 65
                                        ? "rgba(242,201,76,0.9)"
                                        : "rgba(255,122,89,0.9)",
                                }}
                              >
                                {mPct}% attendance
                              </div>
                              {mPct > 75 && mSkip !== null && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#22d3ee",
                                    fontWeight: 600,
                                  }}
                                >
                                  ✓ You can skip <strong>{mSkip}</strong> more{" "}
                                  {mSkip === 1 ? "class" : "classes"}
                                </div>
                              )}
                              {mPct < 75 && mNeed !== null && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(255,122,89,0.9)",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⚠ Attend <strong>{mNeed}</strong> more{" "}
                                  {mNeed === 1 ? "class" : "classes"} to reach
                                  75%
                                </div>
                              )}
                              {mPct === 75 && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(242,201,76,0.9)",
                                    fontWeight: 500,
                                  }}
                                >
                                  You're exactly at 75% — don't skip any more
                                </div>
                              )}
                            </motion.div>
                          )}

                          {/* Save button */}
                          <motion.button
                            type="button"
                            data-ocid="attendance.save_button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn-gradient"
                            style={{
                              fontSize: 12,
                              padding: "8px 14px",
                              opacity: mValid ? 1 : 0.5,
                              cursor: mValid ? "pointer" : "not-allowed",
                            }}
                            disabled={!mValid}
                            onClick={() => handleSaveManualBase(c.id)}
                          >
                            💾 Save as base count
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mark buttons */}
                {!todayRecord ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <motion.button
                      data-ocid="attendance.primary_button"
                      whileTap={{ scale: 0.95 }}
                      className="btn-gradient"
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      onClick={() => markAttendance(c.id, "attended")}
                    >
                      ✓ Present
                    </motion.button>
                    <motion.button
                      data-ocid="attendance.delete_button"
                      whileTap={{ scale: 0.95 }}
                      className="glass-btn glass-btn-red"
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      onClick={() => markAttendance(c.id, "absent")}
                    >
                      ✗ Absent
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="glass-btn"
                      style={{ flex: 1, padding: "7px 0", fontSize: 12 }}
                      onClick={() => markAttendance(c.id, "cancelled")}
                    >
                      − Cancel
                    </motion.button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: statusColor(todayRecord.status),
                        fontWeight: 600,
                      }}
                    >
                      Today:{" "}
                      <span style={{ textTransform: "capitalize" }}>
                        {todayRecord.status}
                      </span>
                    </span>
                    <div
                      style={{ display: "flex", gap: 4, marginLeft: "auto" }}
                    >
                      {(["attended", "absent", "cancelled"] as const).map(
                        (s) => (
                          <motion.button
                            key={s}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              onUpdateAttendance(todayRecord.id, s)
                            }
                            style={{
                              fontSize: 10,
                              padding: "3px 7px",
                              borderRadius: 6,
                              border: `1px solid ${statusColor(s)}44`,
                              background:
                                todayRecord.status === s
                                  ? `${statusColor(s)}22`
                                  : "transparent",
                              color: statusColor(s),
                              cursor: "pointer",
                              fontWeight: todayRecord.status === s ? 700 : 400,
                            }}
                          >
                            {s === "attended"
                              ? "P"
                              : s === "absent"
                                ? "A"
                                : "C"}
                          </motion.button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* History toggle */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#505870",
                      cursor: "pointer",
                      fontSize: 12,
                      flex: 1,
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    {expanded === c.id ? "▲ Hide history" : "▼ Show history"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setAddPastOpen(addPastOpen === c.id ? null : c.id)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6B90CC",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  >
                    + Past Record
                  </motion.button>
                </div>

                {/* Add Past Record form */}
                <AnimatePresence>
                  {addPastOpen === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          marginTop: 8,
                          padding: "10px",
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="date"
                          className="glass-input"
                          style={{ flex: "1 1 130px", fontSize: 12 }}
                          value={pastDate}
                          max={today}
                          onChange={(e) => setPastDate(e.target.value)}
                        />
                        <select
                          className="glass-input"
                          style={{ flex: "1 1 110px", fontSize: 12 }}
                          value={pastStatus}
                          onChange={(e) =>
                            setPastStatus(
                              e.target.value as
                                | "attended"
                                | "absent"
                                | "cancelled",
                            )
                          }
                        >
                          <option value="attended">Present</option>
                          <option value="absent">Absent</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="btn-gradient"
                          style={{ fontSize: 12, padding: "6px 14px" }}
                          onClick={() => handleAddPast(c.id)}
                        >
                          Add
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History */}
                <AnimatePresence>
                  {expanded === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {hist.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#3D4460" }}>
                            No history yet.
                          </div>
                        ) : (
                          hist.map((r) => (
                            <div
                              key={r.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 12,
                                padding: "4px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                gap: 6,
                              }}
                            >
                              <span style={{ color: "#6B7590", flex: 1 }}>
                                {r.date}
                              </span>
                              <div style={{ display: "flex", gap: 3 }}>
                                {(
                                  ["attended", "absent", "cancelled"] as const
                                ).map((s) => (
                                  <motion.button
                                    key={s}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onUpdateAttendance(r.id, s)}
                                    style={{
                                      fontSize: 9,
                                      padding: "2px 5px",
                                      borderRadius: 4,
                                      border: `1px solid ${statusColor(s)}33`,
                                      background:
                                        r.status === s
                                          ? `${statusColor(s)}22`
                                          : "transparent",
                                      color: statusColor(s),
                                      cursor: "pointer",
                                      fontWeight: r.status === s ? 700 : 400,
                                    }}
                                  >
                                    {s === "attended"
                                      ? "P"
                                      : s === "absent"
                                        ? "A"
                                        : "C"}
                                  </motion.button>
                                ))}
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onDeleteAttendance(r.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#FF7A59",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  lineHeight: 1,
                                  padding: "0 2px",
                                  opacity: 0.7,
                                }}
                              >
                                ×
                              </motion.button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
