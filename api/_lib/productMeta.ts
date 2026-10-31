import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError } from "./ops.js";

export interface ProductMeta {
  name: string | null;
  image: string | null;
  price: number | null;
  /** ISO 4217 code of `price`, when the page states one. */
  currency: string | null;
}

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;

const isPrivateAddress = (address: string): boolean => {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
};

/** Rejects non-web schemes and hosts that resolve to private/internal addresses. */
const assertPublicUrl = async (url: URL): Promise<void> => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "Only web links are supported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new HttpError(400, "That link can't be reached.");
  }
};

const readCapped = async (response: Response): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return text;
};

export async function fetchPage(rawUrl: string): Promise<{ html: string; url: URL }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "Enter a valid web address.");
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; WishBoardBot/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    }).catch(() => {
      throw new HttpError(502, "Couldn't open that link.");
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new HttpError(502, "Couldn't open that link.");
    if (!(response.headers.get("content-type") ?? "").includes("html")) {
      throw new HttpError(422, "That link isn't a web page.");
    }
    return { html: await readCapped(response), url };
  }
  throw new HttpError(502, "Too many redirects.");
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Value of the first <meta> whose property/name/itemprop equals one of `keys`. */
const metaContent = (html: string, keys: string[]): string | null => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !keys.includes(key)) continue;
    const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
    const value = (content?.[1] ?? content?.[2] ?? "").trim();
    if (value) return decodeEntities(value);
  }
  return null;
};

const toPrice = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const firstString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object" && "url" in value) return firstString(value.url);
  return null;
};

/** Walks JSON-LD (including @graph) looking for a Product node. */
const findProduct = (node: unknown): Record<string, unknown> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProduct(child);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Product") || types.includes("ProductGroup")) return obj;
  return findProduct(obj["@graph"]);
};

const jsonLdProduct = (html: string): Record<string, unknown> | null => {
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body = ""] of scripts) {
    try {
      const found = findProduct(JSON.parse(body.trim()));
      if (found) return found;
    } catch {
      // malformed JSON-LD is common; try the next block
    }
  }
  return null;
};

const CURRENCY = /^[A-Za-z]{3}$/;

/** First usable price (and its currency) among a product's offers, or its variants' offers. */
const offerPrice = (product: Record<string, unknown> | null): { price: number | null; currency: string | null } => {
  const variants = Array.isArray(product?.hasVariant) ? (product.hasVariant as unknown[]) : [];
  const sources = [product?.offers, ...variants.map((v) => (v as Record<string, unknown> | null)?.offers)];
  for (const source of sources) {
    for (const offer of Array.isArray(source) ? source : [source]) {
      if (!offer || typeof offer !== "object") continue;
      const o = offer as Record<string, unknown>;
      const spec = o.priceSpecification as Record<string, unknown> | undefined;
      const price = toPrice(o.price ?? o.lowPrice ?? spec?.price);
      if (price === null) continue;
      const code = o.priceCurrency ?? spec?.priceCurrency;
      return { price, currency: typeof code === "string" && CURRENCY.test(code) ? code.toUpperCase() : null };
    }
  }
  return { price: null, currency: null };
};

export function parseProductMeta(html: string, pageUrl: URL): ProductMeta {
  const product = jsonLdProduct(html);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const name =
    (typeof product?.name === "string" ? decodeEntities(product.name).trim() : null) ??
    metaContent(html, ["og:title", "twitter:title"]) ??
    (title ? decodeEntities(title).trim() : null);

  const rawImage =
    firstString(product?.image) ??
    metaContent(html, ["og:image", "og:image:secure_url", "twitter:image", "image"]);
  let image: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") image = resolved.href;
    } catch {
      // unusable image address
    }
  }

  const metaPrice = metaContent(html, [
    "product:price:amount",
    "og:price:amount",
    "product:sale_price:amount",
    "price",
  ]);
  const offer = offerPrice(product);
  const price = offer.price ?? (metaPrice ? toPrice(metaPrice) : null);
  const metaCurrency = metaContent(html, [
    "product:price:currency",
    "og:price:currency",
    "product:sale_price:currency",
    "pricecurrency",
  ]);
  const currency =
    offer.price !== null
      ? offer.currency
      : metaCurrency && CURRENCY.test(metaCurrency)
        ? metaCurrency.toUpperCase()
        : null;

  return { name: name === "" ? null : name, image, price, currency };
}
