import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cdnImport = (url: string): Promise<any> =>
  new Function("u", "return import(u)")(url);

const CDN = "https://www.gstatic.com/firebasejs/10.12.0";

interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const { getFirebaseAuth } = await import("../lib/firebase");
        const auth = await getFirebaseAuth();
        if (!auth) return;
        const { onAuthStateChanged } = await cdnImport(
          `${CDN}/firebase-auth.js`,
        );
        unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser: FirebaseUser | null) => {
            setUser(firebaseUser);
            if (firebaseUser) {
              (window as { __instiflow_uid?: string }).__instiflow_uid =
                firebaseUser.uid;
              localStorage.setItem(
                "instiflow_user",
                JSON.stringify({
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                }),
              );
            }
          },
        );
      } catch {
        // Firebase unavailable — stay logged out
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { getFirebaseAuth, getGoogleProvider } = await import(
        "../lib/firebase"
      );
      const auth = await getFirebaseAuth();
      const provider = await getGoogleProvider();
      if (!auth || !provider) throw new Error("Firebase not available");
      const { signInWithPopup } = await cdnImport(`${CDN}/firebase-auth.js`);
      const result = await signInWithPopup(auth, provider);
      const u = result.user as FirebaseUser;
      (window as { __instiflow_uid?: string }).__instiflow_uid = u.uid;
      localStorage.setItem(
        "instiflow_user",
        JSON.stringify({
          uid: u.uid,
          name: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
        }),
      );
      setUser(u);
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
      const { getFirebaseAuth } = await import("../lib/firebase");
      const auth = await getFirebaseAuth();
      if (auth) {
        const { signOut: firebaseSignOut } = await cdnImport(
          `${CDN}/firebase-auth.js`,
        );
        await firebaseSignOut(auth);
      }
    } catch {
      // ignore
    }
    localStorage.removeItem("instiflow_user");
    (window as { __instiflow_uid?: string }).__instiflow_uid = undefined;
    setUser(null);
  };

  return { signInWithGoogle, signOut, user, isLoading, error };
}
