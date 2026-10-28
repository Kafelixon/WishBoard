import assert from "node:assert/strict";
import { it } from "node:test";
import { planRows } from "../../scripts/migrate-firestore.ts";

it("plans rows: cents, order, defaults, and drops follows of missing wishlists", () => {
  const plan = planRows(
    [{
      id: "w1", ownerId: "u1", wishlistName: "A", author: "Ann", iconName: "gift",
      updateTimestamp: 1, items: [{ id: "i1", name: "x", price: "12.34", public: true }, { name: "y", price: "" }],
    }],
    new Map([["u2", ["w1", "gone"]]]),
  );
  assert.deepEqual([...plan.users], [["u1", "Ann"], ["u2", ""]]);
  assert.deepEqual(plan.items.map((i) => [i.id, i.priceCents, i.isPublic, i.sortOrder]), [["i1", 1234, true, 0], ["w1-1", 0, false, 1]]);
  assert.deepEqual(plan.followRows, [{ userId: "u2", wishlistId: "w1" }]);
});
