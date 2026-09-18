import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

let _sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Configure it in .env.local or Vercel environment variables.');
  }
  if (!_sql) {
    _sql = neon(DATABASE_URL);
  }
  return _sql;
}

export function isDbConfigured(): boolean {
  return !!DATABASE_URL;
}

// Cast neon result to Record array (neon returns union type)
export async function q(sql: ReturnType<typeof neon>, query: any): Promise<Record<string, any>[]> {
  const result = await query;
  if (Array.isArray(result)) return result as Record<string, any>[];
  if (result && typeof result === 'object' && 'rows' in result) return (result as any).rows;
  return [];
}
