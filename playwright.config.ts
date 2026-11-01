import { defineConfig } from "@playwright/test";

const port = "4173";

export default defineConfig({
  testDir: "e2e",
  // Tests within a file run in parallel too; the specs are independent (each page fakes its own backend).
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  // Serves the production build (run `pnpm build` first).
  webServer: {
    command: `pnpm preview --port ${port} --strictPort`,
    port: Number(port),
    reuseExistingServer: !process.env.CI,
  },
});
