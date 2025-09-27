import Stripe from 'stripe';
import { NextResponse, type NextRequest } from 'next/server';

// ✅ قراءة المتغيرات من البيئة
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
const SANAD_API_KEY = process.env.SANAD_API_KEY as string;

// نقطة النهاية الصحيحة في ووردبريس (كما في كود الـ PHP)
const WP_WEBHOOK_ENDPOINT = process.env.WP_API_BASE
    ? `${process.env.WP_API_BASE.replace(/\/$/, '')}/sanad/v1/webhook-update`
    : '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    // ⚠️ تأكد من أن هذا الإصدار مطابق للإصدار المستخدم في لوحة تحكم Stripe
    apiVersion: '2025-08-27.basil', 
});

export async function POST(req: NextRequest) {
    if (!WP_WEBHOOK_ENDPOINT) {
        return NextResponse.json({ error: "Misconfiguration: WP_API_BASE is not set." }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        // ✅ التحقق من توقيع Webhook لضمان الأمان
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`❌ فشل التحقق من توقيع Webhook.`, err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 🔴 الاستماع لحدث 'payment_intent.succeeded' فقط
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const transaction_id = paymentIntent.id;
        
        // 💡 يمكنك استخراج أي بيانات إضافية من metadata هنا إذا لزم الأمر، لكن الأهم هو الـ transaction_id
        // const userId = paymentIntent.metadata.user_id; 

        if (transaction_id) {
            console.log(`✅ تم استلام تبرع ناجح لعملية Stripe: ${transaction_id}`);

            try {
                // 🚀 الاتصال بـ API ووردبريس لتحديث حالة التبرع إلى "completed"
                const wpUpdateResponse = await fetch(WP_WEBHOOK_ENDPOINT, { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // ✅ تمرير المفتاح الأمني في Header (الـ Bearer Token)
                        'Authorization': `Bearer ${SANAD_API_KEY}`, 
                    },
                    // ✅ إرسال رقم المعاملة فقط. كود الـ PHP سيبحث عن السجل ويحدثه.
                    body: JSON.stringify({
                        transaction_id: transaction_id, 
                    }),
                });

                if (!wpUpdateResponse.ok) {
                    const errorDetails = await wpUpdateResponse.text();
                    console.error('❌ فشل في تحديث ووردبريس:', errorDetails);
                    // ⚠️ يُفضل إرجاع خطأ (500) هنا لإخبار Stripe بالمحاولة مرة أخرى
                    return new NextResponse(`Failed to update WordPress: ${errorDetails}`, { status: 500 });
                }
                
                console.log('✅ تم تحديث ووردبريس بنجاح. حالة التبرع أصبحت "completed"');

            } catch (error) {
                console.error('❌ خطأ في الاتصال بـ API ووردبريس:', error);
                return new NextResponse(`Server error during WP update: ${error}`, { status: 500 });
            }
        }
    }

    // يتم إرجاع 200 بغض النظر عن نوع الحدث طالما تم استقباله بنجاح
    return NextResponse.json({ received: true }, { status: 200 });
}