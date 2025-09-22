import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req) {
  try {
    const session = await getServerSession();
    const jwt = session?.user?.wordpressJwt;
    const userId = session?.user?.wordpressUserId;
    const basic = process.env.WORDPRESS_API_AUTH;

    const { amount, caseId, stripePaymentIntentId } = await req.json().catch(() => ({}));

    // تحقق من وجود جميع الحقول المطلوبة، بما في ذلك userId
    if (!amount || !caseId || !stripePaymentIntentId || !userId) {
      return json({ error: "Missing required fields", got: { amount, caseId, stripePaymentIntentId, userId } }, 400);
    }

    const base =
      process.env.WORDPRESS_API_URL ||
      process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
      process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT ||
      process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL;

    if (!base) return json({ error: "WORDPRESS_API_URL not configured" }, 500);

    const endpoint = `${base.replace(/\/$/, "")}/sanad/v1/record-donation`;

    const payload = {
      amount: Number(amount),
      userId: userId,
      caseId: Number(caseId),
      status: "مكتمل",
      // ⬅️ إضافة الحقول الجديدة
      payment_method: "Stripe", // تم إضافة هذه القيمة الثابتة
      transaction_id: stripePaymentIntentId, // تم ربط هذا الحقل بـ stripePaymentIntentId
      donation_currency: "USD", // تم إضافة هذا الحقل
    };

    const makeReq = (authHeader) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

    let used = "none";
    let wpRes = null;

    if (jwt) {
      wpRes = await makeReq(`Bearer ${jwt}`);
      used = "bearer";
      if (wpRes.status === 401 || wpRes.status === 403) {
        if (basic) {
          wpRes = await makeReq(`Basic ${basic}`);
          used = "basic";
        }
      }
    } else if (basic) {
      wpRes = await makeReq(`Basic ${basic}`);
      used = "basic";
    } else {
      return json({ error: "No auth available (JWT or Basic)" }, 401);
    }

    const raw = await wpRes.text();
    let data; try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!wpRes.ok) {
      return json({ error: data?.message || data?.error || `WordPress ${wpRes.status}`, authUsed: used, details: data }, wpRes.status);
    }

    return json({ ok: true, authUsed: used, result: data }, 200);
  } catch (e) {
    return json({ error: e?.message || "Unknown server error" }, 500);
  }
}