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
import { UserWishlists } from "@/components/ui/UserWishlists";
import { FollowedWishlists } from "@/components/ui/FollowedWishlists";
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
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <TopMenu />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-5 sm:pt-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<SignInForm />} />
            <Route path="/wishlist/:wishlistId" element={<WishlistPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/wishlists" element={<UserWishlists />} />
              <Route path="/following" element={<FollowedWishlists />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </main>
          <Toaster />
        <SpeedInsights />
        <Analytics />
      </PersistGate>
    </Provider>
  );
};

export default App;
