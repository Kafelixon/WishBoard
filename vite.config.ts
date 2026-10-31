import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // `pnpm dev:api` serves /api/wishlists locally (the default backend).
  server: { proxy: { "/api": "http://localhost:3001" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
