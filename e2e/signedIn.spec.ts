import { expect, test as base, type Page } from "@playwright/test";
import { FakeBackend, installFakeBackend, TEST_USER } from "./fakeBackend";

// Signed-in flows against the production build, with Firebase Auth and the API faked (see fakeBackend.ts).
const test = base.extend<{ backend: FakeBackend }>({
  backend: async ({ page }, provide) => {
    page.on("pageerror", (error) => {
      throw error;
    });
    const backend = new FakeBackend();
    await installFakeBackend(page, backend);
    await provide(backend);
  },
});

const signIn = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.getByLabel("Password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
};

const createWishlist = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "New wishlist" }).first().click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create wishlist" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
};

test.describe("sign in", () => {
  test("rejects wrong credentials and stays on the form", async ({ page, backend: _ }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Invalid email or password.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signs in, keeps the session across a reload, and signs out", async ({ page, backend: _ }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/wishlists");
    await expect(page.getByRole("heading", { name: "Your wishlists" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your wishlists" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeHidden();
    await page.goto("/wishlists");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("own wishlists", () => {
  test("create, rename and delete a wishlist", async ({ page, backend: _ }) => {
    await signIn(page);
    await page.goto("/wishlists");
    await expect(page.getByText("Plant your first wishlist")).toBeVisible();

    await createWishlist(page, "Birthday");
    await expect(page.getByText(TEST_USER.name)).toBeVisible();

    await page.getByRole("button", { name: "Actions for Birthday" }).click();
    await page.getByRole("menuitem", { name: "Edit wishlist" }).click();
    await page.getByLabel("Name").fill("Birthday 2026");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("link", { name: "Birthday 2026" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Birthday", exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Actions for Birthday 2026" }).click();
    await page.getByRole("menuitem", { name: "Edit wishlist" }).click();
    await page.getByRole("button", { name: "Delete wishlist" }).click();
    const confirmWishlist = page.getByRole("dialog", { name: "Delete wishlist" });
    await expect(confirmWishlist).toContainText("Delete this wishlist and all of its items?");
    await confirmWishlist.getByRole("button", { name: "Delete wishlist" }).click();
    await expect(page.getByRole("link", { name: "Birthday 2026" })).toBeHidden();
    await expect(page.getByText("Plant your first wishlist")).toBeVisible();
  });

  test("add, edit and delete an item", async ({ page, backend: _ }) => {
    await signIn(page);
    await page.goto("/wishlists");
    await createWishlist(page, "Home");
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page.getByText("Add your first wish")).toBeVisible();

    await page.getByRole("button", { name: "Add item" }).first().click();
    await page.getByLabel("Name").fill("Linen throw");
    await page.getByLabel("Average price").fill("129.5");
    const publicSwitch = page.getByRole("switch", { name: "Public" });
    const wasPublic = (await publicSwitch.getAttribute("aria-checked")) === "true";
    await publicSwitch.click();
    const addRequest = page.waitForRequest(
      (request) => request.url().endsWith("/api/wishlists") && request.postData()?.includes('"addItem"') === true,
    );
    await page.getByRole("dialog").getByRole("button", { name: "Add item" }).click();
    await expect(page.getByRole("heading", { name: "Linen throw" })).toBeVisible();
    await expect(page.getByText("zł 129.5", { exact: true })).toBeVisible();
    const sent = (await addRequest).postDataJSON() as { item: { public: boolean; price: number } };
    expect(sent.item).toMatchObject({ public: !wasPublic, price: 129.5 });
    await expect(page.getByText("Item added successfully.", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit Linen throw" }).click();
    await page.getByLabel("Name").fill("Wool throw");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Wool throw" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Linen throw" })).toBeHidden();

    await page.getByRole("button", { name: "Edit Wool throw" }).click();
    await page.getByRole("button", { name: "Delete item" }).click();
    const confirmItem = page.getByRole("dialog", { name: "Delete item" });
    await expect(confirmItem).toContainText("Delete this item?");
    await confirmItem.getByRole("button", { name: "Delete item" }).click();
    await expect(page.getByRole("heading", { name: "Wool throw" })).toBeHidden();
    await expect(page.getByText("Add your first wish")).toBeVisible();
  });

  test("the Public switch is sent to the API, and the page shows what the API returns per viewer", async ({ page, backend, browser }) => {
    const id = backend.seed({
      ownerId: TEST_USER.uid,
      name: "Mixed",
      author: TEST_USER.name,
      items: [
        { name: "Shown to all", public: true },
        { name: "Only for me", public: false },
      ],
    });
    await signIn(page);
    await page.goto(`/wishlist/${id}`);
    await expect(page.getByRole("heading", { name: "Only for me" })).toBeVisible();

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await installFakeBackend(visitorPage, backend);
    await visitorPage.goto(`/wishlist/${id}`);
    await expect(visitorPage.getByRole("heading", { name: "Shown to all" })).toBeVisible();
    await expect(visitorPage.getByRole("heading", { name: "Only for me" })).toBeHidden();
    await visitor.close();
  });
});

test.describe("following", () => {
  test("follow and unfollow someone else's wishlist", async ({ page, backend }) => {
    const id = backend.seed({
      ownerId: "someone-else",
      name: "Wedding",
      author: "Alex",
      items: [
        { name: "Tea set", public: true },
        { name: "Secret gift", public: false },
      ],
    });
    await signIn(page);

    await page.goto("/following");
    await expect(page.getByText("Nothing followed yet")).toBeVisible();

    await page.goto(`/wishlist/${id}`);
    await expect(page.getByRole("heading", { name: "Tea set" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Secret gift" })).toBeHidden();
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(page.getByText("You are now following this wishlist", { exact: true })).toBeVisible();

    await page.goto("/following");
    await expect(page.getByRole("link", { name: "Wedding" })).toBeVisible();

    await page.getByRole("link", { name: "Wedding" }).click();
    await page.getByRole("button", { name: "Following", exact: true }).click();
    await expect(page.getByText("You are no longer following this wishlist", { exact: true })).toBeVisible();

    await page.goto("/following");
    await expect(page.getByText("Nothing followed yet")).toBeVisible();
  });
});
