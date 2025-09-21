import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import RequestForm from "../RequestForm";

interface RequestNeedPageProps {
  params: {
    caseId: string;
  };
}

export default async function RequestNeedPage({
  params,
}: RequestNeedPageProps) {
  // تحويل معرف الحالة من نص إلى رقم
  const caseId = parseInt(params.caseId, 10);

  // إذا كان المعرف غير صالح، يتم إرجاع null وتظهر صفحة 404
  if (isNaN(caseId)) {
    notFound();
  }

  // جلب بيانات الحالة من الواجهة البرمجية (API)
  const caseItem = await getCaseById(caseId);

  // إذا لم يتم العثور على الحالة، يتم عرض صفحة 404
  if (!caseItem) {
    notFound();
  }

  // عرض نموذج الطلب مع بيانات الحالة
  return <RequestForm caseItem={caseItem} caseId={params.caseId} />;
}
