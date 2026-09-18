import { NextRequest, NextResponse } from 'next/server';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';

const planPrices: Record<string, string> = {
  starter: '490.00',
  pro: '990.00',
  power: '1990.00',
};

export async function POST(req: NextRequest) {
  const { planId, return_url } = await req.json();

  if (!planId || !planPrices[planId]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const price = planPrices[planId];

  // Mock mode — no real YooKassa credentials
  if (!YOOKASSA_SHOP_ID || YOOKASSA_SHOP_ID === 'YOUR_SHOP_ID') {
    const mockPaymentId = `mock-payment-${Date.now()}`;
    return NextResponse.json({
      mock: true,
      payment_id: mockPaymentId,
      confirmation_url: `${return_url || 'http://localhost:3000/subscribe'}?payment_id=${mockPaymentId}&status=succeeded&plan=${planId}`,
    });
  }

  // Real YooKassa API
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
  const idempotenceKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Idempotence-Key': idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: {
        value: price,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: return_url || 'http://localhost:3000/subscribe',
      },
      description: `TutorAI — ${planId} subscription`,
      metadata: {
        plan_id: planId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.description || 'Payment creation failed' }, { status: 500 });
  }

  const payment = await response.json();
  return NextResponse.json({
    payment_id: payment.id,
    confirmation_url: payment.confirmation?.confirmation_url,
  });
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('payment_id');

  if (!paymentId) {
    return NextResponse.json({ error: 'payment_id required' }, { status: 400 });
  }

  if (!YOOKASSA_SHOP_ID || YOOKASSA_SHOP_ID === 'YOUR_SHOP_ID') {
    return NextResponse.json({ status: 'succeeded', mock: true });
  }

  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const payment = await response.json();
  return NextResponse.json({
    status: payment.status,
    paid: payment.paid,
    metadata: payment.metadata,
  });
}
