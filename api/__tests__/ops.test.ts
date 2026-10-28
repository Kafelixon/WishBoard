import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { createVerifier, type Caller } from "../_lib/auth.js";
import { poolDb } from "../_lib/db.js";
import { handleOp, HttpError } from "../_lib/ops.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = poolDb(pool);
const run = randomUUID().slice(0, 8);
const alice: Caller = { uid: `t-alice-${run}`, name: "Alice" };
const bob: Caller = { uid: `t-bob-${run}`, name: "Bob" };

const op = (caller: Caller | null, body: Record<string, unknown>) =>
  handleOp(db, caller, body);
const rejects = (promise: Promise<unknown>, status: number) =>
  assert.rejects(promise, (e) => e instanceof HttpError && e.status === status);

after(async () => {
  await pool.query("delete from users where id = any($1)", [
    [alice.uid, bob.uid],
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
});
