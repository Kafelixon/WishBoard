import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  type User,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { logout } from "@/redux/slices/userSlice";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "./use-toast";
import { usePageTitle } from "@/lib/usePageTitle";
import { changeUsername } from "@/lib/authHandlers";
import {
  deleteUserData,
  updateExistingWishlistsAuthor,
} from "@/lib/wishlistHandlers";
import { useUserId } from "@/lib/common";

export const SettingsPage = () => {
  usePageTitle("Settings");
  return (
    <Card className="w-fit glass divide-y m-auto p-2 md:p-2">
      <h1 className="p-3 scroll-m-20 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
        Settings
      </h1>
      <ChangeUsername />
      <ResetPassword />
      <ChangeEmail />
      <RemoveAccount />
    </Card>
  );
};

interface CommonSettingsFormProps {
  label: string;
  children: React.ReactNode;
}

const CommonSettingsForm: React.FC<CommonSettingsFormProps> = ({
  label,
  children,
}) => {
  return (
    <div className="p-3 flex flex-col gap-1.5">
      <p>{label}</p>
      {children}
    </div>
  );
};

const ResetPassword: React.FC = () => {
  const { toast } = useToast();

  const resetPassword = async () => {
    if (!auth.currentUser?.email) {
      console.error("No user or email found.");
      toast({ title: "Something went wrong. Please try again." });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast({ title: "Password reset email sent successfully!" });
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast({
        title: "Failed to send password reset email.",
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm label="Reset Password">
      <Button
        className="w-full"
        color="primary"
        onClick={() => void resetPassword()}
      >
        Send Password Reset Email
      </Button>
    </CommonSettingsForm>
  );
};

const ChangeUsername: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = useUserId();
  const [username, setUsername] = useState("");

  const submitNewUsername = async () => {
    if (!auth.currentUser) {
      console.error("No user found.");
      toast({ title: "Something went wrong. Please try again." });
      return;
    }
    try {
      await changeUsername(username);
      await updateExistingWishlistsAuthor(userId, username);
      toast({
        title: "Username updated successfully!",
        description: "Please log in again.",
      });
      dispatch(logout());
      void navigate("/");
    } catch (error) {
      console.error("Error updating username:", error);
      toast({ title: "Failed to update username.", variant: "destructive" });
    }
  };

  return (
    <CommonSettingsForm label="Change Username">
      <Input
        type="text"
        placeholder="New Username"
        value={username}
        onChange={(e) => { setUsername(e.target.value); }}
      />
      <Button
        className="w-full"
        type="submit"
        disabled={!username}
        color="primary"
        onClick={() => { void submitNewUsername(); }}
      >
        Change Username
      </Button>
    </CommonSettingsForm>
  );
};

const ChangeEmail: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(true);

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
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    try {
      const user = await reauthenticateWithPassword(toast);
      if (!user) return;

      await verifyBeforeUpdateEmail(user, email);
      toast({ title: "Verification email sent successfully to " + email });
    } catch (error) {
      console.error("Error changing email:", error);
      toast({
        title: authErrorTitle(error, "Failed to change email"),
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm label="Change Email">
      <Input
        type="email"
        placeholder="New Email"
        value={email}
        color={isValid ? "primary" : "danger"}
        onChange={handleInputChange}
        onBlur={validateEmail}
      />
      <Button
        className="w-full"
        type="submit"
        disabled={!email || !isValid}
        color="primary"
        onClick={() => void changeEmail()}
      >
        Change Email
      </Button>
    </CommonSettingsForm>
  );
};

type Toast = ReturnType<typeof useToast>["toast"];

const authErrorTitle = (error: unknown, fallback: string): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "auth/wrong-password" || code === "auth/invalid-credential"
    ? "Incorrect password"
    : fallback;
};

/**
 * Asks for the current password and re-authenticates, which Firebase requires
 * for sensitive changes. Resolves with the user, or null when the flow should
 * stop quietly (session not ready, Google-only account, prompt cancelled).
 * Rejects when Firebase rejects the password.
 */
async function reauthenticateWithPassword(toast: Toast): Promise<User | null> {
  const user = auth.currentUser;
  if (!user?.email) {
    toast({
      title: "Your account is still loading",
      description: "Please try again in a moment.",
      variant: "destructive",
    });
    return null;
  }
  if (!user.providerData.some((p) => p.providerId === "password")) {
    toast({
      title: "Not available for this account yet",
      description: "Accounts that sign in with Google can't do this from Settings.",
      variant: "destructive",
    });
    return null;
  }

  const password = window.prompt("Please enter your password to continue.");
  if (!password) return null;

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
  return user;
}

const RemoveAccount: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const removeAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone.",
    );
    if (!confirmDelete) return;

    try {
      const user = await reauthenticateWithPassword(toast);
      if (!user) return;

      await deleteUserData(user.uid);
      await deleteUser(user);
      toast({ title: "Account deleted" });

      dispatch(logout());
      void navigate("/");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: authErrorTitle(error, "Failed to delete account"),
        variant: "destructive",
      });
    }
  };

  return (
    <CommonSettingsForm label="Delete Account">
      <Button
        variant="outline"
        color="danger"
        onClick={() => void removeAccount()}
      >
        Delete My Account
      </Button>
    </CommonSettingsForm>
  );
};

export default SettingsPage;
