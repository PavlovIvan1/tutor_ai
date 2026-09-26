import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const { userId, consents } = await req.json();

  if (!userId || !consents) return NextResponse.json({ error: 'userId and consents required' }, { status: 400 });

  try {
    for (const [type, granted] of Object.entries(consents)) {
      await q(sql, sql`INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address) VALUES (${crypto.randomUUID()}, ${userId}, ${type}, ${granted}, ${req.headers.get('x-forwarded-for') || 'unknown'}) ON CONFLICT DO NOTHING`);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Consent save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
