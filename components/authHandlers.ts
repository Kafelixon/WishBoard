import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
  AuthError,
} from "firebase/auth";
import { auth } from "../src/firebaseSetup";
import { login } from "../redux/slices/userSlice";
import { setUserPreferences } from "../data/userPreferences";

export const loginUser = async (
  email: string,
  password: string,
  registered: boolean,
  dispatch: any,
  uid: string,
  navigate: any,
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
    setUserPreferences(uid, { theme: "dark" });
  } catch (error: AuthError | any) {
    throw error;
  }
};

export const loginWithGoogle = async (
  dispatch: any,
  navigate: any,
  from: string
) => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    dispatchLogin(dispatch, result, navigate, from);
  } catch (error: AuthError | any) {
    throw error;
  }
};

const dispatchLogin = (
  dispatch: any,
  credential: UserCredential,
  navigate: any,
  from: string
) => {
  const { uid, email } = credential.user;
  dispatch(login({ uid, email }));
  navigate(from, { replace: true });
};
