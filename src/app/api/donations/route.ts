// app/api/donations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "lib/auth";
import { getCaseById } from "../../../../lib/api";

const WP_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
const WP_DONATIONS_REST = `${WP_BASE}/wp/v2/donations`;
const WP_DONATIONS_CUSTOM = `${WP_BASE}/sanad/v1/record-donation`;

const json = (data: any, status = 200) => NextResponse.json(data, { status });

/* -----------------------------------------------------------
 * أدوات مساعدة
 * ----------------------------------------------------------- */

// تحويل الأرقام العربية-الهندية إلى لاتينية وإزالة الفواصل/المسافات
const toNumberSafe = (v: unknown): number => {
  if (typeof v === "number" && isFinite(v)) return v;

  if (typeof v === "string") {
    // أرقام عربية-هندية (٠-٩) و (۰-۹)
    const map: Record<string, string> = {
      "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
      "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
      "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
      "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    };
    const normalized = v
      .replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d)
      .replace(/[,\s\u00A0]/g, "") // فواصل ومسافات
      .replace(/^\+/, ""); // علامة + في البداية إن وجدت
    const num = Number(normalized);
    return isFinite(num) ? num : NaN;
  }

  return NaN;
};

// دالة مساعدة لاستخراج مبلغ التبرع من حقول مختلفة
const getDonationAmount = (donation: any): number => {
  const fields = [
    donation?.donation_amount,
    donation?.amount,
    donation?.acf?.donation_amount,
    donation?.acf?.amount,
  ];
  for (const field of fields) {
    const n = toNumberSafe(field);
    if (isFinite(n) && n > 0) return n;
  }
  return NaN;
};

// قراءة كل صفحات ووردبريس (حتى 100 عنصر لكل صفحة) — نكتفي بأول 3 صفحات تحسبًا
const fetchWpPages = async (url: string, headers: Record<string, string>) => {
  const all: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}per_page=100&page=${page}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WP error ${res.status}: ${body}`);
    }
    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < 100) break; // لا مزيد من الصفحات
  }
  return all;
};

/* -----------------------------------------------------------
 * GET: عرض التبرعات الخاصة بالمستخدم
 * ----------------------------------------------------------- */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const jwt = (session?.user as any)?.wordpressJwt as string | undefined;
  const userId = (session?.user as any)?.wordpressUserId as number | undefined;

  if (!jwt || !userId) {
    return json({ ok: false, error: "Authentication required" }, 401);
  }

  try {
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` };

    // نجلب تبرعات المستخدم فقط
    const rawDonations = await fetchWpPages(`${WP_DONATIONS_REST}?author=${userId}`, headers);
    // console.log("البيانات الخام من WordPress:", rawDonations);

    // تجميع معرفات الحالات الفريدة
    const uniqueCaseIds: number[] = Array.isArray(rawDonations)
      ? [
          ...new Set(
            rawDonations
              .map((d: any) => toNumberSafe(d?.acf?.case_id))
              .filter((id: number) => Number.isInteger(id) && id > 0)
          ),
        ]
      : [];

    // جلب بيانات الحالات دفعة واحدة
    const caseResults = await Promise.all(
      uniqueCaseIds.map(async (id) => {
        try {
          return await getCaseById(id);
        } catch {
          return null;
        }
      })
    );

    const caseNameMap = new Map<number, string>();
    caseResults.forEach((c: any) => {
      if (c && Number.isInteger(c.id)) {
        caseNameMap.set(c.id, c.title);
      }
    });

    // تجميع التبرعات حسب الحالة
    const aggregated: Record<number, { caseId: string; caseName: string; totalAmount: number }> =
      rawDonations.reduce((acc: any, d: any) => {
        const caseId = toNumberSafe(d?.acf?.case_id);
        const amount = getDonationAmount(d);
        if (Number.isInteger(caseId) && caseId > 0 && isFinite(amount) && amount > 0) {
          if (!acc[caseId]) {
            acc[caseId] = {
              caseId: String(caseId),
              caseName: caseNameMap.get(caseId) || "—",
              totalAmount: 0,
            };
          }
          acc[caseId].totalAmount += amount;
        }
        return acc;
      }, {});

    const donations = Object.values(aggregated);
    // console.log("البيانات المجمعة النهائية:", donations);

    return json({ ok: true, donations });
  } catch (e: any) {
    console.error("[Donations GET] error:", e);
    return json({ ok: false, error: "Internal error while fetching donations" }, 500);
  }
}

/* -----------------------------------------------------------
 * POST: تسجيل تبرّع جديد
 * ----------------------------------------------------------- */
export async function POST(req: NextRequest) {
  const trace = `don-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = await getServerSession(authOptions);
  const jwt = (session?.user as any)?.wordpressJwt as string | undefined;

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    // استخراج البيانات
    const amount = getDonationAmount(body);
    // نقبل caseId من body.caseId أو body.case_id تحسبًا
    const caseIdRaw = Number.isFinite(toNumberSafe(body?.caseId))
      ? toNumberSafe(body?.caseId)
      : toNumberSafe(body?.case_id);
    const caseId = Number(caseIdRaw);
    const stripePaymentIntentId = String(body?.stripePaymentIntentId || body?.transaction_id || "");

    // userId من الجلسة أو 0 (قد تتجاهله نقطة النهاية وتعتمد على JWT)
    const userId = toNumberSafe((session?.user as any)?.wordpressUserId ?? 0) || 0;
    console.log(`[Donations POST] Determined userId: ${userId}`);

    // تحققات أولية
    if (!isFinite(amount) || amount <= 0 || !Number.isInteger(caseId) || caseId <= 0) {
      return json(
        {
          ok: false,
          error: "Missing or invalid required fields",
          details: {
            isMissingAmount: !isFinite(amount) || amount <= 0,
            isMissingCaseId: !Number.isInteger(caseId) || caseId <= 0,
          },
          got: { amount, caseId, stripePaymentIntentId, userId },
          trace,
        },
        400
      );
    }

    // تحقق من وجود الحالة قبل الإرسال
    try {
      const caseData = await getCaseById(caseId);
      if (!caseData || !Number.isInteger(caseData?.id)) {
        return json(
          { ok: false, error: "المعرف caseId غير موجود", details: { caseId }, trace },
          400
        );
      }
    } catch {
      return json(
        { ok: false, error: "تعذر التحقق من الحالة (caseId)", details: { caseId }, trace },
        502
      );
    }

    // تجهيز الحمولة — نرسل الشكلين لضمان التوافق مع نقطة ووردبريس
    const wpPayload = {
      // الهوية (قد تتجاهلها نقطة النهاية وتستخدم JWT)
      userId: Number(userId),

      // caseId بالشكلين
      caseId: Number(caseId),
      case_id: Number(caseId),

      // amount بالشكلين
      amount: Number(amount),
      donation_amount: Number(amount),

      // حالة دفع معيارية (إنجليزية) لتفادي قوائم ثابتة
      status: "completed",

      // معلومات الدفع
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Trace-Id": trace,
    };
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

    const wpRes = await fetch(WP_DONATIONS_CUSTOM, {
      method: "POST",
      headers,
      body: JSON.stringify(wpPayload),
      cache: "no-store",
    });

    const wpText = await wpRes.text();
    let wpData: any;
    try {
      wpData = JSON.parse(wpText);
    } catch {
      wpData = { raw: wpText };
    }

    if (!wpRes.ok) {
      console.error("[Donations POST] WordPress responded with an error:", {
        status: wpRes.status,
        sent: wpPayload,
        received: wpData,
        trace,
      });
      return json(
        {
          ok: false,
          error: wpData?.message || wpData?.error || `WordPress Error: ${wpRes.status}`,
          details: {
            wordpressStatus: wpRes.status,
            sentPayload: wpPayload,
            receivedData: wpData,
            trace,
          },
        },
        502
      );
    }

    // بعض نقاط النهاية تعيد { success: false } رغم 200
    const successFlag =
      typeof wpData?.success === "boolean" ? wpData.success : true;

    if (!successFlag) {
      console.error("[Donations POST] WordPress did not confirm success:", {
        sent: wpPayload,
        received: wpData,
        trace,
      });
      return json(
        {
          ok: false,
          error: wpData?.message || "WordPress did not confirm success",
          details: {
            wordpressStatus: wpRes.status,
            sentPayload: wpPayload,
            receivedData: wpData,
            trace,
          },
        },
        502
      );
    }

    return json({ ok: true, result: wpData, trace }, 200);
  } catch (e: any) {
    console.error("[Donations POST] Unexpected server error:", e);
    return json({ ok: false, error: e?.message || "Unknown server error", trace }, 500);
  }
}
