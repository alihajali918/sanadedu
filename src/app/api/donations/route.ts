import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // لا كاش

const rawBase = process.env.WP_API_BASE || "";
const WP_API_BASE = rawBase.replace(/\/$/, ""); // شيل السلاش الأخير لو موجود
const SANAD_API_KEY = process.env.SANAD_API_KEY || "";
const SANAD_API_ENDPOINT = WP_API_BASE ? `${WP_API_BASE}/sanad/v1/record-donation` : "";

// فحص صحة WP_API_BASE (لازم ينتهي بـ /wp-json)
function isValidWpBase(url: string) {
  return /^https?:\/\/.+\/wp-json$/i.test(url);
}

function numOr0(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    if (!isValidWpBase(WP_API_BASE)) {
      return NextResponse.json(
        {
          error: "Misconfiguration",
          details: {
            hint: "Set WP_API_BASE in .env.local to your real WordPress REST base, e.g. https://example.com/wp-json",
            current: rawBase || "(empty)",
          },
        },
        { status: 500 }
      );
    }

    const body: any = await req.json().catch(() => ({}));

    // --- normalize donated_items from multiple shapes/keys
    const diRaw = body.donated_items ?? body.donatedItems ?? [];
    let donatedItemsArr: any[] = [];
    if (Array.isArray(diRaw)) {
      donatedItemsArr = diRaw;
    } else if (typeof diRaw === "string") {
      try { donatedItemsArr = JSON.parse(diRaw); } catch { donatedItemsArr = []; }
      if (!Array.isArray(donatedItemsArr)) donatedItemsArr = [];
    } else if (diRaw && typeof diRaw === "object") {
      // لو جاك ككائن: خذه كقائمة قيم
      donatedItemsArr = Object.values(diRaw);
      if (!Array.isArray(donatedItemsArr)) donatedItemsArr = [];
    }

    // 💡 التعديل الحاسم: إضافة بند التبرع التشغيلي (need_id: 0)
    const customDonationAmount = numOr0(body.custom_donation);

    if (customDonationAmount > 0) {
      // نضيف بندًا جديدًا للدعم التشغيلي
      donatedItemsArr.push({
        case_id: 0,
        line_total: customDonationAmount, // المبلغ النقدي
        need_id: 0, // 🎯 الشرط الإجباري لتفعيل تحديث ميزانية التشغيل في الـ Webhook
        item_quantity: 0,
        item_name: "تبرع لدعم الكادر التشغيلي/مخصص",
      });
    }
    // ----------------------------------------------------

    // --- case_ids (فريدة وأعداد صحيحة موجبة)
    // نستخرج مُعرفات الحالات (باستثناء ID=0 للدعم التشغيلي)
    const caseIdsFromItems = donatedItemsArr
      .map((i: any) => Number(i?.case_id || i?.caseId))
      .filter((id: number) => id > 0); // 🌟 تم التأكد من أن IDs أكبر من 0

    const case_ids = Array.from(new Set(caseIdsFromItems));
    

    // --- payload إلى ووردبريس
    // amount بالسنت (integer > 0)، و WP يحوله لدولار: amount_in_cents/100
    const amountCents = Math.round(numOr0(body.amount || body.totalPaidAmount || body.total_paid_amount || 0));

    const payload = {
      amount: amountCents, // بالسنت
      subtotal_amount: numOr0(body.subtotal_amount),
      shipping_fees: numOr0(body.shipping_fees),
      custom_donation: customDonationAmount,

      // توحيد: نرسل JSON string للقائمة الموحدة (WP يخزنه في donated_items_list)
      donated_items: JSON.stringify(donatedItemsArr),

      // مفيدة لاختيار case رئيسي في WP
      case_ids,

      transaction_id: body.transaction_id || body.paymentIntentId || body.payment_intent_id || "",
      userId: numOr0(body.userId || body.user_id),
      user_id: numOr0(body.user_id || body.userId),

      status: body.status || "pending",
      payment_method: body.payment_method || body.paymentMethod || "Stripe",

      donor_name: (body.donor_name && String(body.donor_name).trim()) || "فاعل خير",
      donor_email: (body.donor_email && String(body.donor_email).trim()) || "",

      // اختياري: لو مرّت عملة من الفرونت
      donation_currency: body.donation_currency || body.currency || undefined,
    };

    if (!payload.amount || payload.amount < 1) {
      return NextResponse.json(
        { error: "ValidationError", details: { amount: "amount (in cents) is required (>0)" }, got: payload },
        { status: 400 }
      );
    }

    // 🌟 تحقق إضافي لضمان وجود الـ Endpoint
    if (!SANAD_API_ENDPOINT) {
      throw new Error("SANAD_API_ENDPOINT is not configured, check WP_API_BASE.");
    }

    // --- تجهيز الهيدرز + مهلة للطلب
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (SANAD_API_KEY) {
      headers.Authorization = `Bearer ${SANAD_API_KEY}`;
      headers["X-API-Key"] = SANAD_API_KEY;
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let wpRes: Response;
    try {
      wpRes = await fetch(SANAD_API_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const raw = await wpRes.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = { message: "Non-JSON response", raw }; }

    if (!wpRes.ok) {
      return NextResponse.json(
        { error: data?.message || "WordPress error", details: data, got: payload },
        { status: wpRes.status || 500 }
      );
    }

    return NextResponse.json(data || { ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("Donations proxy error:", err);
    const msg = err?.name === "AbortError" ? "Timeout contacting WordPress" : (err?.message || "Server error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}