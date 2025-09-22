import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // ✅ قم بتحديث رقم الإصدار هنا
    apiVersion: '2025-08-27.basil',
});

// هذا هو المفتاح السري الذي يجب أن يتطابق مع المفتاح الموجود في إضافة ووردبريس
const secret = process.env.STRIPE_SECRET_KEY_FOR_WEBHOOK;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // هنا يمكنك معالجة الأحداث المختلفة
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            // يمكنك هنا إرسال البيانات إلى ووردبريس لتسجيل التبرع
            break;
        case 'payment_method.attached':
            const paymentMethod = event.data.object;
            console.log(`PaymentMethod ${paymentMethod.id} was attached to a Customer!`);
            break;
        // ... والمزيد من أنواع الأحداث
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}