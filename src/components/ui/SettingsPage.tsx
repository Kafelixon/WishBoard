import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AuthCredential,
  EmailAuthProvider,
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
import { changeUsername } from "@/lib/authHandlers";
import { updateExistingWishlistsAuthor } from "@/lib/wishlistHandlers";
import { useUserId } from "@/lib/common";

export const SettingsPage = () => {
  return (
    <Card className="w-fit glass divide-y m-auto p-2 md:p-2">
      <h1 className="p-3 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
        Settings
      </h1>
      <ChangeUsername />
      <ResetPassword />
      <ChangeEmail />
      <RemoveAccount />
    </Card>
  );
};

type CommonSettingsFormProps = {
  label: string;
  children: React.ReactNode;
};

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

  const submitNewUsername = () => {
    if (!auth.currentUser) {
      console.error("No user found.");
      toast({ title: "Something went wrong. Please try again." });
      return;
    }
    try {
      changeUsername(username);
      updateExistingWishlistsAuthor(userId, username)
        .then(() => {
          toast({
            title: "Username updated successfully!",
            description: "Please log in again.",
          });
          dispatch(logout());
          navigate("/");
        })
        .catch((error) => {
          console.error("Error updating author name in wishlists:", error);
          toast({
            title: "Failed to update author name in wishlists.",
            variant: "destructive",
          });
        });
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
        onChange={(e) => setUsername(e.target.value)}
      />
      <Button
        className="w-full"
        type="submit"
        disabled={!username}
        color="primary"
        onClick={() => void submitNewUsername()}
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
    const credential = promptForCredentials();

    if (auth.currentUser) {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      toast({ title: "Verification email sent successfully to " + email });
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

const RemoveAccount: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const removeAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone.",
    );
    if (!confirmDelete) return;

    const credential = promptForCredentials();
    if (!auth.currentUser) return;

    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
      toast({ title: "Account deleted" });

      dispatch(logout());
      navigate("/");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Failed to delete account", variant: "destructive" });
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

function promptForCredentials(): AuthCredential {
  const password = prompt("Please enter your password to continue.");
  if (!auth.currentUser?.email || !password) {
    throw new Error("Invalid email or password");
  }
  return EmailAuthProvider.credential(auth.currentUser.email, password);
}

export default SettingsPage;
