import { useSyncExternalStore } from "react";
import type { User } from "@/lib/types";

/**
 * The signed-in user, kept in memory and in localStorage. The storage key and
 * shape match what redux-persist used to write, so existing sign-ins carry over
 * and pgHandlers can read it synchronously before React renders.
 */
const STORAGE_KEY = "persist:root";

const read = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    // redux-persist stored each key of the slice as a JSON string: { user: '{"uid":…}' | 'null', _persist: … }
    const stored = (JSON.parse(raw) as { user?: string }).user;
    return stored === undefined ? null : (JSON.parse(stored) as User | null);
  } catch {
    return null;
  }
};

const write = (user: User | null) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: JSON.stringify(user),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      }),
    );
  } catch {
    // Private mode or full storage: the user simply isn't remembered across reloads.
  }
};

let current = read();

/** The saved user, without subscribing (for code that runs outside React). */
export const getStoredUser = (): User | null => current;
const listeners = new Set<() => void>();

const setUser = (user: User | null) => {
  current = user;
  write(user);
  listeners.forEach((listener) => {
    listener();
  });
};

export const login = (user: User) => {
  setUser(user);
};
export const logout = () => {
  setUser(null);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Keeps other open tabs in step when someone signs in or out.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = read();
    listeners.forEach((listener) => {
      listener();
    });
  });
}

export const useStoredUser = (): User | null => useSyncExternalStore(subscribe, () => current);
