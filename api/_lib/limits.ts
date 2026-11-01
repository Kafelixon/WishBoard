/** Limits the API enforces. The client imports them too (via src/lib/limits.ts) so its forms match. */

/** Wishlist, item and followed-wishlist names. */
export const MAX_NAME_LENGTH = 200;
export const MAX_AUTHOR_LENGTH = 100;
/** Item links and image addresses. */
export const MAX_URL_LENGTH = 4096;
/** Prices are stored as integer cents, which overflow a little above 21 million. */
export const MAX_PRICE = 10_000_000;
/** Days a reservation holds; after that the item is free for anyone (the reserver included) to reserve again. */
export const RESERVATION_DAYS = 90;
