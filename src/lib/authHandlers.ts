import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import type { TKey } from "@/i18n";
import { auth } from "@/firebaseSetup";
import i18n from "@/i18n";
import { login } from "@/lib/userStore";
import { NavigateFunction } from "react-router-dom";

const AUTH_ERROR_KEYS: Partial<Record<string, TKey>> = {
  "auth/invalid-credential": "authErrors.invalidCredential",
  "auth/wrong-password": "authErrors.invalidCredential",
  "auth/user-not-found": "authErrors.invalidCredential",
  "auth/invalid-email": "authErrors.invalidEmail",
  "auth/email-already-in-use": "authErrors.emailInUse",
  "auth/weak-password": "authErrors.weakPassword",
  "auth/too-many-requests": "authErrors.tooManyRequests",
  "auth/network-request-failed": "authErrors.network",
  "auth/account-exists-with-different-credential": "authErrors.differentCredential",
};

// The user closing the Google popup is not an error worth a toast.
const SILENT_AUTH_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

/** The Firebase error code on an error thrown by these handlers, or on a raw Firebase error. */
export const getAuthErrorCode = (error: unknown): string | undefined => {
  const cause = (error as { cause?: unknown } | null)?.cause;
  const code = ((cause ?? error) as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
};

export const isSilentAuthError = (error: unknown): boolean => {
  const code = getAuthErrorCode(error);
  return code !== undefined && SILENT_AUTH_CODES.has(code);
};

/** Translated message for a Firebase auth error, or the given fallback key's text for unknown codes. */
export const authErrorMessage = (
  error: unknown,
  fallback: TKey = "authErrors.generic",
): string => {
  const code = getAuthErrorCode(error);
  return i18n.t((code ? AUTH_ERROR_KEYS[code] : undefined) ?? fallback);
};

export const loginUser = async (
  email: string,
  password: string,
  navigate: NavigateFunction,
  from: string,
) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    completeLogin(userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error(i18n.t("authErrors.loginFailed")), {
      cause: error,
    });
  }
};

export const registerUser = async (
  email: string,
  password: string,
  username: string,
  navigate: NavigateFunction,
  from: string,
) => {
  if (password.length < 6) {
    throw new Error(i18n.t("validation.passwordShort"));
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    lastVerificationSend = { uid: userCredential.user.uid, at: Date.now() };
    await changeUsername(username);
    completeLogin(userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error(i18n.t("authErrors.registerFailed")), {
      cause: error,
    });
  }
};

export const changeUsername = async (newUsername: string) => {
  if (!auth.currentUser) {
    throw new Error(i18n.t("authErrors.userNotFound"));
  }

  try {
    await updateProfile(auth.currentUser, {
      displayName: newUsername,
    });
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error(i18n.t("authErrors.usernameFailed")), {
      cause: error,
    });
  }
};

export const loginWithGoogle = async (
  navigate: NavigateFunction,
  from: string,
) => {
  const provider = new GoogleAuthProvider();

  try {
    const userCredential = await signInWithPopup(auth, provider);
    completeLogin(userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error(i18n.t("authErrors.googleFailed")), {
      cause: error,
    });
  }
};

const completeLogin = (
  credential: UserCredential,
  navigate: NavigateFunction,
  from: string,
) => {
  const { uid, email, displayName, photoURL } = credential.user;
  login({ uid, displayName, email, photoURL });
  void navigate(from, { replace: true });
};

const RESEND_COOLDOWN_MS = 60_000;
let lastVerificationSend: { uid: string; at: number } | null = null;

/** Seconds until the given user may ask for another verification email (0 when they may now). */
export const resendCooldownSeconds = (uid: string): number =>
  lastVerificationSend?.uid === uid
    ? Math.max(0, Math.ceil((lastVerificationSend.at + RESEND_COOLDOWN_MS - Date.now()) / 1000))
    : 0;

/** Sends the verification email again. Firebase rate-limits this and answers `auth/too-many-requests`. */
export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(i18n.t("authErrors.userNotFound"));
  }
  try {
    await sendEmailVerification(user);
    lastVerificationSend = { uid: user.uid, at: Date.now() };
  } catch (error) {
    // Rate-limited means one went out recently, so hold off the same way as after a send.
    if (getAuthErrorCode(error) === "auth/too-many-requests") {
      lastVerificationSend = { uid: user.uid, at: Date.now() };
    }
    throw error;
  }
};

/** Re-reads the account from Firebase (the SDK otherwise only refreshes emailVerified on sign-in and at startup). */
export const refreshEmailVerified = async (): Promise<boolean> => {
  if (!auth.currentUser) {
    throw new Error(i18n.t("authErrors.userNotFound"));
  }
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
};
