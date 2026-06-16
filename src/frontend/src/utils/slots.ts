import type { Course } from "../types";

// ─── Time Columns ───────────────────────────────────────────────────────────────────────────────
export interface TimeColumn {
  label: string;
  start: string;
  end: string;
}

export const TIME_COLUMNS: TimeColumn[] = [
  { label: "8:00–8:50", start: "08:00", end: "08:50" },
  { label: "9:00–9:50", start: "09:00", end: "09:50" },
  { label: "10:00–10:50", start: "10:00", end: "10:50" },
  { label: "11:00–11:50", start: "11:00", end: "11:50" },
  { label: "12:00–12:50", start: "12:00", end: "12:50" },
  { label: "13:00–13:50", start: "13:00", end: "13:50" },
  { label: "14:00–15:15", start: "14:00", end: "15:15" },
  { label: "15:30–16:45", start: "15:30", end: "16:45" },
  { label: "17:00–17:50", start: "17:00", end: "17:50" },
];

// Extra slot column index (virtual — after index 8)
export const EXTRA_SLOT_COL_INDEX = 9;
export const EXTRA_SLOT_TIME: TimeColumn = {
  label: "18:00–20:00",
  start: "18:00",
  end: "20:00",
};

// Lunch slot
export const LUNCH_COL_INDEX = 4;
export const LUNCH_SLOT_TIME: TimeColumn = {
  label: "12:00–13:00",
  start: "12:00",
  end: "13:00",
};

// ─── Lab Slots (P, Q, R, S, T) ──────────────────────────────────────────────────────────────────
// P, Q, R, S, T are SEPARATE independent lab slots.
// Each maps to one specific day at the afternoon period (14:00–16:45).
// They do NOT share a single course — each is independently assignable.
export const LAB_SLOTS = ["P", "Q", "R", "S", "T"] as const;
export type LabSlot = (typeof LAB_SLOTS)[number];

export const LAB_START_TIME = "14:00";
export const LAB_END_TIME = "16:45";

/** Returns true if a slot letter is a lab slot (P/Q/R/S/T) */
export function isLabSlot(slot: string): boolean {
  return (LAB_SLOTS as readonly string[]).includes(slot);
}

/** Map each lab slot letter to which day (0=Mon…4=Fri) it occurs */
export const LAB_DAY_MAP: Record<LabSlot, number> = {
  P: 0, // Monday
  Q: 1, // Tuesday
  R: 2, // Wednesday
  S: 3, // Thursday
  T: 4, // Friday
};

// Keep isPQRSTSlot as alias for backward compat
export const isPQRSTSlot = isLabSlot;
export const PQRST_SLOTS = LAB_SLOTS;
export type PQRSTSlot = LabSlot;
export const PQRST_DAY_MAP = LAB_DAY_MAP;
export const PQRST_START_TIME = LAB_START_TIME;
export const PQRST_END_TIME = LAB_END_TIME;

// ─── Slot Grid ────────────────────────────────────────────────────────────────────────────────
// IITM official slot grid — Mon–Fri rows, 9 columns (TIME_COLUMNS).
// Cols 6 and 7 are lab columns. Each cell is the slot letter for that day+col.
// Lab slots P/Q/R/S/T are placed in col 6 of their respective days.
// H, J, K, L, M appear in their proper day+column positions.
//
// Grid layout (each row = day, each col = TIME_COLUMNS index):
//   col: 0    1    2    3    4     5    6    7    8
// Mon:   A    B    C    D    LUNCH G    P    H    J
// Tue:   B    C    D    E    LUNCH A    Q    M    F
// Wed:   C    D    E    F    LUNCH B    R    J    G
// Thu:   E    F    G    A    LUNCH D    S    L    H
// Fri:   F    G    A    B    LUNCH C    T    K    E
//
// Cols 6 and 7 are independent cells — each is its own slot.
export const SLOT_GRID: (string | null)[][] = [
  ["A", "B", "C", "D", null, "G", "P", "H", "J"], // Mon
  ["B", "C", "D", "E", null, "A", "Q", "M", "F"], // Tue
  ["C", "D", "E", "F", null, "B", "R", "J", "G"], // Wed
  ["E", "F", "G", "A", null, "D", "S", "L", "H"], // Thu
  ["F", "G", "A", "B", null, "C", "T", "K", "E"], // Fri
];

// ─── Slot Occurrences ────────────────────────────────────────────────────────────────────────
// Maps slot letter → list of (day, col) where it appears in the timetable grid.
export const SLOT_OCCURRENCES: Record<
  string,
  Array<{ day: number; col: number }>
> = {
  A: [
    { day: 0, col: 0 },
    { day: 1, col: 5 },
    { day: 3, col: 3 },
    { day: 4, col: 2 },
  ],
  B: [
    { day: 0, col: 1 },
    { day: 1, col: 0 },
    { day: 2, col: 5 },
    { day: 4, col: 3 },
  ],
  C: [
    { day: 0, col: 2 },
    { day: 1, col: 1 },
    { day: 2, col: 0 },
    { day: 4, col: 5 },
  ],
  D: [
    { day: 0, col: 3 },
    { day: 1, col: 2 },
    { day: 2, col: 1 },
    { day: 3, col: 5 },
  ],
  E: [
    { day: 1, col: 3 },
    { day: 2, col: 2 },
    { day: 3, col: 0 },
    { day: 4, col: 8 },
  ],
  F: [
    { day: 1, col: 8 },
    { day: 2, col: 3 },
    { day: 3, col: 1 },
    { day: 4, col: 0 },
  ],
  G: [
    { day: 0, col: 5 },
    { day: 2, col: 8 },
    { day: 3, col: 2 },
    { day: 4, col: 1 },
  ],
  // Hourly slots H, J, K, L, M — restored
  H: [
    { day: 0, col: 7 },
    { day: 3, col: 8 },
  ],
  J: [
    { day: 0, col: 8 },
    { day: 2, col: 7 },
  ],
  K: [{ day: 4, col: 7 }],
  L: [{ day: 3, col: 7 }],
  M: [{ day: 1, col: 7 }],
  // Lab slots — each is ONE specific day at col 6 (14:00–16:45)
  P: [{ day: 0, col: 6 }], // Monday
  Q: [{ day: 1, col: 6 }], // Tuesday
  R: [{ day: 2, col: 6 }], // Wednesday
  S: [{ day: 3, col: 6 }], // Thursday
  T: [{ day: 4, col: 6 }], // Friday
};

// ─── Colors ──────────────────────────────────────────────────────────────────────────────────
export const PASTEL_COLORS = [
  "#A8D5BA",
  "#B8C9F0",
  "#F5C6D0",
  "#FFE4A8",
  "#D4B8F0",
  "#B8E8E0",
  "#FFD4B8",
  "#C8E6C9",
  "#FFCDD2",
  "#B3E5FC",
  "#FFF9C4",
  "#F8BBD0",
  "#E1BEE7",
  "#BBDEFB",
  "#B2EBF2",
  "#DCEDC8",
  "#FF7043",
  "#AB47BC",
  "#42A5F5",
  "#26A69A",
  "#EC407A",
  "#FFA726",
  "#66BB6A",
  "#7E57C2",
];

const DEFAULT_SLOT_COLORS: Record<string, string> = {
  A: "#A8D5BA",
  B: "#B8C9F0",
  C: "#F5C6D0",
  D: "#FFE4A8",
  E: "#D4C5F9",
  F: "#B8E8E0",
  G: "#FFDAB9",
  H: "#C8E6C9",
  J: "#B3D9FF",
  K: "#FFB3C6",
  L: "#C5E3F7",
  M: "#F9D5A7",
  P: "#E8D5F9",
  Q: "#D5F0E8",
  R: "#F9E8D5",
  S: "#D5E8F9",
  T: "#F9D5E8",
  EXTRA_6_8: "#C4B5FD",
  LUNCH: "#D4B8F0",
};

export function getSlotColor(slot: string): string {
  return DEFAULT_SLOT_COLORS[slot] ?? "#B8C9F0";
}

// ─── Class Info ───────────────────────────────────────────────────────────────────────────────
export interface ClassInfo {
  id: string;
  entryId?: string; // TimetableEntry id (unique per cell)
  name: string;
  code: string;
  slot: string;
  venue?: string;
  color: string;
  startTime: string;
  endTime: string;
}

export function getClassesOnDay(
  dayOfWeek: number,
  courses: Course[],
): ClassInfo[] {
  const dayIdx = dayOfWeek - 1;
  if (dayIdx < 0 || dayIdx > 4) return [];

  const results: ClassInfo[] = [];
  for (const course of courses) {
    const occs = SLOT_OCCURRENCES[course.slot] ?? [];
    for (const occ of occs) {
      if (occ.day === dayIdx) {
        const col = TIME_COLUMNS[occ.col];
        results.push({
          id: course.id,
          name: course.name,
          code: course.code,
          slot: course.slot,
          venue: course.venue,
          color: course.color ?? DEFAULT_SLOT_COLORS[course.slot] ?? "#B8C9F0",
          startTime: col.start,
          endTime: col.end,
        });
      }
    }
  }
  results.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return results;
}

/**
 * Get today's classes from TimetableEntries (new data model).
 * Also includes EXTRA_6_8 slots.
 */
export function getClassesOnDayFromEntries(
  dayOfWeek: number,
  entries: import("../types").TimetableEntry[],
): ClassInfo[] {
  const dayIdx = dayOfWeek - 1;
  if (dayIdx < 0 || dayIdx > 4) return [];

  const results: ClassInfo[] = [];

  for (const entry of entries) {
    if (entry.day === dayIdx) {
      results.push({
        id: entry.courseId,
        entryId: entry.id,
        name: entry.courseName,
        code: entry.courseCode,
        slot: entry.slot,
        venue: entry.venue,
        color: entry.color ?? DEFAULT_SLOT_COLORS[entry.slot] ?? "#B8C9F0",
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }
  }
  results.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return results;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getSlotScheduleDesc(slot: string): string {
  if (slot === "EXTRA_6_8") return "Mon–Fri 18:00–20:00";
  if (isLabSlot(slot)) {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const dayIdx = LAB_DAY_MAP[slot as LabSlot];
    return `${dayNames[dayIdx]} 14:00–16:45 (Lab)`;
  }
  const occs = SLOT_OCCURRENCES[slot] ?? [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return occs
    .map((o) => `${dayNames[o.day]} ${TIME_COLUMNS[o.col].start}`)
    .join(", ");
}

/**
 * Calculate total class hours for a list of ClassInfo items.
 * Theory slots (A-M): 1 hour each occurrence
 * Lab slots (P-T): 2.75 hours each
 * Extra slot (EXTRA_6_8): 2 hours each
 */
export function calcTotalClassHours(classes: ClassInfo[]): {
  totalMinutes: number;
  formatted: string;
} {
  let totalMinutes = 0;
  for (const c of classes) {
    if (c.slot === "EXTRA_6_8") {
      totalMinutes += 120; // 2 hours
    } else if (isLabSlot(c.slot)) {
      totalMinutes += 165; // 2h 45m = 165 min
    } else {
      totalMinutes += 60; // 1 hour for theory slots
    }
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formatted =
    hours > 0 && mins > 0
      ? `${hours}h ${mins}m`
      : hours > 0
        ? `${hours}h`
        : `${mins}m`;
  return { totalMinutes, formatted };
}
