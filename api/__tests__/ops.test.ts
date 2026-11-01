import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { createVerifier, firebaseProjectId, type Caller } from "../_lib/auth.js";
import { poolDb } from "../_lib/db.js";
import { handleOp, HttpError } from "../_lib/ops.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = poolDb(pool);
const run = randomUUID().slice(0, 8);
const alice: Caller = { uid: `t-alice-${run}`, name: "Alice" };
const bob: Caller = { uid: `t-bob-${run}`, name: "Bob" };
const carol: Caller = { uid: `t-carol-${run}`, name: "Carol" };

const op = (caller: Caller | null, body: Record<string, unknown>) =>
  handleOp(db, caller, body);
const rejects = (promise: Promise<unknown>, status: number) =>
  assert.rejects(promise, (e) => e instanceof HttpError && e.status === status);

after(async () => {
  await pool.query("delete from users where id = any($1)", [
    [alice.uid, bob.uid, carol.uid],
  ]);
  await pool.end();
});

describe("wishlist operations", () => {
  let wishlistId = "";

  it("creates and lists a wishlist for its owner", async () => {
    ({ id: wishlistId } = (await op(alice, {
      op: "createWishlist", name: "Birthday", author: "Alice", icon: "gift",
    })) as { id: string });
    const mine = (await op(alice, { op: "listMine" })) as { id: string }[];
    assert.deepEqual(mine.map((w) => w.id), [wishlistId]);
  });

  it("stores, changes and clears the icon color", async () => {
    const view = async () =>
      ((await op(alice, { op: "view", wishlistId })) as { info: { iconColor?: string } }).info
        .iconColor;
    assert.equal(await view(), undefined);
    const update = (iconColor?: string) =>
      op(alice, { op: "updateWishlist", id: wishlistId, name: "Birthday", author: "Alice", icon: "gift", iconColor });
    await update("#2563eb");
    assert.equal(await view(), "#2563eb");
    await rejects(update("blue"), 400);
    await update();
    assert.equal(await view(), undefined);
  });

  it("requires sign-in for writes", async () => {
    await rejects(op(null, { op: "listMine" }), 401);
  });

  it("keeps every item when many are added concurrently", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        op(alice, {
          op: "addItem", wishlistId,
          item: { name: `Item ${i}`, price: i + 0.5, public: i % 2 === 0 },
        }),
      ),
    );
    const view = (await op(alice, { op: "view", wishlistId })) as {
      isOwner: boolean; items: { price: number }[];
    };
    assert.equal(view.isOwner, true);
    assert.equal(view.items.length, 8);
    assert.ok(view.items.some((i) => i.price === 3.5));
  });

  it("shows only public items to other users and anonymous visitors", async () => {
    for (const caller of [bob, null]) {
      const view = (await op(caller, { op: "view", wishlistId })) as {
        isOwner: boolean; items: unknown[];
      };
      assert.equal(view.isOwner, false);
      assert.equal(view.items.length, 4);
    }
  });

  it("updates and deletes an item, returning the new list", async () => {
    const items = (await op(alice, { op: "view", wishlistId })) as {
      items: { id: string }[];
    };
    const [first, second] = items.items;
    const updated = (await op(alice, {
      op: "updateItem", wishlistId,
      item: { id: first?.id, name: "Renamed", price: 10, public: true },
    })) as { id: string; name: string }[];
    assert.equal(updated.find((i) => i.id === first?.id)?.name, "Renamed");
    const after = (await op(alice, {
      op: "deleteItem", wishlistId, itemId: second?.id,
    })) as unknown[];
    assert.equal(after.length, 7);
  });

  it("stores an item's currency, defaulting to PLN", async () => {
    const items = (await op(alice, {
      op: "addItem", wishlistId, item: { name: "Euro thing", price: 5, currency: "eur", public: true },
    })) as { name: string; currency: string }[];
    assert.equal(items.find((i) => i.name === "Euro thing")?.currency, "EUR");
    assert.equal(items.find((i) => i.name !== "Euro thing")?.currency, "PLN");
  });

  it("blocks non-owners from changing a wishlist", async () => {
    await rejects(op(bob, { op: "addItem", wishlistId, item: { name: "x" } }), 403);
    await rejects(op(bob, { op: "deleteWishlist", id: wishlistId }), 403);
    await rejects(
      op(bob, { op: "updateWishlist", id: wishlistId, name: "x", author: "x", icon: "gift" }),
      403,
    );
  });

  it("rejects unknown wishlists and bad input", async () => {
    await rejects(op(alice, { op: "addItem", wishlistId: "nope", item: { name: "x" } }), 404);
    await rejects(op(alice, { op: "addItem", wishlistId, item: { name: "" } }), 400);
    await rejects(op(alice, { op: "addItem", wishlistId, item: { name: "x", price: -1 } }), 400);
    await rejects(op(alice, { op: "bogus" }), 400);
  });

  it("follows, reports and unfollows", async () => {
    await op(bob, { op: "follow", wishlistId });
    await op(bob, { op: "follow", wishlistId });
    assert.deepEqual(await op(bob, { op: "isFollowing", wishlistId }), { following: true });
    const followed = (await op(bob, { op: "followed" })) as { id: string }[];
    assert.deepEqual(followed.map((w) => w.id), [wishlistId]);
    await op(bob, { op: "renameFollow", wishlistId, customName: "  Mum's list " });
    const renamed = (await op(bob, { op: "followed" })) as { customName?: string }[];
    assert.equal(renamed[0]?.customName, "Mum's list");
    await op(bob, { op: "renameFollow", wishlistId, customName: "" });
    const cleared = (await op(bob, { op: "followed" })) as { customName?: string }[];
    assert.equal(cleared[0]?.customName, undefined);
    await rejects(op(alice, { op: "renameFollow", wishlistId, customName: "x" }), 404);
    await op(bob, { op: "unfollow", wishlistId });
    assert.deepEqual(await op(bob, { op: "isFollowing", wishlistId }), { following: false });
    await rejects(op(bob, { op: "follow", wishlistId: "nope" }), 404);
  });

  it("updates the author on all own wishlists", async () => {
    await op(alice, { op: "updateAuthor", author: "Alicia" });
    const mine = (await op(alice, { op: "listMine" })) as { author: string }[];
    assert.equal(mine[0]?.author, "Alicia");
  });

  it("deletes all of a user's data with the account", async () => {
    const { id } = (await op(bob, {
      op: "createWishlist", name: "Bobs", author: "Bob", icon: "gift",
    })) as { id: string };
    await op(bob, { op: "addItem", wishlistId: id, item: { name: "x" } });
    await op(bob, { op: "deleteAccount" });
    const left = await pool.query(
      "select (select count(*) from wishlists where id = $1)::int w, (select count(*) from wishlist_items where wishlist_id = $1)::int i",
      [id],
    );
    assert.deepEqual(left.rows[0], { w: 0, i: 0 });
  });

  it("deletes a wishlist with its items and follows", async () => {
    await op(bob, { op: "follow", wishlistId });
    await op(alice, { op: "deleteWishlist", id: wishlistId });
    assert.equal(await op(alice, { op: "view", wishlistId }), null);
    const left = await pool.query(
      "select (select count(*) from wishlist_items where wishlist_id = $1)::int i, (select count(*) from user_follows where wishlist_id = $1)::int f",
      [wishlistId],
    );
    assert.deepEqual(left.rows[0], { i: 0, f: 0 });
  });
});

describe("item reservations", () => {
  interface ViewItem { id: string; name: string; reservation?: string }
  let wishlistId = "";
  let giftId = "";
  let secretId = "";

  const items = async (caller: Caller | null) =>
    ((await op(caller, { op: "view", wishlistId })) as { items: ViewItem[] }).items;
  const reservationOf = async (caller: Caller | null, itemId = giftId) =>
    (await items(caller)).find((i) => i.id === itemId)?.reservation;
  const reserve = (caller: Caller | null, itemId = giftId) =>
    op(caller, { op: "reserveItem", wishlistId, itemId });
  const unreserve = (caller: Caller | null, itemId = giftId) =>
    op(caller, { op: "unreserveItem", wishlistId, itemId });

  it("sets up a wishlist with a public and a private item", async () => {
    ({ id: wishlistId } = (await op(alice, {
      op: "createWishlist", name: "Wedding", author: "Alice", icon: "gift",
    })) as { id: string });
    await op(alice, { op: "addItem", wishlistId, item: { name: "Gift", public: true } });
    const all = (await op(alice, {
      op: "addItem", wishlistId, item: { name: "Secret", public: false },
    })) as ViewItem[];
    giftId = all.find((i) => i.name === "Gift")?.id ?? "";
    secretId = all.find((i) => i.name === "Secret")?.id ?? "";
    assert.ok(giftId && secretId);
  });

  it("lets a visitor reserve an item and shows it as taken to other visitors", async () => {
    const returned = (await reserve(bob)) as ViewItem[];
    assert.equal(returned.find((i) => i.id === giftId)?.reservation, "mine");
    await reserve(bob); // reserving twice is a no-op
    assert.equal(await reservationOf(bob), "mine");
    assert.equal(await reservationOf(carol), "taken");
  });

  it("hides reservations from the owner and from signed-out visitors", async () => {
    for (const caller of [alice, null]) {
      const visible = await items(caller);
      assert.ok(visible.length > 0);
      assert.ok(visible.every((i) => !("reservation" in i)));
    }
    const ownerLists = [
      await op(alice, { op: "updateItem", wishlistId, item: { id: giftId, name: "Gift", public: true } }),
      await op(alice, { op: "addItem", wishlistId, item: { name: "Another", public: true } }),
    ] as ViewItem[][];
    for (const list of ownerLists) assert.ok(list.every((i) => !("reservation" in i)));
  });

  it("refuses a second reservation and lets only the reserver release it", async () => {
    await rejects(reserve(carol), 409);
    await unreserve(carol);
    assert.equal(await reservationOf(bob), "mine");
    const released = (await unreserve(bob)) as ViewItem[];
    assert.equal(released.find((i) => i.id === giftId)?.reservation, undefined);
    assert.equal(await reservationOf(carol), undefined);
    await reserve(carol);
    assert.equal(await reservationOf(bob), "taken");
  });

  it("rejects the owner, signed-out callers, private and unknown items", async () => {
    await rejects(reserve(alice), 403);
    await rejects(unreserve(alice), 403);
    await rejects(reserve(null), 401);
    await rejects(reserve(bob, secretId), 404);
    await rejects(reserve(bob, "nope"), 404);
    await rejects(op(bob, { op: "reserveItem", wishlistId: "nope", itemId: giftId }), 404);
  });

  it("drops a reservation when the item is made private, and still lets the reserver release it", async () => {
    // Carol holds the gift from the previous test.
    const setPublic = (isPublic: boolean) =>
      op(alice, { op: "updateItem", wishlistId, item: { id: giftId, name: "Gift", public: isPublic } });
    await setPublic(false);
    await unreserve(carol); // no longer 404 on a private item
    await setPublic(true);
    assert.equal(await reservationOf(carol), undefined);
    assert.equal(await reservationOf(bob), undefined);
    await reserve(carol);
  });

  it("drops reservations with the item and with the reserver's account", async () => {
    await reserve(bob, (await items(bob)).find((i) => i.name === "Another")?.id);
    const count = async () =>
      (await pool.query("select count(*)::int n from item_reservations where item_id in (select id from wishlist_items where wishlist_id = $1)", [wishlistId])).rows[0] as { n: number };
    assert.deepEqual(await count(), { n: 2 });
    await op(alice, { op: "deleteItem", wishlistId, itemId: giftId });
    assert.deepEqual(await count(), { n: 1 });
    await op(bob, { op: "deleteAccount" });
    assert.deepEqual(await count(), { n: 0 });
    await op(alice, { op: "deleteWishlist", id: wishlistId });
  });
});

describe("firebase token verification", () => {
  it("accepts a valid token and rejects wrong audience, issuer and signature", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const other = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", kid: "k1" };
    const verify = createVerifier("proj", createLocalJWKSet({ keys: [jwk] }));
    const sign = (key: typeof privateKey, claims: { iss?: string; aud?: string }) =>
      new SignJWT({ name: "Zed" })
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setSubject("uid-1")
        .setIssuer(claims.iss ?? "https://securetoken.google.com/proj")
        .setAudience(claims.aud ?? "proj")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(key);

    assert.deepEqual(await verify(await sign(privateKey, {})), { uid: "uid-1", name: "Zed" });
    await assert.rejects(verify(await sign(privateKey, { aud: "evil" })));
    await assert.rejects(verify(await sign(privateKey, { iss: "https://evil.example" })));
    await assert.rejects(verify(await sign(other.privateKey, {})));
  });

  it("refuses to start without a project ID", () => {
    assert.equal(firebaseProjectId({ FIREBASE_PROJECT_ID: "proj" }), "proj");
    assert.equal(firebaseProjectId({ FIREBASE_PROJECT_ID: "", VITE_APP_FIREBASE_PROJECT_ID: "web" }), "web");
    assert.throws(() => firebaseProjectId({}), /FIREBASE_PROJECT_ID/);
  });
});
