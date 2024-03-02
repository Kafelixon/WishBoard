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
import { firestore } from "../src/firebaseSetup";
import { WishlistItem, Wishlist } from "../src/types";

// const userWishlistRef = (userId: string) =>
//   collection(doc(collection(firestore, "users"), userId), "wishlist");

// const updateOccurrences = async (
//   record: WishlistItem,
//   docRef: any
// ): Promise<number> => {
//   const currentDoc = await getDoc(docRef);
//   if (currentDoc.exists()) {
//     const currentData = currentDoc.data() as WishlistItem;
//     return Number(record.occurrences) + Number(currentData.occurrences);
//   }
//   return Number(record.occurrences);
// };

// export const saveToUserWishlist = async (
//   userId: string,
//   WishlistItem: WishlistItem[]
// ) => {
//   if (!userId) throw new Error("User ID is not provided.");

//   const batch = writeBatch(firestore);

//   for (const record of WishlistItem) {
//     if (!record.id) {
//       console.error("Original text is missing or empty for record:", record);
//       continue;
//     }

//     const docRef = doc(userWishlistRef(userId), record.id);
//     record.id = await updateOccurrences(record, docRef);

//     batch.set(docRef, record, { merge: true });
//   }

//   await batch.commit();
// };
//
// export const createWishlist = async (userId: string, wishlistData: string) => {
//   const wishlistId = uuidv4();
//   await firestore
//     .collection("wishlists")
//     .doc(wishlistId)
//     .set({
//       ...wishlistData,
//       ownerId: userId,
//     });
//   return wishlistId;
// };
//
export const createWishlist = async (userId: string, wishlistName: string) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistName) throw new Error("Wishlist name is not provided.");

  const wishlistsCollection = collection(firestore, "wishlists");
  await addDoc(wishlistsCollection, {
    wishlistName: wishlistName,
    ownerId: userId,
  });
};

export const addItemToWishlist = async (
  userId: string,
  wishlistId: string,
  item: WishlistItem,
) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!item) throw new Error("Item is not provided.");

  const wishlistRef = doc(firestore, "wishlists", wishlistId);
  const isOwner = await isUserWishlistOwner(userId, wishlistId);
  if (isOwner) {
    await setDoc(wishlistRef, { items: arrayUnion(item) }, { merge: true });
  } else {
    throw new Error("You cannot modify this wishlist.");
  }
};

export const isUserWishlistOwner = async (
  userId: string,
  wishlistId: string,
) => {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");

  const wishlistRef = doc(firestore, "wishlists", wishlistId);
  const wishlistData = await getDoc(wishlistRef);
  if (!wishlistData.exists()) {
    throw new Error("Wishlist is invalid.");
  }
  return userId === wishlistData.data().ownerId;
};

export const fetchWishlistName = async (wishlistId: string) => {
  const wishlistRef = doc(firestore, "wishlists", wishlistId);
  const wishlistData = await getDoc(wishlistRef);
  if (wishlistData.exists() && wishlistData.data().wishlistName) {
    return String(wishlistData.data().wishlistName);
  }
  return "Wishlist";
};

// find wishlists with owner id
export const findWishlistsByOwner = async (userId: string) => {
  const q = query(
    collection(firestore, "wishlists"),
    where("ownerId", "==", userId),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    return {
      id: docSnap.id,
      name: String(docSnap.data().wishlistName),
    } as Wishlist;
  });
};

export const fetchWishlistItems = async (wishlistId: string) => {
  const wishlistRef = doc(firestore, "wishlists", wishlistId);
  const wishlistData = await getDoc(wishlistRef);
  if (wishlistData.exists()) {
    return wishlistData.data().items as WishlistItem[];
  }
  return null;
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
      { merge: true },
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
      { merge: true },
    );
    console.log("Wishlist unfollow transaction successfull!");
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};

export const fetchFollowedWishlists = async (userId: string) => {
  if (!userId) throw new Error("User ID is not provided.");

  const followedRef = doc(firestore, "user_follows", userId);
  const followedData = await getDoc(followedRef);
  if (followedData.exists()) {
    return followedData.data().follows as string[];
  }
  return [];
};
