import { Outlet, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
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

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <TopMenu />
          <Routes>
            <Route element={<Outlet />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<SignInForm />} />
              <Route path="/wishlists" element={<UserWishlistsOverview />} />
              <Route path="/wishlist/:wishlistId" element={<WishlistPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
          <Toaster />
        <SpeedInsights />
        <Analytics />
      </PersistGate>
    </Provider>
  );
};

export default App;
