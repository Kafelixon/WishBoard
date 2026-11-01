-- WishBoard Postgres schema. User ids are Firebase Auth UIDs (auth stays in Firebase).
CREATE TABLE IF NOT EXISTS users (
  id          text PRIMARY KEY,
  username    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlists (
  id          text PRIMARY KEY,
  owner_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon_name   text NOT NULL,
  icon_color  text,
  author      text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS icon_color text;
CREATE INDEX IF NOT EXISTS wishlists_owner_idx ON wishlists(owner_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id           text PRIMARY KEY,
  wishlist_id  text NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  name         text NOT NULL,
  price_cents  integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency     text NOT NULL DEFAULT 'PLN',
  link         text,
  image        text,
  is_public    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0
);
-- Existing databases: older rows are all zloty prices, which the default fills in.
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PLN';
CREATE INDEX IF NOT EXISTS wishlist_items_wishlist_idx ON wishlist_items(wishlist_id);

CREATE TABLE IF NOT EXISTS user_follows (
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wishlist_id  text NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  custom_name  text,
  PRIMARY KEY (user_id, wishlist_id)
);
-- For databases created before followers could rename a wishlist.
ALTER TABLE user_follows ADD COLUMN IF NOT EXISTS custom_name text;
-- The primary key leads with user_id, so lookups and cascade deletes by wishlist need their own index.
CREATE INDEX IF NOT EXISTS user_follows_wishlist_idx ON user_follows(wishlist_id);

-- A visitor's claim on an item so gifts aren't bought twice. Never shown to the wishlist owner.
CREATE TABLE IF NOT EXISTS item_reservations (
  item_id      text PRIMARY KEY REFERENCES wishlist_items(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reserved_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_reservations_user_idx ON item_reservations(user_id);
