import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebaseSetup";
import { WishlistItem, Wishlist } from "@/lib/types";
import dynamicIconImports from "lucide-react/dynamicIconImports";

const WISHLISTS_COLLECTION: string = "wishlists";

export const createWishlist = async (
  userId: string,
  authorUserName: string,
  wishlistName: string,
  iconName: keyof typeof dynamicIconImports
) => {
  validateUserIdAndWishlistId(userId, wishlistName);

  console.log(new Date().getTime());
  const wishlistsCollection = collection(firestore, WISHLISTS_COLLECTION);
  await addDoc(wishlistsCollection, {
    wishlistName: wishlistName,
    ownerId: userId,
    author: authorUserName,
    iconName: iconName,
    updateTimestamp: new Date().getTime(),
  });
};

export const wishlistExists = async (wishlistId: string) => {
  const wishlistData = await fetchWishlistData(wishlistId);
  return wishlistData.exists();
};

export const addItemToWishlist = async (
  userId: string,
  wishlistId: string,
  item: WishlistItem
) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlistId);
  const isOwner = await isOwnerOfWishlist(userId, wishlistId);
  if (isOwner) {
    await setDoc(wishlistRef, { items: arrayUnion(item) }, { merge: true });
  } else {
    throw new Error("You cannot modify this wishlist.");
  }
};

export const updateWishlistItem = async (
  userId: string,
  wishlistId: string,
  item: WishlistItem
) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  if (item.id === undefined || item.id === null) {
    throw new Error("Item ID is not provided.");
  }

  if (!(await isOwnerOfWishlist(userId, wishlistId))) {
    throw new Error("You cannot modify this wishlist.");
  }
  
  const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlistId);
  const wishlistData = await getDoc(wishlistRef);

  if (!wishlistData.exists()) {
    throw new Error("Wishlist is invalid.");
  }

  const items = wishlistData.data().items as WishlistItem[];
  items[item.id] = item;

  await updateDoc(wishlistRef, { items: items });
};

export const deleteWishlistItem = async (
  userId: string,
  wishlistId: string,
  itemId: number
) => {
  validateUserIdAndWishlistId(userId, wishlistId);
  
  if (!(await isOwnerOfWishlist(userId, wishlistId))) {
    throw new Error("You cannot modify this wishlist.");
  }
  
  const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlistId);
  const wishlistData = await getDoc(wishlistRef);
  if (!wishlistData.exists()) {
    throw new Error("Wishlist is invalid.");
  }

  const items = wishlistData.data().items as WishlistItem[];
  items.splice(itemId, 1);

  await updateDoc(wishlistRef, { items: items });
};

export const isOwnerOfWishlist = async (userId: string, wishlistId: string) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  const wishlistData = await fetchWishlistData(wishlistId);
  if (!wishlistData.exists()) {
    throw new Error("Wishlist is invalid.");
  }
  return userId === wishlistData.data().ownerId;
};

// find wishlists with owner id
export const findWishlistsByOwner = async (userId: string) => {
  const q = query(
    collection(firestore, WISHLISTS_COLLECTION),
    where("ownerId", "==", userId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    return {
      id: docSnap.id,
      wishlistName: String(docSnap.data().wishlistName),
      author: String(docSnap.data().author),
      iconName: docSnap.data().iconName as keyof typeof dynamicIconImports,
      updateTimestamp: docSnap.data().updateTimestamp as number,
    } as Wishlist;
  });
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
  userId: string | null
): Promise<WishlistItem[] | null> => {
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

  const wishlistData = await fetchWishlistData(wishlistId);
  if (!wishlistData.exists()) return null;

  const items = wishlistData.data().items as WishlistItem[];
  if (userId && userId === wishlistData.data().ownerId) return items;
  return items.filter((item) => item.public);
};

// Follow Wishlist

export const followWishlist = async (userId: string, wishlistId: string) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  try {
    const followedRef = doc(firestore, "user_follows", userId);
    const followedData = await getDoc(followedRef);
    if (followedData.exists()) {
      const followed = followedData.data().follows as string[];
      if (followed.includes(wishlistId)) {
        console.log("Wishlist already followed!");
        return;
      }
    }
    await setDoc(
      followedRef,
      { follows: arrayUnion(wishlistId) },
      { merge: true }
    );
    console.log("Wishlist followed!");
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};

/**
 * Unfollows a wishlist.
 * @param userId - The ID of the user.
 * @param wishlistId - The ID of the wishlist to unfollow.
 * @throws Error if either user ID or wishlist ID is not provided or if the operation fails.
 * @returns void
 */
export const unfollowWishlist = async (userId: string, wishlistId: string) => {
  validateUserIdAndWishlistId(userId, wishlistId);

  try {
    const userFollowedWishlistsRef = doc(firestore, "user_follows", userId);
    const userFollowedWishlistsData = await getDoc(userFollowedWishlistsRef);

    if (userFollowedWishlistsData.exists()) {
      const followedWishlistIds = userFollowedWishlistsData.data()
        .follows as string[];
      if (followedWishlistIds.includes(wishlistId)) {
        const updatedFollowedWishlistIds = followedWishlistIds.filter(
          (id: string) => id !== wishlistId
        );
        await setDoc(userFollowedWishlistsRef, {
          follows: updatedFollowedWishlistIds,
        });
      }
    }
  } catch (error) {
    console.error("Failed to remove wishlist from followed: ", error);
    throw error;
  }
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
  userId: string
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
  wishlistId: string
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
  wishlistIds: string[]
): Promise<Wishlist[]> => {
  const wishlists: Wishlist[] = [];

  for (const wishlistId of wishlistIds) {
    const wishlist = await fetchWishlistById(wishlistId);
    if (wishlist) {
      wishlists.push({
        id: wishlistId,
        wishlistName: String(wishlist.wishlistName),
        author: String(wishlist.author),
        iconName: wishlist.iconName,
        updateTimestamp: wishlist.updateTimestamp,
      });
    }
  }

  return wishlists;
};

/**
 * Fetches a wishlist by its ID.
 * @param wishlistId - The ID of the wishlist.
 * @returns A wishlist object or null.
 */
export const fetchWishlistById = async (
  wishlistId: string
): Promise<Wishlist | null> => {
  const wishlistData = await fetchWishlistData(wishlistId);
  if (!wishlistData.exists()) return null;

  return wishlistData.data() as Wishlist;
};

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
  newAuthorName: string
) => {
  const wishlists = await findWishlistsByOwner(userId);
  for (const wishlist of wishlists) {
    const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlist.id);
    await setDoc(
      wishlistRef,
      { author: newAuthorName, updateTimestamp: new Date().getTime() },
      { merge: true }
    );
  }
};
