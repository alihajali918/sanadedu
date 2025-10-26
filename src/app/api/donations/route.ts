import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "lib/auth"; // تأكد من المسار الصحيح لملف authOptions
import { auth } from "lib/auth";       // تأكد من المسار الصحيح لدالة auth

export const dynamic = "force-dynamic";

// --- Type Definitions ---

// تعريف هيكل العنصر المتبرع به (للتوافق مع كلا المفتاحين في WP Plugin)
interface WpDonatedItem {
  case_id?: number | string;
  caseId?: number | string;
  case_name?: string;
  caseName?: string;
  line_total: number;
  item_quantity: number;
  need_id: number;
}

// تعريف هيكل استجابة التبرع الفردي من WordPress (لـ GET)
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

// تعريف هيكل البيانات النهائية التي ستُرسل إلى الواجهة الأمامية (لـ GET)
interface FormattedDonation {
  id: string;
  caseId: string;
  caseName: string;
  amount: number;
  status: string;
  date: string;
  currency: string;
}

// --- Configuration ---

const WP_API_BASE =
  (process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WORDPRESS_API_URL)?.replace(/\/$/, "") ||
  "";

const WP_JSON = WP_API_BASE
  ? (WP_API_BASE.endsWith("/wp-json") ? WP_API_BASE : `${WP_API_BASE}/wp-json`)
  : "";

const SANAD_MY_DONATIONS = WP_JSON ? `${WP_JSON}/sanad/v1/my-donations` : "";
const SANAD_RECORD_DONATION = WP_JSON ? `${WP_JSON}/sanad/v1/record-donation` : "";


// تحويل حالة إنجليزية إلى عربية
const statusMap: Record<string, string> = {
  completed: "مكتمل",
  pending: "قيد الانتظار",
  processing: "قيد التنفيذ",
  cancelled: "ملغي",
  failed: "فشل",
};

// ------------------------------------------------------------
// 1. POST HANDLER: تسجيل تبرع جديد (مصحح وبسجلات مراقبة)
// ------------------------------------------------------------

export async function POST(req: Request) {
  try {
    console.log("DEBUG 1: Starting POST request.");
    
    // 1. المصادقة
    const session = await auth(); 
    const token = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;

    if (!token || !userId) {
      console.error("DEBUG ERROR: Not authenticated. Token or User ID missing.");
      return NextResponse.json(
        { error: "Not authenticated or user ID missing" },
        { status: 401 }
      );
    }
    console.log(`DEBUG 2: Authentication successful for User ID: ${userId}`);

    // 2. تحليل الحمولة
    const body = await req.json();
    const { amount, caseId, stripePaymentIntentId } = body;

    if (!amount || !caseId || !stripePaymentIntentId) {
      console.error("DEBUG ERROR: Missing required fields in body.");
      return NextResponse.json(
        { error: "Missing required fields (amount, caseId, stripePaymentIntentId)" },
        { status: 400 }
      );
    }
    
    // 3. بناء الـ Endpoint والـ Payload
    if (!SANAD_RECORD_DONATION) {
       console.error("DEBUG ERROR: Environment variable NEXT_PUBLIC_WORDPRESS_API_URL is missing.");
       return NextResponse.json({ error: "Misconfiguration: WordPress API base is missing." }, { status: 500 });
    }
    
    const endpoint = SANAD_RECORD_DONATION;
    console.log(`DEBUG 3: Target Endpoint: ${endpoint}`);

    // 💡 الحمولة المصححة: بناء مصفوفة donated_items
    const donatedItemsPayload: WpDonatedItem[] = [
      {
        case_id: caseId,
        caseId: caseId, 
        line_total: amount,
        item_quantity: 0,
        need_id: 0, 
      },
    ];

    const payload = {
      amount,
      donor_id: userId,
      project_id: caseId,
      status: "completed",
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
      donation_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      donated_items: donatedItemsPayload, // العنصر الحاسم للنجاح في WP
    };
    
    console.log("DEBUG 4: Sending Payload. Size:", JSON.stringify(payload).length);

    // 4. إرسال طلب Fetch
    const wpRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`DEBUG 5: Received WP Status: ${wpRes.status}`);

    // 5. معالجة الاستجابة
    const text = await wpRes.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text, message: "Non-JSON response received" }; }
    
    console.log("DEBUG 6: WP Response Text (Snippet):", text.substring(0, 200));

    if (!wpRes.ok) {
      const message =
        json?.message ||
        json?.error ||
        `WordPress error ${wpRes.status}: ${text}`;
      
      console.error("DEBUG ERROR: WP returned non-OK status. Error:", message);
      // إرجاع حالة الخطأ الأصلية من WP (400, 401, 500)
      return NextResponse.json({ error: message }, { status: wpRes.status });
    }

    console.log("DEBUG 7: Success. Returning 200.");
    return NextResponse.json(json, { status: 200 });

  } catch (err: any) {
    // ⚠️ يحدث خطأ 500 هنا إذا كان هناك استثناء غير مُعالَج (مثل فشل req.json())
    console.error("CRITICAL API ERROR: Uncaught exception in /api/donations:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error. Check Server Logs." },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// 2. GET HANDLER: جلب التبرعات
// ------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: User Not Authenticated." },
        { status: 401 }
      );
    }
    const userId = String(session.user.id);

    if (!SANAD_MY_DONATIONS) {
      console.error("Configuration Error: SANAD_MY_DONATIONS endpoint is not set.");
      return NextResponse.json(
        { ok: false, error: "Misconfiguration: WordPress API base is missing." },
        { status: 500 }
      );
    }

    const url = `${SANAD_MY_DONATIONS}?userId=${encodeURIComponent(userId)}`;
    const wpRes = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000), 
    });

    if (!wpRes.ok) {
      const raw = await wpRes.text();
      let msg = `WP API Error (${wpRes.status}).`;
      try {
        const j = JSON.parse(raw);
        msg = j?.message || j?.error || msg;
      } catch (e) {
        // ...
      }
      return NextResponse.json({ ok: false, error: msg }, { status: wpRes.status });
    }

    const list: WpDonationResponse[] = (await wpRes.json()) || [];
    if (!Array.isArray(list)) {
        return NextResponse.json({ ok: true, donations: [] }, { status: 200 });
    }

    const formatted: FormattedDonation[] = list.map((d) => {
      const arabicStatus =
        statusMap[(String(d.status) || "").toLowerCase()] || String(d.status) || "مكتمل";

      const firstItem: WpDonatedItem | null = Array.isArray(d.donatedItems) && d.donatedItems.length > 0
        ? d.donatedItems[0]
        : null;

      const caseId =
        String(firstItem?.case_id ?? firstItem?.caseId ?? "N/A");
      const caseName =
        String(firstItem?.case_name ?? firstItem?.caseName ?? "تبرع عام");

      return {
        id: String(d.id),
        caseId,
        caseName,
        amount: Number(d.totalPaidAmount || 0), 
        status: arabicStatus,
        date: String(d.date),
        currency: String(d.currency || "QAR"),
      };
    });

    return NextResponse.json({ ok: true, donations: formatted }, { status: 200 });
  } catch (err: any) {
    const msg =
      err?.name === "TimeoutError" ? "Timeout: The external API took too long to respond." : err?.message || "Internal Server error.";
    console.error("Donations API (sanad/v1/my-donations) error:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}