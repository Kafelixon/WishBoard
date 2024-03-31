import { Button } from "@/components/ui/button";
import { logout } from "@/redux/slices/userSlice";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useUserId } from "@/lib/common";

export function TopMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const userId = useUserId();

  const navigateToLogin = () => {
    navigate("/login");
  };

  const navigateToHome = () => {
    navigate("/");
  };

  const navigateToWishlist = () => {
    navigate("/wishlists");
  };

  const navigateToSettingsPage = () => {
    navigate("/settings");
  };

  const MenuButtons = () => {
    if (location.pathname === "/login") return;
    if (!userId) return <Button onClick={navigateToLogin}>Sign up</Button>;
    return (
      <>
        <Button onClick={navigateToWishlist}>Wishlists</Button>
        <Button onClick={navigateToSettingsPage}>
          <Settings />
        </Button>
        <Button onClick={() => dispatch(logout())}>Logout</Button>
      </>
    );
  };

  return (
    <div className="fixed top-0 left-0 p-3 w-screen flex items-center justify-between z-10">
      <div>
        <h1
          className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl"
          onClick={navigateToHome}
        >
          WishBoard
        </h1>
      </div>
      <div className="flex items-end justify-between gap-2">
        <MenuButtons />
      </div>
    </div>
  );
}
