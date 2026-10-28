import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Provider, useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebaseSetup";
import { logout } from "@/redux/slices/userSlice";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/redux/store";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"

import { TopMenu } from "@/components/ui/TopMenu";
import { SignInForm } from "@/components/ui/SignInForm";
import { WishlistPage } from "@/components/ui/WishlistPage";
import { SettingsPage } from "@/components/ui/SettingsPage";
import { LandingPage } from "@/components/ui/LandingPage";
import { UserWishlistsOverview } from "@/components/ui/UserWishlistsOverview";
import { NotFound } from "@/components/ui/NotFound";
import { RequireAuth } from "@/components/ui/RequireAuth";

/** Drops the persisted user when Firebase reports there is no signed-in session. */
const AuthSync = () => {
  const dispatch = useDispatch();
  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) dispatch(logout());
      }),
    [dispatch],
  );
  return null;
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <AuthSync />
          <TopMenu />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<SignInForm />} />
            <Route path="/wishlist/:wishlistId" element={<WishlistPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/wishlists" element={<UserWishlistsOverview />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        <SpeedInsights />
        <Analytics />
      </PersistGate>
    </Provider>
  );
};

export default App;
