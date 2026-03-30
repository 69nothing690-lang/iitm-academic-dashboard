import { useEffect, useRef, useState } from "react";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
} from "../types";
import {
  type FirestoreData,
  loadFromFirestore,
  saveToFirestore,
} from "../utils/firestoreSync";
import { autoDetectSem } from "../utils/semester";
import { getItem, setItem } from "../utils/storage";

const SAMPLE_COURSES: Course[] = [
  {
    id: "1",
    name: "Mathematics III",
    code: "MA3201",
    slot: "A",
    venue: "CLT",
    color: "#A8D5BA",
    hoursPerWeek: 4,
  },
  {
    id: "2",
    name: "Physics",
    code: "PH2201",
    slot: "B",
    venue: "ESB 244",
    color: "#B8C9F0",
    hoursPerWeek: 3,
  },
  {
    id: "3",
    name: "Chemistry",
    code: "CY2101",
    slot: "C",
    venue: "HSB 315",
    color: "#F5C6D0",
    hoursPerWeek: 3,
  },
  {
    id: "4",
    name: "Introduction to Programming",
    code: "CS1100",
    slot: "D",
    venue: "CS Lab",
    color: "#FFE4A8",
    hoursPerWeek: 4,
  },
];

function genSampleAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const courseIds = ["1", "2", "3", "4"];
  const statuses: Array<"attended" | "absent"> = [
    "attended",
    "attended",
    "attended",
    "attended",
    "attended",
    "absent",
  ];
  let id = 1;
  for (const cid of courseIds) {
    for (let i = 20; i >= 1; i--) {
      const d = new Date(2026, 0, 6 + i * 2);
      if (d.getDay() === 0) continue;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      records.push({
        id: String(id++),
        courseId: cid,
        date: d.toISOString().split("T")[0],
        status,
      });
    }
  }
  return records;
}

interface UseAppDataOptions {
  userId?: string;
  storageMode?: "local" | "sync";
  migrateLocal?: boolean;
}

export function useAppData({
  userId,
  storageMode = "local",
  migrateLocal = false,
}: UseAppDataOptions = {}) {
  const [isCloudLoading, setIsCloudLoading] = useState(
    storageMode === "sync" && !!userId,
  );

  // Ref to suppress Firestore writes during initial cloud load
  const suppressSaveUntil = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [courses, setCourses] = useState<Course[]>(() => {
    const stored = getItem<Course[]>("courses", []);
    if (stored.length === 0) return SAMPLE_COURSES;
    return stored;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const stored = getItem<AttendanceRecord[]>("attendance", []);
    if (stored.length === 0) return genSampleAttendance();
    return stored;
  });

  const [tasks, setTasks] = useState<Task[]>(() =>
    getItem<Task[]>("tasks", [
      {
        id: "t1",
        title: "Submit MA3201 Assignment",
        date: "2026-02-10",
        completed: false,
      },
      {
        id: "t2",
        title: "Physics Lab Report",
        date: "2026-02-12",
        time: "17:00",
        completed: false,
      },
      {
        id: "t3",
        title: "Chemistry Quiz Prep",
        date: "2026-02-15",
        completed: false,
      },
    ]),
  );

  const [semSettings, setSemSettings] = useState<SemSettings>(() =>
    getItem<SemSettings>("semSettings", {
      year: new Date().getFullYear(),
      semType: autoDetectSem(),
      overridden: false,
    }),
  );

  const [studentName, setStudentName] = useState<string>(() =>
    getItem<string>("studentName", "Scholar"),
  );

  const [examEntries, setExamEntries] = useState<ExamEntry[]>(() =>
    getItem<ExamEntry[]>("examEntries", []),
  );

  // ── Cloud load on mount (sync mode only) ──────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (storageMode !== "sync" || !userId) return;

    const loadCloud = async () => {
      try {
        const cloudData = await loadFromFirestore(userId);
        if (cloudData) {
          // Suppress Firestore writes for 3s while we apply cloud data
          suppressSaveUntil.current = Date.now() + 3000;
          if (cloudData.courses?.length) setCourses(cloudData.courses);
          if (cloudData.attendance?.length) setAttendance(cloudData.attendance);
          if (cloudData.tasks?.length) setTasks(cloudData.tasks);
          if (cloudData.semSettings) setSemSettings(cloudData.semSettings);
          if (cloudData.studentName) setStudentName(cloudData.studentName);
          if (cloudData.examEntries?.length)
            setExamEntries(cloudData.examEntries);
        } else if (migrateLocal) {
          // No cloud doc yet — push local data up immediately
          const localData: FirestoreData = {
            courses: getItem<Course[]>("courses", SAMPLE_COURSES),
            attendance: getItem<AttendanceRecord[]>("attendance", []),
            tasks: getItem<Task[]>("tasks", []),
            semSettings: getItem<SemSettings>("semSettings", {
              year: new Date().getFullYear(),
              semType: autoDetectSem(),
              overridden: false,
            }),
            studentName: getItem<string>("studentName", "Scholar"),
            examEntries: getItem<ExamEntry[]>("examEntries", []),
          };
          await saveToFirestore(userId, localData);
        }
      } catch (e) {
        console.warn("Firestore load failed, using local data:", e);
      } finally {
        setIsCloudLoading(false);
      }
    };

    loadCloud();
  }, []);

  // ── localStorage persistence ───────────────────────────────────────────────
  useEffect(() => {
    setItem("courses", courses);
  }, [courses]);
  useEffect(() => {
    setItem("attendance", attendance);
  }, [attendance]);
  useEffect(() => {
    setItem("tasks", tasks);
  }, [tasks]);
  useEffect(() => {
    setItem("semSettings", semSettings);
  }, [semSettings]);
  useEffect(() => {
    setItem("studentName", studentName);
  }, [studentName]);
  useEffect(() => {
    setItem("examEntries", examEntries);
  }, [examEntries]);

  // ── Firestore sync (debounced, only in sync mode) ─────────────────────────
  useEffect(() => {
    if (storageMode !== "sync" || !userId) return;
    if (Date.now() < suppressSaveUntil.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToFirestore(userId, {
        courses,
        attendance,
        tasks,
        semSettings,
        studentName,
        examEntries,
      }).catch((e) => console.warn("Firestore save failed:", e));
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    courses,
    attendance,
    tasks,
    semSettings,
    studentName,
    examEntries,
    storageMode,
    userId,
  ]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addCourse = (c: Course) => setCourses((prev) => [...prev, c]);
  const deleteCourse = (id: string) =>
    setCourses((prev) => prev.filter((c) => c.id !== id));

  const addAttendance = (r: AttendanceRecord) =>
    setAttendance((prev) => [...prev, r]);
  const deleteAttendance = (id: string) =>
    setAttendance((prev) => prev.filter((r) => r.id !== id));
  const updateAttendance = (id: string, status: AttendanceRecord["status"]) =>
    setAttendance((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );

  const addTask = (t: Task) => setTasks((prev) => [...prev, t]);
  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));
  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

  const addExamEntry = (e: ExamEntry) => setExamEntries((prev) => [...prev, e]);
  const deleteExamEntry = (id: string) =>
    setExamEntries((prev) => prev.filter((e) => e.id !== id));

  const setExamOverride = (
    courseId: string,
    examType: "quiz1" | "quiz2" | "endSem",
    date: string,
  ) => {
    setExamEntries((prev) => {
      const filtered = prev.filter(
        (e) => !(e.courseId === courseId && e.examType === examType),
      );
      return [
        ...filtered,
        {
          id: `${courseId}-${examType}`,
          courseId,
          examType,
          date,
          custom: true,
        },
      ];
    });
  };

  const clearExamOverride = (
    courseId: string,
    examType: "quiz1" | "quiz2" | "endSem",
  ) => {
    setExamEntries((prev) =>
      prev.filter((e) => !(e.courseId === courseId && e.examType === examType)),
    );
  };

  return {
    isCloudLoading,
    courses,
    addCourse,
    deleteCourse,
    attendance,
    addAttendance,
    deleteAttendance,
    updateAttendance,
    tasks,
    addTask,
    deleteTask,
    toggleTask,
    semSettings,
    setSemSettings,
    studentName,
    setStudentName,
    examEntries,
    addExamEntry,
    deleteExamEntry,
    setExamOverride,
    clearExamOverride,
  };
}
