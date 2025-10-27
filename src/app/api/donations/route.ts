// ============================================================
// FILE: src/app/api/donations/route.ts (FINAL FIXED VERSION)
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "lib/auth";

// Forced runtime Node.js (required for cookies in RSC routes)
export const runtime = "nodejs";
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

const SANAD_RECORD_DONATION = WP_JSON
  ? `${WP_JSON}/sanad/v1/record-donation`
  : "";

// ============================================================
// 1. POST: سجل تبرع جديد في WordPress
// ============================================================

export async function POST(req: Request) {
  try {
    // ✅ 1. جلب الجلسة من NextAuth (مع الكوكي)
    const session: any = await auth();
    console.log("SESSION AT /api/donations:", session);

    const token = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;
    const donorEmail = session?.user?.email ?? "";
    const donorName = session?.user?.name ?? "فاعل خير";

    // ✅ 2. حماية بدون انهيار 500
    if (!token || !userId) {
      return NextResponse.json(
        { error: "Not authenticated. You must be logged in." },
        { status: 401 }
      );
    }

    // ✅ 3. تحليل body
    const body = await req.json();
    const { amount: minorAmount, caseId, stripePaymentIntentId, needId } = body;

    if (!minorAmount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // ✅ 4. تحويل سنت → ريال
    const majorAmount = Number(minorAmount) / 100;
    if (majorAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount." },
        { status: 400 }
      );
    }

    // ✅ 5. بناء payload لـ WordPress
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

    // ✅ 6. إرسال ل WordPress
    const wpRes = await fetch(SANAD_RECORD_DONATION, {
      method: "POST",
      credentials: "include", // IMPORTANT
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const text = await wpRes.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!wpRes.ok) {
      return NextResponse.json(
        { error: json?.message || json?.error || text },
        { status: wpRes.status }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (err: any) {
    console.error("CRITICAL ERROR in /api/donations:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
