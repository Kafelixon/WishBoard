const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Adds https:// to addresses typed without a scheme. Empty input stays empty. */
export const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

/** Empty is valid (the field is optional); otherwise it must be a plausible http(s) address. */
export const isValidWebUrl = (value: string): boolean => {
  const normalized = normalizeUrl(value);
  if (normalized === "") return true;
  if (/\s/.test(normalized)) return false;

  try {
    const url = new URL(normalized);
    const isWeb = url.protocol === "http:" || url.protocol === "https:";
    return isWeb && (url.hostname.includes(".") || url.hostname === "localhost");
  } catch {
    return false;
  }
};
