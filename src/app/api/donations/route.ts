// ============================================================
// FILE: src/app/api/donations/route.ts
// ✅ FINAL VERSION — Supports Anonymous & Authenticated Donors (JWT + API KEY)
// ============================================================
import { NextResponse } from "next/server";
import { auth } from "lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// 🧩 Type Definitions
// ============================================================
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
  status: string;
  date: string;
  currency: string;
  needId: string;
  quantity: number;
}

// ============================================================
// 🌍 WordPress API Setup
// ============================================================
const WP_API_BASE =
  (process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WORDPRESS_API_URL)?.replace(/\/$/, "") || "";

const WP_JSON = WP_API_BASE
  ? WP_API_BASE.endsWith("/wp-json")
    ? WP_API_BASE
    : `${WP_API_BASE}/wp-json`
  : "";

const SANAD_MY_DONATIONS = WP_JSON ? `${WP_JSON}/sanad/v1/my-donations` : "";
const SANAD_RECORD_DONATION = WP_JSON ? `${WP_JSON}/sanad/v1/record-donation` : "";

// ============================================================
// 1️⃣ POST — تسجيل تبرع جديد (مجهول أو معرف)
// ============================================================
export async function POST(req: Request) {
  try {
    // 🧩 التحقق من الجلسة
    let session: any = null;
    try {
      session = await auth();
    } catch (authError: any) {
      console.error("AUTH ERROR:", authError);
    }

    const isAuthenticated = !!session?.user?.wordpressJwt && !!session?.user?.wordpressUserId;
    const token = session?.user?.wordpressJwt ?? null;
    const userId = session?.user?.wordpressUserId ?? 0;
    const donorEmail = session?.user?.email ?? "";
    const donorName = session?.user?.name ?? "فاعل خير";

    // 🧩 قراءة البيانات القادمة من الواجهة
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { amount: minorAmount, caseId, stripePaymentIntentId, needId, quantity } = body;

    if (!minorAmount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields (amount, caseId, stripePaymentIntentId)." },
        { status: 400 }
      );
    }

    if (!SANAD_RECORD_DONATION) {
      return NextResponse.json({ error: "WordPress API base not configured." }, { status: 500 });
    }

    const majorAmount = Number(minorAmount) / 100;
    const itemQuantity = Number(quantity) > 0 ? Number(quantity) : 1;

    const donatedItemsPayload: WpDonatedItem[] = [
      {
        case_id: caseId,
        caseId,
        line_total: majorAmount,
        item_quantity: itemQuantity,
        need_id: needId || 0,
      },
    ];

    // 🧩 إنشاء حمولة الطلب
    const payload = {
      amount: majorAmount,
      donor_id: userId || undefined,
      project_id: caseId,
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
      donation_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      donated_items: donatedItemsPayload,
      donor_email: donorEmail || undefined,
      donor_name: donorName || "فاعل خير",
      anonymous: !isAuthenticated,
    };

    // 🧩 إعداد الهيدرز — دعم JWT + API KEY
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isAuthenticated && token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      const apiKey =
        process.env.SANAD_API_KEY || process.env.NEXT_PUBLIC_SANAD_API_KEY || "";
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    }

    console.log("📤 Submitting donation to WordPress:", {
      endpoint: SANAD_RECORD_DONATION,
      isAuthenticated,
      hasJWT: !!token,
      hasApiKey: !!headers["Authorization"],
    });

    const wpRes = await fetch(SANAD_RECORD_DONATION, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const raw = await wpRes.text();
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      json = { raw };
    }

    if (!wpRes.ok) {
      console.error(`❌ WP API Error (${wpRes.status}):`, json);
      return NextResponse.json(
        { error: json?.message || json?.error || raw },
        { status: wpRes.status }
      );
    }

    console.log("✅ Donation recorded successfully:", json);
    return NextResponse.json({ ok: true, data: json }, { status: 200 });
  } catch (err: any) {
    console.error("CRITICAL API ERROR (POST /donations):", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// ============================================================
// 2️⃣ GET — جلب تبرعات المستخدم (المسجل فقط)
// ============================================================
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.wordpressUserId) {
      return NextResponse.json(
        { ok: false, error: "User not authenticated. Anonymous donors have no donation list." },
        { status: 401 }
      );
    }

    const userId = String(session.user.wordpressUserId);

    if (!SANAD_MY_DONATIONS) {
      return NextResponse.json(
        { ok: false, error: "WordPress API base not configured." },
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
      } catch {}
      return NextResponse.json({ ok: false, error: msg }, { status: wpRes.status });
    }

    const list: WpDonationResponse[] = (await wpRes.json()) || [];

    const formatted: FormattedDonation[] = list.flatMap((d) => {
      const status = (String(d.status) || "").toLowerCase();
      const arabicStatus = status === "completed" ? "مكتمل" : "قيد المعالجة";

      if (!Array.isArray(d.donatedItems) || d.donatedItems.length === 0) {
        return [
          {
            id: String(d.id),
            caseId: "0",
            caseName: "تبرع عام",
            amount: Number(d.totalPaidAmount || 0),
            status: arabicStatus,
            date: String(d.date),
            currency: String(d.currency || "QAR"),
            needId: "0",
            quantity: 1,
          },
        ];
      }

      return d.donatedItems.map((item, index) => ({
        id: `${d.id}-${index}`,
        caseId: String(item?.case_id ?? item?.caseId ?? "N/A"),
        caseName: String(item?.case_name ?? item?.caseName ?? "تبرع مشروع"),
        amount: Number(item.line_total || 0),
        status: arabicStatus,
        date: String(d.date),
        currency: String(d.currency || "QAR"),
        needId: String(item.need_id || "N/A"),
        quantity: Number(item.item_quantity || 1),
      }));
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
