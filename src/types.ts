export type WishlistItem = {
  image: string;
  name: string;
  price: string;
  link: string;
};

export type Wishlist = {
  id: string;
  name: string;
};

export type UserState = {
  user: User | null;
};

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
}
