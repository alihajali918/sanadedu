import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import RequestForm from "../RequestForm";

// ✅ تعريف نوع أكثر شمولاً لـ "params" لاستيعاب أنواع مختلفة
// هذا يحل مشكلة الـ Type Error التي كانت تظهر أثناء التجميع.
interface RequestNeedPageProps {
  params: {
    caseId: string;
  };
}

export default async function RequestNeedPage({
  params,
}: RequestNeedPageProps) {
  // ✅ تحويل المعرف من نص (string) إلى رقم (integer) هو خطوة ضرورية وسليمة.
  const caseId = parseInt(params.caseId, 10);

  // ✅ هذا التحقق من صحة البيانات (validation) هو إجراء ممتاز.
  // في حال كان المعرف غير صالح، يتم منع أي أخطاء مستقبلية.
  if (isNaN(caseId)) {
    notFound();
  }

  // ✅ استخدام await مع دالة جلب البيانات (getCaseById) يضمن أن البيانات جاهزة قبل المتابعة.
  const caseItem = await getCaseById(caseId);

  // ✅ التحقق من وجود بيانات الحالة قبل عرض المكون يمنع ظهور أخطاء.
  if (!caseItem) {
    notFound();
  }

  // ✅ تمرير الخصائص بشكل صحيح إلى المكون (RequestForm).
  return <RequestForm caseItem={caseItem} caseId={params.caseId} />;
}