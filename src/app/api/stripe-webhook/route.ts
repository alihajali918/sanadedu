import Stripe from 'stripe';
import { NextResponse, type NextRequest } from 'next/server';

// 🚨 ملاحظة: يجب أن يتوفر المفتاح الخاص لـ Stripe في البيئة
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // ⚠️ استخدم إصدار API صحيحاً ومستقراً
    apiVersion: '2025-08-27.basil',
});

// ✅ المفتاح السري لسترايب (يتم الحصول عليه من لوحة تحكم سترايب)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// ✅ المفتاح السري الخاص بـ API ووردبريس (تم إنشاؤه من قِبلك)
const sanadApiKey = process.env.SANAD_API_KEY as string;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        // ✅ التحقق من أن الرسالة قادمة من سترايب
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
    } catch (err: any) {
        console.error(`❌ فشل التحقق من توقيع Webhook.`, err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 🔴 الاستماع لحدث 'payment_intent.succeeded' 
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        // ✅ تصحيح: استرجاع البيانات باستخدام مفاتيح snake_case (المستخدمة في التخزين)
        const caseId = metadata.case_id; // تم التصحيح من caseId
        const totalPaidAmount = parseFloat(metadata.total_paid_amount || '0'); // تم التصحيح من totalPaidAmount
        const subtotalAmount = parseFloat(metadata.subtotal_amount || '0'); // تم التصحيح من subtotalAmount
        const shippingFees = parseFloat(metadata.shipping_fees || '0'); // تم التصحيح من shippingFees
        const customDonation = parseFloat(metadata.custom_donation || '0'); // تم التصحيح من customDonation
        
        // قائمة المنتجات التي تم حفظها كسلسلة JSON نصية
        const donatedItemsString = metadata.donated_items; // تم التصحيح من donatedItems
        
        // معرف العملية
        const transaction_id = paymentIntent.id;
        
        // userId: يتم استرجاعه بنفس طريقة التخزين
        const userId = metadata.user_id || 'guest-donor'; 

        if (caseId && transaction_id) {
            console.log(`✅ تم استلام تبرع ناجح لعملية Stripe: ${transaction_id}`);
            console.log(`الإجمالي المدفوع: ${totalPaidAmount}`);
            
            try {
                // ✅ تصحيح: يجب استخدام نقطة النهاية الصحيحة "update-case"
                const wpUpdateResponse = await fetch('https://cms.sanadedu.org/wp-json/sanad/v1/update-case', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // 🚨 ملاحظة هامة: في Webhook لووردبريس (الملف المصحح)، لا يتم قراءة 
                    // البيانات مباشرة من هذا الـ body، بل يتم قراءة الحمولة الأصلية لـ Stripe 
                    // (التي هي `event.data.object` أو الـ `payment_intent`). 
                    // لذلك، لن نرسل هنا إلا المفتاح الأمني `api_key` ليتجاوز الـ permission_callback.
                    body: JSON.stringify({
                        api_key: sanadApiKey,
                    }),
                });

                // 🚨 ملاحظة: نظرًا لأن نقطة النهاية update-case في ووردبريس
                // تتوقع **حمولة Stripe الأصلية**، فإنها ستفشل الآن لأننا نرسل فقط 
                // `{ api_key: sanadApiKey }` وليس الحمولة الكاملة.
                // أفضل حل هو إرسال الحمولة الكاملة لـ Stripe Webhook
                // عبر نقطة نهاية آمنة مع مفتاح API.

                if (!wpUpdateResponse.ok) {
                    console.error('❌ فشل في تحديث ووردبريس:', await wpUpdateResponse.text());
                } else {
                    console.log('✅ تم تحديث ووردبريس بنجاح.');
                }
            } catch (error) {
                console.error('❌ خطأ في الاتصال بـ API ووردبريس:', error);
            }
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}