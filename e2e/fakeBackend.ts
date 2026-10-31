import { randomUUID } from "node:crypto";
import type { Page, Route } from "@playwright/test";

/**
 * Stands in for Firebase Auth and the /api/wishlists function, so signed-in flows
 * run against the production build with no secrets or database. It follows
 * api/_lib/ops.ts for request keys, validation, ownership checks and private-item
 * filtering, but is a hand-written copy: the real logic is covered by `pnpm test`,
 * so these tests prove the UI talks to the API correctly, not that the API is right.
 */

export const TEST_USER = {
  uid: "user-e2e",
  email: "e2e@example.com",
  password: "correct-horse",
  name: "E2E Tester",
};

interface Item {
  id: string;
  name: string;
  price: number;
  currency: string;
  link: string;
  image: string;
  public: boolean;
}

interface StoredWishlist {
  id: string;
  ownerId: string;
  name: string;
  author: string;
  icon: string;
  iconColor?: string;
  updateTimestamp: number;
  items: Item[];
}

type Body = Record<string, unknown>;

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const base64Url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** An unsigned token in the shape Firebase's client parses (and our fake API reads `sub` from). */
const makeIdToken = (user: typeof TEST_USER) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://securetoken.google.com/e2e",
    aud: "e2e",
    sub: user.uid,
    user_id: user.uid,
    email: user.email,
    name: user.name,
    iat: now,
    auth_time: now,
    exp: now + 3600,
    firebase: { identities: { email: [user.email] }, sign_in_provider: "password" },
  };
  return `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(payload)}.signature`;
};

const callerFrom = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  try {
    const payload = authorization.replace(/^Bearer\s+/i, "").split(".")[1] ?? "";
    const { sub } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: unknown };
    if (typeof sub === "string" && sub) return sub;
  } catch {
    // falls through to the same 401 the real function gives a bad token
  }
  throw new ApiError(401, "Invalid or expired session.");
};

const required = (value: unknown, field: string, allowEmpty = false): string => {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new ApiError(400, `${field} is required.`);
  }
  return value;
};

const color = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/.test(value)) {
    throw new ApiError(400, "iconColor must be a #rrggbb color.");
  }
  return value;
};

const toCurrency = (value: unknown): string =>
  typeof value === "string" && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : "PLN";

const toPrice = (value: unknown): number => {
  const price = value === undefined || value === null ? 0 : Number(value);
  if (!Number.isFinite(price) || price < 0) throw new ApiError(400, "price must be a non-negative number.");
  return Math.round(price * 100) / 100;
};

const toItem = (raw: unknown, id: string): Item => {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    id,
    name: required(item.name, "item name"),
    price: toPrice(item.price),
    currency: toCurrency(item.currency),
    link: typeof item.link === "string" ? item.link : "",
    image: typeof item.image === "string" ? item.image : "",
    public: item.public === true,
  };
};

export class FakeBackend {
  private readonly wishlists = new Map<string, StoredWishlist>();
  /** user id -> followed wishlist id -> the follower's own name for it */
  private readonly follows = new Map<string, Map<string, string | undefined>>();

  /** Adds a wishlist owned by someone else (or the test user), without going through the UI. */
  seed(wishlist: { ownerId: string; name: string; author: string; items?: Partial<Item>[] }): string {
    const id = randomUUID();
    this.wishlists.set(id, {
      id,
      ownerId: wishlist.ownerId,
      name: wishlist.name,
      author: wishlist.author,
      icon: "gift",
      updateTimestamp: Date.now(),
      items: (wishlist.items ?? []).map((item) => toItem(item, randomUUID())),
    });
    return id;
  }

  handle(uid: string | null, body: Body): unknown {
    const user = () => {
      if (!uid) throw new ApiError(401, "Sign in required.");
      return uid;
    };
    /** `key` is the request field naming the wishlist, which differs between ops just as in ops.ts. */
    const owned = (key: "id" | "wishlistId") => {
      const wishlist = this.wishlists.get(required(body[key], key));
      if (!wishlist) throw new ApiError(404, "Wishlist is invalid.");
      if (wishlist.ownerId !== user()) throw new ApiError(403, "You cannot modify this wishlist.");
      wishlist.updateTimestamp = Date.now();
      return wishlist;
    };
    const summary = ({ items: _items, ownerId: _ownerId, ...rest }: StoredWishlist) => rest;
    const newestFirst = (a: StoredWishlist, b: StoredWishlist) => b.updateTimestamp - a.updateTimestamp;

    switch (body.op) {
      case "ping":
        return { ok: true };

      case "createWishlist": {
        const id = this.seed({
          ownerId: user(),
          name: required(body.name, "name"),
          author: required(body.author, "author", true),
        });
        const created = this.wishlists.get(id);
        if (created) {
          created.icon = required(body.icon, "icon");
          created.iconColor = color(body.iconColor);
        }
        return { id };
      }

      case "updateWishlist": {
        const wishlist = owned("id");
        wishlist.name = required(body.name, "name");
        wishlist.author = required(body.author, "author", true);
        wishlist.icon = required(body.icon, "icon");
        wishlist.iconColor = color(body.iconColor);
        return {};
      }

      case "deleteWishlist": {
        const wishlist = owned("id");
        this.wishlists.delete(wishlist.id);
        return {};
      }

      case "addItem": {
        const wishlist = owned("wishlistId");
        wishlist.items.push(toItem(body.item, randomUUID()));
        return wishlist.items;
      }

      case "updateItem": {
        const wishlist = owned("wishlistId");
        const itemId = required((body.item as Partial<Item> | undefined)?.id, "Item ID");
        const index = wishlist.items.findIndex((item) => item.id === itemId);
        if (index < 0) throw new ApiError(404, "Item not found.");
        wishlist.items[index] = toItem(body.item, itemId);
        return wishlist.items;
      }

      case "deleteItem": {
        const wishlist = owned("wishlistId");
        const itemId = required(body.itemId, "itemId");
        wishlist.items = wishlist.items.filter((item) => item.id !== itemId);
        return wishlist.items;
      }

      case "listMine":
        return [...this.wishlists.values()]
          .filter((wishlist) => wishlist.ownerId === user())
          .sort(newestFirst)
          .map(summary);

      case "view": {
        const wishlist = this.wishlists.get(required(body.wishlistId, "wishlistId"));
        if (!wishlist) return null;
        const isOwner = uid === wishlist.ownerId;
        return {
          info: summary(wishlist),
          isOwner,
          items: isOwner ? wishlist.items : wishlist.items.filter((item) => item.public),
        };
      }

      case "follow": {
        const id = required(body.wishlistId, "wishlistId");
        if (!this.wishlists.has(id)) throw new ApiError(404, "Wishlist is invalid.");
        const mine = this.follows.get(user()) ?? new Map<string, string | undefined>();
        if (!mine.has(id)) mine.set(id, undefined);
        this.follows.set(user(), mine);
        return {};
      }

      case "unfollow":
        this.follows.get(user())?.delete(required(body.wishlistId, "wishlistId"));
        return {};

      case "isFollowing":
        return { following: this.follows.get(user())?.has(required(body.wishlistId, "wishlistId")) ?? false };

      case "followed":
        return [...(this.follows.get(user()) ?? [])]
          .flatMap(([id, customName]) => {
            const wishlist = this.wishlists.get(id);
            return wishlist ? [{ wishlist, customName }] : [];
          })
          .sort((a, b) => newestFirst(a.wishlist, b.wishlist))
          .map(({ wishlist, customName }) => ({ ...summary(wishlist), ...(customName && { customName }) }));

      case "renameFollow": {
        const mine = this.follows.get(user());
        const id = required(body.wishlistId, "wishlistId");
        if (!mine?.has(id)) throw new ApiError(404, "You are not following this wishlist.");
        const customName = typeof body.customName === "string" ? body.customName.trim() : "";
        mine.set(id, customName || undefined);
        return {};
      }

      case "updateAuthor": {
        const author = required(body.author, "author");
        for (const wishlist of this.wishlists.values()) {
          if (wishlist.ownerId === user()) {
            wishlist.author = author;
            wishlist.updateTimestamp = Date.now();
          }
        }
        return {};
      }

      case "deleteAccount": {
        for (const [id, wishlist] of this.wishlists) {
          if (wishlist.ownerId === user()) this.wishlists.delete(id);
        }
        this.follows.delete(user());
        return {};
      }

      default:
        throw new ApiError(400, "Unknown operation.");
    }
  }
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Routes the page's Firebase Auth and /api/wishlists traffic to the fake. */
export async function installFakeBackend(page: Page, backend: FakeBackend): Promise<void> {
  // Anything else Firebase might ask Google for gets an empty answer rather than the network.
  await page.route(/googleapis\.com|firebaseapp\.com/, (route) => json(route, 200, {}));

  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword/, (route) => {
    const { email, password } = route.request().postDataJSON() as { email: string; password: string };
    if (email !== TEST_USER.email || password !== TEST_USER.password) {
      return json(route, 400, {
        error: { code: 400, message: "INVALID_LOGIN_CREDENTIALS", errors: [{ message: "INVALID_LOGIN_CREDENTIALS" }] },
      });
    }
    return json(route, 200, {
      localId: TEST_USER.uid,
      email: TEST_USER.email,
      displayName: TEST_USER.name,
      registered: true,
      idToken: makeIdToken(TEST_USER),
      refreshToken: "e2e-refresh-token",
      expiresIn: "3600",
    });
  });

  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/, (route) =>
    json(route, 200, {
      users: [
        {
          localId: TEST_USER.uid,
          email: TEST_USER.email,
          displayName: TEST_USER.name,
          emailVerified: true,
          providerUserInfo: [{ providerId: "password", email: TEST_USER.email, federatedId: TEST_USER.email }],
          createdAt: String(Date.now()),
          lastLoginAt: String(Date.now()),
        },
      ],
    }),
  );

  await page.route(/identitytoolkit\.googleapis\.com\/v2\/recaptchaConfig/, (route) =>
    json(route, 200, {
      recaptchaEnforcementState: [{ provider: "EMAIL_PASSWORD_PROVIDER", enforcementState: "OFF" }],
    }),
  );

  await page.route(/securetoken\.googleapis\.com/, (route) =>
    json(route, 200, {
      access_token: makeIdToken(TEST_USER),
      id_token: makeIdToken(TEST_USER),
      refresh_token: "e2e-refresh-token",
      expires_in: "3600",
      user_id: TEST_USER.uid,
    }),
  );

  await page.route("**/api/wishlists", (route) => {
    try {
      const uid = callerFrom(route.request().headers().authorization);
      const body = route.request().postDataJSON() as Body;
      return json(route, 200, { data: backend.handle(uid, body) });
    } catch (error) {
      // Fulfil even unexpected errors so a fake bug fails the test instead of hanging the request.
      if (error instanceof ApiError) return json(route, error.status, { error: error.message });
      return json(route, 500, { error: String(error) });
    }
  });
}
