// globals.d.ts
// هذا الملف يوسّع واجهة Window العامة لتضمين الخصائص المخصصة.

interface Window {
  /**
   * معرف مؤقت لتأخير أحداث تغيير حجم النافذة المتعلقة بعلامات الخريطة.
   * يمكن أن يكون معرف setTimeout، أو undefined إذا لم يتم تعيينه.
   */
  mapResizeTimer: ReturnType<typeof setTimeout> | undefined;
}