import { expect, test } from "@playwright/test";

// No backend or sign-in needed: these only check that the built app boots and routes.
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("login page shows the sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("signed-out visitors are redirected from protected pages to /login", async ({ page }) => {
  for (const path of ["/wishlists", "/following", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("unknown routes render the not-found page", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByText("Page not found")).toBeVisible();
});
