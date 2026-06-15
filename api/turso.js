import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

let schemaReady;

async function ensureSchema() {
  schemaReady ??= client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      wishlist_name TEXT NOT NULL CHECK (length(trim(wishlist_name)) > 0),
      owner_id TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'shopping-cart',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_wishlists_owner_updated ON wishlists(owner_id, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      wishlist_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
      link TEXT NOT NULL DEFAULT '',
      public INTEGER NOT NULL DEFAULT 0 CHECK (public IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_sort ON wishlist_items(wishlist_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_public_sort ON wishlist_items(wishlist_id, public, sort_order)`,
    `CREATE TABLE IF NOT EXISTS user_follows (
      user_id TEXT NOT NULL,
      wishlist_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, wishlist_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id)`,
  ], "write");

  await schemaReady;
}

function send(res, status, body) {
  res.status(status).setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body;
}

function toPriceCents(price) {
  const numericPrice = price === "" || price == null ? 0 : Number(price);
  return Math.max(0, Math.round(numericPrice * 100));
}

function fromPriceCents(priceCents) {
  return Number(priceCents) / 100;
}

function mapWishlist(row) {
  return {
    id: String(row.id),
    name: String(row.wishlist_name),
    author: String(row.author),
    icon: String(row.icon_name),
    updateTimestamp: Number(row.updated_at),
  };
}

function mapItem(row) {
  return {
    id: String(row.id),
    image: String(row.image),
    name: String(row.name),
    price: fromPriceCents(row.price_cents),
    link: String(row.link),
    public: Boolean(row.public),
  };
}

function normalizeItem(item, sortOrder = 0, timestamp = Date.now()) {
  return {
    id: item?.id == null ? crypto.randomUUID() : String(item.id),
    image: String(item?.image ?? ""),
    name: String(item?.name ?? ""),
    priceCents: toPriceCents(item?.price),
    link: String(item?.link ?? ""),
    public: item?.public === "true" ? true : item?.public === "false" ? false : Boolean(item?.public),
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function itemInsertStatement(wishlistId, item) {
  return {
    sql: `INSERT INTO wishlist_items (id, wishlist_id, name, image, price_cents, link, public, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            wishlist_id = excluded.wishlist_id,
            name = excluded.name,
            image = excluded.image,
            price_cents = excluded.price_cents,
            link = excluded.link,
            public = excluded.public,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at`,
    args: [item.id, wishlistId, item.name, item.image, item.priceCents, item.link, item.public ? 1 : 0, item.sortOrder, item.createdAt, item.updatedAt],
  };
}

function upsertUserStatement(userId, now = Date.now()) {
  return {
    sql: `INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
    args: [userId, now, now],
  };
}

async function getWishlistRow(id) {
  const result = await client.execute({
    sql: "SELECT * FROM wishlists WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ?? null;
}

async function getWishlistItems(wishlistId, includePrivate) {
  const result = await client.execute({
    sql: `SELECT * FROM wishlist_items
          WHERE wishlist_id = ? ${includePrivate ? "" : "AND public = 1"}
          ORDER BY sort_order ASC, created_at ASC`,
    args: [wishlistId],
  });
  return result.rows.map(mapItem);
}

async function nextItemSortOrder(wishlistId) {
  const result = await client.execute({
    sql: "SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order FROM wishlist_items WHERE wishlist_id = ?",
    args: [wishlistId],
  });
  return Number(result.rows[0]?.sort_order ?? 0);
}

function validateUserAndWishlist(userId, wishlistId) {
  if (!userId) throw new Error("User ID is not provided.");
  if (!wishlistId) throw new Error("Wishlist ID is not provided.");
}

async function authenticatedUid(req) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const apiKey = process.env.VITE_APP_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("VITE_APP_FIREBASE_API_KEY must be configured to verify auth tokens.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.users?.[0]?.localId ?? null;
}

async function requireUser(req, requestedUserId) {
  if (!requestedUserId) throw new Error("User ID is not provided.");
  const uid = await authenticatedUid(req);
  if (!uid || uid !== requestedUserId) throw new Error("You are not authenticated as this user.");
}

async function assertOwner(userId, wishlistId) {
  const wishlist = await getWishlistRow(wishlistId);
  if (!wishlist) throw new Error("Wishlist is invalid.");
  if (String(wishlist.owner_id) !== userId) {
    throw new Error("You cannot modify this wishlist.");
  }
  return wishlist;
}

async function handleGet(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId") ?? "";
  const wishlistId = url.searchParams.get("wishlistId") ?? "";

  switch (action) {
    case "exists": {
      const row = await getWishlistRow(wishlistId);
      return send(res, 200, { exists: Boolean(row) });
    }
    case "byId": {
      const row = await getWishlistRow(wishlistId);
      return send(res, 200, { wishlist: row ? mapWishlist(row) : null });
    }
    case "byOwner": {
      await requireUser(req, userId);
      const result = await client.execute({
        sql: "SELECT * FROM wishlists WHERE owner_id = ? ORDER BY updated_at DESC",
        args: [userId],
      });
      return send(res, 200, { wishlists: result.rows.map(mapWishlist) });
    }
    case "items": {
      if (!wishlistId) throw new Error("Wishlist ID is not provided.");
      const row = await getWishlistRow(wishlistId);
      if (!row) return send(res, 200, { items: null });
      if (userId) await requireUser(req, userId);
      const includePrivate = Boolean(userId && userId === String(row.owner_id));
      return send(res, 200, { items: await getWishlistItems(wishlistId, includePrivate) });
    }
    case "followed": {
      await requireUser(req, userId);
      const result = await client.execute({
        sql: `SELECT w.* FROM wishlists w
              INNER JOIN user_follows f ON f.wishlist_id = w.id
              WHERE f.user_id = ?
              ORDER BY w.updated_at DESC`,
        args: [userId],
      });
      return send(res, 200, { wishlists: result.rows.map(mapWishlist) });
    }
    case "isOwner": {
      validateUserAndWishlist(userId, wishlistId);
      await requireUser(req, userId);
      const row = await getWishlistRow(wishlistId);
      if (!row) throw new Error("Wishlist is invalid.");
      return send(res, 200, { owner: String(row.owner_id) === userId });
    }
    case "isFollowing": {
      validateUserAndWishlist(userId, wishlistId);
      await requireUser(req, userId);
      const result = await client.execute({
        sql: "SELECT 1 FROM user_follows WHERE user_id = ? AND wishlist_id = ? LIMIT 1",
        args: [userId, wishlistId],
      });
      return send(res, 200, { following: result.rows.length > 0 });
    }
    default:
      return send(res, 400, { error: "Unknown action." });
  }
}

async function handlePost(req, res) {
  const body = parseBody(req);
  const { action, userId, wishlistId } = body;
  const now = Date.now();

  await requireUser(req, userId);

  switch (action) {
    case "create": {
      const { wishlist } = body;
      if (!wishlist?.name) throw new Error("Wishlist name is not provided.");
      const id = crypto.randomUUID();
      await client.batch([
        upsertUserStatement(userId, now),
        {
          sql: `INSERT INTO wishlists (id, wishlist_name, owner_id, author, icon_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [id, wishlist.name, userId, wishlist.author ?? "", wishlist.icon ?? "gift", now, now],
        },
      ], "write");
      return send(res, 200, { id });
    }
    case "update": {
      const { wishlist } = body;
      validateUserAndWishlist(userId, wishlist?.id);
      await assertOwner(userId, wishlist.id);
      await client.execute({
        sql: "UPDATE wishlists SET wishlist_name = ?, owner_id = ?, author = ?, icon_name = ?, updated_at = ? WHERE id = ?",
        args: [wishlist.name, userId, wishlist.author ?? "", wishlist.icon ?? "gift", now, wishlist.id],
      });
      return send(res, 200, { ok: true });
    }
    case "delete": {
      validateUserAndWishlist(userId, wishlistId);
      await assertOwner(userId, wishlistId);
      await client.batch([
        { sql: "DELETE FROM user_follows WHERE wishlist_id = ?", args: [wishlistId] },
        { sql: "DELETE FROM wishlist_items WHERE wishlist_id = ?", args: [wishlistId] },
        { sql: "DELETE FROM wishlists WHERE id = ?", args: [wishlistId] },
      ], "write");
      return send(res, 200, { ok: true });
    }
    case "addItem": {
      validateUserAndWishlist(userId, wishlistId);
      await assertOwner(userId, wishlistId);
      const item = normalizeItem(body.item, await nextItemSortOrder(wishlistId), now);
      await client.batch([
        itemInsertStatement(wishlistId, item),
        { sql: "UPDATE wishlists SET updated_at = ? WHERE id = ?", args: [now, wishlistId] },
      ], "write");
      return send(res, 200, { item: mapItem({ ...item, price_cents: item.priceCents, public: item.public ? 1 : 0 }) });
    }
    case "updateItem": {
      validateUserAndWishlist(userId, wishlistId);
      if (!body.item?.id) throw new Error("Item ID is not provided.");
      await assertOwner(userId, wishlistId);
      const item = normalizeItem(body.item, 0, now);
      await client.batch([
        {
          sql: `UPDATE wishlist_items
                SET name = ?, image = ?, price_cents = ?, link = ?, public = ?, updated_at = ?
                WHERE id = ? AND wishlist_id = ?`,
          args: [item.name, item.image, item.priceCents, item.link, item.public ? 1 : 0, now, item.id, wishlistId],
        },
        { sql: "UPDATE wishlists SET updated_at = ? WHERE id = ?", args: [now, wishlistId] },
      ], "write");
      return send(res, 200, { ok: true });
    }
    case "deleteItem": {
      validateUserAndWishlist(userId, wishlistId);
      await assertOwner(userId, wishlistId);
      await client.batch([
        { sql: "DELETE FROM wishlist_items WHERE id = ? AND wishlist_id = ?", args: [body.itemId, wishlistId] },
        { sql: "UPDATE wishlists SET updated_at = ? WHERE id = ?", args: [now, wishlistId] },
      ], "write");
      return send(res, 200, { ok: true });
    }
    case "follow": {
      validateUserAndWishlist(userId, wishlistId);
      await client.batch([
        upsertUserStatement(userId, now),
        { sql: "INSERT OR IGNORE INTO user_follows (user_id, wishlist_id, created_at) VALUES (?, ?, ?)", args: [userId, wishlistId, now] },
      ], "write");
      return send(res, 200, { ok: true });
    }
    case "unfollow": {
      validateUserAndWishlist(userId, wishlistId);
      await client.execute({
        sql: "DELETE FROM user_follows WHERE user_id = ? AND wishlist_id = ?",
        args: [userId, wishlistId],
      });
      return send(res, 200, { ok: true });
    }
    case "updateAuthors": {
      await client.execute({
        sql: "UPDATE wishlists SET author = ?, updated_at = ? WHERE owner_id = ?",
        args: [body.newAuthorName, now, userId],
      });
      return send(res, 200, { ok: true });
    }
    default:
      return send(res, 400, { error: "Unknown action." });
  }
}

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      throw new Error("TURSO_URL and TURSO_TOKEN must be configured.");
    }

    await ensureSchema();

    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);

    return send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error instanceof Error ? error.message : "Unknown error." });
  }
}
