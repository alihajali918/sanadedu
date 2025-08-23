// src/app/api/create-payment-intent/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// ❗ استبدل هذا بمفتاحك السري (Secret Key) من Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil', // ⭐ قم بتعديل هذا السطر ليطابق القيمة المطلوبة
});

export async function POST(request: Request) {
  try {
    // تم التعديل هنا: الآن نستقبل 'caseId' بالإضافة إلى 'amount'
    const { amount, caseId } = await request.json();

    // تحقق من أن المبلغ و 'caseId' موجودان وصالحين
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!caseId) { // التأكد من وجود معرف الحالة
        return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // إنشاء PaymentIntent بالمبلغ والعملة
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // المبلغ يجب أن يكون بالسنتات، لذا نضرب في 100
      currency: 'usd', // أو العملة التي تستخدمها في موقعك
      automatic_payment_methods: {
        enabled: true,
      },
      // ⭐ التعديل الرئيسي هنا: إضافة 'case_id' إلى metadata
      // هذا هو المفتاح لربط عملية الدفع بالحالة الصحيحة في ووردبريس لاحقاً عبر الـ Webhook
      metadata: {
        case_id: String(caseId), // تأكد من تحويله إلى سلسلة نصية إذا كان رقماً
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error("Internal Error creating PaymentIntent:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}