import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import RequestForm from "../RequestForm";

// ✅ الحل النهائي: نقوم بتعريف نوع الخصائص بشكل مباشر داخل المكون
// هذا التعريف يتجاوز أي تضارب محتمل مع أنواع Next.js الداخلية
// ويضمن أن الكود سيعمل بشكل صحيح.
export default async function RequestNeedPage({
  params,
}: {
  params: {
    caseId: string;
  };
}) {
  const caseId = parseInt(params.caseId, 10);

  if (isNaN(caseId)) {
    notFound();
  }

  const caseItem = await getCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return <RequestForm caseItem={caseItem} caseId={params.caseId} />;
}