export interface Course {
  id: string;
  name: string;
  code: string;
  slot: string;
  venue?: string;
  color?: string; // hex color chosen by user
  hoursPerWeek?: number;
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
