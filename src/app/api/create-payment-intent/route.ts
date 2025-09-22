import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-08-27.basil',
});

// هذا هو المفتاح السري الذي يجب أن يتطابق مع المفتاح الموجود في إضافة ووردبريس
const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY; 

export async function POST(request: Request) {
    try {
        const { amount, caseId } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        if (!caseId) {
            return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                case_id: String(caseId),
            },
        });

        // ✅ هنا، بعد إنشاء Payment Intent، يجب أن نرسل الطلب إلى ووردبريس.
        // يجب أن تتأكد من أن WordPress API Endpoint يعمل بشكل صحيح.
        // يمكننا القيام بذلك بعد الدفع الفعلي وليس الآن.
        
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
