// src/app/cases/request-need/[caseId]/page.tsx
import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import RequestForm from "../RequestForm";

type Params = { caseId: string };

export default async function RequestNeedPage({
  params,
}: {
  // Accept either plain object or Promise, then normalize with Promise.resolve.
  params: Params | Promise<Params>;
}) {
  const { caseId } = await Promise.resolve(params);

  const id = Number.parseInt(caseId, 10);
  if (Number.isNaN(id)) notFound();

  const caseItem = await getCaseById(id);
  if (!caseItem) notFound();

  return <RequestForm caseItem={caseItem} caseId={caseId} />;
}
