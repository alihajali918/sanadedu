import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import RequestForm from "../RequestForm";

// قم بإضافة هذا التعليق لتجاهل خطأ النوع في Next.js
// @ts-ignore
export default async function RequestNeedPage({ params }) {
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