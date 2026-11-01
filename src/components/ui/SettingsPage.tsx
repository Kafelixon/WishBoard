import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  type User,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { login, logout } from "@/lib/userStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePasswordPrompt } from "@/components/ui/PasswordPromptDialog";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useToast } from "./use-toast";
import { usePageTitle } from "@/lib/usePageTitle";
import { changeUsername, isSilentAuthError } from "@/lib/authHandlers";
import { reauthenticateWithGoogle } from "@/lib/googleSignIn";
import { looksLikeEmail } from "@/lib/email";
import { MAX_AUTHOR_LENGTH } from "@/lib/limits";
import {
  deleteUserData,
  exportUserData,
  updateExistingWishlistsAuthor,
} from "@/lib/wishlistHandlers";
import { useUser, useUserId } from "@/lib/common";

export const SettingsPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("settings.title"));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <Card className="divide-y divide-border">
        <ChooseLanguage />
        <ChangeUsername />
        <ResetPassword />
        <ChangeEmail />
        <ExportData />
        <RemoveAccount />
      </Card>
    </div>
  );
};

interface CommonSettingsFormProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const CommonSettingsForm: React.FC<CommonSettingsFormProps> = ({
  label,
  description,
  children,
}) => {
  return (
    <section className="grid gap-4 p-6 sm:grid-cols-[1fr_1.2fr] sm:gap-8">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{label}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
};

const ChooseLanguage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <CommonSettingsForm
      label={t("settings.language.label")}
      description={t("settings.language.description")}
    >
      <LanguageSwitcher className="self-start" />
    </CommonSettingsForm>
  );
};

const ResetPassword: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const email = useUser()?.email ?? null;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetPassword = async () => {
    if (!auth.currentUser?.email) {
      console.error("No user or email found.");
      toast({ title: t("common.somethingWrong") });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast({
        title: t("settings.password.sent"),
        description: t("settings.password.sentDescription", { email: auth.currentUser.email }),
      });
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast({
        title: t("settings.password.failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm
      label={t("settings.password.label")}
      description={t("settings.password.description")}
    >
      <Button variant="outline" className="self-start" onClick={() => { setConfirmOpen(true); }}>
        {t("settings.password.button")}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("settings.password.label")}
        description={
          email
            ? t("settings.password.confirm", { email })
            : t("settings.password.confirmNoEmail")
        }
        confirmLabel={t("settings.password.button")}
        onConfirm={() => void resetPassword()}
        destructive={false}
      />
    </CommonSettingsForm>
  );
};

const ChangeUsername: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const user = useUser();
  const [username, setUsername] = useState("");

  const submitNewUsername = async () => {
    if (!auth.currentUser || !user) {
      console.error("No user found.");
      toast({ title: t("common.somethingWrong") });
      return;
    }
    try {
      await changeUsername(username);
      await updateExistingWishlistsAuthor(user.uid, username);
      login({ ...user, displayName: username });
      setUsername("");
      toast({ title: t("settings.username.updated") });
    } catch (error) {
      console.error("Error updating username:", error);
      toast({ title: t("settings.username.failed"), variant: "destructive" });
    }
  };

  return (
    <CommonSettingsForm
      label={t("settings.username.label")}
      description={t("settings.username.description")}
    >
      <Input
        type="text"
        placeholder={t("settings.username.placeholder")}
        aria-label={t("settings.username.placeholder")}
        maxLength={MAX_AUTHOR_LENGTH}
        value={username}
        onChange={(e) => { setUsername(e.target.value); }}
      />
      <Button
        className="self-start"
        type="submit"
        disabled={!username}
        onClick={() => { void submitNewUsername(); }}
      >
        {t("settings.username.button")}
      </Button>
    </CommonSettingsForm>
  );
};

const ChangeEmail: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(true);
  const { askPassword, passwordDialog } = usePasswordPrompt();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const validateEmail = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsValid(looksLikeEmail(e.target.value.trim()));
  };

  const changeEmail = async () => {
    if (!isValid) {
      toast({ title: t("settings.email.invalid"), variant: "destructive" });
      return;
    }

    try {
      const user = await reauthenticate(t, toast, askPassword);
      if (!user) return;

      await verifyBeforeUpdateEmail(user, email.trim());
      toast({ title: t("settings.email.sent", { email }) });
    } catch (error) {
      console.error("Error changing email:", error);
      toast({
        title: authErrorTitle(t, error, t("settings.email.failed")),
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm
      label={t("settings.email.label")}
      description={t("settings.email.description")}
    >
      <Input
        type="email"
        placeholder={t("settings.email.placeholder")}
        aria-label={t("settings.email.placeholder")}
        aria-invalid={isValid ? undefined : true}
        value={email}
        onChange={handleInputChange}
        onBlur={validateEmail}
      />
      <Button
        className="self-start"
        type="submit"
        disabled={!email || !isValid}
        onClick={() => void changeEmail()}
      >
        {t("settings.email.button")}
      </Button>
      {passwordDialog}
    </CommonSettingsForm>
  );
};

type Toast = ReturnType<typeof useToast>["toast"];

const authErrorTitle = (t: TFunction, error: unknown, fallback: string): string => {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return t("settings.reauth.incorrectPassword");
  }
  // Reauthenticating through the Google popup with another Google account than the signed-in one.
  if (code === "auth/user-mismatch") return t("settings.reauth.userMismatch");
  if (code === "auth/popup-blocked") return t("authErrors.popupBlocked");
  return fallback;
};

/**
 * Confirms the user's identity again, which Firebase requires for sensitive
 * changes: password accounts type their password, Google accounts go through
 * the Google popup. Resolves with the user, or null when the flow should stop
 * quietly (session not ready, unsupported sign-in method, prompt or popup
 * closed). Rejects when Firebase rejects the password or the Google account.
 */
async function reauthenticate(
  t: TFunction,
  toast: Toast,
  askPassword: () => Promise<string | null>,
): Promise<User | null> {
  const user = auth.currentUser;
  if (!user) {
    toast({
      title: t("settings.reauth.loading"),
      description: t("settings.reauth.loadingDescription"),
      variant: "destructive",
    });
    return null;
  }
  const providers = user.providerData.map((p) => p.providerId);

  if (providers.includes(EmailAuthProvider.PROVIDER_ID) && user.email) {
    const password = await askPassword();
    if (!password) return null;
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
    return user;
  }

  if (providers.includes(GoogleAuthProvider.PROVIDER_ID)) {
    // No await before this, so the popup opens within the click and isn't blocked.
    try {
      await reauthenticateWithGoogle(user);
    } catch (error) {
      if (isSilentAuthError(error)) return null;
      throw error;
    }
    return user;
  }

  toast({
    title: t("settings.reauth.unavailable"),
    description: t("settings.reauth.unavailableDescription"),
    variant: "destructive",
  });
  return null;
}

const ExportData: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const userId = useUserId();
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      const { wishlists, followedWishlists } = await exportUserData(userId);
      const data = {
        exportedAt: new Date().toISOString(),
        email: auth.currentUser?.email ?? null,
        wishlists,
        followedWishlists,
      };

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "wishboard-export.json";
      link.click();
      // Some browsers start the download after click() returns, so revoking right away can cancel it.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10_000);
      toast({ title: t("settings.export.done") });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({ title: t("settings.export.failed"), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <CommonSettingsForm
      label={t("settings.export.label")}
      description={t("settings.export.description")}
    >
      <Button
        variant="outline"
        className="self-start"
        disabled={isExporting}
        onClick={() => void exportData()}
      >
        {isExporting ? t("settings.export.exporting") : t("settings.export.button")}
      </Button>
    </CommonSettingsForm>
  );
};

const RemoveAccount: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { askPassword, passwordDialog } = usePasswordPrompt();

  const removeAccount = async () => {
    try {
      const user = await reauthenticate(t, toast, askPassword);
      if (!user) return;

      await deleteUserData(user.uid);
      await deleteUser(user);
      toast({ title: t("settings.delete.done") });

      logout();
      void navigate("/");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: authErrorTitle(t, error, t("settings.delete.failed")),
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm
      label={t("settings.delete.label")}
      description={t("settings.delete.description")}
    >
      <Button
        variant="outline"
        className="self-start border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => { setConfirmOpen(true); }}
      >
        {t("settings.delete.button")}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("settings.delete.label")}
        description={t("settings.delete.confirm")}
        confirmLabel={t("settings.delete.button")}
        onConfirm={() => void removeAccount()}
      />
      {passwordDialog}
    </CommonSettingsForm>
  );
};

export default SettingsPage;
