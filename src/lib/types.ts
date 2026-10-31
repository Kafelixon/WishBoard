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
  /** `#rrggbb`; undefined uses the theme color. */
  iconColor?: string;
  updateTimestamp: number;
}

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}
