import { expect, test as base, type Browser, type Page } from "@playwright/test";
import { FakeBackend, FRIEND_USER, installFakeBackend, TEST_USER, type TestUser } from "./fakeBackend";

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

const signIn = async (page: Page, user: TestUser = TEST_USER) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
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

test.describe("reservations", () => {
  const seedGifts = (backend: FakeBackend) => {
    const id = backend.seed({
      ownerId: TEST_USER.uid,
      name: "Housewarming",
      author: TEST_USER.name,
      items: [
        { name: "Tea set", public: true },
        { name: "Candle", public: true },
        { name: "Secret gift", public: false },
      ],
    });
    return { id, tea: backend.itemId(id, "Tea set") };
  };

  /** A second, independent browser session signed in as `user`. */
  const newSession = async (browser: Browser, backend: FakeBackend, user: TestUser) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", (error) => {
      throw error;
    });
    await installFakeBackend(page, backend);
    await signIn(page, user);
    return { page, close: () => context.close() };
  };

  test("signed-out visitors are asked to sign in and cannot reserve", async ({ page, backend }) => {
    const { id } = seedGifts(backend);
    await page.goto(`/wishlist/${id}`);
    await expect(page.getByRole("heading", { name: "Tea set" })).toBeVisible();
    await expect(page.getByText("Sign in to reserve a gift")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reserve / })).toHaveCount(0);
  });

  test("a visitor reserves an item and then cancels the reservation", async ({ page, backend }) => {
    const { id } = seedGifts(backend);
    await signIn(page, FRIEND_USER);
    await page.goto(`/wishlist/${id}`);
    await expect(page.getByRole("button", { name: /^Reserve / })).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Secret gift" })).toBeHidden();

    await page.getByRole("button", { name: /^Reserve Tea set/ }).click();
    await expect(page.getByText("Reserved. Other visitors will see it's taken.", { exact: true })).toBeVisible();
    await expect(page.getByText("Reserved by you", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reserve Tea set/ })).toHaveCount(0);

    // It is still there after a reload: the reservation lives on the server.
    await page.reload();
    await expect(page.getByText("Reserved by you", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Cancel your reservation of Tea set" }).click();
    await expect(page.getByText("Reservation cancelled.", { exact: true })).toBeVisible();
    await expect(page.getByText("Reserved by you", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: /^Reserve Tea set/ })).toBeVisible();
  });

  // Hiding reservations from the owner and anonymous visitors is the API's job (api/__tests__/ops.test.ts);
  // this checks the page shows what a given viewer's API response contains, and nothing more.
  test("other visitors see a reserved item as taken, the owner and signed-out visitors see nothing", async ({
    page,
    backend,
    browser,
  }) => {
    const { id } = seedGifts(backend);
    await signIn(page, FRIEND_USER);
    await page.goto(`/wishlist/${id}`);
    await page.getByRole("button", { name: /^Reserve Tea set/ }).click();
    await expect(page.getByText("Reserved by you", { exact: true })).toBeVisible();

    const owner = await newSession(browser, backend, TEST_USER);
    await owner.page.goto(`/wishlist/${id}`);
    await expect(owner.page.getByRole("heading", { name: "Secret gift" })).toBeVisible();
    await expect(owner.page.getByText(/^Reserved/)).toHaveCount(0);
    await expect(owner.page.getByRole("button", { name: /Reserve / })).toHaveCount(0);
    await owner.close();

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await installFakeBackend(visitorPage, backend);
    await visitorPage.goto(`/wishlist/${id}`);
    await expect(visitorPage.getByRole("heading", { name: "Tea set" })).toBeVisible();
    await expect(visitorPage.getByText(/^Reserved/)).toHaveCount(0);
    await visitor.close();
  });

  test("an item reserved by someone else shows as taken and has no Reserve button", async ({ page, backend }) => {
    const { id, tea } = seedGifts(backend);
    backend.handle("someone-else", { op: "reserveItem", wishlistId: id, itemId: tea });
    await signIn(page, FRIEND_USER);
    await page.goto(`/wishlist/${id}`);
    await expect(page.getByText(/^Reserved, someone else is getting this/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reserve Tea set/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Reserve Candle/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancel your reservation/ })).toHaveCount(0);
  });

  test("losing a race for an item shows an error and refreshes it as taken", async ({ page, backend }) => {
    const { id, tea } = seedGifts(backend);
    await signIn(page, FRIEND_USER);
    await page.goto(`/wishlist/${id}`);
    await expect(page.getByRole("button", { name: /^Reserve Tea set/ })).toBeVisible();

    // Someone else reserves it after this page loaded.
    backend.handle("someone-else", { op: "reserveItem", wishlistId: id, itemId: tea });
    const response = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/wishlists") && candidate.request().postData()?.includes('"reserveItem"') === true,
    );
    await page.getByRole("button", { name: /^Reserve Tea set/ }).click();
    expect((await response).status()).toBe(409);

    await expect(
      page.getByText("Couldn't reserve this item. Someone may have just reserved it.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/^Reserved, someone else is getting this/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reserve Tea set/ })).toHaveCount(0);
  });
});

test.describe("item order, sorting and details", () => {
  /** Item names in the order the page shows them. */
  const shownNames = (page: Page) => page.getByRole("region", { name: "Items" }).getByRole("listitem").getByRole("heading");

  test("visitors get the owner's order, and price sorts keep each currency apart", async ({ page, backend }) => {
    const id = backend.seed({
      ownerId: "someone-else",
      name: "Mixed prices",
      author: "Someone",
      items: [
        { name: "Lamp", price: 200, public: true },
        { name: "Socks", price: 20, public: true },
        { name: "Scarf", price: 15, currency: "EUR", public: true },
        { name: "Card", public: true },
        { name: "Vase", price: 80, public: true },
      ],
    });
    await page.goto(`/wishlist/${id}`);
    const sort = page.getByLabel("Sort by");
    await expect(sort).toHaveValue("owner");
    await expect(shownNames(page)).toHaveText(["Lamp", "Socks", "Scarf", "Card", "Vase"]);

    // Zloty is the most common currency, so it comes first; the euro item is never compared with it.
    await sort.selectOption({ label: "Price: low to high" });
    await expect(shownNames(page)).toHaveText(["Socks", "Vase", "Lamp", "Scarf", "Card"]);
    await expect(page.getByText("Each currency is sorted separately.")).toBeVisible();
    await expect(page).toHaveURL(/\?sort=price-asc$/);

    await sort.selectOption({ label: "Price: high to low" });
    await expect(shownNames(page)).toHaveText(["Lamp", "Vase", "Socks", "Scarf", "Card"]);

    // The choice survives a reload because it is in the URL.
    await page.reload();
    await expect(page.getByLabel("Sort by")).toHaveValue("price-desc");
    await expect(shownNames(page)).toHaveText(["Lamp", "Vase", "Socks", "Scarf", "Card"]);
  });

  test("the owner arranges items with the arrow buttons and the order is saved", async ({ page, backend }) => {
    const id = backend.seed({
      ownerId: TEST_USER.uid,
      name: "Ordered",
      author: TEST_USER.name,
      items: [
        { name: "First", public: true },
        { name: "Second", public: true },
        { name: "Third", public: true },
      ],
    });
    await signIn(page);
    await page.goto(`/wishlist/${id}`);
    await expect(shownNames(page)).toHaveText(["First", "Second", "Third"]);

    await page.getByRole("button", { name: "Arrange" }).click();
    await expect(page.getByRole("button", { name: "Edit First" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Move First earlier" })).toBeDisabled();
    await page.getByRole("button", { name: "Move Third earlier" }).click();
    await expect(page.getByRole("button", { name: "Move Third earlier" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(shownNames(page)).toHaveText(["Third", "First", "Second"]);
    // At the start its "earlier" arrow is disabled, so focus moves to the other one.
    await expect(page.getByRole("button", { name: "Move Third later" })).toBeFocused();

    const reorder = page.waitForRequest(
      (request) => request.url().endsWith("/api/wishlists") && request.postData()?.includes('"reorderItems"') === true,
    );
    await page.getByRole("button", { name: "Save order" }).click();
    const sent = (await reorder).postDataJSON() as { itemIds: string[] };
    expect(sent.itemIds).toEqual(["Third", "First", "Second"].map((name) => backend.itemId(id, name)));
    await expect(page.getByText("Order saved.", { exact: true })).toBeVisible();

    await page.reload();
    await expect(shownNames(page)).toHaveText(["Third", "First", "Second"]);
  });

  test("cancelling arrange mode keeps the saved order", async ({ page, backend }) => {
    const id = backend.seed({
      ownerId: TEST_USER.uid,
      name: "Ordered",
      author: TEST_USER.name,
      items: [
        { name: "First", public: true },
        { name: "Second", public: true },
      ],
    });
    await signIn(page);
    await page.goto(`/wishlist/${id}`);
    await page.getByRole("button", { name: "Arrange" }).click();
    await page.getByRole("button", { name: "Move Second earlier" }).click();
    await expect(shownNames(page)).toHaveText(["Second", "First"]);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(shownNames(page)).toHaveText(["First", "Second"]);
    await expect(page.getByRole("button", { name: "Edit First" })).toBeVisible();
  });

  test("notes, quantity and most wanted are saved and shown on the card", async ({ page, backend }) => {
    const id = backend.seed({ ownerId: TEST_USER.uid, name: "Details", author: TEST_USER.name });
    await signIn(page);
    await page.goto(`/wishlist/${id}`);
    await page.getByRole("button", { name: "Add item" }).first().click();
    await page.getByLabel("Name").fill("Running shoes");
    await page.getByLabel("Notes").fill("Size 42, blue");
    await page.getByLabel("Quantity").fill("2");
    await page.getByRole("switch", { name: "Most wanted" }).click();
    const addRequest = page.waitForRequest(
      (request) => request.url().endsWith("/api/wishlists") && request.postData()?.includes('"addItem"') === true,
    );
    await page.getByRole("dialog").getByRole("button", { name: "Add item" }).click();
    const sent = (await addRequest).postDataJSON() as { item: Record<string, unknown> };
    expect(sent.item).toMatchObject({ notes: "Size 42, blue", quantity: 2, mostWanted: true });

    const card = page.getByRole("listitem").filter({ hasText: "Running shoes" });
    await expect(card.getByText("Most wanted", { exact: true })).toBeVisible();
    await expect(card.getByText("Size 42, blue", { exact: true })).toBeVisible();
    await expect(card.getByText(/2 of these/)).toBeVisible();

    await page.getByRole("button", { name: "Edit Running shoes" }).click();
    // A fraction is refused (by the field's step check) and the dialog stays open.
    const quantity = page.getByLabel("Quantity");
    await quantity.fill("1.5");
    await page.getByRole("button", { name: "Save changes" }).click();
    expect(await quantity.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    await expect(page.getByRole("dialog", { name: "Edit item" })).toBeVisible();
  });
});
