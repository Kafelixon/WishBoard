/**
 * A loose shape check (one @, a dot in the domain, no spaces); Firebase does the real validation.
 * Plain string checks instead of a regex, so long odd input can't cause backtracking.
 */
export const looksLikeEmail = (value: string): boolean => {
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  if (/\s/.test(value)) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
};
