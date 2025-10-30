// ============================================================
// FILE: src/app/api/donations/route.ts
// ✅ FINAL CORRECTED VERSION: Includes Auth Fix, Runtime Fix, and Quantity Logic
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "lib/auth"; // يجب أن يكون مسار lib/auth صحيحاً

// ✅ الإجراء الحاسم: حل مشكلة 'H is not a function' وإجبار Node Runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Types ------------------------------------------------
interface WpDonatedItem {
    case_id?: number | string;
    caseId?: number | string;
    case_name?: string;
    caseName?: string;
    line_total: number;
    item_quantity: number;
    need_id: number;
}

// ✅ تصحيح خطأ 2304: Cannot find name 'WpDonationResponse'
interface WpDonationResponse {
    id: number | string;
    date: string;
    donorId: number | string;
    totalPaidAmount: number | string;
    currency: string;
    status: string;
    transactionId?: string;
    donatedItems: WpDonatedItem[];
}

interface FormattedDonation {
    id: string;
    caseId: string;
    caseName: string;
    amount: number;
    status: string;
    date: string;
    currency: string;
    needId: string;
    quantity: number;
}
// --- WP API Setup -----------------------------------------
const WP_API_BASE = 
    (process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WORDPRESS_API_URL)?.replace(
        /\/$/,
        ""
    ) || "";

const WP_JSON = WP_API_BASE
    ? WP_API_BASE.endsWith("/wp-json")
        ? WP_API_BASE
        : `${WP_API_BASE}/wp-json`
    : "";

const SANAD_MY_DONATIONS = WP_JSON ? `${WP_JSON}/sanad/v1/my-donations` : "";
const SANAD_RECORD_DONATION = WP_JSON ? `${WP_JSON}/sanad/v1/record-donation` : "";


// ============================================================
// 1. POST: تسجيل تبرع جديد (يسجل كـ 'pending' في WP)
// ============================================================

export async function POST(req: Request) {
    try {
        // ⭐️ عزل خطأ التوثيق (Auth) في كتلة try/catch فرعية
        let session: any = null;
        try {
            session = await auth();
        } catch (authError: any) {
            console.error("AUTH ERROR during session loading (H is not a function?):", authError);
            return NextResponse.json(
                { error: "Authentication system failure.", details: authError?.message || 'Unknown Auth Error' },
                { status: 500 }
            );
        }
        
        // ⭐️ فحص خطأ التجديد لإجبار تسجيل الخروج
        if ((session as any)?.error === "RefreshAccessTokenError") {
            return NextResponse.json(
                { error: "Session Expired. Please login again." },
                { status: 401 }
            );
        }
        
        if (!session?.user?.wordpressJwt || !session?.user?.wordpressUserId) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const token = session.user.wordpressJwt;
        const userId = session.user.wordpressUserId;
        const donorEmail = session.user.email ?? "";
        const donorName = session.user.name ?? "فاعل خير";

        // ⭐️ عزل خطأ قراءة الجسم
        let body: any;
        try {
            body = await req.json();
        } catch (jsonError: any) {
            console.error("JSON Parsing Error:", jsonError);
            return NextResponse.json(
                { error: "Invalid request body (JSON format)." },
                { status: 400 }
            );
        }

        const { amount: minorAmount, caseId, stripePaymentIntentId, needId, quantity } = body; 

        // ✅ التحقق من وجود quantity
        if (!minorAmount || !caseId || !stripePaymentIntentId || quantity === undefined) {
            return NextResponse.json(
                { error: "Missing required fields (amount, caseId, stripePaymentIntentId, quantity)" },
                { status: 400 }
            );
        }

        const majorAmount = Number(minorAmount) / 100;
        const itemQuantity = Number(quantity) > 0 ? Number(quantity) : 1;


        if (!SANAD_RECORD_DONATION) {
            return NextResponse.json(
                { error: "Misconfiguration: WordPress API base missing." },
                { status: 500 }
            );
        }

        // ✅ الحمولة الصحيحة لتحديث الاحتياجات والكميات
        const donatedItemsPayload: WpDonatedItem[] = [
            {
                case_id: caseId,
                caseId: caseId,
                line_total: majorAmount,
                item_quantity: itemQuantity, // الكمية
                need_id: needId || 0, // الاحتياج
            },
        ];

        const payload = {
            amount: majorAmount,
            donor_id: userId,
            project_id: caseId,
            payment_method: "Stripe",
            transaction_id: stripePaymentIntentId,
            // حالة 'pending' تكون ضمنية أو يتم تعيينها في WP
            donation_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""), 
            donated_items: donatedItemsPayload,
            donor_email: donorEmail,
            donor_name: donorName,
        };

        const wpRes = await fetch(SANAD_RECORD_DONATION, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, 
            },
            body: JSON.stringify(payload),
        });

        const raw = await wpRes.text();
        let json: any;
        try { json = JSON.parse(raw); } catch { json = { raw }; }

        if (!wpRes.ok) {
            return NextResponse.json(
                { error: json?.message || json?.error || raw },
                { status: wpRes.status }
            );
        }

        return NextResponse.json(json, { status: 200 });
    } catch (err: any) {
        console.error("CRITICAL API ERROR (POST /donations):", err);
        return NextResponse.json(
            { error: err?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
// ============================================================
// 2. GET: جلب التبرعات وتوحيد الحالة
// ============================================================
export async function GET() {
    try {
        const session = await auth();

        if ((session as any)?.error === "RefreshAccessTokenError") {
            return NextResponse.json(
                { ok: false, error: "Session Expired. Please login again." },
                { status: 401 }
            );
        }
        
        if (!session?.user?.wordpressUserId) {
            return NextResponse.json(
                { ok: false, error: "Access Denied: User Not Authenticated or WP ID Missing." },
                { status: 401 }
            );
        }

        const userId = String(session.user.wordpressUserId); 

        if (!SANAD_MY_DONATIONS) {
            return NextResponse.json(
                { ok: false, error: "Misconfiguration: WordPress API base missing." },
                { status: 500 }
            );
        }

        const url = `${SANAD_MY_DONATIONS}?userId=${encodeURIComponent(userId)}`;

        const wpRes = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            // جلب سجلات المستخدم يجب أن يكون دائماً 'no-store'
            cache: "no-store", 
            signal: AbortSignal.timeout(10000),
        });

        if (!wpRes.ok) {
            const raw = await wpRes.text();
            let msg = `WP API Error (${wpRes.status}).`;
            try {
                const j = JSON.parse(raw);
                msg = j?.message || j?.error || msg;
            } catch {}
            return NextResponse.json({ ok: false, error: msg }, { status: wpRes.status });
        }

        const list: WpDonationResponse[] = (await wpRes.json()) || [];

        // ✅ استخدام flatMap لتسطيح كل عنصر تبرع إلى سطر مستقل
        const formatted: FormattedDonation[] = list.flatMap((d) => {
            const status = (String(d.status) || "").toLowerCase();
            const arabicStatus = status === "completed" ? "مكتمل" : "فشل";

            if (!Array.isArray(d.donatedItems) || d.donatedItems.length === 0) {
                return [
                    {
                        id: String(d.id),
                        caseId: "0",
                        caseName: "دعم عام/تشغيلي",
                        amount: Number(d.totalPaidAmount || 0),
                        status: arabicStatus,
                        date: String(d.date),
                        currency: String(d.currency || "QAR"),
                        needId: "0",
                        quantity: 1,
                    },
                ];
            }

            return d.donatedItems.map((item, index) => {
                const caseId = String(item?.case_id ?? item?.caseId ?? "N/A");
                const caseName = String(item?.case_name ?? item?.caseName ?? "تبرع مشروع");

                return {
                    id: `${d.id}-${index}`, 
                    caseId,
                    caseName,
                    amount: Number(item.line_total || 0),
                    status: arabicStatus,
                    date: String(d.date),
                    currency: String(d.currency || "QAR"),
                    needId: String(item.need_id || "N/A"),
                    quantity: Number(item.item_quantity || 1),
                };
            });
        });

        return NextResponse.json({ ok: true, donations: formatted }, { status: 200 });
    } catch (err: any) {
        const msg =
            err?.name === "TimeoutError"
                ? "Timeout: The external API took too long to respond."
                : err?.message || "Internal Server Error";

        console.error("Donations API (GET /donations) error:", err);

        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}