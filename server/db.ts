import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize drizzle with our schema
export const db = drizzle(pool, { schema });

// Export the pool for transactions
export const pgPool = pool;