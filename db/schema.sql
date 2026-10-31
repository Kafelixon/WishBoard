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
  link         text,
  image        text,
  is_public    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS wishlist_items_wishlist_idx ON wishlist_items(wishlist_id);

CREATE TABLE IF NOT EXISTS user_follows (
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wishlist_id  text NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, wishlist_id)
);
