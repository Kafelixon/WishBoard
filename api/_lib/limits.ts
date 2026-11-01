/** Limits the API enforces. The client imports them too (via src/lib/limits.ts) so its forms match. */

/** Wishlist, item and followed-wishlist names. */
export const MAX_NAME_LENGTH = 200;
export const MAX_AUTHOR_LENGTH = 100;
/** Item links and image addresses. */
export const MAX_URL_LENGTH = 4096;
/** How many of an item the owner can ask for. */
export const MAX_QUANTITY = 99;
/** Item notes (size, colour, model). */
export const MAX_NOTES_LENGTH = 500;
/** Prices are stored as integer cents, which overflow a little above 21 million. */
export const MAX_PRICE = 10_000_000;
/** Days a reservation holds; after that the item is free for anyone (the reserver included) to reserve again. */
export const RESERVATION_DAYS = 90;
