import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCaseById } from "../../../../lib/api";

// يمكن ضبط هذا المسار حسب احتياجاتك. الكود يستخدم المسار العام لـ WP
// إذا كان لديك مسار خاص، احتفظ بالمسار الذي كان لديك.
const WP_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
const WP_DONATIONS_REST = `${WP_BASE}/wp/v2/donations`;
// هذا هو المسار الخاص الذي تم استخدامه في الكود الثاني
const WP_DONATIONS_CUSTOM = `${WP_BASE}/sanad/v1/record-donation`;
const json = (data: any, status = 200) => NextResponse.json(data, { status });

// -------- GET: عرض التبرعات الخاصة بالمستخدم --------
// تم تعديل هذا الكود ليقوم بجلب التبرعات التي قام بها المستخدم الحالي فقط.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const jwt = (session?.user as any)?.wordpressJwt as string | undefined;
  // 1. جلب معرف المستخدم من الجلسة
  const userId = (session?.user as any)?.wordpressUserId as number | undefined;

  // 2. التحقق من وجود رمز التوثيق ومعرف المستخدم. إذا لم يكن المستخدم مسجلاً، لن يكون لديه معرف مستخدم، ونعيد خطأ 401
  if (!jwt || !userId) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    // 3. تعديل رابط الجلب (fetch) لإضافة معلمة "author" لتصفية النتائج حسب معرف المستخدم
    // نفترض أن نقطة نهاية التبرعات في WordPress تدعم التصفية بمعرف المستخدم.
    const wpRes = await fetch(`${WP_DONATIONS_REST}?author=${userId}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });

    if (!wpRes.ok) {
      const body = await wpRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `WP error ${wpRes.status}: ${body}` }, { status: 502 });
    }

    const rawDonations = await wpRes.json();
    console.log("البيانات الخام من WordPress:", rawDonations);

    // 4. جمع معرفات الحالات الفريدة (الآن ستكون فقط حالات المستخدم)
    let uniqueCaseIds: number[] = [];
    if (Array.isArray(rawDonations)) {
      uniqueCaseIds = [...new Set(rawDonations
        .map((d: any) => Number(d.acf?.case_id))
        .filter((id: number) => Number.isInteger(id) && id > 0)
      )];
    }

    // 5. جلب بيانات الحالات دفعة واحدة
    const casePromises = uniqueCaseIds.map(id => getCaseById(id));
    const caseResults = await Promise.all(casePromises);

    // 6. إنشاء خريطة لربط معرف الحالة باسمها
    const caseNameMap = new Map<number, string>();
    caseResults.forEach(caseData => {
      if (caseData) {
        caseNameMap.set(caseData.id, caseData.title);
      }
    });

    // 7. تجميع التبرعات حسب الحالة
    const aggregatedDonations = rawDonations.reduce((acc: any, d: any) => {
      const caseId = Number(d.acf?.case_id);

      // Attempt to find the donation amount from multiple potential fields
      let amount = 0;
      if (typeof d?.donation_amount === 'number' || typeof d?.donation_amount === 'string') {
        amount = Number(d.donation_amount);
      } else if (typeof d?.amount === 'number' || typeof d?.amount === 'string') {
        amount = Number(d.amount);
      } else if (typeof d.acf?.donation_amount === 'number' || typeof d.acf?.donation_amount === 'string') {
        amount = Number(d.acf.donation_amount);
      } else if (typeof d.acf?.amount === 'number' || typeof d.acf?.amount === 'string') {
        amount = Number(d.acf.amount);
      }

      if (isNaN(amount)) {
        amount = 0;
      }

      console.log(`Processing donation with ID ${d.id}:`, d);
      console.log(`Extracted amount:`, amount);

      const caseName = Number.isInteger(caseId) ? caseNameMap.get(caseId) || "—" : "—";

      if (Number.isInteger(caseId) && caseId > 0) {
        if (!acc[caseId]) {
          acc[caseId] = {
            caseId: String(caseId),
            caseName: caseName,
            totalAmount: 0,
          };
        }
        acc[caseId].totalAmount += amount;
      }
      return acc;
    }, {});

    // 8. تحويل الكائن إلى مصفوفة
    const donations = Object.values(aggregatedDonations);
    console.log("البيانات المجمعة النهائية:", donations);

    return NextResponse.json({ ok: true, donations: donations });
  } catch (e) {
    console.error("[Donations GET] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error while fetching donations" }, { status: 500 });
  }
}

// -------- POST: تسجيل تبرّع جديد --------
// هذا الكود يظل كما هو دون تغيير
export async function POST(req: NextRequest) {
  const trace = `don-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const session = await getServerSession(authOptions);
  const jwt = (session?.user as any)?.wordpressJwt as string | undefined;

  // تم حذف التحقق من وجود JWT في بداية الكود للسماح بالتبرعات من غير المسجلين
  // الآن سيتم التعامل مع التوثيق داخل fetch
  
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    
    // تصحيح: استخدام اسم الحقل donation_amount من الواجهة الأمامية
    // تم التعديل لفحص كلا الحقلين donation_amount و amount لضمان التوافق
    const amount = Number(body.donation_amount ?? body.amount);
    const caseId = Number(body.caseId);
    const stripePaymentIntentId = String(body.stripePaymentIntentId || "");
    let userId = body.userId;

    // إذا كان المستخدم مسجلاً، نستخدم معرّفه من الجلسة
    if (session) {
      userId = (session?.user as any)?.wordpressUserId;
    } else {
      // إذا كان المستخدم غير مسجل، نستخدم القيمة 0
      userId = 0;
    }

    const isMissingAmount = !isFinite(amount) || amount <= 0;
    const isMissingCaseId = !Number.isInteger(caseId) || caseId <= 0;
    
    // تم إزالة التحقق من وجود userId لأن التبرعات غير المسجلة مقبولة الآن
    if (isMissingAmount || isMissingCaseId) {
      return json(
        {
          error: "Missing required fields",
          details: { isMissingAmount, isMissingCaseId },
          // تصحيح: إظهار القيمة الصحيحة في رسالة الخطأ
          got: { amount: body.donation_amount ?? body.amount, caseId: body.caseId, stripePaymentIntentId, userId },
          trace,
        },
        400
      );
    }
    
    // استخدام المسار الخاص لتسجيل التبرع
    const endpoint = `${WP_BASE}/sanad/v1/record-donation`;
    
    // البيانات المطلوبة من قبل المسار الخاص
    const wpPayload = {
      userId: Number(userId),
      // تصحيح: استخدام اسم الحقل الصحيح من ملف ACF
      case_id: caseId,
      // تصحيح: استخدام اسم الحقل الصحيح من ملف ACF
      donation_amount: amount,
      status: "مكتمل", // يتم تعيين هذه الحالة من قبل الواجهة الخلفية
      payment_method: "Stripe",
      transaction_id: stripePaymentIntentId,
    };
    
    // إعداد الهيدر مع توثيق JWT (إذا كان متاحاً)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Trace-Id": trace,
    };
    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }

    const wpRes = await fetch(endpoint, {
      method: "POST",
      headers: headers, // استخدام الهيدر المحدث
      body: JSON.stringify(wpPayload),
      cache: "no-store",
    });

    const wpText = await wpRes.text();
    let wpData: any;
    try { wpData = JSON.parse(wpText); } catch { wpData = { raw: wpText }; }

    if (!wpRes.ok) {
      return json(
        {
          error: wpData?.message || wpData?.error || `WordPress ${wpRes.status}`,
          wordpressStatus: wpRes.status,
          sent: wpPayload,
          received: wpData,
          trace,
        },
        502
      );
    }

    const successFlag = wpData?.success ?? true;
    if (!successFlag) {
      return json(
        {
          error: "WordPress did not confirm success",
          wordpressStatus: wpRes.status,
          sent: wpPayload,
          received: wpData,
          trace,
        },
        502
      );
    }

    return json({ ok: true, result: wpData, trace }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Unknown server error", trace }, 500);
  }
}
