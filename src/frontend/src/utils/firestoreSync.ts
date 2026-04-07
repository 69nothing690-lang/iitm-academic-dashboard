import {
  type Unsubscribe,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { firestoreDb } from "../lib/firebase";
import type {
  AttendanceRecord,
  Course,
  ExamEntry,
  SemSettings,
  Task,
} from "../types";

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
    const db = firestoreDb();
    const ref = doc(db, "users", userId);
    await setDoc(
      ref,
      { ...data, lastUpdated: new Date().toISOString() },
      { merge: true },
    );
  } catch (err) {
    console.warn("saveToFirestore failed:", err);
  }
}

export async function loadFromFirestore(
  userId: string,
): Promise<FirestoreData | null> {
  try {
    const db = firestoreDb();
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as FirestoreData;
  } catch (err) {
    console.warn("loadFromFirestore failed:", err);
    return null;
  }
}

export function subscribeToFirestore(
  userId: string,
  callback: (data: FirestoreData) => void,
): Unsubscribe {
  const db = firestoreDb();
  const ref = doc(db, "users", userId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as FirestoreData);
    }
  });
}
