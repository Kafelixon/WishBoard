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

test.describe("Polish locale", () => {
  test.use({ locale: "pl-PL" });

  test("follows the browser language and sets <html lang>", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("listę swoich marzeń");
    await expect(page.getByRole("link", { name: "Zaczynamy" })).toBeVisible();
  });

  test("login form and not-found page are translated", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Hasło")).toBeVisible();
    await page.goto("/definitely-not-a-page");
    await expect(page.getByText("Nie znaleziono strony")).toBeVisible();
  });

  test("the language switcher changes and remembers the language", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Język").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  });
});
