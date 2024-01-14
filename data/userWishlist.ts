import { firestore } from "../src/firebaseSetup";
import { WishlistItem } from "../src/types";
import {
  collection,
  doc,
  getDocs,
  // writeBatch,
  // getDoc,
  query,
  orderBy,
} from "firebase/firestore";

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

export const fetchUserWishlist = async (userId: string) => {
  const userWishlistRef = collection(doc(firestore, "users", userId), "wishlist1");
  const q = query(userWishlistRef, orderBy("price", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => docSnap.data() as WishlistItem);
};

// export const removeFromUserWishlist = async (
//   userId: string,
//   recordsToRemove: string[]
// ) => {
//   if (!userId) throw new Error("User ID is not provided.");

//   const batch = writeBatch(firestore);

//   for (const recordId of recordsToRemove) {
//     const docRef = doc(userWishlistRef(userId), recordId);
//     batch.delete(docRef);
//   }

//   await batch.commit();
// };
