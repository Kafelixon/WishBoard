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
    if (!userId) return <Button className="px-2 md:px-3 lg:px-4" onClick={navigateToLogin}>Sign up</Button>;
    return (
      <>
        <Button className="px-2 md:px-3 lg:px-4" onClick={navigateToWishlist}>Wishlists</Button>
        <Button className="px-2 md:px-3 lg:px-4" onClick={navigateToSettingsPage}>
          <Settings />
        </Button>
        <Button className="px-2 md:px-3 lg:px-4" onClick={() => dispatch(logout())}>Logout</Button>
      </>
    );
  };

  return (
    <div className="top-0 left-0 w-full flex items-center justify-between z-10">
      <div>
        <h1
          className="text-3xl font-extrabold tracking-tight lg:text-4xl"
          onClick={navigateToHome}
        >
          WishBoard
        </h1>
      </div>
      <div className="flex items-end justify-between gap-1 lg:gap-2">
        <MenuButtons />
      </div>
    </div>
  );
}
