import { NextResponse } from "next/server";
import { auth } from "lib/auth";

// ✅ إجبار Next.js أن يستخدم Node runtime وليس Edge
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
// 1. POST: تسجيل تبرع جديد
// ============================================================

export async function POST(req: Request) {
  try {
    const session = await auth();

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

    const body = await req.json();
    const { amount: minorAmount, caseId, stripePaymentIntentId, needId } = body;

    if (!minorAmount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields (amount, caseId, stripePaymentIntentId)" },
        { status: 400 }
      );
    }

    const majorAmount = Number(minorAmount) / 100;
    if (majorAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount (must be positive)." },
        { status: 400 }
      );
    }

    if (!SANAD_RECORD_DONATION) {
      return NextResponse.json(
        { error: "Misconfiguration: WordPress API base missing." },
        { status: 500 }
      );
    }

    const donatedItemsPayload: WpDonatedItem[] = [
      {
        case_id: caseId,
        caseId: caseId,
        line_total: majorAmount,
        item_quantity: 1,
        need_id: needId || 0,
      },
    ];

    const payload = {
      amount: majorAmount,
      donor_id: userId,
      project_id: caseId,
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
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
    try {
      json = JSON.parse(raw);
    } catch {
      json = { raw };
    }

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

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Access Denied: User Not Authenticated." },
        { status: 401 }
      );
    }

    const userId = String(session.user.id);

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

    if (!Array.isArray(list)) {
      return NextResponse.json({ ok: true, donations: [] }, { status: 200 });
    }

    const formatted: FormattedDonation[] = list.map((d) => {
      const status = (String(d.status) || "").toLowerCase();
      const arabicStatus = status === "completed" ? "مكتمل" : "فشل";

      const firstItem = Array.isArray(d.donatedItems) && d.donatedItems.length
        ? d.donatedItems[0]
        : null;

      const caseId = String(firstItem?.case_id ?? firstItem?.caseId ?? "N/A");
      const caseName = String(firstItem?.case_name ?? firstItem?.caseName ?? "تبرع عام");

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
      err?.name === "TimeoutError"
        ? "Timeout: The external API took too long to respond."
        : err?.message || "Internal Server Error";

    console.error("Donations API (GET /donations) error:", err);

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
