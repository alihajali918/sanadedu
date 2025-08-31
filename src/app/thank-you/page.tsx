// src/app/thank-you/page.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css'; // ⭐ استيراد ملف الأنماط

const ThankYouPage = () => {
  return (
    <div className={styles.thankYouPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>✅ شكراً لك على تبرعك!</h1>
        <p className={styles.message}>
          تمت عملية الدفع بنجاح. سنرسل إليك تأكيداً عبر البريد الإلكتروني قريباً.
        </p>
        <Link href="/cases" className={styles.returnButton}>
          العودة إلى الحالات
        </Link>
      </div>
    </div>
  );
};

export default ThankYouPage;