// common.ts TODO: rename
import { useState, useEffect } from "react";
import { auth } from "../src/firebaseSetup";

interface UserIdReturnType {
  userId: string | null;
}

export const useUserId = (): UserIdReturnType => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return { userId };
};
