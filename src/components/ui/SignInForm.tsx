import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        await loginUser(email, password, navigate, from);
      } else {
        await registerUser(email, password, username, navigate, from);
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
      await loginWithGoogle(navigate, from);
    } catch (error) {
      handleLoginError(error, toast);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-12 pt-4 md:pt-10 lg:grid-cols-2">
      <div className="hidden space-y-5 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          WishBoard
        </p>
        <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
          A quieter way to share what you wish for.
        </h2>
        <p className="max-w-md text-lg text-muted-foreground">
          Create lists for every occasion, keep some items private, and send one
          link to the people who matter.
        </p>
      </div>
      <Card className="mx-auto w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {registered ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          {registered
            ? "Sign in to see your wishlists."
            : "It takes a minute. No credit card, ever."}
        </p>
        <form
          noValidate
          onSubmit={(e) => { void handleSubmit(e); }}
          className="mt-7 flex flex-col gap-4"
        >
          {registered ? null : (
            <Field label="Username" id="username">
              <Input
                id="username"
                name="username"
                autoComplete="username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); }}
              />
            </Field>
          )}
          <Field label="Email" id="email">
            {renderEmailInput(email, setEmail)}
          </Field>
          <Field label="Password" id="password">
            {renderPasswordInput(password, setPassword, registered)}
          </Field>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {renderSubmitButton(registered, isSubmitting)}
          <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          {renderGoogleLoginButton(handleGoogleLogin)}
        </form>
        {renderToggleRegisterLogin(registered, setRegistered)}
      </Card>
    </div>
  );
};

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function renderEmailInput(
  email: string,
  setEmail: React.Dispatch<React.SetStateAction<string>>
) {
  return (
    <Input
      id="email"
      name="email"
      autoComplete="email"
      type="email"
      placeholder="name@example.com"
      value={email}
      onChange={(e) => { setEmail(e.target.value); }}
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
      id="password"
      name="password"
      autoComplete={registered ? "current-password" : "new-password"}
      type="password"
      value={password}
      onChange={(e) => { setPassword(e.target.value); }}
    />
  );
}

function renderSubmitButton(registered: boolean, loggingIn: boolean) {
  return (
    <Button type="submit" size="lg" disabled={loggingIn}>
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
      type="button"
      variant="outline"
      size="lg"
    >
      Continue with Google
    </Button>
  );
}

function renderToggleRegisterLogin(
  registered: boolean,
  setRegistered: React.Dispatch<React.SetStateAction<boolean>>
) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {registered ? "Don't have an account? " : "Already have an account? "}
      <button
        type="button"
        onClick={() => { setRegistered(!registered); }}
        className="cursor-pointer rounded-sm border-0 bg-transparent p-0 font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {registered ? "Sign up" : "Sign in"}
      </button>
    </p>
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
