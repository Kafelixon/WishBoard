/** Currency of prices saved before items had one. */
export const DEFAULT_CURRENCY = "PLN";

const COMMON_CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CZK", "CHF", "SEK", "NOK", "DKK"];

/** The picker's choices, plus the item's own currency if it is an unusual one. */
export const currencyOptions = (current: string): string[] =>
  COMMON_CURRENCIES.includes(current) ? COMMON_CURRENCIES : [...COMMON_CURRENCIES, current];
