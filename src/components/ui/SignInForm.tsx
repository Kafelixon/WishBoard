import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginUser, loginWithGoogle, registerUser } from "@/lib/authHandlers";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { RotateCw } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";

interface LocationState {
  from: string;
}

export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [registered, setRegistered] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  usePageTitle(registered ? "Sign in" : "Sign up");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";
  const { toast } = useToast();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const validationError = validateCredentials(email, password, username, registered);
    setFormError(validationError);
    if (validationError) return;

    try {
      setIsSubmitting(true);
      if (registered) {
        await loginUser(email, password, dispatch, navigate, from);
      } else {
        await registerUser(email, password, username, dispatch, navigate, from);
      }
    } catch (error) {
      handleLoginError(error, toast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      await loginWithGoogle(dispatch, navigate, from);
    } catch (error) {
      handleLoginError(error, toast);
    }
  };

  return (
      <Card className="p-5 glass m-auto w-60">
        <form
          noValidate
          onSubmit={(e) => { void handleSubmit(e); }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 0",
          }}
        >
          {registered ? null : (
            <Input
              name="username"
              autoComplete="username"
              type="text"
              aria-label="Username"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); }}
              className="glass-fg"
            />
          )}
          {renderEmailInput(email, setEmail)}
          {renderPasswordInput(password, setPassword, registered)}
          {formError && (
            <p role="alert" className="text-red-600 text-xs">
              {formError}
            </p>
          )}
          {renderSubmitButton(registered, isSubmitting)}
          {renderGoogleLoginButton(handleGoogleLogin)}
        </form>
        {renderToggleRegisterLogin(registered, setRegistered)}
      </Card>
  );
};

function renderEmailInput(
  email: string,
  setEmail: React.Dispatch<React.SetStateAction<string>>
) {
  return (
    <Input
      name="email"
      autoComplete="email"
      type="email"
      aria-label="Email"
      placeholder="Email"
      value={email}
      onChange={(e) => { setEmail(e.target.value); }}
      className="glass-fg"
    />
  );
}

function renderPasswordInput(
  password: string,
  setPassword: React.Dispatch<React.SetStateAction<string>>,
  registered: boolean,
) {
  return (
    <Input
      name="password"
      autoComplete={registered ? "current-password" : "new-password"}
      type="password"
      aria-label="Password"
      placeholder="Password"
      value={password}
      onChange={(e) => { setPassword(e.target.value); }}
      className="glass-fg"
    />
  );
}

function renderSubmitButton(registered: boolean, loggingIn: boolean) {
  return (
    <Button type="submit" className="shadow-md" disabled={loggingIn}>
      {loggingIn ? (
        <RotateCw className="animate-spin" aria-label="Signing in" />
      ) : registered ? (
        "Sign in"
      ) : (
        "Sign up"
      )}
    </Button>
  );
}

function renderGoogleLoginButton(
  handleGoogleLogin: (e: React.SyntheticEvent) => Promise<void>,
) {
  return (
    <Button
      onClick={(e) => { void handleGoogleLogin(e); }}
      variant="outline"
      className="glass-fg"
    >
      Sign in with Google
    </Button>
  );
}

function renderToggleRegisterLogin(
  registered: boolean,
  setRegistered: React.Dispatch<React.SetStateAction<boolean>>
) {
  return (
    <small className="text-center -mb-1">
      {registered ? "Don't have an account? " : "Already have an account? "}
      <button
        type="button"
        onClick={() => { setRegistered(!registered); }}
        className="text-violet-500 cursor-pointer bg-transparent border-0 p-0"
      >
        {registered ? "Sign up" : "Sign in"}
      </button>
    </small>
  );
}

// Plain string checks instead of a regex, so long odd input can't cause backtracking.
const looksLikeEmail = (value: string): boolean => {
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  if (/\s/.test(value)) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
};

function validateCredentials(
  email: string,
  password: string,
  username: string,
  registered: boolean,
): string | null {
  if (!registered && !username.trim()) return "Please choose a username.";
  if (!email.trim()) return "Please enter your email address.";
  if (!looksLikeEmail(email.trim())) return "That email address doesn't look right.";
  if (!password) return "Please enter your password.";
  if (!registered && password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/account-exists-with-different-credential":
    "This email is already registered with a different sign-in method.",
};

// The user closing the Google popup is not an error worth a toast.
const SILENT_AUTH_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

const getAuthErrorCode = (error: unknown): string | undefined => {
  const cause = (error as { cause?: unknown } | null)?.cause;
  const code = ((cause ?? error) as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
};

function handleLoginError(
  error: unknown,
  toast: ReturnType<typeof useToast>["toast"]
) {
  const code = getAuthErrorCode(error);
  if (code && SILENT_AUTH_CODES.has(code)) return;

  console.error("Login Error: ", error);
  toast({
    variant: "destructive",
    description:
      (code && AUTH_ERROR_MESSAGES[code]) ??
      "Something went wrong while signing in. Please try again.",
  });
}

export default SignInForm;
