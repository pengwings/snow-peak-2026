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

type SqlQuery = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

function createLocalClient(): SqlQuery {
  let pool: pg.Pool | null = null;

  function getPool(): pg.Pool {
    if (!pool) {
      pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
  }

  return async (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> => {
    let text = '';
    strings.forEach((str, i) => {
      text += str;
      if (i < values.length) text += `$${i + 1}`;
    });
    const client = await getPool().connect();
    try {
      const result = await client.query(text, values as any[]);
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

  return (strings: TemplateStringsArray, ...values: unknown[]) =>
    getClient()(strings, ...(values as Parameters<typeof getClient>[1][])) as Promise<any[]>;
}

export const sql: SqlQuery =
  process.env.NODE_ENV === 'development' ? createLocalClient() : createNeonClient();
