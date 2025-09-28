// src/app/cases/[id]/page.tsx
import { notFound } from "next/navigation";
import { getCaseById } from "lib/api";
import CaseDetailsContent from "../components/CaseDetailsContent";

interface DynamicPageProps {
  // ✅ في Next.js 15، params هو Promise
  params: Promise<{
    id: string;
  }>;
  // إذا كنت تستخدم searchParams في هذه الصفحة، يجب أن يكون وعدًا أيضًا:
  // searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CaseDetailsPage = async ({ params }: DynamicPageProps) => {
  // ✅ يجب استخدام await على params للحصول على القيمة الفعلية
  const resolvedParams = await params;
  const { id } = resolvedParams; // الآن id موجود على الكائن المحلول

  const caseId = Number(id);

  if (isNaN(caseId)) {
    console.error(`Invalid case ID received: ${id}`);
    notFound();
  }

  let caseItem;
  try {
    caseItem = await getCaseById(caseId);
  } catch (error) {
    // 📝 معالجة أخطاء جلب البيانات، مثل مشاكل الشبكة أو أخطاء الخادم
    console.error(`Failed to fetch case with ID ${caseId}:`, error);
    notFound(); // يمكن عرض صفحة خطأ مخصصة هنا بدلاً من 404
  }

  if (!caseItem) {
    // 📝 إذا لم يتم العثور على الحالة بعد الجلب الناجح
    notFound();
  }

  return <CaseDetailsContent caseItem={caseItem} />;
};

export default CaseDetailsPage;
