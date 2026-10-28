/**
 * Copies Firestore data into Postgres. Idempotent: safe to re-run.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
 *   node --env-file=.env.local --import tsx scripts/migrate-firestore.ts [--dry-run]
 */
import { Pool } from "pg";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

interface FsItem {
  id?: unknown; name?: unknown; price?: unknown;
  link?: unknown; image?: unknown; public?: unknown;
}
export interface FsWishlist {
  id: string; ownerId: string; wishlistName: string; author: string;
  iconName: string; updateTimestamp: number; items: FsItem[];
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

export function planRows(wishlists: FsWishlist[], follows: Map<string, string[]>) {
  const known = new Set(wishlists.map((w) => w.id));
  const users = new Map<string, string>();
  for (const w of wishlists) if (!users.has(w.ownerId)) users.set(w.ownerId, w.author);
  for (const uid of follows.keys()) if (!users.has(uid)) users.set(uid, "");

  const items = wishlists.flatMap((w) =>
    w.items.map((item, index) => ({
      id: text(item.id) || `${w.id}-${index}`,
      wishlistId: w.id,
      name: text(item.name),
      priceCents: Math.max(0, Math.round((Number(item.price) || 0) * 100)),
      link: text(item.link),
      image: text(item.image),
      isPublic: item.public === true,
      sortOrder: index,
    })),
  );
  const followRows = [...follows].flatMap(([userId, ids]) =>
    ids.filter((id) => known.has(id)).map((wishlistId) => ({ userId, wishlistId })),
  );
  return { users, items, followRows };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  initializeApp({ credential: applicationDefault() });
  const fs = getFirestore();

  const wishlists = (await fs.collection("wishlists").get()).docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ownerId: text(data.ownerId),
      wishlistName: text(data.wishlistName),
      author: text(data.author),
      iconName: text(data.iconName) || "shopping-cart",
      updateTimestamp: Number(data.updateTimestamp) || Date.now(),
      items: Array.isArray(data.items) ? (data.items as FsItem[]) : [],
    } satisfies FsWishlist;
  });
  const follows = new Map(
    (await fs.collection("user_follows").get()).docs.map((d) => [
      d.id,
      Array.isArray(d.data().follows) ? (d.data().follows as string[]) : [],
    ]),
  );

  const plan = planRows(wishlists, follows);
  console.log(
    `Firestore: ${plan.users.size} users, ${wishlists.length} wishlists, ${plan.items.length} items, ${plan.followRows.length} follows`,
  );
  if (dryRun) return;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const [id, username] of plan.users) {
      await client.query(
        "insert into users (id, username) values ($1, $2) on conflict (id) do nothing",
        [id, username],
      );
    }
    for (const w of wishlists) {
      await client.query(
        `insert into wishlists (id, owner_id, name, author, icon_name, updated_at)
         values ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))
         on conflict (id) do update set name = excluded.name, author = excluded.author,
           icon_name = excluded.icon_name, updated_at = excluded.updated_at`,
        [w.id, w.ownerId, w.wishlistName, w.author, w.iconName, w.updateTimestamp],
      );
    }
    for (const i of plan.items) {
      await client.query(
        `insert into wishlist_items (id, wishlist_id, name, price_cents, link, image, is_public, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do update set name = excluded.name, price_cents = excluded.price_cents,
           link = excluded.link, image = excluded.image, is_public = excluded.is_public,
           sort_order = excluded.sort_order`,
        [i.id, i.wishlistId, i.name, i.priceCents, i.link, i.image, i.isPublic, i.sortOrder],
      );
    }
    for (const f of plan.followRows) {
      await client.query(
        "insert into user_follows (user_id, wishlist_id) values ($1, $2) on conflict do nothing",
        [f.userId, f.wishlistId],
      );
    }
    await client.query("commit");
    console.log("Copied to Postgres.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("migrate-firestore.ts")) await main();
