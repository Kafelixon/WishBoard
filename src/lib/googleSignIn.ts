import {
  GoogleAuthProvider,
  type User,
  browserPopupRedirectResolver,
  getRedirectResult,
  reauthenticateWithPopup,
  signInWithPopup,
} from "firebase/auth";
import { NavigateFunction } from "react-router-dom";
import { auth } from "@/firebaseSetup";
import i18n from "@/i18n";
import { completeLogin } from "@/lib/authHandlers";

// Kept out of authHandlers, which the app shell imports, so the popup resolver
// only loads with the pages that use it (sign-in and Settings).

// Firebase loads a helper iframe before it opens the popup. Done on the first
// click, that load takes long enough for browsers to stop treating the popup as
// part of the click and block it (auth/popup-blocked). getAuth would preload it,
// but firebaseSetup leaves the resolver out to keep it off the first load, so
// preload it here, as soon as a page that may open the popup is loaded.
// getRedirectResult is the public call that sets the resolver up; this app never
// signs in by redirect, so it just resolves with null.
getRedirectResult(auth, browserPopupRedirectResolver).catch((error: unknown) => {
  // The popup still works without the preload, only possibly blocked on the first try.
  console.error("Preparing Google sign-in failed:", error);
});

export const loginWithGoogle = async (
  navigate: NavigateFunction,
  from: string,
) => {
  const provider = new GoogleAuthProvider();

  try {
    const userCredential = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    completeLogin(userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error(i18n.t("authErrors.googleFailed")), {
      cause: error,
    });
  }
};

/** Confirms a Google account's identity again before a sensitive change. */
export const reauthenticateWithGoogle = (user: User) =>
  reauthenticateWithPopup(user, new GoogleAuthProvider(), browserPopupRedirectResolver);
