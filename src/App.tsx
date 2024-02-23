import { Outlet, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../redux/store";

import { CssVarsProvider } from "@mui/joy/styles";
import { theme } from "./theme";
import { TopMenu } from "../components/TopMenu";
import { SignInForm } from "../components/SignInForm";
import { Wishlist } from "../components/WishlistPage";
import { SettingsPage } from "../components/SettingsPage";
import { LandingPage } from "../components/LandingPage";

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <CssVarsProvider theme={theme}>
          <TopMenu />
          <Routes>
            <Route element={<Outlet />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<SignInForm />} />
              <Route path="/wishlist/:wishlistId" element={<Wishlist />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </CssVarsProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
