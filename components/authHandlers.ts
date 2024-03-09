import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../src/firebaseSetup";
import { login } from "../redux/slices/userSlice";
import { Action, Dispatch } from "redux";
import { NavigateFunction } from "react-router-dom";

export const loginUser = async (
  email: string,
  password: string,
  registered: boolean,
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string
) => {
  let userCredential: UserCredential;

  try {
    if (registered) {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } else {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(userCredential.user).catch((err) =>
        console.log(err)
      );
    }
    dispatchLogin(dispatch, userCredential, navigate, from);
  } catch (error: unknown) {
    throw new Error("Invalid email or password. Please try again.");
  }
};

export const loginWithGoogle = async (
  dispatch: Dispatch<Action>,
  navigate: NavigateFunction,
  from: string
) => {
  const provider = new GoogleAuthProvider();

  const userCredential = await signInWithPopup(auth, provider);
  dispatchLogin(dispatch, userCredential, navigate, from);
};

const dispatchLogin = (
  dispatch: Dispatch<Action>,
  credential: UserCredential,
  navigate: NavigateFunction,
  from: string
) => {
  const { uid, email } = credential.user;
  dispatch(login({ uid, email }));
  navigate(from, { replace: true });
};
