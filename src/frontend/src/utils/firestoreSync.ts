import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cdnImport = (url: string): Promise<any> =>
  new Function("u", "return import(u)")(url);

const CDN = "https://www.gstatic.com/firebasejs/10.12.0";

export interface FirestoreData {
  courses: Course[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  semSettings: SemSettings | null;
  studentName: string;
  examEntries: ExamEntry[];
}

export async function saveToFirestore(
  userId: string,
  data: FirestoreData,
): Promise<void> {
  try {
    const { getFirestoreDb } = await import("../lib/firebase");
    const db = await getFirestoreDb();
    if (!db) return;
    const { doc, setDoc } = await cdnImport(`${CDN}/firebase-firestore.js`);
    const ref = doc(db, "users", userId);
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.warn("saveToFirestore failed:", err);
  }
}

export async function loadFromFirestore(
  userId: string,
): Promise<FirestoreData | null> {
  try {
    const { getFirestoreDb } = await import("../lib/firebase");
    const db = await getFirestoreDb();
    if (!db) return null;
    const { doc, getDoc } = await cdnImport(`${CDN}/firebase-firestore.js`);
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as FirestoreData;
  } catch (err) {
    console.warn("loadFromFirestore failed:", err);
    return null;
  }
}
