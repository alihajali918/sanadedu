// src/app/api/donations/route.ts
import { NextResponse } from "next/server";
import { auth } from "lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const token = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;

    if (!token || !userId) {
      return NextResponse.json(
        { error: "Not authenticated or user ID missing" },
        { status: 401 }
      );
    }

    const { amount, caseId, stripePaymentIntentId } = await req.json();

    if (!amount || !caseId || !stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const base = process.env.NEXT_PUBLIC_WORDPRESS_API_URL; // أو WORDPRESS_API_URL
    if (!base) {
      return NextResponse.json(
        { error: "WORDPRESS_API_URL not configured" },
        { status: 500 }
      );
    }

    const endpoint = `${base.replace(/\/$/, "")}/sanad/v1/record-donation`;

    const payload = {
      amount,
      donor_id: userId,
      project_id: caseId,
      status: "completed",
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
      donation_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    };

    const wpRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      // لو ووردبريس خارجي وبدك تتخطى الكاش:
      // cache: "no-store",
    });

    // سجّل الرد للمساعدة في الديبَغ
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
    console.error("API /api/donations error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
