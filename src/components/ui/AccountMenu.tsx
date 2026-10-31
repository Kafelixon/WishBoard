import { useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { logout } from "@/lib/userStore";
import type { User } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

/** The signed-in user's avatar menu. Loaded on demand so signed-out visitors never download the dropdown code. */
export default function AccountMenu({ user }: { user: User }) {
  const navigate = useNavigate();

  const initials =
    user.displayName
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "?";

  const handleLogout = () => {
    logout();
    signOut(auth).catch((error: unknown) => {
      console.error("Sign out failed", error);
    });
    void navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar>
          <AvatarImage src={user.photoURL ?? undefined} alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.displayName ?? user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void navigate("/settings");
          }}
        >
          <Settings aria-hidden="true" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
