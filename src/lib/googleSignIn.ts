import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  signInWithPopup,
} from "firebase/auth";
import { NavigateFunction } from "react-router-dom";
import { auth } from "@/firebaseSetup";
import i18n from "@/i18n";
import { completeLogin } from "@/lib/authHandlers";

// Kept out of authHandlers, which the app shell imports, so the popup resolver
// only loads with the sign-in page.
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
