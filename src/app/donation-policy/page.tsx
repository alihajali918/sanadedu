// src/app/donation-policy/page.tsx

import React from 'react';
import styles from './DonationPolicyPage.module.css';
import Link from 'next/link';

const DonationPolicyPage = () => {
  return (
    <main className={styles.policyPage}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>سياسة التبرعات لمشروع سند</h1>
        
        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>المقدمة</h2>
          <p>
            مشروع سند هو مبادرة تعليمية إنسانية تعمل على توثيق وعرض احتياجات المؤسسات التعليمية في سوريا (مدارس، معاهد، مراکز تعليم مجتمعي ...)، وتسهيل دعمها مباشرة من خلال منصة إلكترونية شفافة وموثقة.
          </p>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>إدارة التبرعات واستلام الأموال</h2>
          <p>
            يتم استقبال جميع التبرعات المالية من مختلف دول العالم عبر الحساب البنكي الرسمي التابع لجمعية سند في بريطانيا، وذلك لضمان الامتثال القانوني الكامل وتوثيق الأموال.
          </p>
          <p>
            جمعية سند تضمن أن جميع التبرعات المخصصة لمشروع دعم المؤسسات تحفظ وتستخدم فقط لهذا المشروع، ولا تصرف لأي نشاط آخر.
          </p>
          <p>
            بعد استقبال الأموال، يتم تحويلها بشكل قانوني وآمن إلى الداخل السوري لشراء المستلزمات التعليمية وتغطية الاحتياجات المحددة.
          </p>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>رسوم التحويل والفرق في الأسعار</h2>
          <p>
            نظرا لأن التبرعات تمر عبر قنوات بنكية دولية، قد تخصم رسوم تحويل بنسبة تقريبية (10%) تختلف حسب الدولة والمبلغ والبنك.
          </p>
          <p>
            لذلك، قد يظهر سعر المنتج أو الخدمة على الموقع شاملاً هذه النسبة لضمان إيصال الدعم كاملاً إلى الداخل السوري.
          </p>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>التبرع للكادر الميداني والتشغيلي</h2>
          <p>
            بالإضافة إلى دعم المدارس والمعاهد، يمكن للمتبرع اختياريًا تخصيص مبلغ لدعم:
          </p>
          <ul className={styles.supportList}>
            <li><i className="fas fa-users"></i> فرق التوثيق الميداني</li>
            <li><i className="fas fa-truck"></i> النقل والتوصيل</li>
            <li><i className="fas fa-file-video"></i> تجهيز التقارير والفيديوهات</li>
          </ul>
          <p>
            هذا الدعم يُساعد على استمرارية المشروع، ويُنفذ بشكل شفاف دون أن يُخصم تلقائيًا من تبرعات الحالات التعليمية.
          </p>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>التوثيق والمتابعة</h2>
          <p>
            يلتزم مشروع سند بتوثيق جميع الحالات المدعومة بالصور والفيديوهات الميدانية، ورفعها على المنصة بعد مراجعتها والموافقة عليها. يمكن للمتبرع مراجعة الحالة التي دعمها ومشاهدة نتائج التنفيذ بشكل واضح.
          </p>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>سياسة الإرجاع والاستفسارات</h2>
          <ul className={styles.policyList}>
            <li>لا يمكن استرجاع التبرعات التي تم استخدامها أو تنفيذها ميدانيا.</li>
            <li>في حال وجود خطأ تقني أثناء عملية الدفع، يُرجى التواصل معنا بأسرع وقت.</li>
          </ul>
        </section>

        <section className={`${styles.policySection} ${styles.agreementSection}`}>
          <h2 className={styles.sectionTitle}>الموافقة على السياسة</h2>
          <p>
            بإتمام التبرع عبر منصتنا، يقر المتبرع بأنه اطلع على هذه السياسة، ووافق على ما ورد فيها من تفاصيل تتعلق بإدارة التبرعات، الرسوم، التوثيق، والجهة القانونية المستلمة.
          </p>
        </section>

        <div className={styles.backButtonContainer}>
            <Link href="/donation-basket" className={styles.backButton}>
                العودة إلى سلة التبرعات
            </Link>
        </div>

      </div>
    </main>
  );
};

export default DonationPolicyPage;
