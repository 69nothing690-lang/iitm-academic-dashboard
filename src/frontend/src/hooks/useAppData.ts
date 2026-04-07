import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
  TimetableEntry,
} from "../types";
import {
  type FirestoreData,
  loadFromFirestore,
  saveToFirestore,
  subscribeToFirestore,
} from "../utils/firestoreSync";
import { autoDetectSem } from "../utils/semester";
import { getItem, setItem } from "../utils/storage";

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
  const isSync = storageMode === "sync" && !!userId;
  const [isCloudLoading, setIsCloudLoading] = useState(isSync);

  // Ref to suppress Firestore writes during initial cloud load
  const suppressSaveUntil = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we're receiving updates from onSnapshot (to avoid echo-back saves)
  const receivingSnapshot = useRef(false);

  // ── Initial state ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>(() =>
    getItem<Course[]>("courses", []),
  );

  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>(
    () => getItem<TimetableEntry[]>("timetableEntries", []),
  );

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() =>
    getItem<AttendanceRecord[]>("attendance", []),
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    getItem<Task[]>("tasks", []),
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

  // ── Cloud load on mount (sync mode only) ──────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (!isSync) return;

    let unsubscribe: (() => void) | null = null;

    const initCloud = async () => {
      try {
        const cloudData = await loadFromFirestore(userId!);
        if (cloudData) {
          suppressSaveUntil.current = Date.now() + 5000;
          setCourses(cloudData.courses ?? []);
          setTimetableEntries((cloudData as any).timetableEntries ?? []);
          setAttendance(cloudData.attendance ?? []);
          setTasks(cloudData.tasks ?? []);
          if (cloudData.semSettings) setSemSettings(cloudData.semSettings);
          if (cloudData.studentName) setStudentName(cloudData.studentName);
          setExamEntries(cloudData.examEntries ?? []);
        } else if (migrateLocal) {
          const localData: FirestoreData & {
            timetableEntries: TimetableEntry[];
          } = {
            courses: getItem<Course[]>("courses", []),
            timetableEntries: getItem<TimetableEntry[]>("timetableEntries", []),
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
          await saveToFirestore(userId!, localData);
          setCourses(localData.courses);
          setTimetableEntries(localData.timetableEntries);
          setAttendance(localData.attendance);
          setTasks(localData.tasks);
          setSemSettings(
            localData.semSettings ?? {
              year: new Date().getFullYear(),
              semType: autoDetectSem(),
              overridden: false,
            },
          );
          setStudentName(localData.studentName);
          setExamEntries(localData.examEntries);
        }
      } catch (e) {
        console.warn("Firestore load failed, using local data:", e);
      } finally {
        setIsCloudLoading(false);
      }

      try {
        unsubscribe = subscribeToFirestore(userId!, (data) => {
          if (receivingSnapshot.current) return;
          receivingSnapshot.current = true;
          suppressSaveUntil.current = Date.now() + 3000;
          setCourses(data.courses ?? []);
          setTimetableEntries((data as any).timetableEntries ?? []);
          setAttendance(data.attendance ?? []);
          setTasks(data.tasks ?? []);
          if (data.semSettings) setSemSettings(data.semSettings);
          if (data.studentName) setStudentName(data.studentName);
          setExamEntries(data.examEntries ?? []);
          setTimeout(() => {
            receivingSnapshot.current = false;
          }, 200);
        });
      } catch (e) {
        console.warn("Firestore onSnapshot failed:", e);
      }
    };

    initCloud();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // ── localStorage persistence (always, for offline resilience) ──────────────────────
  useEffect(() => {
    setItem("courses", courses);
  }, [courses]);
  useEffect(() => {
    setItem("timetableEntries", timetableEntries);
  }, [timetableEntries]);
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

  // ── Firestore sync (debounced, only in sync mode) ─────────────────────────────
  useEffect(() => {
    if (!isSync) return;
    if (receivingSnapshot.current) return;
    if (Date.now() < suppressSaveUntil.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (receivingSnapshot.current) return;
      if (Date.now() < suppressSaveUntil.current) return;
      saveToFirestore(userId!, {
        courses,
        timetableEntries,
        attendance,
        tasks,
        semSettings,
        studentName,
        examEntries,
      } as any).catch((e) => console.warn("Firestore save failed:", e));
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    courses,
    timetableEntries,
    attendance,
    tasks,
    semSettings,
    studentName,
    examEntries,
    isSync,
    userId,
  ]);

  // ── Mutations ────────────────────────────────────────────────────────────────────────
  const addCourse = useCallback(
    (c: Course) => setCourses((prev) => [...prev, c]),
    [],
  );
  const deleteCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id)),
    [],
  );

  // TimetableEntry mutations
  const addTimetableEntry = useCallback(
    (e: TimetableEntry) => setTimetableEntries((prev) => [...prev, e]),
    [],
  );
  const addTimetableEntries = useCallback(
    (entries: TimetableEntry[]) =>
      setTimetableEntries((prev) => [...prev, ...entries]),
    [],
  );
  const deleteTimetableEntry = useCallback(
    (id: string) =>
      setTimetableEntries((prev) => prev.filter((e) => e.id !== id)),
    [],
  );
  const deleteEntriesForCourse = useCallback(
    (courseId: string) =>
      setTimetableEntries((prev) =>
        prev.filter((e) => e.courseId !== courseId),
      ),
    [],
  );

  const addAttendance = useCallback(
    (r: AttendanceRecord) => setAttendance((prev) => [...prev, r]),
    [],
  );
  const deleteAttendance = useCallback(
    (id: string) => setAttendance((prev) => prev.filter((r) => r.id !== id)),
    [],
  );
  const updateAttendance = useCallback(
    (id: string, status: AttendanceRecord["status"]) =>
      setAttendance((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      ),
    [],
  );

  const addTask = useCallback(
    (t: Task) => setTasks((prev) => [...prev, t]),
    [],
  );
  const deleteTask = useCallback(
    (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const toggleTask = useCallback(
    (id: string) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      ),
    [],
  );

  const addExamEntry = useCallback(
    (e: ExamEntry) => setExamEntries((prev) => [...prev, e]),
    [],
  );
  const deleteExamEntry = useCallback(
    (id: string) => setExamEntries((prev) => prev.filter((e) => e.id !== id)),
    [],
  );

  const setExamOverride = useCallback(
    (
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
    },
    [],
  );

  const clearExamOverride = useCallback(
    (courseId: string, examType: "quiz1" | "quiz2" | "endSem") => {
      setExamEntries((prev) =>
        prev.filter(
          (e) => !(e.courseId === courseId && e.examType === examType),
        ),
      );
    },
    [],
  );

  return {
    isCloudLoading,
    courses,
    addCourse,
    deleteCourse,
    timetableEntries,
    addTimetableEntry,
    addTimetableEntries,
    deleteTimetableEntry,
    deleteEntriesForCourse,
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
