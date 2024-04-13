import dynamicIconImports from "lucide-react/dynamicIconImports";

export type WishlistItem = {
  id: string;
  image: string;
  name: string;
  price: number;
  link: string;
  public?: boolean;
};

export type Wishlist = {
  id: string;
  wishlistName: string;
  author: string;
  iconName: keyof typeof dynamicIconImports;
  updateTimestamp: number;
};

export type UserState = {
  user: User | null;
};

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
}
