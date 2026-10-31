import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { MAX_NAME_LENGTH, MAX_PRICE, MAX_URL_LENGTH } from "./limits.js";
import { HttpError } from "./ops.js";

export interface ProductMeta {
  name: string | null;
  image: string | null;
  price: number | null;
  /** ISO 4217 code of `price`, when the page states one. */
  currency: string | null;
}

const BLOCKED_MESSAGE =
  "Couldn't read that page. The shop may block automated lookups, so fill in the details by hand.";
const UNREACHABLE_MESSAGE = "That link can't be reached.";
const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;

/** Loopback, private, link-local, shared, documentation, multicast and reserved ranges, plus IPv6 forms that embed IPv4. */
const NON_PUBLIC = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  // ::/96 holds ::, ::1 and IPv4-compatible addresses. IPv4-mapped ones (::ffff:a.b.c.d) are checked against the IPv4 ranges.
  ["::", 96], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 32],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, "ipv6");
}

export const isPrivateAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 0) return true;
  return NON_PUBLIC.check(address, family === 4 ? "ipv4" : "ipv6");
};

/**
 * DNS lookup for outgoing connections that refuses hosts with any non-public address.
 * The socket connects to what this returns, so a host can't pass a separate check and
 * then resolve somewhere internal (DNS rebinding).
 */
const publicLookup = ((hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
  lookup(hostname, { all: true }).then(
    (addresses) => {
      if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
        callback(new HttpError(400, UNREACHABLE_MESSAGE));
      } else if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0]?.address, addresses[0]?.family);
      }
    },
    () => {
      callback(new HttpError(400, UNREACHABLE_MESSAGE));
    },
  );
}) as LookupFunction;

/** Rejects non-web schemes and literal internal IPs; host names are checked by `publicLookup` as they connect. */
const assertPublicUrl = (url: URL): void => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "Only web links are supported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isPrivateAddress(host)) {
    throw new HttpError(400, UNREACHABLE_MESSAGE);
  }
};

const open = (url: URL, signal: AbortSignal): Promise<IncomingMessage> =>
  new Promise((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    send(
      url,
      {
        lookup: publicLookup,
        signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; WishBoardBot/1.0)",
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      resolve,
    )
      .on("error", reject)
      .end();
  });

const decoded = (response: IncomingMessage): Readable => {
  const ignoreError = () => undefined; // errors still reach the reader through the returned stream
  switch (response.headers["content-encoding"]) {
    case "gzip":
    case "x-gzip":
      return pipeline(response, createGunzip(), ignoreError);
    case "deflate":
      return pipeline(response, createInflate(), ignoreError);
    case "br":
      return pipeline(response, createBrotliDecompress(), ignoreError);
    default:
      return response;
  }
};

/** Reads at most MAX_BYTES of the (decompressed) body. */
const readCapped = async (body: Readable): Promise<string> => {
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for await (const chunk of body) {
    const data = chunk as Uint8Array;
    bytes += data.length;
    text += decoder.decode(data, { stream: true });
    if (bytes >= MAX_BYTES) break; // leaving the loop destroys the stream
  }
  return text + decoder.decode();
};

const followRedirects = async (start: URL, signal: AbortSignal): Promise<{ html: string; url: URL }> => {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertPublicUrl(url);
    const response = await open(url, signal);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;
    if (/captcha|challenge/i.test(location ?? "") || [401, 403, 429, 503].includes(status)) {
      response.destroy();
      throw new HttpError(422, BLOCKED_MESSAGE);
    }
    if (status >= 300 && status < 400 && location) {
      response.destroy();
      url = new URL(location, url);
      continue;
    }
    if (status < 200 || status >= 300) {
      response.destroy();
      throw new HttpError(502, "Couldn't open that link.");
    }
    if (!(response.headers["content-type"] ?? "").includes("html")) {
      response.destroy();
      throw new HttpError(422, "That link isn't a web page.");
    }
    return { html: await readCapped(decoded(response)), url };
  }
  throw new HttpError(502, "Too many redirects.");
};

export async function fetchPage(rawUrl: string): Promise<{ html: string; url: URL }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "Enter a valid web address.");
  }
  try {
    return await followRedirects(url, AbortSignal.timeout(TIMEOUT_MS));
  } catch (error) {
    // Network failures, timeouts and bad redirect targets all mean the page can't be read.
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, BLOCKED_MESSAGE);
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"', apos: "'", lt: "<", gt: ">", amp: "&", nbsp: " ", ndash: "–", mdash: "—",
  hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", reg: "®", copy: "©", trade: "™",
};

const decodeEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([A-Za-z]+);/g, (whole, name: string) =>
      // Spacing entities such as &NegativeMediumSpace; are noise in a title.
      NAMED_ENTITIES[name] ?? (name.endsWith("Space") ? " " : whole),
    )
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const MAX_TAG_LENGTH = 4000;
const MAX_JSON_LD_BLOCKS = 20;

/** The page and its lowercased copy, made once so repeated scans stay linear. */
interface Doc {
  html: string;
  lower: string;
}

/**
 * Opening tags named `name`, found with indexOf so a hostile page can't make the scan
 * superlinear the way a lazy regex over the whole document can. Yields where the tag
 * ends too, so callers can read what follows it.
 */
function* openTags({ html, lower }: Doc, name: string): Generator<{ tag: string; end: number }, void> {
  const needle = `<${name}`;
  let from = 0;
  for (;;) {
    const start = lower.indexOf(needle, from);
    if (start === -1) return;
    const end = html.indexOf(">", start);
    if (end === -1) return;
    from = end + 1;
    const next = html.charAt(start + needle.length);
    if (end - start > MAX_TAG_LENGTH || !(next === ">" || next === "/" || next.trim() === "")) continue;
    yield { tag: html.slice(start, end + 1), end };
  }
}

/** Text between the end of an opening tag and the next `</name`. */
const innerText = ({ html, lower }: Doc, end: number, name: string): string => {
  const close = lower.indexOf(`</${name}`, end + 1);
  return close === -1 ? "" : html.slice(end + 1, close);
};

/** Value of the first <meta> whose property/name/itemprop equals one of `keys`. */
const metaContent = (doc: Doc, keys: string[]): string | null => {
  for (const { tag } of openTags(doc, "meta")) {
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

const jsonLdProduct = (doc: Doc): Record<string, unknown> | null => {
  let blocks = 0;
  for (const { tag, end } of openTags(doc, "script")) {
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(tag)) continue;
    if (++blocks > MAX_JSON_LD_BLOCKS) break;
    try {
      const found = findProduct(JSON.parse(innerText(doc, end, "script").trim()));
      if (found) return found;
    } catch {
      // malformed JSON-LD is common; try the next block
    }
  }
  return null;
};

const isCurrencyCode = (value: string): boolean => {
  if (value.length !== 3) return false;
  for (let i = 0; i < 3; i++) {
    const c = value.charCodeAt(i) | 32; // fold case
    if (c < 97 || c > 122) return false;
  }
  return true;
};

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
      return { price, currency: typeof code === "string" && isCurrencyCode(code) ? code.toUpperCase() : null };
    }
  }
  return { price: null, currency: null };
};

export function parseProductMeta(html: string, pageUrl: URL): ProductMeta {
  const doc: Doc = { html, lower: html.toLowerCase() };
  const product = jsonLdProduct(doc);
  const titleTag = openTags(doc, "title").next().value;
  const title = titleTag ? innerText(doc, titleTag.end, "title") : undefined;

  const name =
    (typeof product?.name === "string" ? decodeEntities(product.name).trim() : null) ??
    metaContent(doc, ["og:title", "twitter:title"]) ??
    (title ? decodeEntities(title).trim() : null);

  const rawImage =
    firstString(product?.image) ??
    metaContent(doc, ["og:image", "og:image:secure_url", "twitter:image", "image"]);
  let image: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") image = resolved.href;
    } catch {
      // unusable image address
    }
  }

  const metaPrice = metaContent(doc, [
    "product:price:amount",
    "og:price:amount",
    "product:sale_price:amount",
    "price",
  ]);
  const offer = offerPrice(product);
  const price = offer.price ?? (metaPrice ? toPrice(metaPrice) : null);
  const metaCurrency = metaContent(doc, [
    "product:price:currency",
    "og:price:currency",
    "product:sale_price:currency",
    "pricecurrency",
  ]);
  const currency =
    offer.price !== null
      ? offer.currency
      : metaCurrency && isCurrencyCode(metaCurrency)
        ? metaCurrency.toUpperCase()
        : null;

  // Kept within the API's limits, so whatever is filled in can be saved.
  const usablePrice = price !== null && price <= MAX_PRICE;
  return {
    name: name ? name.slice(0, MAX_NAME_LENGTH).trim() : null,
    image: image && image.length <= MAX_URL_LENGTH ? image : null,
    price: usablePrice ? price : null,
    currency: usablePrice ? currency : null,
  };
}
