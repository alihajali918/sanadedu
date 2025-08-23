"use client";

import React from 'react';
import Image from 'next/image';
import styles from './About.module.css'; // ١. استيراد الموديول

const AboutPage = () => {
  return (
    // لا تحتاج كلاس للمحتوى الرئيسي إلا إذا أردت تنسيقه
    <main>
      {/* يمكنك ترك كلاسات الهيرو عامة في globals.css إذا كانت مشتركة */}
      <section className="pageHeroSection" style={{ backgroundImage: "url('/images/about-hero-bg.jpg')" }}>
        <div className="container">
          <h1 className="pageHeroTitle">من نحن</h1>
        </div>
      </section>

      {/* ٢. تطبيق الأنماط باستخدام الكائن styles */}
      <section id="aboutSanadSection" className={styles.aboutSection}>
        <div className={`${styles.grid} container`}> {/* دمج كلاس الموديول مع كلاس عام */}
          <div className={`${styles.imageContainer} ${styles.orderImage}`}>
            <Image src="/images/about-sanad-image.jpg" alt="صورة عن سند" width={600} height={400} className={styles.responsiveImage} />
          </div>
          <div className={`${styles.textContent} ${styles.orderText}`}>
          <h2 /* لم نعد نحتاج كلاس هنا لأن الاختيار يتم من الأعلى */>من هي &quot;سند&quot;؟</h2>
          <p>
              &quot;سند&quot; هي جمعية أهلية تعليمية غير ربحية, مرخصة رسميا في الجمهورية العربية السورية, ومسجلة ولها تواجد إداري وفني في المملكة المتحدة.
          </p>
          <p>
              تسعى الجمعية إلى دعم المؤسسات التعليمية المتضررة والمهمشة في سوريا من خلال توثيق احتياجات المدارس ميدانيا بالصوت والصورة, ثم عرض هذه الاحتياجات بشفافية تامة عبر منصة إلكترونية, ليتمكن المتبرعون من تغطيتها مباشرة.
          </p>
          <p>
              تركز &quot;سند&quot; على المدارس التي تعاني من تدهور في البنية التحتية أو نقص حاد في التجهيزات الأساسية (مثل المقاعد, السبورات, الأبواب, التدفئة, وغيرها).
          </p>
          <p>
              التميز في عمل الجمعية يقوم على الدقة في التوثيق, وتخصيص التبرع لمنتجات واضحة, وسرعة التنفيذ والمتابعة.
          </p>
          <p>
              تؤمن الجمعية أن التعليم هو حجر الأساس لبناء المجتمعات, وأن تحسين بيئته في الداخل السوري مسؤولية جماعية تبدأ من مبادرات حقيقية ومستقلة.
          </p>
      </div>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;