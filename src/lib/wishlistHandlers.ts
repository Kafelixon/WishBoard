import * as firestore from "@/lib/firestoreHandlers";
import * as postgres from "@/lib/pgHandlers";

export type {
  FollowStateChanger,
  WishlistChanger,
  WishlistItemChanger,
  WishlistView,
} from "@/lib/firestoreHandlers";

/** The data layer talks to /api/wishlists (Neon Postgres); VITE_BACKEND=firestore switches back to Firestore. */
const backend =
  import.meta.env.VITE_BACKEND === "firestore" ? firestore : postgres;

export const {
  addItemToWishlist,
  createWishlist,
  deleteWishlist,
  deleteUserData,
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
