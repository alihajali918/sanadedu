// File: src/app/api/donations/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "lib/auth";

export const dynamic = "force-dynamic";

// ✅ بناء أساس WP مرة واحدة
const WP_API_BASE =
  process.env.WP_API_BASE?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.replace(/\/$/, "") ||
  "";

const WP_JSON = WP_API_BASE
  ? (WP_API_BASE.endsWith("/wp-json") ? WP_API_BASE : `${WP_API_BASE}/wp-json`)
  : "";

// 🔗 endpoint الصحيح من البلغ-إن
const SANAD_MY_DONATIONS = WP_JSON ? `${WP_JSON}/sanad/v1/my-donations` : "";

// تحويل حالة إنجليزية إلى عربية (كما في واجهتك)
const statusMap: Record<string, string> = {
  completed: "مكتمل",
  pending: "قيد الانتظار",
  processing: "قيد التنفيذ",
  cancelled: "ملغي",
  failed: "فشل",
};

export async function GET() {
  try {
    // 1) التأكد من المصادقة
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
      } catch {}
      return NextResponse.json({ ok: false, error: msg }, { status: wpRes.status });
    }

    const list = await wpRes.json();
    if (!Array.isArray(list)) {
      return NextResponse.json({ ok: true, donations: [] }, { status: 200 });
    }

    // 4) تحويل شكل الاستجابة إلى ما تتوقعه الواجهة (caseName/amount/status/date/currency/ids…)
    const formatted = list.map((d: any) => {
      // من sanad_extract_donation_details:
      // id, date, donorId, donorName, donorEmail, totalPaidAmount, subtotalAmount,
      // shippingFees, customDonation, donatedItems, currency, status, paymentMethod, transactionId
      const arabicStatus =
        statusMap[(d?.status || "").toLowerCase()] || d?.status || "مكتمل";

      // نختار اسم/معرّف الحالة من أول عنصر ضمن donatedItems (لو متاح)
      const firstItem = Array.isArray(d?.donatedItems) && d.donatedItems.length > 0
        ? d.donatedItems[0]
        : null;

      const caseId =
        String(firstItem?.case_id ?? firstItem?.caseId ?? "غير معروف");
      const caseName =
        String(firstItem?.case_name ?? firstItem?.caseName ?? "تبرع عام");

      return {
        id: String(d?.id ?? ""),
        caseId,
        caseName,
        amount: Number(d?.totalPaidAmount ?? 0),
        status: arabicStatus,
        date: String(d?.date ?? new Date().toISOString()),
        currency: String(d?.currency ?? "QAR"),
        // لو احتجت التفاصيل لاحقاً:
        // transactionId: String(d?.transactionId ?? ""),
        // paymentMethod: String(d?.paymentMethod ?? ""),
        // donatedItems: d?.donatedItems ?? [],
      };
    });

    return NextResponse.json({ ok: true, donations: formatted }, { status: 200 });
  } catch (err: any) {
    const msg =
      err?.name === "TimeoutError" ? "Timeout." : err?.message || "Server error.";
    console.error("Donations API (sanad/v1/my-donations) error:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
