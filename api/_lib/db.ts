import type { Pool } from "pg";

export type Row = Record<string, unknown>;

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

export interface Db extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

export const poolDb = (pool: Pool): Db => ({
  query: (text, params) => pool.query<Row>(text, params),
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await fn({
        query: (text, params) => client.query<Row>(text, params),
      });
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  },
});
