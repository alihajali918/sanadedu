import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "lib/auth"; // يجب أن يكون مسار ملف authOptions صحيحاً

export const dynamic = "force-dynamic";

// --- Type Definitions for API Response ---

// تعريف هيكل العنصر المتبرع به (قد يحتوي على caseId أو case_id)
interface WpDonatedItem {
  case_id?: number | string;
  caseId?: number | string;
  case_name?: string;
  caseName?: string;
}

// تعريف هيكل استجابة التبرع الفردي من WordPress
interface WpDonationResponse {
  id: number | string;
  date: string;
  donorId: number | string;
  totalPaidAmount: number | string;
  currency: string;
  status: string; // الحالة بالإنجليزية
  transactionId?: string;
  paymentMethod?: string;
  donatedItems: WpDonatedItem[];
}

// تعريف هيكل البيانات النهائية التي ستُرسل إلى الواجهة الأمامية
interface FormattedDonation {
  id: string;
  caseId: string;
  caseName: string;
  amount: number;
  status: string; // الحالة بالعربية
  date: string;
  currency: string;
}

// --- Configuration ---

// ✅ بناء أساس WP مرة واحدة (مع التأكد من إزالة الشرطة المائلة الأخيرة)
const WP_API_BASE =
  (process.env.WP_API_BASE || process.env.NEXT_PUBLIC_WORDPRESS_API_URL)?.replace(/\/$/, "") ||
  "";

const WP_JSON = WP_API_BASE
  ? (WP_API_BASE.endsWith("/wp-json") ? WP_API_BASE : `${WP_API_BASE}/wp-json`)
  : "";

// 🔗 endpoint الصحيح من البلغ-إن
const SANAD_MY_DONATIONS = WP_JSON ? `${WP_JSON}/sanad/v1/my-donations` : "";

// تحويل حالة إنجليزية إلى عربية
const statusMap: Record<string, string> = {
  completed: "مكتمل",
  pending: "قيد الانتظار",
  processing: "قيد التنفيذ",
  cancelled: "ملغي",
  failed: "فشل",
};

// --- API Handler ---

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
      console.error("Configuration Error: SANAD_MY_DONATIONS endpoint is not set.");
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
      // استخدام no-store لضمان عدم تخزين الاستجابة مؤقتاً
      cache: "no-store",
      // تعيين مهلة 10 ثوانٍ لمنع الحظر الدائم
      signal: AbortSignal.timeout(10000), 
    });

    if (!wpRes.ok) {
      const raw = await wpRes.text();
      let msg = `WP API Error (${wpRes.status}).`;
      try {
        const j = JSON.parse(raw);
        // محاولة استخراج رسالة خطأ أكثر وضوحاً من استجابة WP
        msg = j?.message || j?.error || msg;
      } catch (e) {
        // لا شيء، نستخدم رسالة الخطأ الافتراضية
      }
      return NextResponse.json({ ok: false, error: msg }, { status: wpRes.status });
    }

    // افتراض أن الاستجابة هي مصفوفة من WpDonationResponse
    const list: WpDonationResponse[] = (await wpRes.json()) || [];
    if (!Array.isArray(list)) {
        // إذا لم تكن مصفوفة، نعود بمصفوفة فارغة
        return NextResponse.json({ ok: true, donations: [] }, { status: 200 });
    }

    // 4) تحويل شكل الاستجابة إلى ما تتوقعه الواجهة (FormattedDonation)
    const formatted: FormattedDonation[] = list.map((d) => {
      // تحويل الحالة الإنجليزية إلى العربية، والافتراض "مكتمل" إذا لم يتم العثور على تطابق
      const arabicStatus =
        statusMap[(String(d.status) || "").toLowerCase()] || String(d.status) || "مكتمل";

      // نختار اسم/معرّف الحالة من أول عنصر ضمن donatedItems (لو متاح)
      const firstItem: WpDonatedItem | null = Array.isArray(d.donatedItems) && d.donatedItems.length > 0
        ? d.donatedItems[0]
        : null;

      // استخلاص Case ID واسمه
      const caseId =
        String(firstItem?.case_id ?? firstItem?.caseId ?? "N/A"); // استخدام "N/A" أو ما شابه لـ "غير معروف"
      const caseName =
        String(firstItem?.case_name ?? firstItem?.caseName ?? "تبرع عام");

      return {
        id: String(d.id),
        caseId,
        caseName,
        // التأكد من أن المبلغ رقمي
        amount: Number(d.totalPaidAmount || 0), 
        status: arabicStatus,
        date: String(d.date),
        currency: String(d.currency || "QAR"),
      };
    });

    return NextResponse.json({ ok: true, donations: formatted }, { status: 200 });
  } catch (err: any) {
    // التعامل مع الأخطاء العامة وأخطاء المهلة
    const msg =
      err?.name === "TimeoutError" ? "Timeout: The external API took too long to respond." : err?.message || "Internal Server error.";
    console.error("Donations API (sanad/v1/my-donations) error:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
