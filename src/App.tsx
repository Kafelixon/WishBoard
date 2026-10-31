import { Suspense, lazy, useEffect, type ComponentType } from "react";
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
import { LandingPage } from "@/components/ui/LandingPage";
import { NotFound } from "@/components/ui/NotFound";
import { RequireAuth } from "@/components/ui/RequireAuth";
import { startEarlyRequests } from "@/lib/pgHandlers";

const loaders = {
  SignInForm: () => import("@/components/ui/SignInForm"),
  WishlistPage: () => import("@/components/ui/WishlistPage"),
  SettingsPage: () => import("@/components/ui/SettingsPage"),
  UserWishlists: () => import("@/components/ui/UserWishlists"),
  FollowedWishlists: () => import("@/components/ui/FollowedWishlists"),
};

const lazyPage = <K extends keyof typeof loaders>(name: K) =>
  lazy(async () => {
    const page = (await loaders[name]()) as unknown as Record<K, ComponentType>;
    return { default: page[name] };
  });

const SignInForm = lazyPage("SignInForm");
const WishlistPage = lazyPage("WishlistPage");
const SettingsPage = lazyPage("SettingsPage");
const UserWishlists = lazyPage("UserWishlists");
const FollowedWishlists = lazyPage("FollowedWishlists");

/** Starts fetching the chunk for the page being opened before React has rendered, so it never waits on the app shell. */
const preloadInitialRoute = (pathname: string) => {
  if (pathname.startsWith("/wishlist/")) void loaders.WishlistPage();
  else if (pathname === "/wishlists") void loaders.UserWishlists();
  else if (pathname === "/following") void loaders.FollowedWishlists();
  else if (pathname === "/settings") void loaders.SettingsPage();
  else if (pathname === "/login") void loaders.SignInForm();
  // Postgres backend only: start the page's data request (or wake the database) before any page code loads.
  if (import.meta.env.VITE_BACKEND !== "firestore") startEarlyRequests(pathname);
};
preloadInitialRoute(window.location.pathname);

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
          <Suspense fallback={null}>
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
          </Suspense>
          </main>
          <Toaster />
        <SpeedInsights />
        <Analytics />
      </PersistGate>
    </Provider>
  );
};

export default App;
