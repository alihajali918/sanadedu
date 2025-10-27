import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// 🚨 تأكد من صحة مسارات الاستيراد لدوال المصادقة
import { authOptions } from "lib/auth"; 
import { auth } from "lib/auth";       

export const dynamic = "force-dynamic";

// --- Type Definitions ---

interface WpDonatedItem {
  case_id?: number | string;
  caseId?: number | string;
  case_name?: string;
  caseName?: string;
  line_total: number;
  item_quantity: number;
  need_id: number;
}

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
  status: string; // الحالة بالعربية: إما "مكتمل" أو "فشل"
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


// ============================================================
// 1. POST HANDLER: تسجيل تبرع جديد (مُصحَّح نهائياً للتوافق المحاسبي)
// ============================================================

export async function POST(req: Request) {
  try {
    
    // 1. المصادقة واستخلاص بيانات المستخدم
    const session = await auth(); 
    const token = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;
    const donorEmail = session?.user?.email ?? '';
    const donorName = session?.user?.name ?? 'فاعل خير';


    if (!token || !userId) {
      return NextResponse.json(
        { error: "Not authenticated or user ID missing" },
        { status: 401 }
      );
    }

    // 2. تحليل الحمولة
    const body = await req.json();
    // ✅ استخدام اسم جديد للمبلغ القادم (minorAmount = 12000 سنت)
    const { amount: minorAmount, caseId, stripePaymentIntentId, needId } = body; 

    if (!minorAmount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields (amount, caseId, stripePaymentIntentId)" },
        { status: 400 }
      );
    }
    
    // 🛑 تحويل المبلغ إلى العملة الرئيسية (12000 -> 120.00)
    const majorAmount = Number(minorAmount) / 100;
    if (majorAmount <= 0) {
        return NextResponse.json({ error: "Invalid donation amount (must be positive)." }, { status: 400 });
    }
    
    // 3. بناء الـ Endpoint والـ Payload
    if (!SANAD_RECORD_DONATION) {
       return NextResponse.json({ error: "Misconfiguration: WordPress API base is missing." }, { status: 500 });
    }
    
    const endpoint = SANAD_RECORD_DONATION;

    // 💡 بناء مصفوفة donated_items (تستخدم العملة الرئيسية و item_quantity = 1)
    const donatedItemsPayload: WpDonatedItem[] = [
      {
        case_id: caseId,
        caseId: caseId, 
        line_total: majorAmount, // ✅ المبلغ الرئيسي (120.00)
        item_quantity: 1, // 🛑 التصحيح الحاسم: القيمة 1 لتجنب خطأ 500
        need_id: needId || 0,
      },
    ];

    const payload = {
      amount: majorAmount, // ✅ المبلغ الرئيسي (120.00)
      donor_id: userId,
      project_id: caseId,
      // لا نرسل حقل الحالة ليُسجَّل كـ "pending" تلقائياً
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
      donation_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      donated_items: donatedItemsPayload, // العنصر الحاسم للنجاح في WP
      
      // بيانات المتبرع
      donor_email: donorEmail, 
      donor_name: donorName,
    };
    
    // 4. إرسال طلب Fetch
    const wpRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    // 5. معالجة الاستجابة
    const text = await wpRes.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!wpRes.ok) {
      const message =
        json?.message ||
        json?.error ||
        `WordPress error ${wpRes.status}: ${text}`;
      return NextResponse.json({ error: message }, { status: wpRes.status });
    }

    return NextResponse.json(json, { status: 200 });

  } catch (err: any) {
    console.error("CRITICAL API ERROR: Uncaught exception in /api/donations:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error. Check Server Logs." },
      { status: 500 }
    );
  }
}

// ============================================================
// 2. GET HANDLER: جلب التبرعات (مع توحيد الحالة إلى مكتمل/فشل)
// ============================================================

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
      // ✅ توحيد الحالة: إذا كانت completed تكون "مكتمل"، وإلا تكون "فشل"
      const status = (String(d.status) || "").toLowerCase();
      const arabicStatus = status === 'completed' ? 'مكتمل' : 'فشل';

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