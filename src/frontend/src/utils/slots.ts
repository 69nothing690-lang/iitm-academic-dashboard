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

// ─── Slot Grid ───────────────────────────────────────────────────────────────────────────────
// Cols 6 and 7 use [top, bottom] tuples for split cells
export const SLOT_GRID: (string | null | [string | null, string | null])[][] = [
  ["A", "B", "C", "D", null, "G", ["P", "H"], ["P", "M"], "J"], // Mon
  ["B", "C", "D", "E", null, "A", ["Q", "M"], ["Q", "H"], "F"], // Tue
  ["C", "D", "E", "F", null, "B", ["R", "J"], ["R", "K"], "G"], // Wed
  ["E", "F", "G", "A", null, "D", ["S", "L"], ["S", "J"], "H"], // Thu
  ["F", "G", "A", "B", null, "C", ["T", "K"], ["T", "L"], "E"], // Fri
];

// ─── Slot Occurrences ────────────────────────────────────────────────────────────────────────
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
  H: [
    { day: 0, col: 6 },
    { day: 1, col: 7 },
    { day: 3, col: 8 },
  ],
  J: [
    { day: 0, col: 8 },
    { day: 2, col: 6 },
    { day: 3, col: 7 },
  ],
  K: [
    { day: 2, col: 7 },
    { day: 4, col: 6 },
  ],
  L: [
    { day: 3, col: 6 },
    { day: 4, col: 7 },
  ],
  M: [
    { day: 0, col: 7 },
    { day: 1, col: 6 },
  ],
  P: [{ day: 0, col: 6 }],
  Q: [{ day: 1, col: 6 }],
  R: [{ day: 2, col: 6 }],
  S: [{ day: 3, col: 6 }],
  T: [{ day: 4, col: 6 }],
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
  const occs = SLOT_OCCURRENCES[slot] ?? [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return occs
    .map((o) => `${dayNames[o.day]} ${TIME_COLUMNS[o.col].start}`)
    .join(", ");
}
