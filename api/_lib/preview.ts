import type { Queryable } from "./db.js";

const SITE_NAME = "WishBoard";
const SITE_DESCRIPTION =
  "Create wishlists, keep items private or share them with a link, and follow friends' wishlists.";

/** What a link preview may show: public data only, never private items or reservations. */
export interface WishlistPreview {
  name: string;
  author: string;
  itemCount: number;
  image: string | null;
}

export const loadPreview = async (
  q: Queryable,
  wishlistId: string,
): Promise<WishlistPreview | null> => {
  const { rows } = await q.query(
    `select w.name, w.author,
       (select count(*) from wishlist_items i where i.wishlist_id = w.id and i.is_public) as item_count,
       (select i.image from wishlist_items i
         where i.wishlist_id = w.id and i.is_public and i.image ~* '^https?://'
         order by i.sort_order, i.id limit 1) as image
     from wishlists w where w.id = $1`,
    [wishlistId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    name: String(row.name),
    author: String(row.author),
    itemCount: Number(row.item_count),
    image: typeof row.image === "string" ? row.image : null,
  };
};

export type PreviewLanguage = "en" | "pl";

/** Crawlers rarely send Accept-Language; Polish only when asked for first. */
export const previewLanguage = (acceptLanguage: string | null): PreviewLanguage =>
  acceptLanguage?.trim().toLowerCase().startsWith("pl") ? "pl" : "en";

// Same wording as `wishlistPage.byAuthor` and `items.statItems_*` in src/locales.
interface Copy {
  byAuthor: (author: string) => string;
  fallback: string;
  items: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
}

const COPY: Record<PreviewLanguage, Copy> = {
  en: {
    byAuthor: (author) => `Wishlist by ${author}`,
    fallback: "Wishlist",
    items: { one: "item", other: "items" },
  },
  pl: {
    byAuthor: (author) => `Lista życzeń: ${author}`,
    fallback: "Lista życzeń",
    items: { one: "przedmiot", few: "przedmioty", many: "przedmiotów", other: "przedmiotu" },
  },
};

export const describePreview = (preview: WishlistPreview, lang: PreviewLanguage): string => {
  const copy = COPY[lang];
  const owner = preview.author.trim() ? copy.byAuthor(preview.author.trim()) : copy.fallback;
  if (preview.itemCount === 0) return owner;
  const word = copy.items[new Intl.PluralRules(lang).select(preview.itemCount)] ?? copy.items.other;
  return `${owner} · ${String(preview.itemCount)} ${word}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** A minimal page for link-preview crawlers. `preview` is null for a missing wishlist, which gets the site's own tags. */
export const renderPreview = (
  preview: WishlistPreview | null,
  pageUrl: string,
  lang: PreviewLanguage,
): string => {
  const title = preview ? preview.name : SITE_NAME;
  const description = preview ? describePreview(preview, lang) : SITE_DESCRIPTION;
  const meta: [string, string, string][] = [
    ["name", "description", description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", pageUrl],
    ["property", "og:locale", lang === "pl" ? "pl_PL" : "en_US"],
    ...(preview?.image
      ? ([
          ["property", "og:image", preview.image],
          ["property", "og:image:alt", preview.name],
        ] as [string, string, string][])
      : []),
    ["name", "twitter:card", preview?.image ? "summary_large_image" : "summary"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
  ];
  const tags = meta
    .map(([attr, key, value]) => `    <meta ${attr}="${key}" content="${escapeHtml(value)}" />`)
    .join("\n");
  const pageTitle = preview ? `${preview.name} · ${SITE_NAME}` : SITE_NAME;
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(pageTitle)}</title>
${tags}
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>
  </body>
</html>
`;
};
