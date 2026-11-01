import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  EmailAuthProvider,
  type User,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { logout } from "@/lib/userStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePasswordPrompt } from "@/components/ui/PasswordPromptDialog";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useToast } from "./use-toast";
import { usePageTitle } from "@/lib/usePageTitle";
import { changeUsername } from "@/lib/authHandlers";
import {
  deleteUserData,
  exportUserData,
  updateExistingWishlistsAuthor,
} from "@/lib/wishlistHandlers";
import { useUserId } from "@/lib/common";

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

  const resetPassword = async () => {
    if (!auth.currentUser?.email) {
      console.error("No user or email found.");
      toast({ title: t("common.somethingWrong") });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast({ title: t("settings.password.sent") });
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
      <Button variant="outline" className="self-start" onClick={() => void resetPassword()}>
        {t("settings.password.button")}
      </Button>
    </CommonSettingsForm>
  );
};

const ChangeUsername: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userId = useUserId();
  const [username, setUsername] = useState("");

  const submitNewUsername = async () => {
    if (!auth.currentUser) {
      console.error("No user found.");
      toast({ title: t("common.somethingWrong") });
      return;
    }
    try {
      await changeUsername(username);
      await updateExistingWishlistsAuthor(userId, username);
      toast({
        title: t("settings.username.updated"),
        description: t("settings.username.updatedDescription"),
      });
      logout();
      void navigate("/");
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

  const isValidEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return regex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const validateEmail = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsValid(isValidEmail(e.target.value));
  };

  const changeEmail = async () => {
    if (!isValid) {
      toast({ title: t("settings.email.invalid"), variant: "destructive" });
      return;
    }

    try {
      const user = await reauthenticateWithPassword(t, toast, askPassword);
      if (!user) return;

      await verifyBeforeUpdateEmail(user, email);
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
  return code === "auth/wrong-password" || code === "auth/invalid-credential"
    ? t("settings.reauth.incorrectPassword")
    : fallback;
};

/**
 * Asks for the current password and re-authenticates, which Firebase requires
 * for sensitive changes. Resolves with the user, or null when the flow should
 * stop quietly (session not ready, Google-only account, prompt cancelled).
 * Rejects when Firebase rejects the password.
 */
async function reauthenticateWithPassword(
  t: TFunction,
  toast: Toast,
  askPassword: () => Promise<string | null>,
): Promise<User | null> {
  const user = auth.currentUser;
  if (!user?.email) {
    toast({
      title: t("settings.reauth.loading"),
      description: t("settings.reauth.loadingDescription"),
      variant: "destructive",
    });
    return null;
  }
  if (!user.providerData.some((p) => p.providerId === "password")) {
    toast({
      title: t("settings.reauth.unavailable"),
      description: t("settings.reauth.unavailableDescription"),
      variant: "destructive",
    });
    return null;
  }

  const password = await askPassword();
  if (!password) return null;

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
  return user;
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
      URL.revokeObjectURL(url);
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
      const user = await reauthenticateWithPassword(t, toast, askPassword);
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
