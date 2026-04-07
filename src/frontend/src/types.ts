export interface Course {
  id: string;
  name: string;
  code: string;
  slot: string;
  venue?: string;
  color?: string; // hex color chosen by user
  hoursPerWeek?: number;
}

// Each cell in the timetable grid is a unique TimetableEntry.
// This allows removing a Monday 9AM class without affecting the same
// course on other days.
export interface TimetableEntry {
  id: string; // unique per cell instance
  courseId: string; // links back to Course for attendance/exams
  courseName: string;
  courseCode: string;
  slot: string; // e.g. "A", "EXTRA_6_8"
  day: number; // 0=Mon … 4=Fri
  colIndex: number; // TIME_COLUMNS index (or 9 for extra slot)
  startTime: string;
  endTime: string;
  venue?: string;
  color?: string;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  status: "attended" | "absent" | "cancelled";
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  notes?: string;
  completed: boolean;
}

export interface SemSettings {
  year: number;
  semType: "even" | "odd";
  overridden: boolean;
}

export interface ExamEntry {
  id: string;
  courseId: string;
  examType: "quiz1" | "quiz2" | "endSem";
  date: string;
  custom?: boolean;
}
