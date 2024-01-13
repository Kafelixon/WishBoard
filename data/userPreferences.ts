import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../src/firebaseSetup";

// Define a UserPreferences type
type UserPreferences = {
  theme: string;
};

// Utility function to get cached preferences
const getCachedPreferences = (uid: string): UserPreferences | null => {
  const cachedData = localStorage.getItem(`userPrefs-${uid}`);
  return cachedData ? JSON.parse(cachedData) : null;
};

// Utility function to set cached preferences
const setCachedPreferences = (uid: string, preferences: UserPreferences) => {
  localStorage.setItem(`userPrefs-${uid}`, JSON.stringify(preferences));
};

export const getUserPreferences = async (
  uid: string | null
): Promise<UserPreferences | null> => {
  if (!uid) {
    return null;
  }

  // Try getting preferences from cache first
  const cachedPrefs = getCachedPreferences(uid);
  if (cachedPrefs) {
    return cachedPrefs;
  }

  try {
    const docSnap = await getDoc(doc(firestore, "users", uid));
    if (docSnap.exists()) {
      const userPrefs: UserPreferences = docSnap.data() as UserPreferences;
      setCachedPreferences(uid, userPrefs); // Cache the fetched preferences
      return userPrefs;
    } else {
      return null;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const setUserPreferences = async (
  uid: string | null,
  preferences: UserPreferences
) => {
  if (!uid) {
    return null;
  }
  console.log("setting user preferences to: ");
  console.log(preferences);
  try {
    await setDoc(doc(firestore, "users", uid), preferences);
    setCachedPreferences(uid, preferences); // Cache the set preferences
  } catch (e) {
    console.error(e);
  }
};

export const updateUserPreferences = async (
  uid: string | null,
  preferences: any
) => {
  if (!uid) {
    return null;
  }
  console.log("updating user preferences to: ");
  console.log(preferences);
  try {
    await updateDoc(doc(firestore, "users", uid), preferences, { merge: true });
    // Update cached preferences after updating
    const updatedPrefs = { ...getCachedPreferences(uid), ...preferences };
    setCachedPreferences(uid, updatedPrefs);
  } catch (e) {
    console.error(e);
  }
};
