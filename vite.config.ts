import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const src = path.resolve(__dirname, "./src");

export default defineConfig(({ mode }) => {
  const useFirestore = loadEnv(mode, process.cwd(), "VITE_").VITE_BACKEND === "firestore";
  return {
    plugins: [react()],
    // `pnpm dev:api` serves /api/wishlists locally (the default backend).
    server: { proxy: { "/api": `http://localhost:${process.env.API_PORT ?? "3001"}` } },
    resolve: {
      alias: [
        // Must come before "@": swaps the data layer so only one backend is bundled.
        ...(useFirestore
          ? [{ find: "@/lib/backend", replacement: path.join(src, "lib/firestoreHandlers.ts") }]
          : []),
        { find: "@", replacement: src },
      ],
    },
  };
});
