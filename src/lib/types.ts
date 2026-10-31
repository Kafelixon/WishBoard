import type { WishlistIconName } from "@/lib/wishlistIcons";

export interface WishlistItem {
  id: string;
  image: string;
  name: string;
  price: number;
  link: string;
  public?: boolean;
}

export interface Wishlist {
  id: string;
  name: string;
  author: string;
  icon: WishlistIconName;
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
