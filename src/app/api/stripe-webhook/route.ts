import Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
// ✅ استيراد revalidateTag من Next.js
import { revalidateTag } from 'next/cache';

// ✅ قراءة المتغيرات من البيئة
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
// 🔑 تصحيح: استخدام الاسم المتفق عليه والمتطابق مع wp-config
const SANAD_WEBHOOK_API_KEY = process.env.SANAD_WEBHOOK_API_KEY as string;

// نقطة النهاية الصحيحة في ووردبريس
const WP_WEBHOOK_ENDPOINT = process.env.WP_API_BASE
    ? `${process.env.WP_API_BASE.replace(/\/$/, "")}/sanad/v1/webhook-update`
    : "";

// ⚠️ تأكد من أن هذا الإصدار مطابق للإصدار المستخدم في لوحة تحكم Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    // يمكنك تعديل رقم الإصدار هنا
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
    // التحقق من الإعدادات الأساسية
    if (!WP_WEBHOOK_ENDPOINT) {
        return NextResponse.json(
            { error: "Misconfiguration: WP_API_BASE is not set." },
            { status: 500 }
        );
    }
    
    // التحقق من وجود المفتاح قبل إرسال الطلب
    if (!SANAD_WEBHOOK_API_KEY) {
        console.error("❌ Misconfiguration: SANAD_WEBHOOK_API_KEY is not set in the environment.");
        return NextResponse.json(
            { error: "Misconfiguration: Webhook API Key for WordPress is missing." },
            { status: 500 }
        );
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        // ✅ التحقق من توقيع Webhook لضمان الأمان
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`❌ فشل التحقق من توقيع Webhook.`, err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 🔴 الاستماع لحدث 'payment_intent.succeeded' فقط
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const transaction_id = paymentIntent.id;

        if (transaction_id) {
            console.log(`✅ تم استلام تبرع ناجح لعملية Stripe: ${transaction_id}`);

            try {
                // 1. إرسال البيانات إلى ووردبريس لتحديث حالة التبرع والكميات
                const wpUpdateResponse = await fetch(WP_WEBHOOK_ENDPOINT, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // ✅ تمرير المفتاح الأمني (SANAD_WEBHOOK_API_KEY)
                        Authorization: `Bearer ${SANAD_WEBHOOK_API_KEY}`,
                    },
                    // 💡 تمرير الحدث كاملاً
                    body: JSON.stringify(event),
                });

                if (!wpUpdateResponse.ok) {
                    const errorDetails = await wpUpdateResponse.text();
                    console.error("❌ فشل في تحديث ووردبريس:", errorDetails);
                    // ⚠️ إرجاع خطأ (500) لإخبار Stripe بالمحاولة مرة أخرى
                    return new NextResponse(
                        `Failed to update WordPress: ${errorDetails}`,
                        { status: 500 }
                    );
                }

                // 2. ✅ الخطوة الحاسمة: إعادة التحقق من صحة البيانات المخزنة مؤقتاً
                try {
                    revalidateTag('cases'); 
                    revalidateTag('needs-lists'); 
                    
                    console.log("🚀 تم إعادة التحقق من صحة (Revalidation) بيانات الحالات والاحتياجات بنجاح.");
                } catch (revalidateError) {
                    console.error("⚠️ فشل في عملية Revalidation:", revalidateError);
                    // تجاهل هذا الخطأ وإرجاع 200 لأن التحديث الأساسي تم
                }

                console.log(
                    '✅ تم تحديث ووردبريس بنجاح. حالة التبرع أصبحت "completed"'
                );
            } catch (error) {
                console.error("❌ خطأ في الاتصال بـ API ووردبريس:", error);
                return new NextResponse(`Server error during WP update: ${error}`, {
                    status: 500, // لإخبار Stripe بالمحاولة مجددًا
                });
            }
        }
    }

    // يتم إرجاع 200 بغض النظر عن نوع الحدث طالما تم استقباله بنجاح
    return NextResponse.json({ received: true }, { status: 200 });
}