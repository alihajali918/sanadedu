// src/app/cases/[id]/layout.tsx
// هذا الملف هو Server Component بشكل افتراضي (لأنه لا يحتوي على 'use client')
// وهو المكان الصحيح لـ generateStaticParams() ضمن المسار الديناميكي
// ولا يجب أن يصدر أي بيانات عادية مثل allDummyCases.

// استيراد البيانات الوهمية (allDummyCases) والأنواع من الملف المشترك shared-data.ts
// ⚠️ المسار النسبي الصحيح هنا: `../../shared-data`
// لأنك ترجع مجلدين للأعلى (من [id] إلى cases، ثم من cases إلى app)
import { allDummyCases, type CaseItem } from '../shared-data'; 

// دالة generateStaticParams - مكانها الصحيح هنا داخل layout.tsx
// Next.js سيكتشفها ويستخدمها لبناء المسارات الثابتة
export async function generateStaticParams() {
    return allDummyCases.map((caseItem: CaseItem) => ({
        id: caseItem.id.toString(), // تحويل الـ ID إلى سلسلة نصية
    }));
}

// مكون الـ Layout الفعلي
// هذا المكون سيستقبل 'children' وهي صفحة [id]/page.tsx
export default function CaseIdLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children} {/* هنا سيتم عرض محتوى page.tsx */}
    </>
  );
}