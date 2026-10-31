import { randomUUID } from "node:crypto";
import type { Caller } from "./auth.js";
import type { Db, Queryable, Row } from "./db.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Item {
  id: string;
  name: string;
  price: number;
  currency: string;
  link: string;
  image: string;
  public: boolean;
  /** Visitors only: whether someone reserved it. Never sent to the owner. */
  reservation?: "mine" | "taken";
}

const WISHLIST_COLUMNS = `id, name, author, icon_name, icon_color,
  (extract(epoch from updated_at) * 1000)::bigint as updated_ms`;

const toWishlist = (row: Row) => ({
  id: String(row.id),
  name: String(row.name),
  author: String(row.author),
  icon: String(row.icon_name),
  iconColor: typeof row.icon_color === "string" ? row.icon_color : undefined,
  updateTimestamp: Number(row.updated_ms),
});

const toFollowedWishlist = (row: Row) => ({
  ...toWishlist(row),
  ...(typeof row.custom_name === "string" && { customName: row.custom_name }),
});

const toItem = (row: Row): Item => ({
  id: String(row.id),
  name: String(row.name),
  price: Number(row.price_cents) / 100,
  currency: typeof row.currency === "string" ? row.currency : "PLN",
  link: typeof row.link === "string" ? row.link : "",
  image: typeof row.image === "string" ? row.image : "",
  public: Boolean(row.is_public),
  ...((row.reservation === "mine" || row.reservation === "taken") && {
    reservation: row.reservation,
  }),
});

const HEX_COLOR = /^#[0-9a-f]{6}$/;

const color = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new HttpError(400, "iconColor must be a #rrggbb color.");
  }
  return value;
};

const str = (value: unknown, field: string, allowEmpty = false): string => {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value;
};

/** ISO 4217 code; anything else falls back to zloty. */
const toCurrency = (value: unknown): string =>
  typeof value === "string" && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : "PLN";

const toCents = (price: unknown): number => {
  const value = price === undefined || price === null ? 0 : Number(price);
  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(400, "price must be a non-negative number.");
  }
  return Math.round(value * 100);
};

const asRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value as Record<string, unknown>;
};

const requireCaller = (caller: Caller | null): Caller => {
  if (!caller) throw new HttpError(401, "Sign in required.");
  return caller;
};

const ensureUser = async (q: Queryable, caller: Caller) => {
  await q.query(
    "insert into users (id, username) values ($1, $2) on conflict (id) do nothing",
    [caller.uid, caller.name ?? ""],
  );
};

/** Locks the wishlist row and checks the caller owns it. */
const lockOwned = async (q: Queryable, caller: Caller, wishlistId: string) => {
  const { rows } = await q.query(
    "select owner_id from wishlists where id = $1 for update",
    [wishlistId],
  );
  if (!rows[0]) throw new HttpError(404, "Wishlist is invalid.");
  if (rows[0].owner_id !== caller.uid) {
    throw new HttpError(403, "You cannot modify this wishlist.");
  }
};

const ITEM_COLUMNS =
  "select id, name, price_cents, currency, link, image, is_public from wishlist_items";
const ALL_ITEMS = `${ITEM_COLUMNS} where wishlist_id = $1 order by sort_order, id`;
const PUBLIC_ITEMS = `${ITEM_COLUMNS} where wishlist_id = $1 and is_public order by sort_order, id`;
// Reservation state only goes to signed-in visitors, so the owner can't spot it by opening their own link signed out.
const VISITOR_ITEMS = `select i.id, i.name, i.price_cents, i.currency, i.link, i.image, i.is_public,
    case when r.user_id is null then null when r.user_id = $2 then 'mine' else 'taken' end as reservation
  from wishlist_items i left join item_reservations r on r.item_id = i.id
  where i.wishlist_id = $1 and i.is_public order by i.sort_order, i.id`;

/** The owner's view: every item, and nothing about reservations. */
const listItems = async (q: Queryable, wishlistId: string): Promise<Item[]> => {
  const { rows } = await q.query(ALL_ITEMS, [wishlistId]);
  // Rows come from our own query for one wishlist, not from the request body.
  return rows.map(toItem); // nosemgrep
};

/** A visitor's view: public items, with reservations when signed in. */
const listVisitorItems = async (
  q: Queryable,
  wishlistId: string,
  visitorId: string | null,
): Promise<Item[]> => {
  const { rows } = visitorId
    ? await q.query(VISITOR_ITEMS, [wishlistId, visitorId])
    : await q.query(PUBLIC_ITEMS, [wishlistId]);
  return rows.map(toItem); // nosemgrep
};

/** Locks a public item and checks the caller is a visitor, not the wishlist's owner. */
const lockReservable = async (
  q: Queryable,
  caller: Caller,
  wishlistId: string,
  itemId: string,
) => {
  const { rows } = await q.query(
    `select w.owner_id from wishlist_items i join wishlists w on w.id = i.wishlist_id
     where i.id = $1 and i.wishlist_id = $2 and i.is_public for update of i`,
    [itemId, wishlistId],
  );
  if (!rows[0]) throw new HttpError(404, "Item not found.");
  if (rows[0].owner_id === caller.uid) {
    throw new HttpError(403, "You cannot reserve items on your own wishlist.");
  }
};

const touch = (q: Queryable, wishlistId: string) =>
  q.query("update wishlists set updated_at = now() where id = $1", [wishlistId]);

/** Runs `change` on an owned wishlist and returns its full item list. */
const changeItems = (
  db: Db,
  caller: Caller | null,
  wishlistId: unknown,
  change: (q: Queryable, id: string) => Promise<void>,
) => {
  const user = requireCaller(caller);
  const id = str(wishlistId, "wishlistId");
  return db.transaction(async (q) => {
    await lockOwned(q, user, id);
    await change(q, id);
    await touch(q, id);
    return listItems(q, id);
  });
};

export type Body = Record<string, unknown> & { op?: unknown };

export async function handleOp(
  db: Db,
  caller: Caller | null,
  body: Body,
): Promise<unknown> {
  switch (body.op) {
    case "createWishlist": {
      const user = requireCaller(caller);
      const id = randomUUID();
      await db.transaction(async (q) => {
        await ensureUser(q, user);
        await q.query(
          `insert into wishlists (id, owner_id, name, author, icon_name, icon_color)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            user.uid,
            str(body.name, "name"),
            str(body.author, "author", true),
            str(body.icon, "icon"),
            color(body.iconColor),
          ],
        );
      });
      return { id };
    }

    case "updateWishlist": {
      const user = requireCaller(caller);
      const id = str(body.id, "id");
      await db.transaction(async (q) => {
        await lockOwned(q, user, id);
        await q.query(
          `update wishlists set name = $2, author = $3, icon_name = $4,
           icon_color = $5, updated_at = now() where id = $1`,
          [
            id,
            str(body.name, "name"),
            str(body.author, "author", true),
            str(body.icon, "icon"),
            color(body.iconColor),
          ],
        );
      });
      return {};
    }

    case "deleteWishlist": {
      const user = requireCaller(caller);
      const id = str(body.id, "id");
      await db.transaction(async (q) => {
        await lockOwned(q, user, id);
        await q.query("delete from wishlists where id = $1", [id]);
      });
      return {};
    }

    case "addItem": {
      const item = asRecord(body.item, "item");
      return changeItems(db, caller, body.wishlistId, async (q, id) => {
        await q.query(
          `insert into wishlist_items
             (id, wishlist_id, name, price_cents, link, image, is_public, currency, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, $8,
             (select coalesce(max(sort_order), -1) + 1 from wishlist_items where wishlist_id = $2))`,
          [
            randomUUID(),
            id,
            str(item.name, "item name"),
            toCents(item.price),
            typeof item.link === "string" ? item.link : "",
            typeof item.image === "string" ? item.image : "",
            item.public === true,
            toCurrency(item.currency),
          ],
        );
      });
    }

    case "updateItem": {
      const item = asRecord(body.item, "item");
      const itemId = str(item.id, "Item ID");
      return changeItems(db, caller, body.wishlistId, async (q, id) => {
        const { rows } = await q.query(
          `update wishlist_items set name = $3, price_cents = $4, link = $5,
             image = $6, is_public = $7, currency = $8
           where id = $1 and wishlist_id = $2 returning id`,
          [
            itemId,
            id,
            str(item.name, "item name"),
            toCents(item.price),
            typeof item.link === "string" ? item.link : "",
            typeof item.image === "string" ? item.image : "",
            item.public === true,
            toCurrency(item.currency),
          ],
        );
        if (!rows[0]) throw new HttpError(404, "Item not found.");
      });
    }

    case "deleteItem": {
      const itemId = str(body.itemId, "itemId");
      return changeItems(db, caller, body.wishlistId, async (q, id) => {
        await q.query(
          "delete from wishlist_items where id = $1 and wishlist_id = $2",
          [itemId, id],
        );
      });
    }

    case "reserveItem":
    case "unreserveItem": {
      const user = requireCaller(caller);
      const wishlistId = str(body.wishlistId, "wishlistId");
      const itemId = str(body.itemId, "itemId");
      const reserve = body.op === "reserveItem";
      return db.transaction(async (q) => {
        await lockReservable(q, user, wishlistId, itemId);
        if (reserve) {
          await ensureUser(q, user);
          await q.query(
            `insert into item_reservations (item_id, user_id) values ($1, $2)
             on conflict (item_id) do nothing`,
            [itemId, user.uid],
          );
          const { rows } = await q.query(
            "select user_id from item_reservations where item_id = $1",
            [itemId],
          );
          if (rows[0]?.user_id !== user.uid) {
            throw new HttpError(409, "Someone has already reserved this item.");
          }
        } else {
          // Only the visitor's own reservation can be released.
          await q.query(
            "delete from item_reservations where item_id = $1 and user_id = $2",
            [itemId, user.uid],
          );
        }
        return listVisitorItems(q, wishlistId, user.uid);
      });
    }

    case "ping": {
      // Wakes a suspended database; the client sends it while a visitor is still on a page that needs no data.
      await db.query("select 1");
      return { ok: true };
    }

    case "listMine": {
      const user = requireCaller(caller);
      const { rows } = await db.query(
        `select ${WISHLIST_COLUMNS} from wishlists where owner_id = $1
         order by updated_at desc`,
        [user.uid],
      );
      return rows.map(toWishlist);
    }

    case "view": {
      const id = str(body.wishlistId, "wishlistId");
      const { rows } = await db.query(
        `select ${WISHLIST_COLUMNS}, owner_id from wishlists where id = $1`,
        [id],
      );
      if (!rows[0]) return null;
      const isOwner = !!caller && caller.uid === rows[0].owner_id;
      return {
        info: toWishlist(rows[0]),
        isOwner,
        items: isOwner
          ? await listItems(db, id)
          : await listVisitorItems(db, id, caller?.uid ?? null),
      };
    }

    case "follow": {
      const user = requireCaller(caller);
      const id = str(body.wishlistId, "wishlistId");
      await db.transaction(async (q) => {
        const { rows } = await q.query("select 1 from wishlists where id = $1", [id]);
        if (!rows[0]) throw new HttpError(404, "Wishlist is invalid.");
        await ensureUser(q, user);
        await q.query(
          `insert into user_follows (user_id, wishlist_id) values ($1, $2)
           on conflict do nothing`,
          [user.uid, id],
        );
      });
      return {};
    }

    case "unfollow": {
      const user = requireCaller(caller);
      await db.query(
        "delete from user_follows where user_id = $1 and wishlist_id = $2",
        [user.uid, str(body.wishlistId, "wishlistId")],
      );
      return {};
    }

    case "isFollowing": {
      const user = requireCaller(caller);
      const { rows } = await db.query(
        "select 1 from user_follows where user_id = $1 and wishlist_id = $2",
        [user.uid, str(body.wishlistId, "wishlistId")],
      );
      return { following: rows.length > 0 };
    }

    case "followed": {
      const user = requireCaller(caller);
      const { rows } = await db.query(
        `select ${WISHLIST_COLUMNS}, f.custom_name from wishlists
         join user_follows f on f.wishlist_id = wishlists.id and f.user_id = $1
         order by updated_at desc`,
        [user.uid],
      );
      return rows.map(toFollowedWishlist);
    }

    case "renameFollow": {
      const user = requireCaller(caller);
      const customName =
        body.customName === null || body.customName === undefined
          ? ""
          : str(body.customName, "customName", true).trim();
      const { rows } = await db.query(
        `update user_follows set custom_name = $3
         where user_id = $1 and wishlist_id = $2 returning 1`,
        [user.uid, str(body.wishlistId, "wishlistId"), customName || null],
      );
      if (!rows[0]) throw new HttpError(404, "You are not following this wishlist.");
      return {};
    }

    case "updateAuthor": {
      const user = requireCaller(caller);
      await db.query(
        "update wishlists set author = $2, updated_at = now() where owner_id = $1",
        [user.uid, str(body.author, "author")],
      );
      return {};
    }

    case "deleteAccount": {
      const user = requireCaller(caller);
      // Wishlists, items, follows and reservations go with the user row (ON DELETE CASCADE).
      await db.query("delete from users where id = $1", [user.uid]);
      return {};
    }

    default:
      throw new HttpError(400, "Unknown operation.");
  }
}
