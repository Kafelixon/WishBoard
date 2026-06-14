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
import { login } from "../redux/slices/userSlice";
import { Action, Dispatch } from "redux";
import { NavigateFunction } from "react-router-dom";

export const loginUser = async (
  email: string,
  password: string,
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string,
) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    dispatchLogin(dispatch, userCredential, navigate, from);
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
  dispatch: Dispatch<Action>,
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
    dispatchLogin(dispatch, userCredential, navigate, from);
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
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string,
) => {
  const provider = new GoogleAuthProvider();

  try {
    const userCredential = await signInWithPopup(auth, provider);
    dispatchLogin(dispatch, userCredential, navigate, from);
  } catch (error) {
    console.error(error);
    throw Object.assign(new Error("Google login failed. Please try again."), {
      cause: error,
    });
  }
};

const dispatchLogin = (
  dispatch: Dispatch<Action>,
  credential: UserCredential,
  navigate: NavigateFunction,
  from: string,
) => {
  const { uid, email, displayName, photoURL } = credential.user;
  dispatch(login({ uid, displayName, email, photoURL }));
  void navigate(from, { replace: true });
};
