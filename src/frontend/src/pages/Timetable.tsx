import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { Course } from "../types";
import {
  PASTEL_COLORS,
  SLOT_GRID,
  SLOT_OCCURRENCES,
  TIME_COLUMNS,
  getSlotColor,
  getSlotScheduleDesc,
} from "../utils/slots";

interface Props {
  courses: Course[];
  onAddCourse: (c: Course) => void;
  onDeleteCourse: (id: string) => void;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI"];
const ALL_SLOTS = Object.keys(SLOT_OCCURRENCES).sort();

// ─── IITM Course Database (for Populate) ───────────────────────────────────
const IITM_COURSE_DB: Record<string, { name: string; venue: string }> = {
  MA1101: { name: "Calculus", venue: "CLT" },
  MA1102: { name: "Linear Algebra", venue: "CLT" },
  MA2040: {
    name: "Probability, Statistics and Stochastic Processes",
    venue: "CLT",
  },
  MA3201: { name: "Mathematics III", venue: "CLT" },
  MA4230: { name: "Real Analysis", venue: "HSB 315" },
  MA3100: { name: "Numerical Methods", venue: "CLT" },
  PH1010: { name: "Physics I", venue: "ESB 244" },
  PH1020: { name: "Physics II", venue: "ESB 244" },
  PH2100: { name: "Quantum Physics", venue: "ESB 244" },
  PH2201: { name: "Physics for Engineers", venue: "ESB 244" },
  PH3100: { name: "Statistical Mechanics", venue: "ESB 244" },
  CH1010: { name: "Chemistry I", venue: "HSB 315" },
  CH1020: { name: "Chemistry II", venue: "HSB 315" },
  CH2100: { name: "Physical Chemistry", venue: "HSB 315" },
  CY2101: { name: "Chemistry for Engineers", venue: "HSB 315" },
  CS1100: { name: "Introduction to Programming", venue: "CS Lab" },
  CS1200: { name: "Data Structures and Algorithms", venue: "CS Lab" },
  CS2700: { name: "Computer Organization", venue: "CS 215" },
  CS3200: { name: "Operating Systems", venue: "CS 215" },
  CS3300: { name: "Compiler Design", venue: "CS 215" },
  EE2703: { name: "Applied Programming Lab", venue: "ESB 244" },
  EE3200: { name: "Signals and Systems", venue: "ESB 244" },
  EE3310: { name: "Digital Signal Processing", venue: "ESB 244" },
  ME2300: { name: "Engineering Mechanics", venue: "MED 115" },
  ME2700: { name: "Fluid Mechanics", venue: "MED 115" },
  CE2100: { name: "Structural Analysis", venue: "CED 101" },
  CE3100: { name: "Concrete Structures", venue: "CED 101" },
  HS1010: { name: "Technical English", venue: "HSS 101" },
  HS2100: { name: "Economics", venue: "HSS 101" },
  ES2100: { name: "Environmental Science", venue: "CLT" },
  GE1010: { name: "Engineering Graphics", venue: "GE Lab" },
  GE2100: { name: "Engineering Design", venue: "GE Lab" },
  BT2100: { name: "Biochemistry", venue: "BT Lab" },
  MS2100: { name: "Materials Science", venue: "MED 115" },
};

// ─── Override type ──────────────────────────────────────────────────────────
interface DayOverride {
  id: string;
  day: string;
  slot: string;
  name: string;
  time?: string;
}

interface EveningSlot {
  id: string;
  name: string;
  code: string;
  venue: string;
  days: string[];
  time: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function Timetable({ courses, onAddCourse, onDeleteCourse }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [slot, setSlot] = useState("A");
  const [venue, setVenue] = useState("");
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [populateMsg, setPopulateMsg] = useState("");

  // Manual Overrides
  const [overrides, setOverrides] = useState<DayOverride[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("instiflow_overrides") ?? "[]");
    } catch {
      return [];
    }
  });
  const [showOverrideSection, setShowOverrideSection] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [ovDay, setOvDay] = useState(DAYS[0]);
  const [ovSlot, setOvSlot] = useState("A");
  const [ovName, setOvName] = useState("");
  const [ovTime, setOvTime] = useState("");

  // Cell delete confirmation
  const [deleteCell, setDeleteCell] = useState<{
    courseId?: string;
    overrideKey?: string;
    label: string;
  } | null>(null);

  // Save/Load
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Evening Slots (6 PM - 8 PM)
  const [eveningSlots, setEveningSlots] = useState<EveningSlot[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("instiflow_evening_slots") ?? "[]",
      );
    } catch {
      return [];
    }
  });
  const [showEveningSection, setShowEveningSection] = useState(false);
  const [showEveningForm, setShowEveningForm] = useState(false);
  const [evName, setEvName] = useState("");
  const [evCode, setEvCode] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evDays, setEvDays] = useState<string[]>(["Monday"]);
  const [evTime, setEvTime] = useState("18:00–20:00");

  const saveEveningSlots = (list: EveningSlot[]) => {
    setEveningSlots(list);
    localStorage.setItem("instiflow_evening_slots", JSON.stringify(list));
  };

  const saveOverrides = (list: DayOverride[]) => {
    setOverrides(list);
    localStorage.setItem("instiflow_overrides", JSON.stringify(list));
  };

  const slotToCourse = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.slot, c);
    }
    return map;
  }, [courses]);

  // Build override lookup: dayLabel -> slotLetter -> override info
  const overrideLookup = useMemo(() => {
    const map = new Map<string, { name: string; time?: string }>();
    for (const ov of overrides) {
      // day is full name like "Monday", convert to 3-letter
      const dayShort = ov.day.slice(0, 3).toUpperCase();
      map.set(`${dayShort}__${ov.slot}`, { name: ov.name, time: ov.time });
    }
    return map;
  }, [overrides]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddCourse({
      id: Date.now().toString(),
      name: name.trim(),
      code: code.trim(),
      slot,
      venue: venue.trim() || undefined,
      color: selectedColor,
      hoursPerWeek,
    });
    setName("");
    setCode("");
    setVenue("");
    setSlot("A");
    setSelectedColor(PASTEL_COLORS[0]);
    setHoursPerWeek(3);
    setShowForm(false);
    setPopulateMsg("");
  };

  const handlePopulate = () => {
    const key = code.trim().toUpperCase();
    if (!key) {
      setPopulateMsg("Enter a course code first.");
      return;
    }
    const found = IITM_COURSE_DB[key];
    if (found) {
      setName(found.name);
      setVenue(found.venue);
      setPopulateMsg(`✓ Populated from database: ${key}`);
    } else {
      setPopulateMsg(`Course "${key}" not found in database.`);
    }
  };

  const handleAddOverride = () => {
    if (!ovSlot) return;
    const newOv: DayOverride = {
      id: Date.now().toString(),
      day: ovDay,
      slot: ovSlot,
      name: ovName.trim(),
      time: ovTime.trim() || undefined,
    };
    const updated = [
      ...overrides.filter((o) => !(o.day === ovDay && o.slot === ovSlot)),
      newOv,
    ];
    saveOverrides(
      ovName.trim()
        ? updated
        : overrides.filter((o) => !(o.day === ovDay && o.slot === ovSlot)),
    );
    setOvName("");
    setOvTime("");
    setShowOverrideForm(false);
  };

  const handleSaveData = () => {
    const data = { courses, overrides };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "instiflow-timetable.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.courses && Array.isArray(parsed.courses)) {
          for (const c of parsed.courses) {
            onAddCourse(c);
          }
        }
        if (parsed.overrides && Array.isArray(parsed.overrides)) {
          saveOverrides(parsed.overrides);
        }
      } catch {
        // silently fail
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px" }}
    >
      {/* Page header */}
      <div
        className="print-hide"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            className="page-heading-gradient"
            style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px" }}
          >
            Timetable
          </h2>
          <p style={{ fontSize: 13, color: "#6B7590", marginTop: 4 }}>
            IITM slot-based weekly schedule
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <motion.button
            data-ocid="timetable.secondary_button"
            className="glass-btn print-hide"
            whileTap={{ scale: 0.97 }}
            onClick={() => window.print()}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            🖨️ Print
          </motion.button>
          <motion.button
            data-ocid="timetable.primary_button"
            className="btn-gradient print-hide"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            {showForm ? "✕ Cancel" : "+ Add Course"}
          </motion.button>
        </div>
      </div>

      {/* ─── Section B: Manual Override ──────────────────────────────────── */}
      <div style={{ marginBottom: 16 }} className="print-hide">
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setShowOverrideSection(!showOverrideSection)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "inherit",
            }}
            data-ocid="timetable.override.toggle"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>
                Manual Override
              </span>
              <span style={{ fontSize: 12, color: "#6B7590" }}>
                Add an override for a particular day-slot.
              </span>
            </div>
            <span
              style={{
                color: "#6B7590",
                fontSize: 18,
                transition: "transform 0.2s",
                transform: showOverrideSection
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showOverrideSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 20px 20px" }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#4A5270",
                      fontStyle: "italic",
                      marginBottom: 14,
                    }}
                  >
                    Leave the name field blank to delete the particular day-slot
                    override.
                  </p>

                  {/* Override list */}
                  {overrides.length > 0 && (
                    <div
                      style={{
                        marginBottom: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {overrides.map((ov, i) => (
                        <div
                          key={ov.id}
                          data-ocid={`timetable.item.${i + 1}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            background: "rgba(167,139,250,0.08)",
                            border: "1px solid rgba(167,139,250,0.2)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>
                            {ov.day}
                          </span>
                          <span style={{ color: "#6B7590" }}>Slot</span>
                          <span style={{ color: "#818cf8", fontWeight: 700 }}>
                            {ov.slot}
                          </span>
                          <span style={{ color: "#6B7590" }}>→</span>
                          <span style={{ color: "#F0F4FF", flex: 1 }}>
                            {ov.name || (
                              <em style={{ color: "#4A5270" }}>deleted</em>
                            )}
                          </span>
                          <motion.button
                            data-ocid={`timetable.delete_button.${i + 1}`}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              saveOverrides(
                                overrides.filter((o) => o.id !== ov.id),
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#FF7A59",
                              cursor: "pointer",
                              fontSize: 14,
                              opacity: 0.7,
                            }}
                          >
                            ×
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Override form */}
                  <AnimatePresence>
                    {showOverrideForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden", marginBottom: 12 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            padding: "12px",
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <select
                            className="glass-input"
                            style={{ flex: "1 1 130px", fontSize: 12 }}
                            value={ovDay}
                            onChange={(e) => setOvDay(e.target.value)}
                          >
                            {DAYS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            className="glass-input"
                            style={{ flex: "1 1 100px", fontSize: 12 }}
                            value={ovSlot}
                            onChange={(e) => setOvSlot(e.target.value)}
                          >
                            {ALL_SLOTS.map((s) => (
                              <option key={s} value={s}>
                                Slot {s}
                              </option>
                            ))}
                          </select>
                          <input
                            className="glass-input"
                            style={{ flex: "2 1 180px", fontSize: 12 }}
                            placeholder="Override name (blank = delete slot)"
                            value={ovName}
                            onChange={(e) => setOvName(e.target.value)}
                          />
                          <input
                            className="glass-input"
                            style={{ flex: "1 1 140px", fontSize: 12 }}
                            placeholder="Time e.g. 10:00–11:00"
                            value={ovTime}
                            onChange={(e) => setOvTime(e.target.value)}
                          />
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="btn-gradient"
                            style={{ fontSize: 12, padding: "8px 16px" }}
                            onClick={handleAddOverride}
                          >
                            Save Override
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: "flex", gap: 10 }}>
                    <motion.button
                      data-ocid="timetable.override.primary_button"
                      whileTap={{ scale: 0.97 }}
                      className="glass-btn-accent"
                      style={{ fontSize: 12, padding: "8px 16px" }}
                      onClick={() => setShowOverrideForm(!showOverrideForm)}
                    >
                      {showOverrideForm ? "✕ Cancel" : "+ Add Override"}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="glass-btn"
                      style={{
                        fontSize: 12,
                        padding: "8px 16px",
                        color: "rgba(255,122,89,0.85)",
                      }}
                      onClick={() => saveOverrides([])}
                    >
                      Clear Overrides
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* ─── Section C: Save / Load ──────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }} className="print-hide">
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setShowSaveLoad(!showSaveLoad)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "inherit",
            }}
            data-ocid="timetable.saveload.toggle"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>
                Save / Load Previously Generated Data
              </span>
              <span style={{ fontSize: 12, color: "#6B7590" }}>
                Save your current calendar or load a previously saved calendar.
              </span>
            </div>
            <span
              style={{
                color: "#6B7590",
                fontSize: 18,
                transition: "transform 0.2s",
                transform: showSaveLoad ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showSaveLoad && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 20px 20px" }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,122,89,0.7)",
                      fontStyle: "italic",
                      marginBottom: 16,
                    }}
                  >
                    ⚠️ Warning: Making modifications to the downloaded file might
                    lead to unpredictable results!
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <motion.button
                      data-ocid="timetable.save.primary_button"
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.03 }}
                      className="glass-btn-accent"
                      style={{
                        fontSize: 13,
                        padding: "10px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={handleSaveData}
                    >
                      💾 Save Data
                    </motion.button>
                    <motion.button
                      data-ocid="timetable.load.secondary_button"
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.03 }}
                      className="glass-btn"
                      style={{
                        fontSize: 13,
                        padding: "10px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📂 Load Data
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      style={{ display: "none" }}
                      onChange={handleLoadData}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "#4A5270", marginTop: 12 }}>
                    Saved file includes all your courses and slot overrides.
                    Load it on any device running InstiFlow.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
      {/* ─── Section A: Add Slot ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }} className="print-hide">
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "inherit",
            }}
            data-ocid="timetable.open_modal_button"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>
                Add Slot
              </span>
              <span style={{ fontSize: 12, color: "#6B7590" }}>
                Add your courses here with the corresponding slot, course
                number, name and venue.
              </span>
            </div>
            <span
              style={{
                color: "#6B7590",
                fontSize: 18,
                transition: "transform 0.2s",
                transform: showForm ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showForm && (
              <motion.div
                key="add-slot-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 20px 20px" }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#4A5270",
                      fontStyle: "italic",
                      marginBottom: 14,
                    }}
                  >
                    The <strong style={{ color: "#818cf8" }}>Populate</strong>{" "}
                    button attempts to fetch unfilled information from the
                    course database using the course number.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    <input
                      data-ocid="timetable.input"
                      className="glass-input"
                      style={{ flex: "2 1 180px" }}
                      placeholder="Course Name *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <div style={{ flex: "1 1 130px", display: "flex", gap: 6 }}>
                      <input
                        className="glass-input"
                        style={{ flex: 1 }}
                        placeholder="Course Code (e.g. MA3201)"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setPopulateMsg("");
                        }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.04 }}
                        className="glass-btn"
                        style={{
                          padding: "0 12px",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        onClick={handlePopulate}
                        title="Auto-fill name & venue from IITM course database"
                      >
                        ✨ Populate
                      </motion.button>
                    </div>
                    <input
                      className="glass-input"
                      style={{ flex: "1 1 130px" }}
                      placeholder="Venue (e.g. CLT, ESB 244)"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />
                    <select
                      data-ocid="timetable.select"
                      className="glass-input"
                      style={{ flex: "2 1 220px" }}
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                    >
                      {ALL_SLOTS.map((s) => (
                        <option key={s} value={s}>
                          Slot {s} — {getSlotScheduleDesc(s)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="glass-input"
                      style={{ flex: "1 1 130px" }}
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((h) => (
                        <option key={h} value={h}>
                          {h} hr{h > 1 ? "s" : ""}/week
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Populate message */}
                  {populateMsg && (
                    <div
                      style={{
                        fontSize: 11,
                        color: populateMsg.startsWith("✓")
                          ? "#22d3ee"
                          : "rgba(255,122,89,0.85)",
                        marginBottom: 10,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: populateMsg.startsWith("✓")
                          ? "rgba(34,211,238,0.06)"
                          : "rgba(255,122,89,0.06)",
                        border: `1px solid ${populateMsg.startsWith("✓") ? "rgba(34,211,238,0.2)" : "rgba(255,122,89,0.2)"}`,
                      }}
                    >
                      {populateMsg}
                    </div>
                  )}

                  {/* Enhanced Color Picker */}
                  <div style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7590",
                        marginBottom: 10,
                        fontWeight: 500,
                      }}
                    >
                      Course Color
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      {PASTEL_COLORS.map((c) => (
                        <motion.button
                          key={c}
                          whileTap={{ scale: 0.88 }}
                          whileHover={{ scale: 1.12 }}
                          onClick={() => setSelectedColor(c)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: c,
                            border:
                              selectedColor === c
                                ? "3px solid rgba(255,255,255,0.95)"
                                : "2px solid rgba(255,255,255,0.15)",
                            cursor: "pointer",
                            boxShadow:
                              selectedColor === c
                                ? `0 0 0 3px ${c}88, 0 0 12px ${c}66`
                                : "none",
                            transition: "border 0.15s, box-shadow 0.15s",
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 8,
                      }}
                    >
                      <label
                        htmlFor="color-picker"
                        style={{ fontSize: 12, color: "#6B7590" }}
                      >
                        Custom:
                      </label>
                      <input
                        type="color"
                        id="color-picker"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        style={{
                          width: 36,
                          height: 36,
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          background: "none",
                          padding: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "#6B7590",
                          fontFamily: "monospace",
                        }}
                      >
                        {selectedColor}
                      </span>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: selectedColor,
                          border: "1px solid rgba(255,255,255,0.2)",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <motion.button
                      data-ocid="timetable.submit_button"
                      className="glass-btn-accent"
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAdd}
                      style={{ padding: "9px 28px" }}
                    >
                      + Add Slot
                    </motion.button>
                    <motion.button
                      className="glass-btn"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        for (const c of courses) onDeleteCourse(c.id);
                      }}
                      style={{
                        padding: "9px 18px",
                        color: "rgba(255,122,89,0.85)",
                        fontSize: 12,
                      }}
                    >
                      Clear Slots
                    </motion.button>
                    <motion.button
                      className="glass-btn"
                      whileTap={{ scale: 0.97 }}
                      onClick={handlePopulate}
                      style={{ padding: "9px 18px", fontSize: 12 }}
                    >
                      ✨ Populate
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Timetable Grid */}
      <GlassCard style={{ marginBottom: 16, overflowX: "auto" }}>
        <div
          style={{
            fontSize: 11,
            color: "#6B7590",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            marginBottom: 16,
          }}
          className="print-hide"
        >
          Weekly Schedule
        </div>

        {/* Print header */}
        <div
          style={{ display: "none", marginBottom: 12 }}
          className="print-only"
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#1a1a2e",
              marginBottom: 2,
            }}
          >
            InstiFlow — IITM Weekly Timetable
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            Jan–May 2026 · Even Semester
          </div>
        </div>

        <div
          className="tt-grid-wrapper"
          style={{
            minWidth: 900,
            WebkitPrintColorAdjust: "exact",
            // @ts-ignore
            printColorAdjust: "exact",
            fontFamily: "inherit",
          }}
        >
          {/* IITM Official Grid Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 56 }} />
              {TIME_COLUMNS.map((col, ci) =>
                ci === 6 || ci === 7 ? (
                  <col key={col.label} style={{ width: "14%" }} />
                ) : (
                  <col key={col.label} style={{ width: "9%" }} />
                ),
              )}
            </colgroup>

            {/* Header Row */}
            <thead>
              <tr>
                <th
                  style={{
                    background: "#0d0f1a",
                    border: "1px solid #1e2235",
                    padding: "8px 4px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#3D4460",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                  }}
                >
                  DAYS
                </th>
                {TIME_COLUMNS.map((col, ci) => (
                  <th
                    key={col.label}
                    style={{
                      background: ci === 4 ? "#0b0d18" : "#0d0f1a",
                      border: "1px solid #1e2235",
                      padding: "8px 4px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: ci === 4 ? "#2D3450" : "#4A5270",
                      textAlign: "center",
                      letterSpacing: "0.01em",
                      lineHeight: 1.4,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Day Rows */}
            <tbody>
              {DAY_LABELS.map((dayLabel, dayIdx) => (
                <tr key={dayLabel}>
                  {/* Day label cell */}
                  <td
                    style={{
                      background: "#0d0f1a",
                      border: "1px solid #1e2235",
                      textAlign: "center",
                      padding: "4px 2px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#5A6280",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      height: 78,
                    }}
                  >
                    {dayLabel}
                  </td>

                  {/* Time slot cells */}
                  {SLOT_GRID[dayIdx].map((cell, colIdx) => {
                    const cellKey = `${dayLabel}-col-${colIdx}`;

                    /* ── LUNCH ── */
                    if (colIdx === 4) {
                      return (
                        <td
                          key={cellKey}
                          style={{
                            background: "#0b0d18",
                            border: "1px solid #1e2235",
                            textAlign: "center",
                            verticalAlign: "middle",
                            padding: 4,
                            height: 78,
                          }}
                        >
                          <div style={{ fontSize: 11, marginBottom: 2 }}>🍽️</div>
                          <div
                            style={{
                              fontSize: 7,
                              color: "#2D3450",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            LUNCH
                          </div>
                        </td>
                      );
                    }

                    /* ── Split afternoon cell (tuple) ── */
                    if (Array.isArray(cell)) {
                      const [topSlot, bottomSlot] = cell;
                      const topCourse = topSlot
                        ? slotToCourse.get(topSlot)
                        : null;
                      const bottomCourse = bottomSlot
                        ? slotToCourse.get(bottomSlot)
                        : null;
                      const topOverrideInfo = topSlot
                        ? (overrideLookup.get(`${dayLabel}__${topSlot}`) ??
                          null)
                        : null;
                      const topOverride = topOverrideInfo?.name ?? null;
                      const botOverrideInfo = bottomSlot
                        ? (overrideLookup.get(`${dayLabel}__${bottomSlot}`) ??
                          null)
                        : null;
                      const botOverride = botOverrideInfo?.name ?? null;

                      const renderHalf = (
                        slotLetter: string | null,
                        course: Course | null | undefined,
                        overrideName: string | null,
                        key: string,
                        isLab: boolean,
                        labSlot?: string | null,
                      ) => {
                        const bg = course?.color ?? null;
                        const filled = !!(course || bg || overrideName);
                        // For empty bottom halves, show the lab slot letter instead
                        const displaySlot =
                          !isLab && !filled && labSlot ? labSlot : slotLetter;
                        return (
                          <div
                            key={key}
                            style={{
                              flex: 1,
                              background: overrideName
                                ? "rgba(139,92,246,0.22)"
                                : bg
                                  ? bg
                                  : "#13151f",
                              borderBottom: "1px solid #1e2235",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px 3px",
                              overflow: "hidden",
                              WebkitPrintColorAdjust: "exact",
                              // @ts-ignore
                              printColorAdjust: "exact",
                            }}
                          >
                            {displaySlot && (
                              <>
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 700,
                                    color: filled
                                      ? "rgba(0,0,0,0.6)"
                                      : "#2A3050",
                                    lineHeight: 1,
                                    display: "block",
                                  }}
                                >
                                  ({displaySlot})
                                </span>
                                {filled && (
                                  <>
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: "rgba(0,0,0,0.85)",
                                        lineHeight: 1.1,
                                        marginTop: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "100%",
                                        display: "block",
                                        textAlign: "center",
                                      }}
                                    >
                                      {overrideName ||
                                        course?.code ||
                                        course?.name.slice(0, 6)}
                                    </span>
                                    {(course?.venue || course?.name) &&
                                      !isLab && (
                                        <span
                                          style={{
                                            fontSize: 7,
                                            color: "rgba(0,0,0,0.55)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            maxWidth: "100%",
                                            display: "block",
                                            textAlign: "center",
                                          }}
                                        >
                                          {course?.venue ?? ""}
                                        </span>
                                      )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        );
                      };

                      return (
                        <td
                          key={cellKey}
                          style={{
                            border: "1px solid #1e2235",
                            padding: 0,
                            height: 78,
                            verticalAlign: "stretch",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              height: "100%",
                            }}
                          >
                            {renderHalf(
                              topSlot,
                              topCourse,
                              topOverride,
                              `${cellKey}-top`,
                              true,
                            )}
                            {renderHalf(
                              bottomSlot,
                              bottomCourse,
                              botOverride,
                              `${cellKey}-bot`,
                              false,
                              topSlot,
                            )}
                          </div>
                        </td>
                      );
                    }

                    /* ── Normal cell ── */
                    const slotLetter = cell as string | null;
                    const course = slotLetter
                      ? slotToCourse.get(slotLetter)
                      : null;
                    const overrideInfo = slotLetter
                      ? (overrideLookup.get(`${dayLabel}__${slotLetter}`) ??
                        null)
                      : null;
                    const overrideName = overrideInfo?.name ?? null;
                    const overrideTime = overrideInfo?.time ?? null;
                    const bg = course?.color ?? null;
                    const filled = !!(bg || overrideName);

                    return (
                      <motion.td
                        key={cellKey}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          delay: (dayIdx * 9 + colIdx) * 0.008,
                          duration: 0.25,
                        }}
                        onClick={() => {
                          if (!filled) return;
                          if (course) {
                            setDeleteCell({
                              courseId: course.id,
                              label: course.name,
                            });
                          } else if (overrideName && slotLetter) {
                            setDeleteCell({
                              overrideKey: `${dayLabel}__${slotLetter}`,
                              label: overrideName,
                            });
                          }
                        }}
                        style={{
                          border: "1px solid #1e2235",
                          background: overrideName
                            ? "rgba(139,92,246,0.22)"
                            : (bg ?? "#13151f"),
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "4px 3px",
                          height: 78,
                          cursor: filled ? "pointer" : "default",
                          WebkitPrintColorAdjust: "exact",
                          // @ts-ignore
                          printColorAdjust: "exact",
                          position: "relative",
                        }}
                      >
                        {slotLetter && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1,
                              height: "100%",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: filled ? "rgba(0,0,0,0.55)" : "#252840",
                                lineHeight: 1,
                              }}
                            >
                              ({slotLetter})
                            </span>
                            {filled && (
                              <>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: "rgba(0,0,0,0.88)",
                                    lineHeight: 1.15,
                                    marginTop: 2,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "95%",
                                    display: "block",
                                  }}
                                >
                                  {overrideName || course?.code || ""}
                                </span>
                                {course?.name && (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: "rgba(0,0,0,0.6)",
                                      lineHeight: 1.2,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "95%",
                                      display: "block",
                                    }}
                                  >
                                    {course.name.length > 14
                                      ? `${course.name.slice(0, 13)}…`
                                      : course.name}
                                  </span>
                                )}
                                {course?.venue && (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: "rgba(0,0,0,0.5)",
                                      lineHeight: 1.1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "95%",
                                      display: "block",
                                    }}
                                  >
                                    {course.venue}
                                  </span>
                                )}
                                {overrideTime && (
                                  <span
                                    style={{
                                      fontSize: 7,
                                      color: "rgba(0,0,0,0.45)",
                                      lineHeight: 1.1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "95%",
                                      display: "block",
                                    }}
                                  >
                                    ⏰ {overrideTime}
                                  </span>
                                )}
                                {filled && (
                                  <span
                                    style={{
                                      fontSize: 7,
                                      color: "rgba(0,0,0,0.35)",
                                      marginTop: 1,
                                    }}
                                  >
                                    tap to remove
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </motion.td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          {courses.length > 0 && (
            <div
              className="tt-legend"
              style={{
                marginTop: 14,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                paddingTop: 6,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {courses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "#8B95B0",
                  }}
                >
                  <div
                    className="tt-legend-dot"
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: c.color ?? getSlotColor(c.slot),
                      border: `1px solid ${c.color ?? getSlotColor(c.slot)}`,
                      WebkitPrintColorAdjust: "exact",
                      // @ts-ignore
                      printColorAdjust: "exact",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, color: "#B0BAD0" }}>
                    Slot {c.slot}
                  </span>
                  <span style={{ color: "#4A5270" }}>—</span>
                  <span style={{ color: "#8B95B0" }}>{c.code || c.name}</span>
                  {c.venue && (
                    <span style={{ color: "#4A5270", fontSize: 10 }}>
                      · {c.venue}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Course Cards */}
      <GlassCard className="print-hide" style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "#6B7590",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Your Courses ({courses.length})
        </div>
        {courses.length === 0 ? (
          <div style={{ color: "#3D4460", fontSize: 13 }}>
            No courses added yet. Use &ldquo;Add Slot&rdquo; above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {courses.map((c, idx) => (
              <motion.div
                key={c.id}
                data-ocid={`timetable.item.${idx + 1}`}
                whileHover={{ scale: 1.02 }}
                style={{
                  padding: "14px 16px",
                  background: c.color
                    ? `${c.color}1A`
                    : "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  border: `1px solid ${c.color ? `${c.color}55` : "rgba(255,255,255,0.08)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c.color ?? getSlotColor(c.slot),
                        flexShrink: 0,
                        boxShadow: c.color ? `0 0 6px ${c.color}88` : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
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
                  {c.code && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7590",
                        marginLeft: 18,
                        marginBottom: 2,
                      }}
                    >
                      {c.code}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 12,
                      marginLeft: 18,
                      color: c.color ?? "#8B95B0",
                      fontWeight: 500,
                    }}
                  >
                    Slot {c.slot}
                    {c.venue && (
                      <span style={{ color: "#6B7590", fontWeight: 400 }}>
                        {" "}
                        &middot; {c.venue}
                      </span>
                    )}
                    {c.hoursPerWeek && (
                      <span style={{ fontSize: 10, color: "#4A5270" }}>
                        {" "}
                        &middot; {c.hoursPerWeek} hrs/wk
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  data-ocid={`timetable.delete_button.${idx + 1}`}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDeleteCourse(c.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#FF7A59",
                    cursor: "pointer",
                    fontSize: 18,
                    marginLeft: 8,
                    flexShrink: 0,
                    lineHeight: 1,
                    opacity: 0.7,
                  }}
                >
                  ×
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── Evening Slots (6 PM – 8 PM) ── */}
      <GlassCard className="print-hide" style={{ marginBottom: 16 }}>
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            background: "none",
            border: "none",
            width: "100%",
            padding: 0,
            textAlign: "left",
          }}
          onClick={() => setShowEveningSection((v) => !v)}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>
              ⏰ Extra Slots (6 PM – 8 PM)
            </div>
            <div style={{ fontSize: 12, color: "#6B7590", marginTop: 2 }}>
              Happiness of Living or any evening class
            </div>
          </div>
          <span style={{ color: "#a78bfa", fontSize: 18 }}>
            {showEveningSection ? "▲" : "▼"}
          </span>
        </button>
        <AnimatePresence>
          {showEveningSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ marginTop: 16 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn-gradient"
                  style={{
                    fontSize: 13,
                    padding: "8px 16px",
                    marginBottom: 14,
                  }}
                  onClick={() => setShowEveningForm((v) => !v)}
                >
                  {showEveningForm ? "Cancel" : "+ Add Evening Slot"}
                </motion.button>

                {showEveningForm && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <input
                      className="glass-input"
                      placeholder="Course Name (e.g. Happiness of Living)"
                      value={evName}
                      onChange={(e) => setEvName(e.target.value)}
                    />
                    <input
                      className="glass-input"
                      placeholder="Course Code (e.g. HS4001)"
                      value={evCode}
                      onChange={(e) => setEvCode(e.target.value)}
                    />
                    <input
                      className="glass-input"
                      placeholder="Venue (e.g. OAT)"
                      value={evVenue}
                      onChange={(e) => setEvVenue(e.target.value)}
                    />
                    <input
                      className="glass-input"
                      placeholder="Time (e.g. 18:00–20:00)"
                      value={evTime}
                      onChange={(e) => setEvTime(e.target.value)}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#A9B0C7",
                          marginBottom: 6,
                        }}
                      >
                        Days
                      </div>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {DAYS.map((day) => (
                          <label
                            key={day}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: "pointer",
                              fontSize: 13,
                              color: evDays.includes(day)
                                ? "#a78bfa"
                                : "#6B7590",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={evDays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setEvDays([...evDays, day]);
                                else setEvDays(evDays.filter((d) => d !== day));
                              }}
                              style={{ accentColor: "#a78bfa" }}
                            />
                            {day.slice(0, 3)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="btn-gradient"
                      style={{ fontSize: 13, padding: "9px 16px" }}
                      onClick={() => {
                        if (!evName.trim()) return;
                        const newSlot: EveningSlot = {
                          id: Date.now().toString(),
                          name: evName.trim(),
                          code: evCode.trim(),
                          venue: evVenue.trim(),
                          days: evDays,
                          time: evTime.trim() || "18:00–20:00",
                        };
                        saveEveningSlots([...eveningSlots, newSlot]);
                        setEvName("");
                        setEvCode("");
                        setEvVenue("");
                        setEvDays(["Monday"]);
                        setEvTime("18:00–20:00");
                        setShowEveningForm(false);
                      }}
                    >
                      Add Evening Slot
                    </motion.button>
                  </div>
                )}

                {eveningSlots.length > 0 && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {eveningSlots.map((es) => (
                      <div
                        key={es.id}
                        style={{
                          background: "rgba(139,92,246,0.12)",
                          border: "1px solid rgba(139,92,246,0.25)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#F0F4FF",
                            }}
                          >
                            {es.name}{" "}
                            {es.code && (
                              <span style={{ color: "#a78bfa" }}>
                                ({es.code})
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7590",
                              marginTop: 2,
                            }}
                          >
                            {es.days.map((d) => d.slice(0, 3)).join(", ")} ·{" "}
                            {es.time} {es.venue && `· ${es.venue}`}
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            saveEveningSlots(
                              eveningSlots.filter((e) => e.id !== es.id),
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e05555",
                            cursor: "pointer",
                            fontSize: 18,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* ── Delete cell confirmation modal ── */}
      <AnimatePresence>
        {deleteCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setDeleteCell(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, #12142a 0%, #0d0f20 100%)",
                border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: 16,
                padding: "28px 32px",
                minWidth: 300,
                boxShadow: "0 0 40px rgba(139,92,246,0.2)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#F0F4FF",
                  marginBottom: 6,
                }}
              >
                Remove this class?
              </div>
              <div style={{ fontSize: 13, color: "#6B7590", marginBottom: 24 }}>
                {deleteCell.label}
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <motion.button
                  data-ocid="timetable.cancel_button"
                  whileTap={{ scale: 0.96 }}
                  className="glass-btn"
                  style={{ padding: "9px 20px", fontSize: 13 }}
                  onClick={() => setDeleteCell(null)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  data-ocid="timetable.delete_button"
                  whileTap={{ scale: 0.96 }}
                  className="btn-gradient"
                  style={{
                    padding: "9px 20px",
                    fontSize: 13,
                    background: "linear-gradient(135deg,#e05555,#c04040)",
                  }}
                  onClick={() => {
                    if (deleteCell.courseId) {
                      onDeleteCourse(deleteCell.courseId);
                    } else if (deleteCell.overrideKey) {
                      // overrideKey is "DAYSHORT__SLOT", find and remove matching override
                      const [dayShort, slot] =
                        deleteCell.overrideKey.split("__");
                      const fullDay = DAYS.find(
                        (d) => d.slice(0, 3).toUpperCase() === dayShort,
                      );
                      saveOverrides(
                        overrides.filter(
                          (o) => !(o.day === fullDay && o.slot === slot),
                        ),
                      );
                    }
                    setDeleteCell(null);
                  }}
                >
                  Remove
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
