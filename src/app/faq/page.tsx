// src/app/faq/page.tsx

'use client'; // ضروري لأننا سنستخدم useState لتفاعل الأكورديون

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css'; // ✨ استيراد الستايلات الخاصة بالصفحة ✨

// بيانات أسئلة شائعة وهمية كمثال
const faqData = [
  {
    id: 1,
    question: 'ما هي منصة سند؟',
    answer: 'منصة سند هي منصة إنسانية تهدف إلى ربط المتبرعين بالمؤسسات التعليمية والدينية المحتاجة في ، لضمان مستقبل أفضل لأجيالنا.'
  },
  {
    id: 2,
    question: 'كيف يمكنني التبرع؟',
    answer: 'يمكنك التبرع عن طريق تصفح الحالات المعروضة في قسم "الحالات" واختيار الحالة التي تود دعمها. ثم أضف مبلغ تبرعك إلى السلة وتابع عملية الدفع الآمنة.'
  },
  {
    id: 3,
    question: 'هل تبرعاتي آمنة؟',
    answer: 'نعم، نستخدم أحدث تقنيات التشفير لضمان أمان معلوماتك الشخصية ومعاملاتك المالية. جميع عمليات الدفع تتم عبر بوابات دفع موثوقة.'
  },
  {
    id: 4,
    question: 'كيف يتم التأكد من وصول تبرعي؟',
    answer: 'نعمل بشفافية تامة مع المؤسسات الموثقة. بعد كل تبرع، نتابع مع المؤسسة المعنية ونقدم لك تحديثات دورية حول كيفية استخدام تبرعك وأثره على أرض الواقع.'
  },
  {
    id: 5,
    question: 'هل يمكنني توثيق مؤسستي لدى سند؟',
    answer: 'بالتأكيد! إذا كنت تمثل مؤسسة تعليمية أو دينية في  وتحتاج إلى دعم، يمكنك تقديم طلب توثيق عبر صفحة "طلب توثيق المؤسسة". سنقوم بمراجعة طلبك والتواصل معك.'
  },
  {
    id: 6,
    question: 'هل يمكنني التبرع بمبالغ صغيرة؟',
    answer: 'نعم، كل تبرع، مهما كان صغيراً، يحدث فرقاً كبيراً. يمكنك التبرع بالمبلغ الذي يناسبك، وكل المساهمات محل تقدير كبير.'
  }
];

const FAQPage = () => {
  // حالة لإدارة السؤال المفتوح (يمكن أن يكون id أو null)
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);

  // وظيفة لتبديل فتح/إغلاق الإجابة
  const toggleQuestion = (id: number) => {
    setOpenQuestionId(openQuestionId === id ? null : id);
  };

  return (
    <div className={styles.faqContainer}>
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>الأسئلة الشائعة</h1>
          <p className={styles.pageDescription}>
            هنا ستجد إجابات على أكثر الأسئلة شيوعاً حول منصة سند وعملية التبرع والمؤسسات المدعومة.
          </p>
        </div>
      </div>

      <div className={styles.faqListSection}>
        <div className={styles.container}>
          {faqData.map((item) => (
            <div key={item.id} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => toggleQuestion(item.id)}
                aria-expanded={openQuestionId === item.id}
              >
                {item.question}
                <span className={`${styles.arrowIcon} ${openQuestionId === item.id ? styles.arrowOpen : ''}`}></span>
              </button>
              {openQuestionId === item.id && (
                <div className={styles.faqAnswer}>
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
          {faqData.length === 0 && (
            <p className={styles.noFaqsMessage}>لا توجد أسئلة شائعة متاحة حالياً.</p>
          )}
        </div>
      </div>

      {/* يمكنك إضافة قسم لتشجيع المستخدمين على التواصل إذا لم يجدوا إجابتهم */}
      <div className={styles.contactPromptSection}>
        <div className={styles.container}>
          <p>إذا لم تجد إجابة لسؤالك، لا تتردد في <Link href="/contact" className={styles.contactLink}>التواصل معنا</Link>.</p>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;