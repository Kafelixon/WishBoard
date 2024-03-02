import { Box, Button, Typography } from "@mui/joy";
import { logout } from "../redux/slices/userSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUserId } from "../data/common";

export function TopMenu() {
  const navigate = useNavigate();
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

  return (
    <Box
      sx={{
        boxSizing: "border-box",
        position: "fixed",
        top: 0,
        p: 2,
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 1,
      }}
    >
      <Box>
        <Typography level="h2" onClick={navigateToHome}>
          Minimal Wishlist
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        {!userId ? (
          <Button onClick={navigateToLogin}>Sign in</Button>
        ) : (
          <>
            <Button onClick={navigateToWishlist}>Wishlists</Button>
            <Button onClick={navigateToSettingsPage}>
              <SettingsIcon />
            </Button>
            <Button onClick={() => dispatch(logout())}>Logout</Button>
          </>
        )}
      </Box>
    </Box>
  );
}
