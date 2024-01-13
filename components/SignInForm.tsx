import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Typography } from "@mui/joy";
import { Google } from "@mui/icons-material";
import { loginUser, loginWithGoogle } from "./authHandlers";
import StyledCard from "./StyledCard";

export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registered, setRegistered] = useState(true);

  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.user);
  const navigate = useNavigate();
  const { state } = useLocation();

  const uid = user?.uid;
  const from = state?.from?.pathname || "/";

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
        from
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
    <StyledCard>
      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0"}}
      >
        {renderEmailInput(email, setEmail)}
        {renderPasswordInput(password, setPassword)}
        {renderSubmitButton(registered)}
        {renderGoogleLoginButton(handleGoogleLogin)}
      </form>
      {renderToggleRegisterLogin(registered, setRegistered)}
    </StyledCard>
  );
};

function renderEmailInput(
  email: string,
  setEmail: {
    (value: React.SetStateAction<string>): void;
    (arg0: string): void;
  }
) {
  return (
    <Input
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
  }
) {
  return (
    <Input
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
  (e: React.FormEvent<any>): Promise<void>;
  (e: React.FormEvent<any>): Promise<void>;
}) {
  return (
    <Button
      onClick={handleGoogleLogin}
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
  }
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

function handleLoginError(error: any) {
  console.error("Login Error: ", error.message || error);
}

export default SignInForm;
