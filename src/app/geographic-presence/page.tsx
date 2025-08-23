// src/app/geographic-presence/page.tsx
"use client"; // هذا السطر ضروري لأننا نستخدم حالة (state) وتفاعلات (interactions)

import React, { useState } from 'react'; // استيراد React و useState
import SyriaMap from './syriaSvg'; // استيراد مكون الخريطة SVG
import styles from './page.module.css'; // استيراد الـ CSS Module

// المكون الرئيسي للصفحة
const GeographicPresencePage: React.FC = () => {
  // تعريف حالة (state) لتخزين اسم المحافظة المختارة
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);

  // دالة لمعالجة النقر على المحافظة
  const handleGovernorateClick = (govId: string, govName: string) => {
    console.log(`تم النقر على المحافظة: ${govName} (ID: ${govId})`);
    setSelectedGovernorate(govName); // تحديث الحالة باسم المحافظة
    // يمكنك هنا إضافة أي منطق آخر تريده، مثل:
    // - توجيه المستخدم لصفحة تفاصيل المحافظة
    // - عرض معلومات إضافية عن المحافظة
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>الوجود الجغرافي في سوريا</h1>
      

      <SyriaMap/>


      {selectedGovernorate && (
        <p className={styles.selectedGovernorate}>
          المحافظة المختارة: <strong>{selectedGovernorate}</strong>
        </p>
      )}
    </div>
  );
};
export default SyriaMap; // تصدير المكون لكي يستخدمه Next.js