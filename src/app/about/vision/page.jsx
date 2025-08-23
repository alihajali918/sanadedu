// ==========================================================
// ملف: page.tsx لصفحة "رؤيتنا" (النسخة النهائية)
// ==========================================================

"use client";

import React from 'react';
import styles from './VisionPage.module.css';

const VisionPage = () => {
  return (
    <main className={styles.visionPageContent}>
      <div className="container">
        <h1 className={styles.pageTitle}>رؤيتنا</h1>
        
        <div className={styles.grid}>

          {/* العمود الأول: الأيقونة */}
          <div className={`${styles.visionIconContainer} ${styles.orderIcon}`}>
            <i className="fa-solid fa-stairs"></i> {/* تم تعديل الأيقونة هنا */}
          </div>

          {/* العمود الثاني: النص */}
          <div className={`${styles.visionText} ${styles.orderText}`}>
            <p>
              نطمح في "سند" إلى بناء منصة وطنية شاملة لتوثيق احتياجات المدارس والمراكز التعليمية في سوريا، بشكل يجعل كل حالة مرئية، كل حاجة واضحة، وكل تبرع مراقب وموثّق.
            </p>
            <p>
              نؤمن أن التعليم في سوريا يحتاج إلى:
            </p>
            
            {/* تم تحويل القائمة النقطية إلى قائمة HTML */}
            <ul className={styles.visionList}>
              <li>دعم مباشر وفعّال للمؤسسات التعليمية المتضررة</li>
              <li>توثيق ميداني شفاف لحالات المدارس، وتحديد احتياجاتها بدقة</li>
              <li>ربط المتبرعين خارج سوريا باحتياجات الداخل بطريقة موثوقة ومباشرة</li>
              <li>تحريك المجتمع نحو التطوع والدعم المنظم للعملية التعليمية</li>
            </ul>

            <p>
              هدفنا إحياء وتحسين جودة المدارس القائمة وتحسين واقعها لتكون بيئة آمنة ومحترمة للطالب والمعلم.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
};

export default VisionPage;