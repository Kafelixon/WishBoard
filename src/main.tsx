import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-ext-500.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-ext-600.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-ext-400.css";
import "@fontsource/newsreader/latin-500.css";
import "@fontsource/newsreader/latin-ext-500.css";
import "@fontsource/newsreader/latin-600.css";
import "@fontsource/newsreader/latin-ext-600.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
