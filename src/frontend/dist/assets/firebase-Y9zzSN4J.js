const cdnImport = (url) => new Function("u", "return import(u)")(url);
const firebaseConfig = {
  apiKey: "AIzaSyACeYwNljzgrk8WAywxKSHoj_juuk2rPbg",
  authDomain: "insti-flow.firebaseapp.com",
  projectId: "insti-flow",
  storageBucket: "insti-flow.firebasestorage.app",
  messagingSenderId: "439140382247",
  appId: "1:439140382247:web:08bdb56afb68e0a9014002",
  measurementId: "G-5MWJ8TFFER"
};
const CDN = "https://www.gstatic.com/firebasejs/10.12.0";
let _app = null;
let _auth = null;
let _db = null;
let _googleProvider = null;
async function getFirebaseApp() {
  if (_app) return _app;
  try {
    const { initializeApp } = await cdnImport(`${CDN}/firebase-app.js`);
    _app = initializeApp(firebaseConfig);
  } catch {
    console.warn("Firebase app init failed");
  }
  return _app;
}
async function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    const app = await getFirebaseApp();
    if (!app) return null;
    const { getAuth } = await cdnImport(`${CDN}/firebase-auth.js`);
    _auth = getAuth(app);
  } catch {
    console.warn("Firebase auth init failed");
  }
  return _auth;
}
async function getGoogleProvider() {
  if (_googleProvider) return _googleProvider;
  try {
    const { GoogleAuthProvider } = await cdnImport(`${CDN}/firebase-auth.js`);
    _googleProvider = new GoogleAuthProvider();
  } catch {
    console.warn("Firebase GoogleAuthProvider init failed");
  }
  return _googleProvider;
}
async function getFirestoreDb() {
  if (_db) return _db;
  try {
    const app = await getFirebaseApp();
    if (!app) return null;
    const { getFirestore } = await cdnImport(`${CDN}/firebase-firestore.js`);
    _db = getFirestore(app);
  } catch {
    console.warn("Firestore init failed");
  }
  return _db;
}
getFirebaseAuth().then((a) => {
});
getGoogleProvider().then((p) => {
});
getFirestoreDb().then((d) => {
});
export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
  getGoogleProvider
};
