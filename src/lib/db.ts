import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

let sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Configure it in .env.local or Vercel environment variables.');
  }
  if (!sql) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

export function isDbConfigured(): boolean {
  return !!DATABASE_URL;
}
