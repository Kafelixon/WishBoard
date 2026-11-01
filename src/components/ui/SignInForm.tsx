import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authErrorMessage,
  isSilentAuthError,
  loginUser,
  registerUser,
} from "@/lib/authHandlers";
import { loginWithGoogle } from "@/lib/googleSignIn";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { RotateCw } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { looksLikeEmail } from "@/lib/email";
import { MAX_AUTHOR_LENGTH } from "@/lib/limits";

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
  const { t } = useTranslation();
  usePageTitle(registered ? t("signIn.titleSignIn") : t("signIn.titleSignUp"));

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";
  const { toast } = useToast();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const validationError = validateCredentials(t, email, password, username, registered);
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
          {t("app.name")}
        </p>
        <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
          {t("signIn.asideTitle")}
        </h2>
        <p className="max-w-md text-lg text-muted-foreground">
          {t("signIn.asideText")}
        </p>
      </div>
      <Card className="mx-auto w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {registered ? t("signIn.welcomeBack") : t("signIn.createAccount")}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          {registered ? t("signIn.subtitleSignIn") : t("signIn.subtitleSignUp")}
        </p>
        <form
          noValidate
          onSubmit={(e) => { void handleSubmit(e); }}
          className="mt-7 flex flex-col gap-4"
        >
          {registered ? null : (
            <Field label={t("signIn.username")} id="username">
              <Input
                id="username"
                name="username"
                autoComplete="username"
                type="text"
                maxLength={MAX_AUTHOR_LENGTH}
                value={username}
                onChange={(e) => { setUsername(e.target.value); }}
              />
            </Field>
          )}
          <Field label={t("signIn.email")} id="email">
            {renderEmailInput(t, email, setEmail)}
          </Field>
          <Field label={t("signIn.password")} id="password">
            {renderPasswordInput(password, setPassword, registered)}
          </Field>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {renderSubmitButton(t, registered, isSubmitting)}
          <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t("signIn.or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          {renderGoogleLoginButton(t, handleGoogleLogin)}
        </form>
        {renderToggleRegisterLogin(t, registered, setRegistered)}
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
  t: TFunction,
  email: string,
  setEmail: React.Dispatch<React.SetStateAction<string>>
) {
  return (
    <Input
      id="email"
      name="email"
      autoComplete="email"
      type="email"
      placeholder={t("signIn.emailPlaceholder")}
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

function renderSubmitButton(t: TFunction, registered: boolean, loggingIn: boolean) {
  return (
    <Button type="submit" size="lg" disabled={loggingIn}>
      {loggingIn ? (
        <RotateCw className="animate-spin" aria-label={t("signIn.signingIn")} />
      ) : registered ? (
        t("signIn.submitSignIn")
      ) : (
        t("signIn.submitSignUp")
      )}
    </Button>
  );
}

function renderGoogleLoginButton(
  t: TFunction,
  handleGoogleLogin: (e: React.SyntheticEvent) => Promise<void>,
) {
  return (
    <Button
      onClick={(e) => { void handleGoogleLogin(e); }}
      type="button"
      variant="outline"
      size="lg"
    >
      {t("signIn.google")}
    </Button>
  );
}

function renderToggleRegisterLogin(
  t: TFunction,
  registered: boolean,
  setRegistered: React.Dispatch<React.SetStateAction<boolean>>
) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {registered ? t("signIn.noAccount") : t("signIn.haveAccount")}{" "}
      <button
        type="button"
        onClick={() => { setRegistered(!registered); }}
        className="cursor-pointer rounded-sm border-0 bg-transparent p-0 font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {registered ? t("signIn.submitSignUp") : t("signIn.submitSignIn")}
      </button>
    </p>
  );
}

function validateCredentials(
  t: TFunction,
  email: string,
  password: string,
  username: string,
  registered: boolean,
): string | null {
  if (!registered && !username.trim()) return t("validation.username");
  if (!email.trim()) return t("validation.emailRequired");
  if (!looksLikeEmail(email.trim())) return t("validation.emailInvalid");
  if (!password) return t("validation.passwordRequired");
  if (!registered && password.length < 6) {
    return t("validation.passwordShort");
  }
  return null;
}

function handleLoginError(
  error: unknown,
  toast: ReturnType<typeof useToast>["toast"]
) {
  if (isSilentAuthError(error)) return;

  console.error("Login Error: ", error);
  toast({ variant: "destructive", description: authErrorMessage(error) });
}

export default SignInForm;
