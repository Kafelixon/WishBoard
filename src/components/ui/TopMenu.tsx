import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { logout } from "@/redux/slices/userSlice";
import { useUser } from "@/lib/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const navLinkClass =
  "rounded-full px-2.5 py-1.5 text-sm text-muted-foreground sm:px-3.5 sm:text-[0.95rem] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-secondary aria-[current=page]:text-foreground";

function LogoMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="hidden size-6 text-primary sm:block"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function TopMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useUser();

  const initials =
    user?.displayName
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "?";

  const handleLogout = () => {
    dispatch(logout());
    signOut(auth).catch((error: unknown) => {
      console.error("Sign out failed", error);
    });
    void navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-5">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md font-display text-xl font-semibold tracking-tight sm:text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogoMark />
          WishBoard
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-0.5 sm:ml-2 sm:gap-1">
          {user && (
            <>
              <NavLink to="/wishlists" className={navLinkClass}>
                Wishlists
              </NavLink>
              <NavLink to="/following" className={navLinkClass}>
                Following
              </NavLink>
            </>
          )}
        </nav>
        {user ? (
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
        ) : (
          location.pathname !== "/login" && (
            <Button asChild size="sm">
              <Link to="/login">Get started</Link>
            </Button>
          )
        )}
      </div>
    </header>
  );
}
