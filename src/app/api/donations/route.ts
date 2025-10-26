import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "lib/auth"; // تأكد من المسار الصحيح
import { auth } from "lib/auth"; // قد تحتاج لاستخدام دالة auth بدلاً من getServerSession

export const dynamic = "force-dynamic";

// --- Type Definitions ---

// تعريف هيكل العنصر المتبرع به (للتوافق مع كلا المفتاحين)
interface WpDonatedItem {
  case_id?: number | string;
  caseId?: number | string;
  case_name?: string;
  caseName?: string;
  line_total: number;
  item_quantity: number;
  need_id: number;
}

// تعريف هيكل استجابة التبرع الفردي من WordPress
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

// تعريف هيكل البيانات النهائية التي ستُرسل إلى الواجهة الأمامية
interface FormattedDonation {
  id: string;
  caseId: string;
  caseName: string;
  amount: number;
  status: string; // الحالة بالعربية
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
// 1. POST HANDLER: تسجيل تبرع جديد
// ------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // 1) المصادقة وجلب التوكن
    // تم التبديل لاستخدام auth لسهولة الوصول إلى JWT
    const session = await auth(); 
    const token = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;

    if (!token || !userId) {
      return NextResponse.json(
        { error: "Not authenticated or user ID missing" },
        { status: 401 }
      );
    }

    // 2) جلب البيانات من الطلب
    const { amount, caseId, stripePaymentIntentId } = await req.json();

    if (!amount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields (amount, caseId, stripePaymentIntentId)" },
        { status: 400 }
      );
    }

    // 3) التحقق من الضبط
    if (!SANAD_RECORD_DONATION) {
       console.error("Configuration Error: SANAD_RECORD_DONATION endpoint is not set.");
       return NextResponse.json({ error: "Misconfiguration: WordPress API base is missing." }, { status: 500 });
    }

    // 4) بناء حمولة البيانات (Payload)
    const donatedItemsPayload: WpDonatedItem[] = [
      {
        // استخدام المفتاحين للتوافق مع دالة sanad_get_field و sanad_webhook_update
        case_id: caseId,
        caseId: caseId,
        line_total: amount,
        item_quantity: 0, // 0 لأنه تبرع نقدي وليس عيني
        need_id: 0, // 0 لأنه ليس لاحتياج محدد (نقدي عام)
      },
    ];

    const payload = {
      amount,
      donor_id: userId,
      // project_id يُرسل لكي يتمكن الـ Plugin من تحديد الحالة الرئيسية بسهولة
      project_id: caseId,
      status: "completed",
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
      // إرسال المصفوفة للتوافق مع هيكل WordPress
      donated_items: donatedItemsPayload, 
      // يمكن إضافة donor_name و donor_email إذا كانت متاحة
    };

    // 5) إرسال الطلب إلى WordPress
    const wpRes = await fetch(SANAD_RECORD_DONATION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // استخدام التوكن للمصادقة على دالة sanad_record_donation
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await wpRes.text();
    let json: any;
    try { 
        json = JSON.parse(text); 
    } catch { 
        json = { raw: text }; 
    }
    
    // 6) معالجة الاستجابة
    if (!wpRes.ok) {
      const message =
        json?.message ||
        json?.error ||
        `WordPress error ${wpRes.status}: Failed to record donation.`;
      
      console.error("WP POST Error:", message, json);
      // إرجاع رسالة الخطأ وحالة الاستجابة من WP
      return NextResponse.json({ success: false, error: message }, { status: wpRes.status });
    }

    return NextResponse.json({ success: true, ...json }, { status: 200 });

  } catch (err: any) {
    console.error("Donations POST API error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server error." }, { status: 500 });
  }
}

// ------------------------------------------------------------
// 2. GET HANDLER: جلب التبرعات (الكود الذي أرفقته سابقاً)
// ------------------------------------------------------------

export async function GET() {
  try {
    // 1) التأكد من المصادقة (باستخدام getServerSession كما في الكود الأصلي)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: User Not Authenticated." },
        { status: 401 }
      );
    }
    const userId = String(session.user.id);

    // 2) التحقق من الضبط
    if (!SANAD_MY_DONATIONS) {
      console.error("Configuration Error: SANAD_MY_DONATIONS endpoint is not set.");
      return NextResponse.json(
        { ok: false, error: "Misconfiguration: WordPress API base is missing." },
        { status: 500 }
      );
    }

    // 3) جلب تبرعات المستخدم من البلغ-إن
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

    // 4) تحويل شكل الاستجابة
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