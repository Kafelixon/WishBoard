import { useState } from "react";
import {
  Button,
  Typography,
  Input,
  FormLabel,
  FormControl,
  Divider,
} from "@mui/joy";
import { auth } from "../src/firebaseSetup";
import StyledCard from "../components/StyledCard";

export const SettingsPage = () => {
  return (
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
  );
};

// component : Common Form Control
type CommonSettingsFormProps = {
  label: string;
  children: React.ReactNode;
};

const CommonSettingsForm: React.FC<CommonSettingsFormProps> = ({
  label,
  children,
}) => {
  return (
    <FormControl sx={{width:"100%", flexDirection:"column", gap:1}}>
      <FormLabel sx={{m:0}}>{label}</FormLabel>
      {children}
    </FormControl>
  );
};

const ResetPassword: React.FC = () => {
  const resetPassword = async () => {
    try {
      // await auth.sendPasswordResetEmail(auth.currentUser?.email || "");
      // alert("Password reset email sent!");
      alert("This feature is not yet implemented.");
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      alert(error.message);
    }
  };

  return (
    <CommonSettingsForm label="Reset Password">
      <Button variant="outlined" color="primary" onClick={resetPassword}>
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
    try {
      if (!isValid) {
        alert("Please enter a valid email address.");
        return;
      }

      if (auth.currentUser) {
        // await auth.currentUser.updateEmail(email);
        // alert("Email updated successfully!");
        alert("This feature is not yet implemented.");
      }
    } catch (error: any) {
      console.error("Error updating email:", error);
      alert(error.message);
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
        disabled={!isValid}
        variant="outlined"
        color="primary"
        onClick={changeEmail}
      >
        Change Email
      </Button>
    </CommonSettingsForm>
  );
};



const RemoveAccount: React.FC = () => {
  const removeAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (confirmDelete) {
      try {
        if (auth.currentUser) {
          // await auth.currentUser.delete();
          // alert("Account deleted successfully.");
          alert("This feature is not yet implemented.");
        }
      } catch (error: any) {
        console.error("Error deleting account:", error);
        alert(error.message);
      }
    }
  };

  return (
    <CommonSettingsForm label="Delete Account">
      <Button variant="outlined" color="danger" onClick={removeAccount}>
        Delete My Account
      </Button>
    </CommonSettingsForm>
  );
};

export default SettingsPage;
