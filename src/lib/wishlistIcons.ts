import {
  Baby,
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Cake,
  Car,
  Dumbbell,
  Gamepad2,
  Gift,
  Heart,
  Home,
  Laptop,
  Music,
  Palette,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";

export const WISHLIST_ICON_FALLBACK = "shopping-cart";

export const wishlistIcons = {
  "shopping-cart": ShoppingCart,
  gift: Gift,
  heart: Heart,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
  gamepad: Gamepad2,
  "book-open": BookOpen,
  shirt: Shirt,
  laptop: Laptop,
  plane: Plane,
  home: Home,
  cake: Cake,
  baby: Baby,
  bike: Bike,
  car: Car,
  music: Music,
  palette: Palette,
  utensils: Utensils,
  dumbbell: Dumbbell,
  briefcase: BriefcaseBusiness,
} as const;

export type WishlistIconName = keyof typeof wishlistIcons;

export const isWishlistIconName = (name: string): name is WishlistIconName =>
  name in wishlistIcons;

export const toWishlistIconName = (name: string): WishlistIconName =>
  isWishlistIconName(name) ? name : WISHLIST_ICON_FALLBACK;
