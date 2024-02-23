import { Box, Button, Typography } from "@mui/joy";
import { logout } from "../redux/slices/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";

export function TopMenu() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userState = useSelector((state: any) => state.user);
  const uid = userState.user ? userState.user.uid : null;

  const navigateToLogin = () => {
    navigate("/login");
  };

  const navigateToHome = () => {
    navigate("/");
  };

  const navigateToWishlist = () => {
    navigate("/wishlist/wishlist1");
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
        minHeight: "60px",
        flexDirection: "row",
        display: "flex",
        alignItems: "end",
        justifyContent: "space-between",
        gap: 1,
        zIndex: 1,
      }}
    >
      <Box sx={{ justifySelf: "start" }}>
        <Typography
          level="h2"
          fontWeight="xl"
          textAlign="center"
          onClick={navigateToHome}
        >
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
        {!uid ? (
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
