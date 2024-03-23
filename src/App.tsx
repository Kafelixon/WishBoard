import { Outlet, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../redux/store";
import { Toaster } from "react-hot-toast";

import { CssVarsProvider } from "@mui/joy/styles";
import { theme } from "./theme";
import { TopMenu } from "../components/TopMenu";
import { SignInForm } from "../components/SignInForm";
import { WishlistPage } from "../components/WishlistPage";
import { SettingsPage } from "../components/SettingsPage";
import { LandingPage } from "../components/LandingPage";
import { UserWishlistsOverview } from "../components/UserWishlistsOverview";
import { WishlistImport } from "../components/JsonWishlistImporter";

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <CssVarsProvider theme={theme}>
          <Toaster />
          <TopMenu />
          <Routes>
            <Route element={<Outlet />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<SignInForm />} />
              <Route path="/wishlists" element={<UserWishlistsOverview />} />
              <Route path="/wishlist/:wishlistId" element={<WishlistPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/import/" element={<WishlistImport />} />
            </Route>
          </Routes>
        </CssVarsProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
