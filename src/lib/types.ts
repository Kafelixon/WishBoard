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
}

export interface Wishlist {
  id: string;
  name: string;
  author: string;
  icon: WishlistIconName;
  updateTimestamp: number;
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
