import type { WishlistIconName } from "@/lib/wishlistIcons";

export interface WishlistItem {
  id: string;
  image: string;
  name: string;
  price: number;
  /** ISO 4217 code the price is in. Missing on items saved before currencies existed (zloty). */
  currency?: string;
  link: string;
  public?: boolean;
  /** Size, colour, model and the like. */
  notes?: string;
  /** How many the owner wants; missing means 1. */
  quantity?: number;
  /** Highlighted on the card as "most wanted". */
  mostWanted?: boolean;
  /** Epoch ms when the item was added, for the "newest" sort. Missing on older Firestore items. */
  createdAt?: number;
  /**
   * Set only for signed-in visitors when someone has reserved the item; the owner
   * never gets it. Always undefined in the Firestore build, which has no reservations.
   */
  reservation?: "mine" | "taken";
  /** With `reservation: "mine"`: when the visitor's reservation lapses (ms since epoch). */
  reservedUntil?: number;
}

export interface Wishlist {
  id: string;
  name: string;
  author: string;
  icon: WishlistIconName;
  /** `#rrggbb`; undefined uses the theme color. */
  iconColor?: string;
  updateTimestamp: number;
  /** The viewer's own name for a wishlist they follow; shown instead of `name`. */
  customName?: string;
}

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export interface ProductMeta {
  name: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
}
