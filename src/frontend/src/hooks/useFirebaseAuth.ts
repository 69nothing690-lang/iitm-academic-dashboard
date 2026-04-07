import {
  type User,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth, googleProvider } from "../lib/firebase";

interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

function persistUser(u: User) {
  localStorage.setItem(
    "instiflow_user",
    JSON.stringify({
      uid: u.uid,
      name: u.displayName,
      email: u.email,
      photoURL: u.photoURL,
    }),
  );
  (window as { __instiflow_uid?: string }).__instiflow_uid = u.uid;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = firebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        persistUser(firebaseUser);
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = firebaseAuth();
      const provider = googleProvider();
      const result = await signInWithPopup(auth, provider);
      persistUser(result.user);
      setUser({
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuth());
    } catch {
      // ignore
    }
    localStorage.removeItem("instiflow_user");
    (window as { __instiflow_uid?: string }).__instiflow_uid = undefined;
    setUser(null);
  };

  return { signInWithGoogle, signOut, user, isLoading, error };
}
