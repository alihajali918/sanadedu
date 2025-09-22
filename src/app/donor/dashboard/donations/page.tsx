import React from 'react';
import Link from 'next/link';
import { getDonations, Donation } from 'lib/api';
import styles from './donations.module.css';

// استيراد دالة المصادقة الصحيحة التي تعمل على جهة الخادم
import { auth } from '@/auth'; // إذا كنت تستخدم App Router

const DonationsPage = async () => {
  let donations: Donation[] = [];
  let error = null;

  try {
    // استخدام دالة auth() لجلب الجلسة الحقيقية من الخادم
    const session = await auth();
    // استخدام wordpressUserId بدلاً من id لضمان جلب البيانات الصحيحة من API
    const userId = session?.user?.wordpressUserId;

    if (!userId) {
      error = 'يجب تسجيل الدخول لعرض التبرعات.';
    } else {
      const fetchedDonations = await getDonations(userId);
      if (Array.isArray(fetchedDonations)) {
        donations = fetchedDonations;
      } else {
        error = 'البيانات المستلمة غير صالحة.';
      }
    }
  } catch (err) {
    console.error('Failed to fetch donations:', err);
    error = 'حدث خطأ أثناء تحميل التبرعات. يرجى المحاولة لاحقاً.';
  }

  // كائن لربط حالة التبرع بالصنف المناسب في CSS
  const statusClasses: { [key: string]: string } = {
    pending: styles.pending,
    completed: styles.completed,
    processing: styles.processing,
    refunded: styles.refunded,
  };

  // كائن لربط حالة التبرع بالنص العربي الذي سيتم عرضه للمستخدم
  const statusText: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    completed: 'مكتمل',
    processing: 'قيد التنفيذ',
    refunded: 'مسترد',
  };

  return (
    <div className={styles.donationsContent}>
      <h1 className={styles.donationsTitle}>تبرعاتي</h1>
      <p className={styles.donationsDescription}>
        هنا يمكنك مراجعة جميع التبرعات التي قمت بها سابقاً، وتتبع حالتها.
      </p>

      {error ? (
        <p className={styles.errorMessage}>{error}</p>
      ) : donations.length === 0 ? (
        <p className={styles.noDonationsMessage}>
          لم تقم بأي تبرعات حتى الآن. ابدأ بتصفح الحالات لدعم قضايانا!
          <Link href="/cases" className={styles.browseCasesLink}>تصفح الحالات</Link>
        </p>
      ) : (
        <div className={styles.donationsList}>
          {donations.map((donation) => (
            <div key={donation.id} className={styles.donationCard}>
              <div className={styles.donationHeader}>
                <h3>{donation.caseName}</h3>
                <span className={`${styles.statusBadge} ${statusClasses[donation.status]}`}>
                  {statusText[donation.status]}
                </span>
              </div>
              <div className={styles.donationDetails}>
                <p><strong>التاريخ:</strong> {donation.date}</p>
                <p><strong>المبلغ:</strong> {donation.amount} {donation.currency}</p>
              </div>
              <div className={styles.donationActions}>
                <Link href={donation.detailsLink} className={styles.viewDetailsBtn}>
                  عرض تفاصيل الحالة
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationsPage;