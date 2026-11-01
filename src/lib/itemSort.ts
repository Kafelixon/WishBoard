import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { WishlistItem } from "@/lib/types";

export const ITEM_SORTS = ["owner", "price-asc", "price-desc", "newest"] as const;
export type ItemSort = (typeof ITEM_SORTS)[number];

/** Reads the `?sort=` value; anything unknown is the owner's order. */
export const toItemSort = (value: string | null): ItemSort =>
  ITEM_SORTS.find((sort) => sort === value) ?? "owner";

/** Currencies of the priced items, most common first, so the wishlist's main currency leads. */
export const priceCurrencies = (items: WishlistItem[]): string[] => {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.price > 0) {
      const currency = item.currency ?? DEFAULT_CURRENCY;
      counts.set(currency, (counts.get(currency) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([currency]) => currency);
};

/**
 * Items in the order `sort` asks for. `items` is in the owner's order, which also breaks ties.
 * Prices are never compared across currencies: the price sorts group items by currency (most
 * common first), sort within each group, and put items without a price last.
 */
export function sortItems(items: WishlistItem[], sort: ItemSort): WishlistItem[] {
  if (sort === "owner") return items;
  const indexed = items.map((item, index) => ({ item, index }));
  if (sort === "newest") {
    // Items saved before createdAt existed share one value; the later-added (higher) position wins.
    indexed.sort(
      (a, b) => (b.item.createdAt ?? 0) - (a.item.createdAt ?? 0) || b.index - a.index,
    );
  } else {
    const currencies = priceCurrencies(items);
    const group = (item: WishlistItem) =>
      item.price > 0 ? currencies.indexOf(item.currency ?? DEFAULT_CURRENCY) : currencies.length;
    const direction = sort === "price-asc" ? 1 : -1;
    indexed.sort(
      (a, b) =>
        group(a.item) - group(b.item) ||
        direction * (a.item.price - b.item.price) ||
        a.index - b.index,
    );
  }
  return indexed.map(({ item }) => item);
}
