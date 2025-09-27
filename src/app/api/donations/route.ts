import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rawBase = process.env.WP_API_BASE || "";
const WP_API_BASE = rawBase.replace(/\/$/, ""); // شيل السلاش الأخير لو موجود
const SANAD_API_KEY = process.env.SANAD_API_KEY || "";
const SANAD_API_ENDPOINT = WP_API_BASE ? `${WP_API_BASE}/sanad/v1/record-donation` : "";

// دالة فحص سريعة لصحة WP_API_BASE
function isValidWpBase(url: string) {
    return /^https?:\/\/.+\/wp-json$/i.test(url);
}

export async function POST(req: Request) {
    try {
        if (!isValidWpBase(WP_API_BASE)) {
            return NextResponse.json(
                {
                    error: "Misconfiguration",
                    details: {
                        hint: "Set WP_API_BASE in .env.local to your real WordPress REST base, e.g. https://example.com/wp-json",
                        current: rawBase || "(empty)",
                    },
                },
                { status: 500 }
            );
        }

        const body = await req.json().catch(() => ({}));

        // normalize donated_items: تأكد أنها مصفوفة (يستقبلها كائن أو سلسلة نصية JSON)
        const donatedItemsArr: any[] = Array.isArray(body.donated_items)
            ? body.donated_items
            : (() => { try { return JSON.parse(body.donated_items); } catch { return []; } })();

        // استخلاص معرفات الحالات (Case IDs)
        const case_ids: number[] = Array.isArray(body.case_ids)
            ? body.case_ids.map((x: any) => Number(x)).filter(Boolean)
            : [...new Set(donatedItemsArr.map((i) => Number(i?.case_id)).filter(Boolean))];

        const payload = {
            amount: Number(body.amount || 0), // المبلغ الإجمالي (بالسنت)
            subtotal_amount: Number(body.subtotal_amount || 0),
            shipping_fees: Number(body.shipping_fees || 0),
            custom_donation: Number(body.custom_donation || 0),
            // 💡 التوحيد: إرسال الحمولة الموحدة كـ JSON string لتخزينها في 'donated_items_list'
            donated_items: JSON.stringify(donatedItemsArr), 
            case_ids,
            transaction_id: body.transaction_id || body.paymentIntentId || "", // مفتاح المطابقة للـ Webhook
            userId: Number(body.userId || body.user_id || 0),
            user_id: Number(body.user_id || body.userId || 0),
            status: body.status || "pending",
            payment_method: body.payment_method || body.paymentMethod || "Stripe",
            donor_name: (body.donor_name && String(body.donor_name).trim()) || "فاعل خير",
            donor_email: (body.donor_email && String(body.donor_email).trim()) || "",
        };

        if (!payload.amount || payload.amount < 1) {
            return NextResponse.json(
                { error: "ValidationError", details: { amount: "amount (in cents) is required (>0)" }, got: payload },
                { status: 400 }
            );
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (SANAD_API_KEY) {
            headers.Authorization = `Bearer ${SANAD_API_KEY}`;
            headers["X-API-Key"] = SANAD_API_KEY;
        }

        const wpRes = await fetch(SANAD_API_ENDPOINT, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });

        const raw = await wpRes.text();
        let data: any = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = { message: "Non-JSON response", raw }; }

        if (!wpRes.ok) {
            return NextResponse.json(
                { error: data?.message || "WordPress error", details: data, got: payload },
                { status: wpRes.status || 500 }
            );
        }

        return NextResponse.json(data || { ok: true }, { status: 200 });
    } catch (err: any) {
        console.error("Donations proxy error:", err);
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}