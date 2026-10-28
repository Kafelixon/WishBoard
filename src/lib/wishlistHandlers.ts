import * as firestore from "@/lib/firestoreHandlers";
import * as postgres from "@/lib/pgHandlers";

export type {
  FollowStateChanger,
  WishlistChanger,
  WishlistItemChanger,
  WishlistView,
} from "@/lib/firestoreHandlers";

/** VITE_BACKEND=postgres switches the data layer from Firestore to /api/wishlists. */
const backend =
  import.meta.env.VITE_BACKEND === "postgres" ? postgres : firestore;

export const {
  addItemToWishlist,
  createWishlist,
  deleteWishlist,
  deleteWishlistItem,
  fetchFollowedWishlists,
  fetchWishlistById,
  fetchWishlistView,
  findWishlistsByOwner,
  followWishlist,
  isFollowingWishlist,
  unfollowWishlist,
  updateExistingWishlistsAuthor,
  updateWishlist,
  updateWishlistItem,
} = backend;
