// src/app/dashboard/donations/page.tsx
'use client'; // تأكد من إضافة هذا السطر إذا كنت تستخدم React Hooks

import React from 'react';
import Link from 'next/link'; // لاستخدام روابط Next.js
import styles from './donations.module.css'; // استيراد الستايلات الخاصة بالصفحة

// بيانات وهمية للتبرعات (سيتم استبدالها ببيانات حقيقية من API لاحقاً)
const dummyDonations = [
  {
    id: 'd001',
    date: '2025-07-10',
    caseName: 'تجديد فصول مدرسة الأمل',
    amount: '150.00',
    currency: 'USD',
    status: 'مكتمل',
    detailsLink: '/cases/123' // رابط تفاصيل الحالة في الموقع العام
  },
  {
    id: 'd002',
    date: '2025-06-25',
    caseName: 'توفير كتب لمكتبة جامع النور',
    amount: '75.00',
    currency: 'USD',
    status: 'مكتمل',
    detailsLink: '/cases/456'
  },
  {
    id: 'd003',
    date: '2025-05-18',
    caseName: 'دعم كادر الأيتام في درعا',
    amount: '100.00',
    currency: 'USD',
    status: 'مكتمل',
    detailsLink: '/support-staff' // مثال لرابط لصفحة "ادعم الكادر"
  },
  {
    id: 'd004',
    date: '2025-04-01',
    caseName: 'ترميم سقف معهد الفارابي',
    amount: '200.00',
    currency: 'USD',
    status: 'قيد التنفيذ',
    detailsLink: '/cases/789'
  },
  {
    id: 'd005',
    date: '2025-03-05',
    caseName: 'تبرع عام لمشاريع سند',
    amount: '50.00',
    currency: 'USD',
    status: 'مكتمل',
    detailsLink: '/about' // مثال لرابط عام
  },
];

const DonationsPage: React.FC = () => {
  return (
    <div className={styles.donationsContent}>
      <h1 className={styles.donationsTitle}>تبرعاتي</h1>
      <p className={styles.donationsDescription}>
        هنا يمكنك مراجعة جميع التبرعات التي قمت بها سابقاً، وتتبع حالتها.
      </p>

      {dummyDonations.length === 0 ? (
        // رسالة تظهر إذا لم يكن هناك تبرعات
        <p className={styles.noDonationsMessage}>
          لم تقم بأي تبرعات حتى الآن. ابدأ بتصفح الحالات لدعم قضايانا!
          <Link href="/cases" className={styles.browseCasesLink}>تصفح الحالات</Link>
        </p>
      ) : (
        // قائمة التبرعات
        <div className={styles.donationsList}>
          {dummyDonations.map((donation) => (
            <div key={donation.id} className={styles.donationCard}>
              <div className={styles.donationHeader}>
                <h3>{donation.caseName}</h3>
                {/* شارة حالة التبرع */}
                <span className={`${styles.statusBadge} ${styles[donation.status.replace(/\s/g, '')]}`}>
                  {donation.status}
                </span>
              </div>
              <div className={styles.donationDetails}>
                <p><strong>التاريخ:</strong> {donation.date}</p>
                <p><strong>المبلغ:</strong> {donation.amount} {donation.currency}</p>
              </div>
              <div className={styles.donationActions}>
                {/* زر لعرض تفاصيل الحالة المرتبطة بالتبرع */}
                <Link href={donation.detailsLink} className={styles.viewDetailsBtn}>
                  عرض تفاصيل الحالة
                </Link>
                {/* يمكن إضافة زر "أعد التبرع" هنا لاحقاً */}
                {/* <button className={styles.reDonateBtn}>أعد التبرع</button> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationsPage;