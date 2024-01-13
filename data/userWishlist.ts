import { firestore } from "../src/firebaseSetup";
import { ResponseData } from "../src/types";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";

const userWishlistRef = (userId: string) =>
  collection(doc(collection(firestore, "users"), userId), "wishlist");

const updateOccurrences = async (
  record: ResponseData,
  docRef: any
): Promise<number> => {
  const currentDoc = await getDoc(docRef);
  if (currentDoc.exists()) {
    const currentData = currentDoc.data() as ResponseData;
    return Number(record.occurrences) + Number(currentData.occurrences);
  }
  return Number(record.occurrences);
};

export const saveToUserWishlist = async (
  userId: string,
  responseData: ResponseData[]
) => {
  if (!userId) throw new Error("User ID is not provided.");

  const batch = writeBatch(firestore);

  for (const record of responseData) {
    if (!record.original_text) {
      console.error("Original text is missing or empty for record:", record);
      continue;
    }

    const docRef = doc(userWishlistRef(userId), record.original_text);
    record.occurrences = await updateOccurrences(record, docRef);

    batch.set(docRef, record, { merge: true });
  }

  await batch.commit();
};

export const fetchUserWishlist = async (userId: string) => {
  const q = query(userWishlistRef(userId), orderBy("occurrences", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => docSnap.data() as ResponseData);
};

export const removeFromUserWishlist = async (
  userId: string,
  recordsToRemove: string[]
) => {
  if (!userId) throw new Error("User ID is not provided.");

  const batch = writeBatch(firestore);

  for (const recordId of recordsToRemove) {
    const docRef = doc(userWishlistRef(userId), recordId);
    batch.delete(docRef);
  }

  await batch.commit();
};
