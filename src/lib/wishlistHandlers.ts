import { WishlistItem, Wishlist } from "@/lib/types";
import { toWishlistIconName } from "@/lib/wishlistIcons";
import { auth } from "@/firebaseSetup";

const TURSO_API = "/api/turso";

export type WishlistChanger = (
  userId: string,
  wishlist: Wishlist,
) => Promise<void>;

type ApiWishlist = Omit<Wishlist, "icon"> & { icon: string };

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function apiGet<T>(params: Record<string, string>) {
  const response = await fetch(`${TURSO_API}?${new URLSearchParams(params)}`, {
    headers: await authHeaders(),
  });
  return handleResponse<T>(response);
}

async function apiPost<T>(body: Record<string, unknown>) {
  const response = await fetch(TURSO_API, {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Turso request failed.");
  }
  return data;
}

function mapWishlist(wishlist: ApiWishlist): Wishlist {
  return {
    ...wishlist,
    icon: toWishlistIconName(wishlist.icon),
  };
}

export const createWishlist: WishlistChanger = async (
  userId: string,
  wishlist: Wishlist,
) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlist.name) throw new Error("Wishlist name is not provided.");

  await apiPost<{ id: string }>({ action: "create", userId, wishlist });
};

export const updateWishlist: WishlistChanger = async (
  userId: string,
  wishlist: Wishlist,
) => {
  validateUserIdAndWishlistId(userId, wishlist.id);
  await apiPost({ action: "update", userId, wishlist });
};

export const deleteWishlist = async (userId: string, wishlistId: string) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  await apiPost({ action: "delete", userId, wishlistId });
};

export const wishlistExists = async (wishlistId: string) => {
  const data = await apiGet<{ exists: boolean }>({
    action: "exists",
    wishlistId,
  });
  return data.exists;
};

export type WishlistItemChanger = (
  userId: string,
  wishlistId: string,
  item: WishlistItem,
) => Promise<void>;

export const addItemToWishlist: WishlistItemChanger = async (
  userId: string,
  wishlistId: string,
  item: WishlistItem,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  await apiPost({ action: "addItem", userId, wishlistId, item });
};

export const updateWishlistItem: WishlistItemChanger = async (
  userId: string,
  wishlistId: string,
  item: WishlistItem,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  if (!item.id) throw new Error("Item ID is not provided.");
  await apiPost({ action: "updateItem", userId, wishlistId, item });
};

export const deleteWishlistItem = async (
  userId: string,
  wishlistId: string,
  itemId: string,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  await apiPost({ action: "deleteItem", userId, wishlistId, itemId });
};

export const isOwnerOfWishlist = async (userId: string, wishlistId: string) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  const data = await apiGet<{ owner: boolean }>({
    action: "isOwner",
    userId,
    wishlistId,
  });
  return data.owner;
};

export const findWishlistsByOwner = async (userId: string) => {
  const data = await apiGet<{ wishlists: ApiWishlist[] }>({
    action: "byOwner",
    userId,
  });
  return data.wishlists.map(mapWishlist);
};

/**
 * Fetches items from a wishlist.
 * @param wishlistId - The ID of the wishlist.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to an array of WishlistItem objects or null.
 * @throws Error if wishlistId is not provided.
 */
export const fetchItemsFromWishlist = async (
  wishlistId: string,
  userId: string | null,
): Promise<WishlistItem[] | null> => {
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

  const data = await apiGet<{ items: WishlistItem[] | null }>({
    action: "items",
    wishlistId,
    ...(userId ? { userId } : {}),
  });
  return data.items;
};

// Follow Wishlist

export type FollowStateChanger = (
  userId: string,
  wishlistId: string,
) => Promise<void>;

export const followWishlist: FollowStateChanger = async (
  userId: string,
  wishlistId: string,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  await apiPost({ action: "follow", userId, wishlistId });
};

/**
 * Unfollows a wishlist.
 * @param userId - The ID of the user.
 * @param wishlistId - The ID of the wishlist to unfollow.
 * @throws Error if either user ID or wishlist ID is not provided or if the operation fails.
 * @returns void
 */
export const unfollowWishlist: FollowStateChanger = async (
  userId: string,
  wishlistId: string,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  await apiPost({ action: "unfollow", userId, wishlistId });
};

/**
 * Validates user ID and wishlist ID.
 * @param userId - The ID of the user.
 * @param wishlistId - The ID of the wishlist.
 * @throws Error if either user ID or wishlist ID is not provided.
 * @returns void
 */
function validateUserIdAndWishlistId(userId: string, wishlistId: string) {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");
}

/**
 * Fetches the wishlists followed by a user.
 * @param userId - The ID of the user.
 * @returns An array of wishlists followed by the user.
 */
export const fetchFollowedWishlists = async (
  userId: string,
): Promise<Wishlist[]> => {
  if (!userId) throw new Error("User ID is not provided.");

  const data = await apiGet<{ wishlists: ApiWishlist[] }>({
    action: "followed",
    userId,
  });
  return data.wishlists.map(mapWishlist);
};

export const isFollowingWishlist = async (
  userId: string,
  wishlistId: string,
): Promise<boolean> => {
  validateUserIdAndWishlistId(userId, wishlistId);

  const data = await apiGet<{ following: boolean }>({
    action: "isFollowing",
    userId,
    wishlistId,
  });
  return data.following;
};

/**
 * Fetches wishlists by their IDs.
 * @param wishlistIds - An array of wishlist IDs.
 * @returns An array of wishlists.
 */
const fetchWishlistsByIds = async (
  wishlistIds: string[],
): Promise<Wishlist[]> => {
  const wishlists: Wishlist[] = [];

  for (const wishlistId of wishlistIds) {
    const wishlist = await fetchWishlistById(wishlistId);
    if (wishlist) wishlists.push(wishlist);
  }

  return wishlists;
};

void fetchWishlistsByIds;

/**
 * Fetches a wishlist by its ID.
 * @param wishlistId - The ID of the wishlist.
 * @returns A wishlist object or null.
 */
export const fetchWishlistById = async (
  wishlistId: string,
): Promise<Wishlist | null> => {
  const data = await apiGet<{ wishlist: ApiWishlist | null }>({
    action: "byId",
    wishlistId,
  });

  return data.wishlist ? mapWishlist(data.wishlist) : null;
};

export const updateExistingWishlistsAuthor = async (
  userId: string,
  newAuthorName: string,
) => {
  await apiPost({ action: "updateAuthors", userId, newAuthorName });
};
