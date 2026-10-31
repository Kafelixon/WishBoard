import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { login } from "@/lib/userStore";
import { NavigateFunction } from "react-router-dom";

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
    throw Object.assign(new Error("Invalid email or password. Please try again."), {
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
    throw new Error("Password must be at least 6 characters");
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await changeUsername(username);
    completeLogin(userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error("Registration failed. Please try again."), {
      cause: error,
    });
  }
};

export const changeUsername = async (newUsername: string) => {
  if (!auth.currentUser) {
    throw new Error("User not found. Please log in again.");
  }

  try {
    await updateProfile(auth.currentUser, {
      displayName: newUsername,
    });
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error("Failed to update username. Please try again."), {
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
    throw Object.assign(new Error("Google login failed. Please try again."), {
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
