import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
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
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistName) throw new Error("Wishlist name is not provided.");

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
  if (!userId) throw new Error("User ID is not provided.");
  if (!item) throw new Error("Item is not provided.");

  const wishlistRef = doc(firestore, WISHLISTS_COLLECTION, wishlistId);
  const isOwner = await isOwnerOfWishlist(userId, wishlistId);
  if (isOwner) {
    await setDoc(wishlistRef, { items: arrayUnion(item) }, { merge: true });
  } else {
    throw new Error("You cannot modify this wishlist.");
  }
};

export const isOwnerOfWishlist = async (userId: string, wishlistId: string) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

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
  return items.filter(item => item.public);
};

// Follow Wishlist

export const followWishlist = async (userId: string, wishlistId: string) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

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

export const unfollowWishlist = async (userId: string, wishlistId: string) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

  try {
    const followedRef = doc(firestore, "user_follows", userId);
    const followedData = await getDoc(followedRef);
    if (followedData.exists()) {
      const followed = followedData.data().follows as string[];
      if (!followed.includes(wishlistId)) {
        const newFollows = followed.filter((id: string) => id !== wishlistId);
        await setDoc(followedRef, { follows: newFollows }, { merge: false });
      }
    }
    await setDoc(
      followedRef,
      { follows: arrayUnion(wishlistId) },
      { merge: true }
    );
    console.log("Wishlist unfollow transaction successfull!");
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};

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
