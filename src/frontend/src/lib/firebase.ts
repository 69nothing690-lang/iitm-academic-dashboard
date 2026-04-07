import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACeYwNljzgrk8WAywxKSHoj_juuk2rPbg",
  authDomain: "insti-flow.firebaseapp.com",
  projectId: "insti-flow",
  storageBucket: "insti-flow.firebasestorage.app",
  messagingSenderId: "439140382247",
  appId: "1:439140382247:web:08bdb56afb68e0a9014002",
  measurementId: "G-5MWJ8TFFER",
};

function getApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _provider: GoogleAuthProvider | null = null;

export function firebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}

export function firestoreDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}

export function googleProvider(): GoogleAuthProvider {
  if (!_provider) {
    _provider = new GoogleAuthProvider();
  }
  return _provider;
}

// Legacy async getters (kept for compatibility)
export async function getFirebaseAuth(): Promise<Auth> {
  return firebaseAuth();
}
export async function getFirestoreDb(): Promise<Firestore> {
  return firestoreDb();
}
export async function getGoogleProvider(): Promise<GoogleAuthProvider> {
  return googleProvider();
}
export async function getFirebaseApp(): Promise<FirebaseApp> {
  return getApp();
}
