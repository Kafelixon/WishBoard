import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import { firestore } from "@/firebaseSetup";
import { WishlistItem, Wishlist } from "@/lib/types";
import { toWishlistIconName } from "@/lib/wishlistIcons";
import { v4 as uuid } from "uuid";

const WISHLISTS_COLLECTION = "wishlists";

export type WishlistChanger = (
  userId: string,
  wishlist: Wishlist,
) => Promise<void>;

export const createWishlist: WishlistChanger = async (
  userId: string,
  wishlist: Wishlist,
) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlist.name) throw new Error("Wishlist name is not provided.");

  await addDoc(collection(firestore, WISHLISTS_COLLECTION), {
    wishlistName: wishlist.name,
    ownerId: userId,
    author: wishlist.author,
    iconName: wishlist.icon,
    items: [],
    updateTimestamp: new Date().getTime(),
  });
};

/**
 * Reads a wishlist inside a transaction, verifies the caller owns it and
 * lets `apply` stage the writes. One round trip for the read, one for the
 * commit, and concurrent writers are retried instead of overwriting each other.
 */
async function withOwnedWishlist<T>(
  userId: string,
  wishlistId: string,
  apply: (
    data: DocumentData,
    tx: Transaction,
    ref: DocumentReference,
  ) => T,
): Promise<T> {
  validateUserIdAndWishlistId(userId, wishlistId);
  const ref = doc(firestore, WISHLISTS_COLLECTION, wishlistId);

  return runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error("Wishlist is invalid.");
    const data = snapshot.data();
    if (data.ownerId !== userId) {
      throw new Error("You cannot modify this wishlist.");
    }
    return apply(data, tx, ref);
  });
}

const readItems = (data: DocumentData): WishlistItem[] =>
  Array.isArray(data.items) ? (data.items as WishlistItem[]) : [];

export const updateWishlist: WishlistChanger = async (
  userId: string,
  wishlist: Wishlist,
) => {
  await withOwnedWishlist(userId, wishlist.id, (_data, tx, ref) => {
    tx.update(ref, {
      wishlistName: wishlist.name,
      author: wishlist.author,
      iconName: wishlist.icon,
      updateTimestamp: new Date().getTime(),
    });
  });
};

export const deleteWishlist = async (userId: string, wishlistId: string) => {
  await withOwnedWishlist(userId, wishlistId, (_data, tx, ref) => {
    tx.delete(ref);
  });
};

/** Item writers resolve with the wishlist's full, updated item list. */
export type WishlistItemChanger = (
  userId: string,
  wishlistId: string,
  item: WishlistItem,
) => Promise<WishlistItem[]>;

const writeItems = (
  userId: string,
  wishlistId: string,
  change: (items: WishlistItem[]) => WishlistItem[],
): Promise<WishlistItem[]> =>
  withOwnedWishlist(userId, wishlistId, (data, tx, ref) => {
    const items = change(readItems(data));
    tx.update(ref, { items, updateTimestamp: new Date().getTime() });
    return items;
  });

export const addItemToWishlist: WishlistItemChanger = (
  userId,
  wishlistId,
  item,
) =>
  writeItems(userId, wishlistId, (items) => [
    ...items,
    { ...item, id: uuid() },
  ]);

export const updateWishlistItem: WishlistItemChanger = (
  userId,
  wishlistId,
  item,
) => {
  if (!item.id) return Promise.reject(new Error("Item ID is not provided."));
  return writeItems(userId, wishlistId, (items) =>
    items.map((element) => (element.id === item.id ? item : element)),
  );
};

export const deleteWishlistItem = (
  userId: string,
  wishlistId: string,
  itemId: string,
): Promise<WishlistItem[]> =>
  writeItems(userId, wishlistId, (items) =>
    items.filter((element) => element.id !== itemId),
  );

export const findWishlistsByOwner = async (userId: string) => {
  const q = query(
    collection(firestore, WISHLISTS_COLLECTION),
    where("ownerId", "==", userId),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    return {
      id: docSnap.id,
      name: String(docSnap.data().wishlistName),
      author: String(docSnap.data().author),
      icon: toWishlistIconName(String(docSnap.data().iconName)),
      updateTimestamp: docSnap.data().updateTimestamp as number,
    };
  });
};

export interface WishlistView {
  info: Wishlist;
  isOwner: boolean;
  /** Everything for the owner, only public items for everyone else. */
  items: WishlistItem[];
}

/**
 * Loads a wishlist page's data with a single document read.
 * @returns The view, or null when the wishlist does not exist.
 */
export const fetchWishlistView = async (
  wishlistId: string,
  userId: string | null,
): Promise<WishlistView | null> => {
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

  const snapshot = await fetchWishlistData(wishlistId);
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const isOwner = !!userId && userId === data.ownerId;
  const items = readItems(data);

  return {
    info: toWishlist(wishlistId, data as WishlistData),
    isOwner,
    items: isOwner ? items : items.filter((item) => item.public),
  };
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

  await setDoc(
    doc(firestore, "user_follows", userId),
    { follows: arrayUnion(wishlistId) },
    { merge: true },
  );
};

/**
 * Unfollows a wishlist.
 * @param userId - The ID of the user.
 * @param wishlistId - The ID of the wishlist to unfollow.
 * @throws Error if either user ID or wishlist ID is not provided or if the operation fails.
 */
export const unfollowWishlist: FollowStateChanger = async (
  userId: string,
  wishlistId: string,
) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  await setDoc(
    doc(firestore, "user_follows", userId),
    { follows: arrayRemove(wishlistId) },
    { merge: true },
  );
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

  const userFollowsDocument = doc(firestore, "user_follows", userId);
  const userFollowsData = await getDoc(userFollowsDocument);

  if (userFollowsData.exists()) {
    const followedWishlistIds = userFollowsData.data().follows as string[];
    return await fetchWishlistsByIds(followedWishlistIds);
  }

  return [];
};

export const isFollowingWishlist = async (
  userId: string,
  wishlistId: string,
): Promise<boolean> => {
  validateUserIdAndWishlistId(userId, wishlistId);

  const userFollowsDocument = doc(firestore, "user_follows", userId);
  const userFollowsData = await getDoc(userFollowsDocument);

  if (userFollowsData.exists()) {
    const followedWishlistIds = userFollowsData.data().follows as string[];
    return followedWishlistIds.includes(wishlistId);
  }

  return false;
};

/**
 * Fetches wishlists by their IDs.
 * @param wishlistIds - An array of wishlist IDs.
 * @returns An array of wishlists.
 */
const fetchWishlistsByIds = async (
  wishlistIds: string[],
): Promise<Wishlist[]> => {
  const results = await Promise.all(
    wishlistIds.map((wishlistId) =>
      fetchWishlistById(wishlistId).catch((error: unknown) => {
        console.error("Failed to load followed wishlist", wishlistId, error);
        return null;
      }),
    ),
  );
  return results.filter((wishlist) => wishlist !== null);
};

interface WishlistData {
  id: string;
  wishlistName: string;
  author: string;
  iconName: string;
  wishlist: number;
  updateTimestamp: number;
}

/**
 * Fetches a wishlist by its ID.
 * @param wishlistId - The ID of the wishlist.
 * @returns A wishlist object or null.
 */
export const fetchWishlistById = async (
  wishlistId: string,
): Promise<Wishlist | null> => {
  const wishlistData = await fetchWishlistData(wishlistId);
  if (!wishlistData.exists()) return null;
  return toWishlist(wishlistId, wishlistData.data() as WishlistData);
};

const toWishlist = (wishlistId: string, data: WishlistData): Wishlist => ({
  id: wishlistId,
  name: data.wishlistName,
  author: data.author,
  icon: toWishlistIconName(data.iconName),
  updateTimestamp: data.updateTimestamp,
});

/**
 * Fetches wishlist data from Firestore.
 *
 * @param wishlistId - The ID of the wishlist to fetch.
 * @returns A Promise that resolves to the wishlist data.
 */
async function fetchWishlistData(wishlistId: string) {
  const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlistId);
  const wishlistData = await getDoc(wishlistRef);
  return wishlistData;
}

export const updateExistingWishlistsAuthor = async (
  userId: string,
  newAuthorName: string,
) => {
  const wishlists = await findWishlistsByOwner(userId);
  await Promise.all(
    wishlists.map((wishlist) =>
      setDoc(
        doc(firestore, WISHLISTS_COLLECTION, wishlist.id),
        { author: newAuthorName, updateTimestamp: new Date().getTime() },
        { merge: true },
      ),
    ),
  );
};

/** Firestore data is not cleaned up on account deletion (existing behaviour). */
export const deleteUserData = (_userId: string): Promise<void> =>
  Promise.resolve();
