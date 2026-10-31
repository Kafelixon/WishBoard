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

/** Suggested icon colors; users can also enter any hex code. */
export const WISHLIST_ICON_COLORS = [
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Slate", value: "#475569" },
] as const;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isHexColor = (value: string): boolean => HEX_COLOR.test(value);

/** Normalizes `#abc`/`#AABBCC` to lowercase `#rrggbb`; anything else becomes undefined (theme default). */
export const toWishlistIconColor = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !isHexColor(value)) return undefined;
  const hex = value.toLowerCase();
  if (hex.length === 7) return hex;
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
};
