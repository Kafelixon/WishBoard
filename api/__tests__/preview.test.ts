import assert from "node:assert/strict";
import { after, describe, it, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import type { Caller } from "../_lib/auth.js";
import { poolDb } from "../_lib/db.js";
import { handleOp } from "../_lib/ops.js";
import { describePreview, loadPreview, previewLanguage, renderPreview } from "../_lib/preview.js";

const sample = { name: "Birthday", author: "Alice", itemCount: 3, image: "https://cdn.example/a.jpg" };

test("describes the author and public item count", () => {
  assert.equal(describePreview(sample, "en"), "Wishlist by Alice · 3 items");
  assert.equal(describePreview({ ...sample, itemCount: 1 }, "en"), "Wishlist by Alice · 1 item");
  assert.equal(describePreview({ ...sample, itemCount: 0 }, "en"), "Wishlist by Alice");
  assert.equal(describePreview({ ...sample, author: " " }, "en"), "Wishlist · 3 items");
  assert.equal(describePreview({ ...sample, itemCount: 5 }, "pl"), "Lista życzeń: Alice · 5 przedmiotów");
  assert.equal(describePreview({ ...sample, itemCount: 22 }, "pl"), "Lista życzeń: Alice · 22 przedmioty");
});

test("picks Polish only when the crawler asks for it first", () => {
  assert.equal(previewLanguage("pl-PL,pl;q=0.9,en;q=0.8"), "pl");
  assert.equal(previewLanguage("en-US,pl;q=0.5"), "en");
  assert.equal(previewLanguage(null), "en");
});

test("renders escaped Open Graph tags", () => {
  const html = renderPreview(
    { ...sample, name: `Tom's "best" <list> & more` },
    "https://wishboard.example/wishlist/abc",
    "en",
  );
  assert.match(html, /<meta property="og:title" content="Tom&#39;s &quot;best&quot; &lt;list&gt; &amp; more" \/>/);
  assert.match(html, /<meta property="og:description" content="Wishlist by Alice · 3 items" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/cdn.example\/a.jpg" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/wishboard.example\/wishlist\/abc" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.doesNotMatch(html, /<list>/);
});

test("leaves out og:image without a photo, and falls back to the site tags for a missing wishlist", () => {
  const noImage = renderPreview({ ...sample, image: null }, "https://w.example/wishlist/x", "en");
  assert.doesNotMatch(noImage, /og:image/);
  assert.match(noImage, /twitter:card" content="summary"/);

  const missing = renderPreview(null, "https://w.example/wishlist/x", "en");
  assert.match(missing, /og:title" content="WishBoard"/);
  assert.doesNotMatch(missing, /og:image/);
});

test("vercel.json sends link-preview crawlers, and only them, to the preview function", () => {
  const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as {
    rewrites: { source: string; destination: string; has?: { key: string; value: string }[] }[];
  };
  const rule = config.rewrites.find((r) => r.destination.startsWith("/api/wishlist-preview"));
  assert.ok(rule?.has?.[0]);
  assert.equal(config.rewrites.indexOf(rule), 0, "must come before the SPA fallback");
  // The pattern comes from our own vercel.json, not from user input.
  const crawler = new RegExp(`^${rule.has[0].value}$`); // nosemgrep
  for (const ua of [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0",
    "WhatsApp/2.23.20.0 A",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "TelegramBot (like TwitterBot)",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com",
  ]) {
    assert.ok(crawler.test(ua), ua);
  }
  for (const ua of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0]",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 Instagram 350.0.0.0",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ]) {
    assert.ok(!crawler.test(ua), ua);
  }
});

describe("loadPreview", () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = poolDb(pool);
  const alice: Caller = { uid: `t-preview-${randomUUID().slice(0, 8)}`, name: "Alice" };
  const op = (body: Record<string, unknown>) => handleOp(db, alice, body);

  after(async () => {
    await pool.query("delete from users where id = $1", [alice.uid]);
    await pool.end();
  });

  it("counts public items and takes the first public photo, never a private one", async () => {
    // The op answers with the owner's wishlists, newest first.
    const [created] = (await op({
      op: "createWishlist", name: "Birthday", author: "Alice", icon: "gift",
    })) as { id: string }[];
    const id = created?.id ?? "";
    assert.deepEqual(await loadPreview(db, id), { name: "Birthday", author: "Alice", itemCount: 0, image: null });

    await op({ op: "addItem", wishlistId: id, item: { name: "Secret", image: "https://cdn.example/secret.jpg", public: false } });
    await op({ op: "addItem", wishlistId: id, item: { name: "No photo", public: true } });
    await op({ op: "addItem", wishlistId: id, item: { name: "Lamp", image: "https://cdn.example/lamp.jpg", public: true } });
    await op({ op: "addItem", wishlistId: id, item: { name: "Mug", image: "https://cdn.example/mug.jpg", public: true } });

    assert.deepEqual(await loadPreview(db, id), {
      name: "Birthday", author: "Alice", itemCount: 3, image: "https://cdn.example/lamp.jpg",
    });
  });

  it("returns null for a missing wishlist", async () => {
    assert.equal(await loadPreview(db, randomUUID()), null);
  });
});
