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
import {
  Button,
  Typography,
  Input,
  FormLabel,
  FormControl,
  Divider,
} from "@mui/joy";
import toast from "react-hot-toast";
import { auth } from "../src/firebaseSetup";
import { logout } from "../redux/slices/userSlice";
import StyledCard from "./StyledCard";
import StyledStack from "./StyledStack";

export const SettingsPage = () => {
  return (
    <StyledStack>
      <StyledCard>
        <Typography level="h3" mb={2}>
          Settings
        </Typography>

        <ResetPassword />
        <Divider />
        <ChangeEmail />
        <Divider />
        <RemoveAccount />
      </StyledCard>
    </StyledStack>
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
    <FormControl sx={{ width: "100%", flexDirection: "column", gap: 1 }}>
      <FormLabel sx={{ m: 0 }}>{label}</FormLabel>
      {children}
    </FormControl>
  );
};

const ResetPassword: React.FC = () => {
  const resetPassword = async () => {
    if (!auth.currentUser?.email) {
      console.error("No user or email found.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast.success("Password reset email sent successfully!");
    } catch (error) {
      console.error("Error sending reset email:", error);
    }
  };

  return (
    <CommonSettingsForm label="Reset Password">
      <Button color="primary" onClick={() => void resetPassword()}>
        Send Password Reset Email
      </Button>
    </CommonSettingsForm>
  );
};

const ChangeEmail: React.FC = () => {
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
      toast.error("Please enter a valid email address.");
      return;
    }
    const credential = promptForCredentials();

    if (auth.currentUser) {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      toast.success("Verification email sent successfully to " + email);
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
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const removeAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmDelete) return;

    const credential = promptForCredentials();
    if (!auth.currentUser) return;

    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
      toast.success("Account deleted successfully!");
      dispatch(logout());
      navigate("/");
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  return (
    <CommonSettingsForm label="Delete Account">
      <Button
        variant="outlined"
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
