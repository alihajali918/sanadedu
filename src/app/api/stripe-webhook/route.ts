// ============================================================
// FILE: src/app/api/stripe/webhook/route.ts
// ✅ FINAL PRODUCTION VERSION — Secure Stripe → WordPress Sync
// Supports Authorization + Fallback + Safe Revalidation
// ============================================================

import Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

// ============================================================
// 🔧 Environment Variables
// ============================================================
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
const SANAD_WEBHOOK_API_KEY = process.env.SANAD_WEBHOOK_API_KEY as string;

const WP_API_BASE = process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "";
const WP_WEBHOOK_ENDPOINT = WP_API_BASE
  ? `${WP_API_BASE.replace(/\/$/, "")}/sanad/v1/webhook-update`
  : "";

// ============================================================
// ⚙️ Stripe Setup
// ============================================================
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // ✅ تأكد أن هذا الإصدار متوافق مع حسابك في لوحة Stripe
  apiVersion: "2025-08-27.basil",
});

// ============================================================
// 🚀 POST Handler — Stripe Webhook Endpoint
// ============================================================
export async function POST(req: NextRequest) {
  // 🔒 تحقق من وجود الإعدادات الأساسية
  if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
    console.error("❌ Missing Stripe configuration keys.");
    return NextResponse.json({ error: "Stripe configuration missing." }, { status: 500 });
  }

  if (!WP_WEBHOOK_ENDPOINT) {
    return NextResponse.json(
      { error: "Misconfiguration: WP_API_BASE is not set." },
      { status: 500 }
    );
  }

  if (!SANAD_WEBHOOK_API_KEY) {
    console.error("❌ SANAD_WEBHOOK_API_KEY is missing in environment.");
    return NextResponse.json(
      { error: "Misconfiguration: Webhook API Key missing." },
      { status: 500 }
    );
  }

  // ============================================================
  // 1️⃣ التحقق من توقيع Stripe Webhook لضمان الأمان
  // ============================================================
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("❌ Stripe Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ============================================================
  // 2️⃣ الاستجابة فقط لحدث الدفع الناجح (payment_intent.succeeded)
  // ============================================================
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const transaction_id = paymentIntent.id;

    if (transaction_id) {
      console.log(`✅ Received Stripe success for PaymentIntent: ${transaction_id}`);

      try {
        // ============================================================
        // 3️⃣ إرسال البيانات إلى ووردبريس لتحديث حالة التبرع
        // ============================================================
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SANAD_WEBHOOK_API_KEY}`,
        };

        // 🔄 Fallback إضافي (في حال حذف الهيدر من السيرفر)
        const fallbackBody = {
          ...event,
          _auth_key: SANAD_WEBHOOK_API_KEY,
        };

        const wpUpdateResponse = await fetch(WP_WEBHOOK_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(fallbackBody),
        });

        if (!wpUpdateResponse.ok) {
          const errorDetails = await wpUpdateResponse.text();
          console.error("❌ WordPress update failed:", errorDetails);
          // Stripe سيعيد المحاولة تلقائياً عند رد 500
          return new NextResponse(`Failed to update WordPress: ${errorDetails}`, {
            status: 500,
          });
        }

        // ============================================================
        // 4️⃣ Revalidate cached data (اختياري لكن مهم)
        // ============================================================
        try {
          await revalidateTag("cases");
          await revalidateTag("needs-lists");
          console.log("🚀 Revalidation completed for 'cases' & 'needs-lists'.");
        } catch (revalidateError) {
          console.error("⚠️ Revalidation failed:", revalidateError);
          // تجاهل هذا الخطأ لأن الهدف الأساسي (تحديث الحالة) تم بنجاح
        }

        console.log("✅ WordPress updated successfully. Donation marked as 'completed'.");
      } catch (error) {
        console.error("❌ Error while sending data to WordPress:", error);
        return new NextResponse(`Server error during WP update: ${error}`, { status: 500 });
      }
    }
  }

  // ============================================================
  // 5️⃣ الرد النهائي — حتى لا تفشل Stripe في التسليم
  // ============================================================
  return NextResponse.json({ received: true }, { status: 200 });
}
