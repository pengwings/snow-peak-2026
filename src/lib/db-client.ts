/**
 * db-client.ts
 *
 * Returns a tagged-template SQL executor regardless of environment:
 *  - Local dev:  standard `pg` over TCP (Docker Postgres)
 *  - Production: `@neondatabase/serverless` over WebSocket (Neon)
 *
 * Both expose the same `sql\`...\`` interface. Clients are created lazily on
 * first use so that DATABASE_URL is only read after dotenv has loaded .env.local.
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import pg from 'pg';

/** A result row: column name → value. Pass a row type as the template's type argument, e.g. sql<UserRow>`...`. */
export type SqlRow = Record<string, unknown>;
type SqlQuery = <T extends SqlRow = SqlRow>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;

function createLocalClient(): SqlQuery {
  let pool: pg.Pool | null = null;

  function getPool(): pg.Pool {
    if (!pool) {
      pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
  }

  return async <T extends SqlRow = SqlRow>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
    let text = '';
    strings.forEach((str, i) => {
      text += str;
      if (i < values.length) text += `$${i + 1}`;
    });
    const client = await getPool().connect();
    try {
      const result = await client.query<T>(text, values);
      return result.rows;
    } finally {
      client.release();
    }
  };
}

function createNeonClient(): SqlQuery {
  let client: NeonQueryFunction<false, false> | null = null;

  function getClient() {
    if (!client) {
      client = neon(process.env.DATABASE_URL!);
    }
    return client;
  }

  return <T extends SqlRow = SqlRow>(strings: TemplateStringsArray, ...values: unknown[]) =>
    getClient()(strings, ...values) as Promise<T[]>;
}

export const sql: SqlQuery =
  process.env.NODE_ENV === 'development' ? createLocalClient() : createNeonClient();
