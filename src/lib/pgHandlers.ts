import { auth } from "@/firebaseSetup";
import { readCachedIdToken } from "@/lib/cachedToken";
import { WishlistItem, Wishlist } from "@/lib/types";
import { toWishlistIconName } from "@/lib/wishlistIcons";
import type {
  FollowStateChanger,
  WishlistChanger,
  WishlistItemChanger,
  WishlistView,
} from "@/lib/firestoreHandlers";

/** Postgres-backed handlers: same contract as firestoreHandlers, over /api/wishlists. */

/**
 * Whether a user was signed in last time, read straight from the persisted
 * Redux state (synchronous, so it doesn't depend on rehydration having finished).
 * Anything unreadable counts as signed in, so we only skip the auth wait when sure.
 */
function wasSignedIn(): boolean {
  try {
    const raw = localStorage.getItem("persist:root");
    if (raw === null) return false;
    const slice = (JSON.parse(raw) as { user?: string }).user;
    return slice === undefined || (JSON.parse(slice) as { user: unknown }).user !== null;
  } catch {
    return true;
  }
}

async function send<T>(
  op: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  // Signed-out visitors have no token to wait for. Returning visitors send the
  // saved token right away instead of waiting for Firebase to re-validate them.
  if (wasSignedIn()) {
    const cachedToken = await readCachedIdToken();
    if (cachedToken) {
      headers.authorization = `Bearer ${cachedToken}`;
    } else {
      await auth.authStateReady();
    }
  }
  if (!headers.authorization && auth.currentUser) {
    headers.authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  const response = await fetch("/api/wishlists", {
    method: "POST",
    headers,
    body: JSON.stringify({ op, ...params }),
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: string;
  } | null;
  if (!response.ok || !payload || !("data" in payload)) {
    throw new Error(payload?.error ?? `Request failed (${String(response.status)})`);
  }
  return payload.data as T;
}

/**
 * Read requests started at page load, before the page's code has even been
 * downloaded. The page's own call with the same op and params takes the pending
 * promise over (once, within a few seconds) instead of sending a second request.
 */
const earlyRequests = new Map<string, Promise<unknown>>();
const EARLY_REQUEST_TTL_MS = 15_000;
const requestKey = (op: string, params: Record<string, unknown>) => op + JSON.stringify(params);

function call<T>(op: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = requestKey(op, params);
  const early = earlyRequests.get(key);
  if (early) {
    earlyRequests.delete(key);
    return early as Promise<T>;
  }
  return send<T>(op, params);
}

function startEarly(op: string, params: Record<string, unknown> = {}) {
  const key = requestKey(op, params);
  const request = send(op, params);
  request.catch(() => undefined); // an unused failure must not become an unhandled rejection
  earlyRequests.set(key, request);
  setTimeout(() => {
    earlyRequests.delete(key);
  }, EARLY_REQUEST_TTL_MS);
}

/** Starts the data request for the page being opened; the route's component picks it up when it mounts. */
export function startEarlyRequests(pathname: string): void {
  const wishlistId = /^\/wishlist\/([^/]+)$/.exec(pathname)?.[1];
  if (wishlistId) startEarly("view", { wishlistId: decodeURIComponent(wishlistId) });
  else if (wasSignedIn() && pathname === "/wishlists") startEarly("listMine");
  else if (wasSignedIn() && pathname === "/following") startEarly("followed");
  else if (pathname === "/" || pathname === "/login") warmUp();
}

/** Fire-and-forget request that wakes the suspended database before the first real query needs it. */
export const warmUp = (): void => {
  fetch("/api/wishlists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "ping" }),
  }).catch(() => undefined);
};

const toWishlist = (raw: Wishlist): Wishlist => ({
  ...raw,
  icon: toWishlistIconName(raw.icon),
});

export const createWishlist: WishlistChanger = async (userId, wishlist) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlist.name) throw new Error("Wishlist name is not provided.");
  await call("createWishlist", {
    name: wishlist.name,
    author: wishlist.author,
    icon: wishlist.icon,
  });
};

export const updateWishlist: WishlistChanger = async (_userId, wishlist) => {
  await call("updateWishlist", {
    id: wishlist.id,
    name: wishlist.name,
    author: wishlist.author,
    icon: wishlist.icon,
  });
};

export const deleteWishlist = async (_userId: string, wishlistId: string) => {
  await call("deleteWishlist", { id: wishlistId });
};

export const addItemToWishlist: WishlistItemChanger = (_u, wishlistId, item) =>
  call<WishlistItem[]>("addItem", { wishlistId, item });

export const updateWishlistItem: WishlistItemChanger = (_u, wishlistId, item) => {
  if (!item.id) return Promise.reject(new Error("Item ID is not provided."));
  return call<WishlistItem[]>("updateItem", { wishlistId, item });
};

export const deleteWishlistItem = (
  _userId: string,
  wishlistId: string,
  itemId: string,
): Promise<WishlistItem[]> => call("deleteItem", { wishlistId, itemId });

export const findWishlistsByOwner = async (_userId: string) =>
  (await call<Wishlist[]>("listMine")).map(toWishlist);

export const fetchWishlistView = async (
  wishlistId: string,
  _userId: string | null,
): Promise<WishlistView | null> => {
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");
  const view = await call<WishlistView | null>("view", { wishlistId });
  return view && { ...view, info: toWishlist(view.info) };
};

export const followWishlist: FollowStateChanger = async (_u, wishlistId) => {
  await call("follow", { wishlistId });
};

export const unfollowWishlist: FollowStateChanger = async (_u, wishlistId) => {
  await call("unfollow", { wishlistId });
};

export const fetchFollowedWishlists = async (
  _userId: string,
): Promise<Wishlist[]> => (await call<Wishlist[]>("followed")).map(toWishlist);

export const isFollowingWishlist = async (
  _userId: string,
  wishlistId: string,
): Promise<boolean> =>
  (await call<{ following: boolean }>("isFollowing", { wishlistId })).following;

export const fetchWishlistById = async (
  wishlistId: string,
): Promise<Wishlist | null> =>
  (await fetchWishlistView(wishlistId, null))?.info ?? null;

export const updateExistingWishlistsAuthor = async (
  _userId: string,
  newAuthorName: string,
) => {
  await call("updateAuthor", { author: newAuthorName });
};

/** Removes the signed-in user's wishlists, items and follows. */
export const deleteUserData = async (_userId: string) => {
  await call("deleteAccount");
};
