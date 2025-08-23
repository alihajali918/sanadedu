// src/app/latest-donors/page.tsx

'use client'; // ضروري إذا أردت استخدام useState أو أي تفاعل من جانب العميل أو جلب بيانات على العميل

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // إذا أردت صوراً رمزية للمتبرعين
import styles from './page.module.css'; // ✨ استيراد الستايلات الخاصة بالصفحة ✨

// بيانات متبرعين وهمية كمثال
const sampleDonors = [
  { id: 'd1', name: 'أحمد المحسن', amount: 500, date: '2024-07-14' },
  { id: 'd2', name: 'عائلة آل كرم', amount: 1200, date: '2024-07-13' },
  { id: 'd3', name: 'مؤسسة العطاء', amount: 3000, date: '2024-07-12' },
  { id: 'd4', name: 'فاطمة الزهراء', amount: 150, date: '2024-07-11' },
  { id: 'd5', name: 'متبرع كريم (مجهول)', amount: 200, date: '2024-07-10' },
  { id: 'd6', name: 'محمد الصادق', amount: 750, date: '2024-07-09' },
  { id: 'd7', name: 'الشركة المتحدة', amount: 5000, date: '2024-07-08' },
  { id: 'd8', name: 'ليلى العبدالله', amount: 90, date: '2024-07-07' },
  // أضف المزيد من المتبرعين
];

const LatestDonorsPage = () => {
  // يمكنك استخدام useState لإدارة عدد المتبرعين المعروضين أو التصفية
  const [displayedDonorsCount, setDisplayedDonorsCount] = useState(5); // عرض أول 5 متبرعين

  const handleLoadMore = () => {
    setDisplayedDonorsCount(prevCount => prevCount + 5); // زيادة عدد المتبرعين بـ 5
  };

  const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
  };

  const formatDonationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' }); // تنسيق التاريخ عربي
  };

  return (
    <div className={styles.donorsContainer}>
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>آخر المتبرعين</h1>
          <p className={styles.pageDescription}>
            نقدم لكم هنا قائمة بآخر المتبرعين الكرام الذين ساهموا في دعم مشاريعنا.
            كل مساهمة هي شكر وتقدير لمشاركتكم العطاء.
          </p>
          {/* يمكنك إضافة صورة رمزية هنا إذا أردت */}
          {/* <Image src="/images/donors-hero.jpg" alt="Latest Donors" width={600} height={400} className={styles.heroImage} priority /> */}
        </div>
      </div>

      <div className={styles.donorsListSection}>
        <div className={styles.container}>
          {sampleDonors.slice(0, displayedDonorsCount).map((donor) => (
            <div key={donor.id} className={styles.donorCard}>
              <div className={styles.donorInfo}>
                <span className={styles.donorName}>{donor.name}</span>
                <span className={styles.donationAmount}>{formatCurrencyWestern(donor.amount)}</span>
              </div>
              <span className={styles.donationDate}>تاريخ التبرع: {formatDonationDate(donor.date)}</span>
            </div>
          ))}

          {displayedDonorsCount < sampleDonors.length && (
            <button onClick={handleLoadMore} className={styles.loadMoreButton}>
              عرض المزيد من المتبرعين <i className="fas fa-arrow-down"></i>
            </button>
          )}
          {displayedDonorsCount >= sampleDonors.length && sampleDonors.length > 0 && (
            <p className={styles.allDonorsLoadedMessage}>
              تم عرض جميع المتبرعين الكرام!
            </p>
          )}
          {sampleDonors.length === 0 && (
              <p className={styles.noDonorsMessage}>
                  لا توجد تبرعات مسجلة حالياً. كن أول المتبرعين!
              </p>
          )}
        </div>
      </div>

      {/* يمكنك إضافة أقسام أخرى هنا مثل:
          - معلومات حول سياسة الخصوصية للمتبرعين
          - شكر خاص للمتبرعين الكبار
      */}
    </div>
  );
};

export default LatestDonorsPage;