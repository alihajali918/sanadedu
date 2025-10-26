// app/api/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
});

const CURRENCY = process.env.DONATION_CURRENCY || "usd";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));

        const amount = Number(body.amount || 0);
        const subtotal_amount = Number(body.subtotal_amount || 0);
        const shipping_fees = Number(body.shipping_fees || 0);
        const custom_donation = Number(body.custom_donation || 0);

        if (!amount || amount < 1) {
            return NextResponse.json(
                {
                    error: "ValidationError",
                    details: { amount: `amount (in cents) is required (>0). Got ${amount}.` },
                },
                { status: 400 }
            );
        }

        // 1. محاولة استخراج الحمولة الأصلية كـ مصفوفة
        let donatedItemsArray: any[] = [];
        try {
            if (typeof body.donated_items === "string") {
                donatedItemsArray = JSON.parse(body.donated_items);
            } else if (Array.isArray(body.donated_items)) {
                donatedItemsArray = body.donated_items;
            }
        } catch (e) {
            console.error("Could not parse donated_items:", e);
        }

        // 2. اختصار الحمولة لأقصى حد لتناسب Metadata
        const compressedItems = donatedItemsArray.map(item => ({
            ci: item.case_id,          // Case ID
            lt: item.line_total,       // Line Total
            iq: item.item_quantity,    // Item Quantity
            // إبقاء need_id إذا كان له قيمة غير الأرقام
            ni: item.need_id && String(item.need_id).length < 20 ? item.need_id : undefined,
        }));
        
        // 3. تحويلها إلى سترينغ والتحقق من الطول
        let finalItemsMetadata = JSON.stringify(compressedItems);
        
        if (finalItemsMetadata.length > 499) {
            console.warn(`Donation item list truncated from ${finalItemsMetadata.length} to 499 characters.`);
            // قص السلسلة النصية عند 499 حرفًا
            finalItemsMetadata = finalItemsMetadata.substring(0, 499);
        }

        // 4. إعادة بناء case_ids من المصفوفة الأصلية (بدون الحاجة لفك التشفير المعقد)
        const case_ids: number[] = [
            ...new Set(
                donatedItemsArray.map((i: any) => Number(i?.case_id)).filter((id: number) => id > 0)
            ),
        ];


        const donor_name =
            (body.donor_name && String(body.donor_name).trim()) || "فاعل خير";
        const donor_email =
            (body.donor_email && String(body.donor_email).trim()) || "";
        const user_id = Number(body.user_id || body.userId || 0);

        // metadata: يتم تخزين جميع بيانات التبرع هنا للوصول إليها لاحقاً في الـ Webhook
        // يجب أن تكون القيم كلها سلاسل نصية (strings) وبطول أقل من 500 حرف
        const metadata: Record<string, string> = {
            // 💡 ضمان عدم تجاوز 500 حرف لـ donor_name و donor_email
            donor_name: donor_name.substring(0, 499), 
            donor_email: donor_email.substring(0, 499),
            
            user_id: String(user_id || 0),
            subtotal_amount: String(subtotal_amount || 0),
            shipping_fees: String(shipping_fees || 0),
            custom_donation: String(custom_donation || 0),
            case_ids: JSON.stringify(case_ids),
            
            // 🛑 تمرير قائمة العناصر المختصرة والمقصورة
            donated_items_list_c: finalItemsMetadata, 
        };
        // حذف المفاتيح ذات القيم الفارغة
        if (metadata.donor_email === "") delete metadata.donor_email;

        // إنشاء PaymentIntent
        const pi = await stripe.paymentIntents.create({
            amount, // المبلغ الإجمالي بالـ سنت
            currency: CURRENCY,
            description: "Donation Payment",
            metadata: metadata as Stripe.MetadataParam, // تمرير بيانات التبرع
            automatic_payment_methods: { enabled: true },
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