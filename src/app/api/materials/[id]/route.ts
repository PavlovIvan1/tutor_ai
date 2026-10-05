import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  try {
    await q(sql, sql`DELETE FROM materials WHERE id = ${params.id} AND tutor_id = ${DEMO_TUTOR_ID}`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Material delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
