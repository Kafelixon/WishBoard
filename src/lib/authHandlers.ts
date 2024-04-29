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

export const loginUser = (
  email: string,
  password: string,
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string
) => {
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential: UserCredential) =>
      handleLogin(dispatch, navigate, from, userCredential)
    )
    .catch(handleLoginError);
};

const handleLogin = (
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string,
  userCredential: UserCredential
) => {
  dispatchLogin(dispatch, userCredential, navigate, from);
};

const handleLoginError = (error: Error) => {
  console.error(error);
  throw new Error("Login failed. Please try again.");
};

export const registerUser = (
  email: string,
  password: string,
  username: string,
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string
) => {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      sendEmailVerification(userCredential.user).catch((err) =>
        console.error(err)
      );
      changeUsername(username);
      dispatchLogin(dispatch, userCredential, navigate, from);
    })
    .catch((error) => {
      console.error(error);
      throw new Error("Registration failed. Please try again.");
    });
};

export const changeUsername = (newUsername: string) => {
  if (!auth.currentUser) {
    throw new Error("User not found. Please log in again.");
  }
  updateProfile(auth.currentUser, {
    displayName: newUsername,
  })
    .then(() => {
      return;
    })
    .catch((error) => {
      console.error(error);
      throw new Error("Failed to update username. Please try again.");
    });
};

export const loginWithGoogle = (
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string
) => {
  const provider: GoogleAuthProvider = new GoogleAuthProvider();

  signInWithPopup(auth, provider)
    .then((userCredential) =>
      handleLogin(dispatch, navigate, from, userCredential)
    )
    .catch(handleLoginError);
};

const dispatchLogin = (
  dispatch: Dispatch<Action>,
  credential: UserCredential,
  navigate: NavigateFunction,
  from: string
) => {
  const { uid, email, displayName } = credential.user;
  dispatch(login({ uid, displayName, email }));
  navigate(from, { replace: true });
};
