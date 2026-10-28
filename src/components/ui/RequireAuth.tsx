import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserId } from "@/lib/common";

/** Redirects signed-out visitors to /login, remembering where they were going. */
export const RequireAuth = () => {
  const userId = useUserId();
  const location = useLocation();

  if (!userId) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};
