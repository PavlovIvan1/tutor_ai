import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verify webhook signature in production:
  // const signature = req.headers.get('X-YooKassa-Signature');

  const event = body.event;
  const payment = body.object;

  if (event === 'payment.succeeded') {
    const planId = payment.metadata?.plan_id;
    const paymentId = payment.id;

    // In production: update user subscription in database
    console.log(`[YooKassa] Payment succeeded: ${paymentId}, plan: ${planId}`);

    // TODO: Update subscription in Supabase
    // await supabase.from('subscriptions').upsert({
    //   user_id: payment.metadata.user_id,
    //   plan: planId,
    //   yookassa_payment_id: paymentId,
    //   expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    // });
  }

  if (event === 'payment.canceled') {
    console.log(`[YooKassa] Payment canceled: ${payment.id}`);
  }

  return NextResponse.json({ ok: true });
}
