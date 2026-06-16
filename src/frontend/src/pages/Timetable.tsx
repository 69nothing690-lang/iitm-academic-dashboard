import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import type { Course, TimetableEntry } from "../types";
import {
  EXTRA_SLOT_COL_INDEX,
  EXTRA_SLOT_TIME,
  LAB_DAY_MAP,
  LAB_END_TIME,
  type LAB_SLOTS,
  LAB_START_TIME,
  LUNCH_SLOT_TIME,
  PASTEL_COLORS,
  SLOT_GRID,
  SLOT_OCCURRENCES,
  TIME_COLUMNS,
  getSlotColor,
  getSlotScheduleDesc,
  isLabSlot,
} from "../utils/slots";

interface Props {
  courses: Course[];
  onAddCourse: (c: Course) => void;
  onDeleteCourse: (id: string) => void;
  timetableEntries: TimetableEntry[];
  onAddTimetableEntries: (entries: TimetableEntry[]) => void;
  onDeleteTimetableEntry: (id: string) => void;
  onDeleteEntriesForCourse: (courseId: string) => void;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_SHORTS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
// All slots for the selector: theory A-M (skipping I), then lab P/Q/R/S/T independently, then EXTRA
const ALL_SLOTS = [
  ...["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M"],
  ...["P", "Q", "R", "S", "T"],
  "EXTRA_6_8",
];

// IITM Course Database
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

interface DayOverride {
  id: string;
  day: string;
  slot: string;
  name: string;
  time?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Unique ID generator
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Return white or near-black text based on background luminance */
function getContrastColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#111827" : "#ffffff";
}

function getColTime(colIdx: number): { start: string; end: string } {
  if (colIdx === EXTRA_SLOT_COL_INDEX)
    return { start: EXTRA_SLOT_TIME.start, end: EXTRA_SLOT_TIME.end };
  return {
    start: TIME_COLUMNS[colIdx]?.start ?? "00:00",
    end: TIME_COLUMNS[colIdx]?.end ?? "00:00",
  };
}

// ─── Color Swatch Picker ─────────────────────────────────────────────────────
function ColorSwatchPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (c: string) => void;
}) {
  return (
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
            type="button"
            onClick={() => onChange(c)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: c,
              border:
                selected === c
                  ? "3px solid rgba(255,255,255,0.95)"
                  : "2px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              boxShadow:
                selected === c ? `0 0 0 3px ${c}88, 0 0 12px ${c}66` : "none",
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
          htmlFor="color-picker-custom"
          style={{ fontSize: 12, color: "#6B7590" }}
        >
          Custom:
        </label>
        <input
          type="color"
          id="color-picker-custom"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
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
          {selected}
        </span>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: selected,
            border: "1px solid rgba(255,255,255,0.2)",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

export function Timetable({
  courses,
  onAddCourse,
  onDeleteCourse,
  timetableEntries,
  onAddTimetableEntries,
  onDeleteTimetableEntry,
  onDeleteEntriesForCourse,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [slot, setSlot] = useState("A");
  const [venue, setVenue] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [slotColor, setSlotColor] = useState<string>(PASTEL_COLORS[0]);
  const [populateMsg, setPopulateMsg] = useState("");

  // Extra slot form (now uses timetableEntries)
  const [showEveningSection, setShowEveningSection] = useState(false);
  const [showEveningForm, setShowEveningForm] = useState(false);
  const [evName, setEvName] = useState("");
  const [evCode, setEvCode] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evDays, setEvDays] = useState<number[]>([]); // day indices 0-4
  const [evStart, setEvStart] = useState("18:00");
  const [evEnd, setEvEnd] = useState("20:00");
  const [evColor, setEvColor] = useState(PASTEL_COLORS[0]);

  // Lunch override form
  const [lunchFormDay, setLunchFormDay] = useState<number | null>(null);
  const [lunchName, setLunchName] = useState("");
  const [lunchVenue, setLunchVenue] = useState("");
  const [lunchColor, setLunchColor] = useState(PASTEL_COLORS[3]); // warm yellow default

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

  // Delete confirmation
  const [deleteCell, setDeleteCell] = useState<{
    entryId?: string; // NEW: TimetableEntry id
    courseId?: string; // for legacy course-level delete (course cards)
    overrideKey?: string;
    label: string;
  } | null>(null);

  // Save/Load
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPrintingRef = useRef(false);

  const handlePrint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    window.onafterprint = () => {
      isPrintingRef.current = false;
      window.onafterprint = null;
    };
    // Small delay ensures print styles are fully applied before dialog opens
    setTimeout(() => {
      window.print();
    }, 100);
    // Safety reset in case onafterprint doesn't fire (e.g. cancelled)
    setTimeout(() => {
      isPrintingRef.current = false;
    }, 3000);
  }, []);

  const saveOverrides = (list: DayOverride[]) => {
    setOverrides(list);
    localStorage.setItem("instiflow_overrides", JSON.stringify(list));
  };

  // Build entry lookup: day -> colIndex -> TimetableEntry[]
  const entryGrid = useMemo(() => {
    const grid = new Map<string, TimetableEntry[]>();
    for (const e of timetableEntries) {
      const key = `${e.day}__${e.colIndex}`;
      const existing = grid.get(key) ?? [];
      grid.set(key, [...existing, e]);
    }
    return grid;
  }, [timetableEntries]);

  // Build extra slot entries by day
  const extraByDay = useMemo(() => {
    const map = new Map<number, TimetableEntry[]>();
    for (const e of timetableEntries) {
      if (e.slot === "EXTRA_6_8") {
        const existing = map.get(e.day) ?? [];
        map.set(e.day, [...existing, e]);
      }
    }
    return map;
  }, [timetableEntries]);

  // Build lunch entries by day
  const lunchByDay = useMemo(() => {
    const map = new Map<number, TimetableEntry[]>();
    for (const e of timetableEntries) {
      if (e.slot === "LUNCH") {
        const existing = map.get(e.day) ?? [];
        map.set(e.day, [...existing, e]);
      }
    }
    return map;
  }, [timetableEntries]);

  // Build unique course IDs that appear in extra slots for the legend
  const extraSlotEntries = useMemo(
    () => timetableEntries.filter((e) => e.slot === "EXTRA_6_8"),
    [timetableEntries],
  );

  // State for remove-course dropdown
  const [removeCourseId, setRemoveCourseId] = useState<string>("");

  // Build override lookup
  const overrideLookup = useMemo(() => {
    const map = new Map<string, { name: string; time?: string }>();
    for (const ov of overrides) {
      const dayShort = ov.day.slice(0, 3).toUpperCase();
      map.set(`${dayShort}__${ov.slot}`, { name: ov.name, time: ov.time });
    }
    return map;
  }, [overrides]);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;
    const courseId = uid();
    const defaultColor = slotColor || getSlotColor(slot);
    const newCourse: Course = {
      id: courseId,
      name: name.trim(),
      code: code.trim(),
      slot: slot,
      venue: venue.trim() || undefined,
      color: defaultColor,
      hoursPerWeek,
    };
    onAddCourse(newCourse);

    // Create TimetableEntry for each occurrence of this slot
    const newEntries: TimetableEntry[] = [];
    if (slot === "EXTRA_6_8") {
      // EXTRA slot: entries for all 5 days by default
      for (let day = 0; day < 5; day++) {
        newEntries.push({
          id: uid(),
          courseId,
          courseName: name.trim(),
          courseCode: code.trim(),
          slot: "EXTRA_6_8",
          day,
          colIndex: EXTRA_SLOT_COL_INDEX,
          startTime: EXTRA_SLOT_TIME.start,
          endTime: EXTRA_SLOT_TIME.end,
          venue: venue.trim() || undefined,
          color: defaultColor,
        });
      }
    } else if (isLabSlot(slot)) {
      // Lab slot (P/Q/R/S/T): one entry for the specific day only
      const dayIdx = LAB_DAY_MAP[slot as (typeof LAB_SLOTS)[number]];
      newEntries.push({
        id: uid(),
        courseId,
        courseName: name.trim(),
        courseCode: code.trim(),
        slot: slot,
        day: dayIdx,
        colIndex: 6, // col 6 is the first lab column
        startTime: LAB_START_TIME,
        endTime: LAB_END_TIME,
        venue: venue.trim() || undefined,
        color: defaultColor,
      });
    } else {
      const occs = SLOT_OCCURRENCES[slot] ?? [];
      for (const occ of occs) {
        const colTime = getColTime(occ.col);
        newEntries.push({
          id: uid(),
          courseId,
          courseName: name.trim(),
          courseCode: code.trim(),
          slot: slot,
          day: occ.day,
          colIndex: occ.col,
          startTime: colTime.start,
          endTime: colTime.end,
          venue: venue.trim() || undefined,
          color: defaultColor,
        });
      }
    }
    onAddTimetableEntries(newEntries);

    setName("");
    setCode("");
    setVenue("");
    setSlot("A");
    setHoursPerWeek(3);
    setSlotColor(PASTEL_COLORS[0]);
    setShowForm(false);
    setPopulateMsg("");
  }, [
    name,
    code,
    slot,
    venue,
    hoursPerWeek,
    slotColor,
    onAddCourse,
    onAddTimetableEntries,
  ]);

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
      id: uid(),
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

  const addEveningSlotEntries = () => {
    if (!evName.trim()) return;
    const courseId = uid();
    const newCourse: Course = {
      id: courseId,
      name: evName.trim(),
      code: evCode.trim(),
      slot: "EXTRA_6_8",
      venue: evVenue.trim() || undefined,
      color: evColor,
    };
    onAddCourse(newCourse);

    const newEntries: TimetableEntry[] = evDays.map((dayIdx) => ({
      id: uid(),
      courseId,
      courseName: evName.trim(),
      courseCode: evCode.trim(),
      slot: "EXTRA_6_8",
      day: dayIdx,
      colIndex: EXTRA_SLOT_COL_INDEX,
      startTime: evStart,
      endTime: evEnd,
      venue: evVenue.trim() || undefined,
      color: evColor,
    }));
    onAddTimetableEntries(newEntries);

    setEvName("");
    setEvCode("");
    setEvVenue("");
    setEvDays([]);
    setEvStart("18:00");
    setEvEnd("20:00");
    setEvColor(PASTEL_COLORS[0]);
    setShowEveningForm(false);
  };

  const handleAddLunchOverride = (dayIdx: number) => {
    if (!lunchName.trim()) return;
    const courseId = uid();
    const newCourse: Course = {
      id: courseId,
      name: lunchName.trim(),
      code: "",
      slot: "LUNCH",
      venue: lunchVenue.trim() || undefined,
      color: lunchColor,
    };
    onAddCourse(newCourse);
    const entry: TimetableEntry = {
      id: uid(),
      courseId,
      courseName: lunchName.trim(),
      courseCode: "",
      slot: "LUNCH",
      day: dayIdx,
      colIndex: 4,
      startTime: LUNCH_SLOT_TIME.start,
      endTime: LUNCH_SLOT_TIME.end,
      venue: lunchVenue.trim() || undefined,
      color: lunchColor,
    };
    onAddTimetableEntries([entry]);
    setLunchName("");
    setLunchVenue("");
    setLunchColor(PASTEL_COLORS[3]);
    setLunchFormDay(null);
  };

  const toggleEvDay = (dayIdx: number) => {
    setEvDays((prev) =>
      prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx],
    );
  };

  const handleSaveData = () => {
    const data = { courses, overrides, timetableEntries };
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
          for (const c of parsed.courses) onAddCourse(c);
        }
        if (parsed.timetableEntries && Array.isArray(parsed.timetableEntries)) {
          onAddTimetableEntries(parsed.timetableEntries);
        }
        if (parsed.overrides && Array.isArray(parsed.overrides)) {
          saveOverrides(parsed.overrides);
        }
      } catch {
        /* silently fail */
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Renders a single slot mini-block (used for individual entries in a cell) ──
  const renderSlotBlock = (
    entry: TimetableEntry,
    slotLetter: string | null,
    fillContainer?: boolean,
  ) => {
    const solidBg = entry.color ?? "#4f46e5";
    const textColor = getContrastColor(solidBg);
    const subTextColor =
      textColor === "#111827" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)";
    const mutedTextColor =
      textColor === "#111827" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.5)";
    return (
      <button
        key={entry.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteCell({
            entryId: entry.id,
            label: `${entry.courseName} (${DAY_SHORTS[entry.day]} ${entry.startTime})`,
          });
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          borderRadius: 5,
          background: solidBg,
          border: `1px solid ${solidBg}`,
          cursor: "pointer",
          width: "100%",
          height: fillContainer ? "100%" : undefined,
          flex: fillContainer ? 1 : undefined,
          fontFamily: "inherit",
          overflow: "visible",
          textAlign: "left",
          padding: "4px 6px",
          minHeight: fillContainer ? 56 : 34,
          justifyContent: "center",
          gap: 1,
          WebkitPrintColorAdjust: "exact",
          // @ts-ignore
          printColorAdjust: "exact",
        }}
      >
        {slotLetter && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: mutedTextColor,
              lineHeight: 1,
              letterSpacing: "0.06em",
              display: "block",
            }}
          >
            [{slotLetter}]
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: textColor,
            overflow: "visible",
            textOverflow: "clip",
            whiteSpace: "normal",
            wordBreak: "break-word",
            display: "block",
            lineHeight: 1.2,
          }}
        >
          {entry.courseCode || entry.courseName.slice(0, 10)}
        </span>
        {entry.courseName && (
          <span
            style={{
              fontSize: 9,
              color: subTextColor,
              overflow: "visible",
              textOverflow: "clip",
              whiteSpace: "normal",
              wordBreak: "break-word",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {entry.courseName.length > 15
              ? `${entry.courseName.slice(0, 14)}…`
              : entry.courseName}
          </span>
        )}
        {entry.venue && (
          <span
            style={{
              fontSize: 8,
              color: mutedTextColor,
              overflow: "visible",
              textOverflow: "clip",
              whiteSpace: "normal",
              wordBreak: "break-word",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {entry.venue}
          </span>
        )}
        <span
          className="print-hide tt-tap-remove"
          style={{ color: mutedTextColor, marginTop: 1 }}
        >
          tap to remove
        </span>
      </button>
    );
  };

  // ── Renders a single grid cell content (normal slot) ──
  const renderCellEntries = (
    cellEntries: TimetableEntry[],
    slotLetter: string | null,
    dayLabel: string,
    _colIdx: number,
    fillContainer?: boolean,
  ) => {
    const overrideInfo = slotLetter
      ? (overrideLookup.get(`${dayLabel}__${slotLetter}`) ?? null)
      : null;
    const overrideName = overrideInfo?.name ?? null;
    const overrideTime = overrideInfo?.time ?? null;
    const filled = cellEntries.length > 0 || !!overrideName;

    return {
      filled,
      bg: "rgba(255,255,255,0.02)",
      content: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: cellEntries.length === 0 ? "center" : "flex-start",
            gap: 3,
            height: "100%",
            width: "100%",
            padding: cellEntries.length > 0 ? "2px 2px" : 0,
          }}
        >
          {!filled && slotLetter && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.15)",
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              ({slotLetter})
            </span>
          )}
          {filled && cellEntries.length > 0 ? (
            cellEntries.map((entry) =>
              renderSlotBlock(entry, slotLetter, fillContainer),
            )
          ) : filled && overrideName ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 5,
                background: "#7c3aed",
                overflow: "hidden",
                minHeight: 36,
                padding: "4px 6px",
                gap: 1,
                justifyContent: "center",
                height: fillContainer ? "100%" : undefined,
                flex: fillContainer ? 1 : undefined,
              }}
            >
              {slotLetter && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1,
                  }}
                >
                  [{slotLetter}]
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {overrideName}
              </span>
              {overrideTime && (
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)" }}>
                  {overrideTime}
                </span>
              )}
              <span
                className="print-hide tt-tap-remove"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                tap to remove
              </span>
            </div>
          ) : null}
        </div>
      ),
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ padding: "32px 28px", position: "relative" }}
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
            onClick={handlePrint}
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

      {/* ─── Manual Override ── */}
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
              ▼
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
                            type="button"
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
                            type="button"
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
                      type="button"
                      className="glass-btn-accent"
                      style={{ fontSize: 12, padding: "8px 16px" }}
                      onClick={() => setShowOverrideForm(!showOverrideForm)}
                    >
                      {showOverrideForm ? "✕ Cancel" : "+ Add Override"}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
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

      {/* ─── Save / Load ── */}
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
              ▼
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
                      type="button"
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
                      type="button"
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
                    Saved file includes all your courses, entries, and slot
                    overrides. Load it on any device running InstiFlow.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* ─── Add Slot ── */}
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
              ▼
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
                        type="button"
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
                          {s === "EXTRA_6_8"
                            ? "Extra Slot — 18:00–20:00 (all days)"
                            : `Slot ${s} — ${getSlotScheduleDesc(s)}`}
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

                  {/* Color picker for all slots */}
                  <ColorSwatchPicker
                    selected={slotColor}
                    onChange={setSlotColor}
                  />

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

                  {/* Remove individual course */}
                  {courses.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        data-ocid="timetable.select"
                        className="glass-input"
                        style={{ flex: "2 1 200px", fontSize: 12 }}
                        value={removeCourseId}
                        onChange={(e) => setRemoveCourseId(e.target.value)}
                      >
                        <option value="">
                          — Select course to remove (all instances) —
                        </option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.slot === "EXTRA_6_8"
                              ? "Extra Slot"
                              : c.slot === "LUNCH"
                                ? "Lunch Slot"
                                : `Slot ${c.slot}`}{" "}
                            · {c.name}
                            {c.code ? ` (${c.code})` : ""}
                          </option>
                        ))}
                      </select>
                      <motion.button
                        data-ocid="timetable.delete_button"
                        className="glass-btn"
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (removeCourseId) {
                            onDeleteCourse(removeCourseId);
                            onDeleteEntriesForCourse(removeCourseId);
                            setRemoveCourseId("");
                          }
                        }}
                        style={{
                          padding: "9px 16px",
                          color: "rgba(255,122,89,0.85)",
                          fontSize: 12,
                          opacity: removeCourseId ? 1 : 0.45,
                        }}
                      >
                        Remove Selected
                      </motion.button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <motion.button
                      data-ocid="timetable.submit_button"
                      className="glass-btn-accent"
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAdd}
                      style={{ padding: "9px 28px" }}
                    >
                      + Add Slot
                    </motion.button>
                    <motion.button
                      className="glass-btn"
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (
                          window.confirm(
                            "⚠️ Clear ALL courses from timetable? This cannot be undone.",
                          )
                        ) {
                          for (const c of courses) {
                            onDeleteCourse(c.id);
                            onDeleteEntriesForCourse(c.id);
                          }
                        }
                      }}
                      style={{
                        padding: "9px 18px",
                        color: "rgba(255,122,89,0.85)",
                        fontSize: 12,
                      }}
                    >
                      ⚠️ Clear All
                    </motion.button>
                    <motion.button
                      className="glass-btn"
                      type="button"
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

      {/* ── Extra Slot (6PM-8PM) ── */}
      <GlassCard
        className="print-hide"
        style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}
      >
        <button
          type="button"
          onClick={() => setShowEveningSection((v) => !v)}
          style={{
            width: "100%",
            padding: "14px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "none",
            border: "none",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd" }}>
              ⏰ Extra Slot (6 PM – 8 PM)
            </div>
            <div style={{ fontSize: 11, color: "#6B7590", marginTop: 2 }}>
              Add 6–8 PM classes to your timetable grid
            </div>
          </div>
          <span
            style={{
              color: "#6B7590",
              fontSize: 16,
              transform: showEveningSection ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        </button>

        {showEveningSection && (
          <div style={{ padding: "0 18px 18px" }}>
            {extraSlotEntries.length === 0 && !showEveningForm && (
              <div style={{ fontSize: 12, color: "#3D4460", marginBottom: 12 }}>
                No extra slots added yet.
              </div>
            )}

            {/* List unique extra slot courses */}
            {Array.from(
              new Map(extraSlotEntries.map((e) => [e.courseId, e])).values(),
            ).map((es) => (
              <div
                key={es.courseId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#e0d4ff" }}
                  >
                    {es.courseName} {es.courseCode ? `(${es.courseCode})` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#8A94B0" }}>
                    {es.startTime}–{es.endTime} ·{" "}
                    {es.venue ? `· ${es.venue}` : ""} &middot; Days:{" "}
                    {extraSlotEntries
                      .filter((e) => e.courseId === es.courseId)
                      .map((e) => DAY_SHORTS[e.day])
                      .join(", ")}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="glass-btn"
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "#e05555",
                  }}
                  onClick={() => {
                    onDeleteCourse(es.courseId);
                    onDeleteEntriesForCourse(es.courseId);
                  }}
                >
                  ×
                </motion.button>
              </div>
            ))}

            {!showEveningForm ? (
              <motion.button
                data-ocid="timetable.open_modal_button"
                whileTap={{ scale: 0.97 }}
                type="button"
                className="btn-gradient"
                style={{ padding: "9px 18px", fontSize: 13, marginTop: 4 }}
                onClick={() => setShowEveningForm(true)}
              >
                + Add Extra Slot
              </motion.button>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <input
                  className="glass-input"
                  placeholder="Course Name (e.g. Happiness of Living, Workshop)"
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                />
                <input
                  className="glass-input"
                  placeholder="Course Code (optional)"
                  value={evCode}
                  onChange={(e) => setEvCode(e.target.value)}
                />
                <input
                  className="glass-input"
                  placeholder="Venue (optional)"
                  value={evVenue}
                  onChange={(e) => setEvVenue(e.target.value)}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#A9B0C7" }}>Days:</span>
                  {DAY_SHORTS.map((d, i) => (
                    <label
                      key={d}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: "#c4b5fd",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={evDays.includes(i)}
                        onChange={() => toggleEvDay(i)}
                        style={{ accentColor: "#a78bfa" }}
                      />
                      {d}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="ev-start-time"
                      style={{
                        fontSize: 11,
                        color: "#6B7590",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Start Time
                    </label>
                    <input
                      id="ev-start-time"
                      className="glass-input"
                      type="time"
                      value={evStart}
                      onChange={(e) => setEvStart(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="ev-end-time"
                      style={{
                        fontSize: 11,
                        color: "#6B7590",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      End Time
                    </label>
                    <input
                      id="ev-end-time"
                      className="glass-input"
                      type="time"
                      value={evEnd}
                      onChange={(e) => setEvEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Color picker — only for extra slot */}
                <ColorSwatchPicker selected={evColor} onChange={setEvColor} />

                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    data-ocid="timetable.save_button"
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="btn-gradient"
                    style={{ flex: 1, padding: "9px 18px", fontSize: 13 }}
                    onClick={addEveningSlotEntries}
                  >
                    Save Slot
                  </motion.button>
                  <motion.button
                    data-ocid="timetable.cancel_button"
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="glass-btn"
                    style={{ padding: "9px 18px", fontSize: 13 }}
                    onClick={() => setShowEveningForm(false)}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Timetable Grid */}
      <div
        style={{
          position: "relative",
          marginBottom: 16,
          borderRadius: 20,
          overflow: "visible",
        }}
      >
        {/* Premium background layer */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, #0a0014 0%, #0d0a2e 45%, #000d1a 100%)",
            zIndex: 0,
            borderRadius: 20,
          }}
        />
        {/* Glowing orbs */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(124,58,237,0.15)",
            filter: "blur(160px)",
            top: -160,
            left: -120,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.12)",
            filter: "blur(160px)",
            bottom: -140,
            right: -80,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(8,145,178,0.08)",
            filter: "blur(120px)",
            top: "40%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        {/* Dot grid overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            zIndex: 0,
            pointerEvents: "none",
            borderRadius: 20,
          }}
        />

        {/* Glass grid card */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px) saturate(160%)",
            WebkitBackdropFilter: "blur(12px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "24px 20px",
            overflow: "visible",
          }}
        >
          {/* Section header inside the glass card */}
          <div
            className="print-hide"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Weekly Schedule
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 2,
                }}
              >
                IITM slot-based horizontal timetable
              </div>
            </div>
          </div>
          <div
            className="mobile-scroll-hint print-hide"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 10,
              fontSize: 11,
              color: "rgba(167,139,250,0.7)",
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            <span>&#8592;</span>
            <span>Scroll horizontally to view full timetable</span>
            <span>&#8594;</span>
          </div>
          <div
            className="print-only-header"
            style={{ display: "none", marginBottom: 4 }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>InstiFlow</span>
              <span style={{ opacity: 0.5, fontWeight: 400 }}>•</span>
              <span style={{ fontWeight: 500 }}>IITM Timetable</span>
              <span style={{ opacity: 0.5, fontWeight: 400 }}>•</span>
              <span style={{ fontWeight: 400, color: "#aabbdd" }}>
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div
            className="tt-scroll-container"
            style={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              width: "100%",
            }}
          >
            <div
              className="tt-grid-wrapper"
              style={{
                minWidth: 1050,
                WebkitPrintColorAdjust: "exact",
                // @ts-ignore
                printColorAdjust: "exact",
                fontFamily: "inherit",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: 56 }} />
                  {TIME_COLUMNS.map((col, ci) => {
                    // Skip col 7 only — it's rendered inside the merged 2:00–4:45 cell
                    if (ci === 7) return null;
                    // Col 6 header spans the 2:00–4:45 merged block (includes col 7 sub-cols)
                    if (ci === 6)
                      return (
                        <col key="col-6-7-merged" style={{ width: "18%" }} />
                      );
                    // Col 8 = 17:00–17:50 → its own column
                    if (ci === 8)
                      return <col key="col-8-17" style={{ width: "8%" }} />;
                    return <col key={col.label} style={{ width: "8%" }} />;
                  })}
                  {/* Extra slot column */}
                  <col style={{ width: "10%" }} />
                </colgroup>

                {/* Header */}
                <thead>
                  <tr>
                    <th
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "10px 4px",
                        fontSize: 9,
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.35)",
                        letterSpacing: "0.1em",
                        textAlign: "center",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      DAYS
                    </th>
                    {TIME_COLUMNS.map((col, ci) => {
                      // Skip col 7 — rendered inside the 2:00–4:45 merged cell
                      if (ci === 7) return null;
                      // Col 6 header spans the entire 2:00–4:45 block (lab + 2 lecture cols)
                      if (ci === 6) {
                        return (
                          <th
                            key="header-2-445"
                            style={{
                              background: "rgba(124,58,237,0.12)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              padding: "4px 2px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#ffffff",
                              textAlign: "center",
                              letterSpacing: "0.01em",
                              lineHeight: 1.4,
                            }}
                          >
                            <div
                              style={{
                                marginBottom: 2,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              2:00–4:45
                            </div>
                            {/* Two sub-column labels */}
                            <div style={{ display: "flex", gap: 2 }}>
                              <div
                                style={{
                                  flex: 1,
                                  background: "rgba(255,255,255,0.04)",
                                  borderRadius: 3,
                                  padding: "2px 1px",
                                  fontSize: 8,
                                  color: "rgba(167,139,250,0.8)",
                                  fontWeight: 600,
                                }}
                              >
                                2:00–3:15
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  background: "rgba(255,255,255,0.04)",
                                  borderRadius: 3,
                                  padding: "2px 1px",
                                  fontSize: 8,
                                  color: "rgba(167,139,250,0.8)",
                                  fontWeight: 600,
                                }}
                              >
                                3:30–4:45
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 7,
                                color: "rgba(255,255,255,0.35)",
                                fontWeight: 400,
                                marginTop: 2,
                              }}
                            >
                              Lab + Lecture
                            </div>
                          </th>
                        );
                      }
                      return (
                        <th
                          key={col.label}
                          style={{
                            background:
                              ci === 4
                                ? "rgba(212,170,100,0.08)"
                                : "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            padding: "10px 4px",
                            fontSize: 10,
                            fontWeight: 600,
                            color:
                              ci === 4 ? "rgba(255,220,120,0.55)" : "#ffffff",
                            textAlign: "center",
                            letterSpacing: "0.01em",
                            lineHeight: 1.4,
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {col.label}
                        </th>
                      );
                    })}
                    <th
                      style={{
                        background: "rgba(167,139,250,0.12)",
                        border: "1px solid rgba(167,139,250,0.25)",
                        padding: "8px 4px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#c4b5fd",
                        textAlign: "center",
                        letterSpacing: "0.01em",
                        lineHeight: 1.4,
                      }}
                    >
                      ⏰ 18:00–20:00
                    </th>
                  </tr>
                </thead>

                {/* Day rows */}
                <tbody>
                  {DAY_LABELS.map((dayLabel, dayIdx) => {
                    return (
                      <tr key={dayLabel}>
                        <td
                          style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            textAlign: "center",
                            padding: "4px 2px",
                            fontSize: 10,
                            fontWeight: 800,
                            background:
                              "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.1))",
                            color: "rgba(255,255,255,0.85)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {dayLabel}
                        </td>

                        {TIME_COLUMNS.map((_col, colIdx) => {
                          const cell = SLOT_GRID[dayIdx]?.[colIdx];
                          const cellKey = `${dayLabel}-${colIdx}`;

                          // ── Lunch cell ──
                          if (colIdx === 4) {
                            const lunchEntries = lunchByDay.get(dayIdx) ?? [];
                            const lunchFilled = lunchEntries.length > 0;
                            const lunchFirst = lunchEntries[0] ?? null;
                            const isFormOpen = lunchFormDay === dayIdx;

                            return (
                              <td
                                key={cellKey}
                                onKeyDown={(e) => {
                                  if (
                                    (e.key === "Enter" || e.key === " ") &&
                                    lunchFilled &&
                                    lunchFirst
                                  ) {
                                    setDeleteCell({
                                      entryId: lunchFirst.id,
                                      label: `${lunchFirst.courseName} (Lunch ${DAY_SHORTS[dayIdx]})`,
                                    });
                                  }
                                }}
                                style={{
                                  background: lunchFilled
                                    ? (lunchFirst?.color ??
                                      "rgba(212,184,100,0.2)")
                                    : "rgba(212,170,100,0.06)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  padding: "4px",
                                  height: 100,
                                  cursor: lunchFilled ? "pointer" : "default",
                                  WebkitPrintColorAdjust: "exact",
                                  // @ts-ignore
                                  printColorAdjust: "exact",
                                }}
                                onClick={() => {
                                  if (lunchFilled && lunchFirst) {
                                    setDeleteCell({
                                      entryId: lunchFirst.id,
                                      label: `${lunchFirst.courseName} (Lunch ${DAY_SHORTS[dayIdx]})`,
                                    });
                                  }
                                }}
                              >
                                {lunchFilled && lunchFirst ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: "rgba(0,0,0,0.85)",
                                        lineHeight: 1.15,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "95%",
                                        display: "block",
                                      }}
                                    >
                                      {lunchFirst.courseName}
                                    </span>
                                    {lunchFirst.venue && (
                                      <span
                                        style={{
                                          fontSize: 8,
                                          color: "rgba(0,0,0,0.55)",
                                          display: "block",
                                        }}
                                      >
                                        {lunchFirst.venue}
                                      </span>
                                    )}
                                    <span
                                      className="print-hide tt-tap-remove"
                                      style={{
                                        color: "rgba(0,0,0,0.35)",
                                        marginTop: 1,
                                      }}
                                    >
                                      tap to remove
                                    </span>
                                  </div>
                                ) : isFormOpen ? (
                                  <div
                                    style={{
                                      padding: "4px 6px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                    }}
                                  >
                                    <input
                                      className="glass-input"
                                      style={{
                                        fontSize: 9,
                                        padding: "2px 4px",
                                        width: "100%",
                                      }}
                                      placeholder="Class name"
                                      value={lunchName}
                                      onChange={(e) =>
                                        setLunchName(e.target.value)
                                      }
                                    />
                                    <input
                                      className="glass-input"
                                      style={{
                                        fontSize: 9,
                                        padding: "2px 4px",
                                        width: "100%",
                                      }}
                                      placeholder="Venue"
                                      value={lunchVenue}
                                      onChange={(e) =>
                                        setLunchVenue(e.target.value)
                                      }
                                    />
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 3,
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {PASTEL_COLORS.slice(0, 8).map((c) => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() => setLunchColor(c)}
                                          style={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: "50%",
                                            background: c,
                                            border:
                                              lunchColor === c
                                                ? "2px solid rgba(255,255,255,0.9)"
                                                : "1px solid rgba(255,255,255,0.2)",
                                            cursor: "pointer",
                                            padding: 0,
                                            flexShrink: 0,
                                          }}
                                        />
                                      ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 3 }}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddLunchOverride(dayIdx)
                                        }
                                        style={{
                                          flex: 1,
                                          fontSize: 8,
                                          padding: "2px 4px",
                                          background:
                                            "linear-gradient(135deg, #7c3aed, #2563eb)",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                          fontFamily: "inherit",
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLunchFormDay(null)}
                                        style={{
                                          fontSize: 8,
                                          padding: "2px 4px",
                                          background: "rgba(255,255,255,0.06)",
                                          color: "#6B7590",
                                          border:
                                            "1px solid rgba(255,255,255,0.08)",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                          fontFamily: "inherit",
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    {dayIdx === 2 && (
                                      <>
                                        <span style={{ fontSize: 14 }}>🍜</span>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            color: "rgba(180,190,255,0.25)",
                                            fontWeight: 600,
                                            letterSpacing: "0.1em",
                                          }}
                                        >
                                          LUNCH
                                        </span>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      className="print-hide"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLunchFormDay(dayIdx);
                                        setLunchName("");
                                        setLunchVenue("");
                                      }}
                                      style={{
                                        fontSize: 7,
                                        color: "rgba(167,139,250,0.5)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "1px 3px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      + add
                                    </button>
                                  </div>
                                )}
                              </td>
                            );
                          }

                          // ── Merged 2:00–4:45 cell — 2 rows × 2 sub-cols ──
                          // ROW 1 (2:00–3:15): lab slot top cell
                          // ROW 2 (3:30–4:45): lecture slot bottom cell
                          // Col 7 = lecture slots (H/J/K/L/M) that occur in the 14:00 and 15:30 sub-cols
                          if (colIdx === 6) {
                            // Lab slot for this day (P/Q/R/S/T)
                            const labSlotLetter = SLOT_GRID[dayIdx]?.[6] as
                              | string
                              | null;
                            const labEntries = labSlotLetter
                              ? (entryGrid.get(`${dayIdx}__6`) ?? []).filter(
                                  (e) => e.slot === labSlotLetter,
                                )
                              : [];

                            // Col 7 slot for this day (lecture at 14:00–15:15 and 15:30–16:45, e.g. H/J/K/L/M)
                            const hourly7Letter = SLOT_GRID[dayIdx]?.[7] as
                              | string
                              | null;
                            const hourly7Entries = hourly7Letter
                              ? (entryGrid.get(`${dayIdx}__7`) ?? []).filter(
                                  (e) => e.slot === hourly7Letter,
                                )
                              : [];

                            // Helper: mini-cell for a single slot
                            const miniCell = (
                              entries: TimetableEntry[],
                              slotLetter: string | null,
                              _isLab: boolean,
                            ) => {
                              const isEmpty = entries.length === 0;
                              return (
                                <div
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    minHeight: 60,
                                    background: isEmpty
                                      ? "rgba(255,255,255,0.02)"
                                      : "transparent",
                                    borderRadius: 4,
                                    border: isEmpty
                                      ? `1px dashed rgba(255,255,255,${_isLab ? "0.08" : "0.05"})`
                                      : "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    overflow: "visible",
                                    justifyContent: isEmpty
                                      ? "center"
                                      : "flex-start",
                                    WebkitPrintColorAdjust: "exact",
                                    // @ts-ignore
                                    printColorAdjust: "exact",
                                  }}
                                >
                                  {isEmpty
                                    ? slotLetter && (
                                        <span
                                          style={{
                                            fontSize: 8,
                                            color: "rgba(255,255,255,0.15)",
                                            textAlign: "center",
                                            fontWeight: 700,
                                          }}
                                        >
                                          ({slotLetter})
                                        </span>
                                      )
                                    : entries.map((e) =>
                                        renderSlotBlock(e, slotLetter, true),
                                      )}
                                </div>
                              );
                            };

                            return (
                              <motion.td
                                key={`${dayLabel}-6-7-merged`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  delay: (dayIdx * 9 + 6) * 0.008,
                                  duration: 0.25,
                                }}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  background: "rgba(124,58,237,0.06)",
                                  padding: "3px",
                                  height: 100,
                                  cursor: "default",
                                  WebkitPrintColorAdjust: "exact",
                                  // @ts-ignore
                                  printColorAdjust: "exact",
                                  position: "relative",
                                  verticalAlign: "top",
                                }}
                              >
                                {/*
                                 * 2×2 grid layout (column-based):
                                 *
                                 *   Col 1 (2:00–3:15)  |  Col 2 (3:30–4:45)
                                 *   ─────────────────────────────────────────
                                 *   Lab top cell        |  Lab top cell
                                 *   ─────────────────────────────────────────
                                 *   Hourly7 bottom cell |  Hourly7 bottom cell
                                 *
                                 * Lab slots (P/Q/R/S/T) fill BOTH top cells.
                                 * Lecture slot (H/J/K/L/M from col7) fills both bottom cells.
                                 * When there is no lab, the top cells are empty placeholders.
                                 */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    height: "100%",
                                    gap: 3,
                                  }}
                                >
                                  {/* SUB-COLUMN 1 — 2:00–3:15 */}
                                  <div
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                      minWidth: 0,
                                    }}
                                  >
                                    {/* Top: lab slot */}
                                    {miniCell(labEntries, labSlotLetter, true)}
                                    {/* Bottom: hourly7 lecture slot */}
                                    {miniCell(
                                      hourly7Entries,
                                      hourly7Letter,
                                      false,
                                    )}
                                  </div>
                                  {/* SUB-COLUMN 2 — 3:30–4:45 */}
                                  <div
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                      minWidth: 0,
                                    }}
                                  >
                                    {/* Top: same lab slot (lab occupies both sub-columns' top) */}
                                    {miniCell(labEntries, labSlotLetter, true)}
                                    {/* Bottom: same hourly7 lecture slot (mirrors left column) */}
                                    {miniCell(
                                      hourly7Entries,
                                      hourly7Letter,
                                      false,
                                    )}
                                  </div>
                                </div>
                              </motion.td>
                            );
                          }

                          // ── Skip col 7 only — it is rendered inside the merged 2:00–4:45 cell ──
                          // Col 8 (17:00–17:50) gets its own cell below
                          if (colIdx === 7) return null;

                          // ── Col 8 — 17:00–17:50 standalone cell ──
                          if (colIdx === 8) {
                            const slotLetter8 = cell as string | null;
                            const entries8 = slotLetter8
                              ? (
                                  entryGrid.get(`${dayIdx}__${colIdx}`) ?? []
                                ).filter((e) => e.slot === slotLetter8)
                              : [];
                            const { content: content8 } = renderCellEntries(
                              entries8,
                              slotLetter8,
                              dayLabel,
                              colIdx,
                            );
                            return (
                              <motion.td
                                key={`${dayLabel}-8-17h`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  delay: (dayIdx * 11 + 8) * 0.008,
                                  duration: 0.25,
                                }}
                                className="tt-cell"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  background: "rgba(255,255,255,0.02)",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  padding: "4px 3px",
                                  height: 100,
                                  cursor: "default",
                                  WebkitPrintColorAdjust: "exact",
                                  // @ts-ignore
                                  printColorAdjust: "exact",
                                  position: "relative",
                                }}
                              >
                                {content8}
                              </motion.td>
                            );
                          }

                          // ── Normal cell ──
                          const slotLetter = cell as string | null;
                          const cellEntries = slotLetter
                            ? (
                                entryGrid.get(`${dayIdx}__${colIdx}`) ?? []
                              ).filter((e) => e.slot === slotLetter)
                            : [];
                          const { content } = renderCellEntries(
                            cellEntries,
                            slotLetter,
                            dayLabel,
                            colIdx,
                          );

                          return (
                            <motion.td
                              key={cellKey}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                delay: (dayIdx * 9 + colIdx) * 0.008,
                                duration: 0.25,
                              }}
                              className="tt-cell"
                              style={{
                                border: "1px solid rgba(255,255,255,0.07)",
                                background: "rgba(255,255,255,0.02)",
                                textAlign: "center",
                                verticalAlign: "middle",
                                padding: "4px 3px",
                                height: 100,
                                cursor: "default",
                                WebkitPrintColorAdjust: "exact",
                                // @ts-ignore
                                printColorAdjust: "exact",
                                position: "relative",
                              }}
                            >
                              {content}
                            </motion.td>
                          );
                        })}

                        {/* Extra slot column */}
                        {(() => {
                          const active = extraByDay.get(dayIdx) ?? [];
                          return (
                            <td
                              key={`extra-${dayLabel}`}
                              style={{
                                background: "rgba(124,58,237,0.06)",
                                border: "1px solid rgba(167,139,250,0.15)",
                                textAlign: "center",
                                verticalAlign: "middle",
                                padding: 4,
                                height: 100,
                              }}
                            >
                              {active.length > 0 && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: 2,
                                    height: "100%",
                                  }}
                                >
                                  {active.map((entry) => {
                                    const solidBg = entry.color ?? "#7c3aed";
                                    const txtColor = getContrastColor(solidBg);
                                    const subTxt =
                                      txtColor === "#111827"
                                        ? "rgba(0,0,0,0.6)"
                                        : "rgba(255,255,255,0.75)";
                                    const mutedTxt =
                                      txtColor === "#111827"
                                        ? "rgba(0,0,0,0.4)"
                                        : "rgba(255,255,255,0.45)";
                                    return (
                                      <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() =>
                                          setDeleteCell({
                                            entryId: entry.id,
                                            label: `${entry.courseName} (${DAY_SHORTS[dayIdx]} extra)`,
                                          })
                                        }
                                        style={{
                                          padding: "3px 5px",
                                          borderRadius: 4,
                                          background: solidBg,
                                          cursor: "pointer",
                                          border: "none",
                                          width: "100%",
                                          flex: 1,
                                          fontFamily: "inherit",
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "flex-start",
                                          justifyContent: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 800,
                                            color: txtColor,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            maxWidth: "100%",
                                            display: "block",
                                          }}
                                        >
                                          {entry.courseCode ||
                                            entry.courseName.slice(0, 8)}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 7,
                                            color: subTxt,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            maxWidth: "100%",
                                            display: "block",
                                          }}
                                        >
                                          {entry.courseName.length > 12
                                            ? `${entry.courseName.slice(0, 11)}…`
                                            : entry.courseName}
                                        </span>
                                        {entry.venue && (
                                          <span
                                            style={{
                                              fontSize: 6,
                                              color: mutedTxt,
                                              display: "block",
                                            }}
                                          >
                                            {entry.venue}
                                          </span>
                                        )}
                                        <span
                                          className="print-hide tt-tap-remove"
                                          style={{ color: mutedTxt }}
                                        >
                                          tap to remove
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
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
                    paddingTop: 10,
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
                          WebkitPrintColorAdjust: "exact", // @ts-ignore
                          printColorAdjust: "exact",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 700, color: "#B0BAD0" }}>
                        {c.slot === "EXTRA_6_8"
                          ? "Extra"
                          : c.slot === "LUNCH"
                            ? "Lunch"
                            : `Slot ${c.slot}`}
                      </span>
                      <span style={{ color: "#4A5270" }}>—</span>
                      <span style={{ color: "#8B95B0" }}>
                        {c.code || c.name}
                      </span>
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
          </div>
        </div>
      </div>

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
                    {c.slot === "EXTRA_6_8"
                      ? "Extra Slot (18:00–20:00)"
                      : c.slot === "LUNCH"
                        ? "Lunch Slot (12:00–13:00)"
                        : isLabSlot(c.slot)
                          ? `Slot ${c.slot} (14:00–16:45 Lab)`
                          : `Slot ${c.slot}`}
                    {c.venue && (
                      <span style={{ color: "#6B7590", fontWeight: 400 }}>
                        {" "}
                        · {c.venue}
                      </span>
                    )}
                    {c.hoursPerWeek && (
                      <span style={{ fontSize: 10, color: "#4A5270" }}>
                        {" "}
                        · {c.hoursPerWeek} hrs/wk
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  data-ocid={`timetable.delete_button.${idx + 1}`}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => {
                    onDeleteCourse(c.id);
                    onDeleteEntriesForCourse(c.id);
                  }}
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

      {/* Delete cell confirmation modal */}
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
                  type="button"
                  className="glass-btn"
                  style={{ padding: "9px 20px", fontSize: 13 }}
                  onClick={() => setDeleteCell(null)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  data-ocid="timetable.delete_button"
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  className="btn-gradient"
                  style={{
                    padding: "9px 20px",
                    fontSize: 13,
                    background: "linear-gradient(135deg,#e05555,#c04040)",
                  }}
                  onClick={() => {
                    if (deleteCell.entryId) {
                      // Delete ONLY this specific entry instance
                      onDeleteTimetableEntry(deleteCell.entryId);
                    } else if (deleteCell.courseId) {
                      // Legacy: full course delete (from course cards)
                      onDeleteCourse(deleteCell.courseId);
                      onDeleteEntriesForCourse(deleteCell.courseId);
                    } else if (deleteCell.overrideKey) {
                      const [dayShort, ovSlotKey] =
                        deleteCell.overrideKey.split("__");
                      const fullDay = DAYS.find(
                        (d) => d.slice(0, 3).toUpperCase() === dayShort,
                      );
                      saveOverrides(
                        overrides.filter(
                          (o) => !(o.day === fullDay && o.slot === ovSlotKey),
                        ),
                      );
                    }
                    setDeleteCell(null);
                  }}
                >
                  Remove This Instance
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lunch Add Form Modal (large screen) */}
      <AnimatePresence>
        {lunchFormDay !== null && (
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
            onClick={() => setLunchFormDay(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, #12142a 0%, #0d0f20 100%)",
                border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: 16,
                padding: "28px 32px",
                minWidth: 320,
                maxWidth: 420,
                width: "90%",
                boxShadow: "0 0 40px rgba(139,92,246,0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#F0F4FF",
                  marginBottom: 4,
                }}
              >
                Add Lunch Class
              </div>
              <div style={{ fontSize: 12, color: "#6B7590", marginBottom: 18 }}>
                {DAY_SHORTS[lunchFormDay ?? 0]} · 12:00–13:00
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <input
                  className="glass-input"
                  placeholder="Class / Course Name *"
                  value={lunchName}
                  onChange={(e) => setLunchName(e.target.value)}
                />
                <input
                  className="glass-input"
                  placeholder="Venue (optional)"
                  value={lunchVenue}
                  onChange={(e) => setLunchVenue(e.target.value)}
                />
                <ColorSwatchPicker
                  selected={lunchColor}
                  onChange={setLunchColor}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="btn-gradient"
                    style={{ flex: 1, padding: "9px 16px", fontSize: 13 }}
                    onClick={() => handleAddLunchOverride(lunchFormDay!)}
                  >
                    Add Class
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="glass-btn"
                    style={{ padding: "9px 16px", fontSize: 13 }}
                    onClick={() => setLunchFormDay(null)}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
