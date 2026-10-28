import { auth } from "@/firebaseSetup";
import { WishlistItem, Wishlist } from "@/lib/types";
import { toWishlistIconName } from "@/lib/wishlistIcons";
import type {
  FollowStateChanger,
  WishlistChanger,
  WishlistItemChanger,
  WishlistView,
} from "@/lib/firestoreHandlers";

/** Postgres-backed handlers: same contract as firestoreHandlers, over /api/wishlists. */

async function call<T>(
  op: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  await auth.authStateReady();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth.currentUser) {
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
