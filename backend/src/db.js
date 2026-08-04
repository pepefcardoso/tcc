import pg from 'pg';
import { env } from './config/env.js';

const { Pool } = pg;

/**
 * Singleton PostgreSQL connection pool.
 * Uses configuration from validated environment variables.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.PG_POOL_MAX,
});
