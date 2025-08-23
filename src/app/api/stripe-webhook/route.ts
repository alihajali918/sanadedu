// src/app/api/stripe-webhook/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil', // ⭐ قم بتعديل هذا السطر ليطابق القيمة المطلوبة
});
// هذا هو مفتاح Webhook السري الذي ستجده في لوحة تحكم Stripe
const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // 1. التحقق من أمان الإشعار
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  // 2. معالجة حدث الدفع الناجح
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // استخراج المبلغ و caseId من البيانات الوصفية (metadata)
    const donatedAmount = paymentIntent.amount / 100;
    const caseId = paymentIntent.metadata.case_id;

    if (!caseId) {
      console.error('Case ID not found in metadata.');
      return NextResponse.json({ received: true });
    }

    try {
      // 3. الاتصال بووردبريس لتحديث المبلغ
      const updateUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL}/wp-json/wp/v2/cases/${caseId}`;

      // (سنحتاج إلى إضافة هذه الوظيفة في WordPress)
      // هذه هي الوظيفة التي سترسل طلب التحديث إلى ووردبريس
      const wordpressResponse = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ❗❗❗ ستحتاج إلى توفير طريقة للمصادقة هنا
          // مثلاً، مفتاح API أو Basic Auth
        },
        body: JSON.stringify({
          acf: {
            // ملاحظة: هذه الطريقة ستستبدل المبلغ الحالي.
            // ستحتاج إلى جلب المبلغ الحالي وإضافة المبلغ الجديد إليه
            // قبل إرساله إلى ووردبريس.
            total_donated: donatedAmount, 
          }
        }),
      });

      if (!wordpressResponse.ok) {
        throw new Error(`WordPress API returned an error: ${wordpressResponse.statusText}`);
      }

      console.log(`Donation of $${donatedAmount} recorded for case ID: ${caseId}`);
    } catch (error) {
      console.error('Failed to update WordPress total_donated field:', error);
      return NextResponse.json({ error: 'Failed to update WordPress.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}