// app/api/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// يتم سحب مفتاح Stripe السري من متغيرات البيئة
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    // ⚠️ تأكد من أن هذا الإصدار مطابق للإصدار المستخدم في لوحة تحكم Stripe
    apiVersion: "2025-08-27.basil",
});

// العملة الافتراضية (يجب أن تكون موحدة بين جميع مراحل التطبيق)
const CURRENCY = process.env.DONATION_CURRENCY || "usd";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));

        // نتوقع المبلغ الإجمالي بالـ سنت (Amount in cents)
        const amount = Number(body.amount || 0);
        const subtotal_amount = Number(body.subtotal_amount || 0);
        const shipping_fees = Number(body.shipping_fees || 0);
        const custom_donation = Number(body.custom_donation || 0);

        // التحقق من صحة المبلغ
        if (!amount || amount < 1) {
            return NextResponse.json(
                {
                    error: "ValidationError",
                    details: { amount: `amount (in cents) is required (>0). Got ${amount}.` },
                },
                { status: 400 }
            );
        }

        // توحيد donated_items: نسمح بمصفوفة أو سترنغ JSON
        const donatedItemsStr =
            typeof body.donated_items === "string"
                ? body.donated_items
                : JSON.stringify(
                    Array.isArray(body.donated_items) ? body.donated_items : []
                );

        // محاولة استخراج case_ids من القائمة إذا لم ترسل بشكل صريح
        const case_ids: number[] = Array.isArray(body.case_ids)
            ? body.case_ids.map((n: any) => Number(n)).filter(Boolean)
            : (() => {
                try {
                    const arr = JSON.parse(donatedItemsStr) || [];
                    // نستخدم Set لإزالة أي مكررات، ونستثني الصفر
                    return [
                        ...new Set(
                            arr.map((i: any) => Number(i?.case_id)).filter((id: number) => id > 0)
                        ),
                    ];
                } catch {
                    return [];
                }
            })();

        const donor_name =
            (body.donor_name && String(body.donor_name).trim()) || "فاعل خير";
        const donor_email =
            (body.donor_email && String(body.donor_email).trim()) || "";
        const user_id = Number(body.user_id || body.userId || 0);

        // metadata: يتم تخزين جميع بيانات التبرع هنا للوصول إليها لاحقاً في الـ Webhook
        // يجب أن تكون القيم كلها سلاسل نصية (strings)
        const metadata: Record<string, string> = {
            donor_name,
            donor_email,
            user_id: String(user_id || 0),
            subtotal_amount: String(subtotal_amount || 0),
            shipping_fees: String(shipping_fees || 0),
            custom_donation: String(custom_donation || 0),
            case_ids: JSON.stringify(case_ids),
            // نمرر قائمة العناصر بالكامل كسلسلة نصية
            donated_items_list: donatedItemsStr, 
        };

        // إنشاء PaymentIntent
        const pi = await stripe.paymentIntents.create({
            amount, // المبلغ الإجمالي بالـ سنت
            currency: CURRENCY,
            description: "Donation Payment",
            metadata, // تمرير بيانات التبرع
            automatic_payment_methods: { enabled: true }, // يسهّل طرق الدفع المتاحة
        });

        // إرجاع clientSecret للواجهة الأمامية
        return NextResponse.json(
            { clientSecret: pi.client_secret },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("create-payment-intent error:", err);
        return NextResponse.json(
            { error: err?.message || "Server error" },
            { status: 500 }
        );
    }
}
