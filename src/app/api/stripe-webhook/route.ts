// app/api/stripe-webhook/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe يحتاج Node runtime في الويبهوك
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// مفاتيح البيئة
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const WORDPRESS_API_AUTH = process.env.WORDPRESS_API_AUTH!;
const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL!; // لازم يبدأ بـ https://

// تهيئة Stripe (بدون apiVersion مخصص)
const stripe = new Stripe(STRIPE_SECRET_KEY);

// (اختياري) Health check بسيط
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  console.log('Stripe webhook received an event!');

  // تحقق المتغيّرات
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !WORDPRESS_API_AUTH || !WORDPRESS_BASE_URL) {
    console.error('Missing required environment variables.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Stripe يتطلب raw body
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err?.message || err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;

    // metadata المطلوبة
    const caseId = pi.metadata?.case_id;
    if (!caseId) {
      console.error('Case ID not found in metadata.');
      return NextResponse.json({ received: true });
    }

    // المبلغ بوحدة العملة الأصغر (يفضل amount_received)
    const currency = (pi.currency || '').toUpperCase();
    const amountMinor = pi.amount_received ?? pi.amount ?? 0;
    const donatedAmount = minorToMajor(amountMinor, currency); // رقم عشري للعرض والحفظ

    try {
      // بناء الروابط بشكل آمن يمنع cms.sanadedu.orgwp-json
      const getCaseUrl = new URL(`/wp-json/wp/v2/cases/${caseId}`, WORDPRESS_BASE_URL).toString();

      const getRes = await fetch(getCaseUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${WORDPRESS_API_AUTH}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!getRes.ok) {
        const t = await getRes.text().catch(() => getRes.statusText);
        console.error(`WordPress GET failed: ${getRes.status} | ${t}`);
        // نعيد 200 حتى لا يعيد Stripe المحاولة بلا نهاية (بدون آلية منع تكرار)
        return NextResponse.json({ received: true });
      }

      const caseData = await getRes.json();
      const currentRaw = caseData?.acf?.total_donated;

      const current =
        typeof currentRaw === 'number'
          ? currentRaw
          : typeof currentRaw === 'string'
          ? parseFloat(currentRaw) || 0
          : 0;

      const newTotal = +(current + donatedAmount).toFixed(fractionDigitsFor(currency));

      const updateUrl = new URL(`/wp-json/wp/v2/cases/${caseId}`, WORDPRESS_BASE_URL).toString();

      const updateRes = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${WORDPRESS_API_AUTH}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acf: {
            total_donated: newTotal,
          },
        }),
      });

      if (!updateRes.ok) {
        const t = await updateRes.text().catch(() => updateRes.statusText);
        console.error(`WordPress POST failed: ${updateRes.status} | ${t}`);
        return NextResponse.json({ received: true });
      }

      console.log(
        `Donation recorded: +${formatDisplay(donatedAmount, currency)} for case ${caseId}. New total: ${formatDisplay(
          newTotal,
          currency
        )}`
      );
    } catch (err) {
      console.error('Failed to update WordPress total_donated field:', err);
      return NextResponse.json({ received: true });
    }
  }

  return NextResponse.json({ received: true });
}

/** عدد المنازل العشرية حسب العملة الشائعة */
function fractionDigitsFor(currency: string): number {
  const zeroDecimal = new Set(['JPY', 'KRW']);
  const threeDecimal = new Set(['BHD', 'KWD', 'JOD', 'OMR', 'TND']);
  if (zeroDecimal.has(currency)) return 0;
  if (threeDecimal.has(currency)) return 3;
  return 2; // QAR وغيرها
}

/** يحوّل من الوحدة الأصغر إلى وحدة العرض */
function minorToMajor(amountInMinor: number, currency: string): number {
  const zeroDecimal = new Set(['JPY', 'KRW']);
  const threeDecimal = new Set(['BHD', 'KWD', 'JOD', 'OMR', 'TND']);
  let divisor = 100;
  if (zeroDecimal.has(currency)) divisor = 1;
  else if (threeDecimal.has(currency)) divisor = 1000;
  return amountInMinor / divisor;
}

/** تنسيق للعرض في اللوق فقط */
function formatDisplay(amountMajor: number, currency: string): string {
  const digits = fractionDigitsFor(currency);
  return `${amountMajor.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}
