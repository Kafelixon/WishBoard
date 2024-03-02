import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Typography } from "@mui/joy";
import { Google } from "@mui/icons-material";
import { loginUser, loginWithGoogle } from "./authHandlers";
import StyledCard from "./StyledCard";
import { User, UserState } from "../src/types";
import StyledStack from "./StyledStack";

interface LocationState {
  from: string;
}

export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registered, setRegistered] = useState(true);

  const dispatch = useDispatch();
  const user: User | null = useSelector((state: UserState) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const uid: string = user?.uid || "";
  const from = (location.state as LocationState)?.from || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginUser(
        email,
        password,
        registered,
        dispatch,
        uid,
        navigate,
        from,
      );
    } catch (error) {
      handleLoginError(error);
    }
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithGoogle(dispatch, navigate, from);
    } catch (error) {
      handleLoginError(error);
    }
  };

  return (
    <StyledStack>
      <StyledCard>
        <form
          onSubmit={(e) => void handleLogin(e)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 0",
          }}
        >
          {renderEmailInput(email, setEmail)}
          {renderPasswordInput(password, setPassword)}
          {renderSubmitButton(registered)}
          {renderGoogleLoginButton(handleGoogleLogin)}
        </form>
        {renderToggleRegisterLogin(registered, setRegistered)}
      </StyledCard>
    </StyledStack>
  );
};

function renderEmailInput(
  email: string,
  setEmail: {
    (value: React.SetStateAction<string>): void;
    (arg0: string): void;
  },
) {
  return (
    <Input
      name="email"
      autoComplete="email"
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}

function renderPasswordInput(
  password: string,
  setPassword: {
    (value: React.SetStateAction<string>): void;
    (arg0: string): void;
  },
) {
  return (
    <Input
      name="password"
      autoComplete="current-password"
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
  );
}

function renderSubmitButton(registered: boolean) {
  return <Button type="submit">{registered ? "Sign in" : "Sign up"}</Button>;
}

function renderGoogleLoginButton(handleGoogleLogin: {
  (e: React.FormEvent): Promise<void>;
}) {
  return (
    <Button
      onClick={(e) => void handleGoogleLogin(e)}
      variant="outlined"
      sx={{
        color: "var(--bs-palette-primary-600)",
        ":hover": {
          color: "var(--bs-palette-primary-700)",
          backgroundColor: "var(--bs-palette-primary-100)",
        },
      }}
    >
      <Google sx={{ pr: 1, maxHeight: "1.4rem" }} />
      Sign in with Google
    </Button>
  );
}

function renderToggleRegisterLogin(
  registered: boolean,
  setRegistered: {
    (value: React.SetStateAction<boolean>): void;
    (arg0: boolean): void;
  },
) {
  return (
    <Typography
      level="body-xs"
      sx={{
        textAlign: "center",
        mb: -1,
        color: "var(--bs-palette-text-primary)",
      }}
    >
      {registered ? "Don't have an account? " : "Already have an account? "}
      <a
        onClick={() => setRegistered(!registered)}
        style={{ cursor: "pointer", color: "var(--bs-palette-primary-600)" }}
      >
        {registered ? "Sign up" : "Sign in"}
      </a>
    </Typography>
  );
}

function handleLoginError(error: Error | unknown) {
  // if error is unknown just log it
  if (
    typeof error !== "object" ||
    error === null ||
    !(error instanceof Error)
  ) {
    console.error("Login Error: ", error);
    return;
  }
  console.error("Login Error: ", error.message || error);
  // TODO: Show error message to user
  if (error.message === "auth/wrong-password") {
    alert("Wrong password.");
  }
  if (error.message === "auth/invalid-login-credentials") {
    alert("User not found.");
  }
}

export default SignInForm;
