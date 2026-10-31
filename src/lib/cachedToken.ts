/**
 * Reads the signed-in user's saved Firebase ID token straight from the browser
 * storage Firebase persists it in, so the first API call doesn't have to wait for
 * Firebase to re-validate the user over the network (~250 ms).
 *
 * This relies on Firebase's internal storage layout, so every failure path
 * returns null and the caller falls back to the regular `auth.currentUser` flow.
 */

const DB_NAME = "firebaseLocalStorageDb";
const STORE_NAME = "firebaseLocalStorage";
/** Don't reuse a token that is about to expire mid-request. */
const MIN_REMAINING_MS = 60_000;

interface PersistedUser {
  stsTokenManager?: { accessToken?: unknown; expirationTime?: unknown };
}

const storageKey = () =>
  `firebase:authUser:${import.meta.env.VITE_APP_FIREBASE_API_KEY as string}:[DEFAULT]`;

const tokenFrom = (user: PersistedUser | undefined): string | null => {
  const manager = user?.stsTokenManager;
  if (
    typeof manager?.accessToken !== "string" ||
    typeof manager.expirationTime !== "number" ||
    manager.expirationTime - Date.now() < MIN_REMAINING_MS
  ) {
    return null;
  }
  return manager.accessToken;
};

const readIndexedDb = () =>
  new Promise<PersistedUser | undefined>((resolve) => {
    const open = indexedDB.open(DB_NAME);
    open.onerror = () => {
      resolve(undefined);
    };
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve(undefined);
        return;
      }
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(storageKey());
      request.onerror = () => {
        db.close();
        resolve(undefined);
      };
      request.onsuccess = () => {
        db.close();
        const row = request.result as { value?: PersistedUser } | undefined;
        resolve(row?.value);
      };
    };
  });

const readLocalStorage = (): PersistedUser | undefined => {
  const raw = localStorage.getItem(storageKey());
  return raw === null ? undefined : (JSON.parse(raw) as PersistedUser);
};

export async function readCachedIdToken(): Promise<string | null> {
  try {
    return tokenFrom(await readIndexedDb()) ?? tokenFrom(readLocalStorage());
  } catch {
    return null;
  }
}
