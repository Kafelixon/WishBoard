import type { Queryable } from "./db.js";
import { HttpError } from "./ops.js";

/**
 * Counts one request against `key` in a fixed window and throws 429 once `limit` is passed.
 * One upsert, so concurrent requests can't both slip under the limit.
 */
export const takeRateLimit = async (
  db: Queryable,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> => {
  const { rows } = await db.query(
    `insert into rate_limits (key) values ($1)
     on conflict (key) do update set
       window_start = case when rate_limits.window_start <= now() - make_interval(secs => $2)
                           then now() else rate_limits.window_start end,
       hits = case when rate_limits.window_start <= now() - make_interval(secs => $2)
                   then 1 else rate_limits.hits + 1 end
     returning hits`,
    [key, windowSeconds],
  );
  if (Number(rows[0]?.hits) > limit) {
    throw new HttpError(429, "Too many requests. Try again in a few minutes.");
  }
};
