// ==========================================================
// FILE: src/app/(auth)/check-email/page.tsx
// DESCRIPTION: Page informing user to check their email for verification.
// ==========================================================

"use client";

import Link from 'next/link';
import React from 'react';
import styles from '../login/login.module.css'; // Reusing login/signup styles for consistency

const CheckEmailPage: React.FC = () => {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>تحقق من بريدك الإلكتروني</h2>
        <p className={styles.successMessage}>
          لقد تم إنشاء حسابك بنجاح!
          <br />
          يرجى التحقق من صندوق الوارد في بريدك الإلكتروني (وربما مجلد الرسائل غير المرغوب فيها)
          للعثور على رابط تفعيل حسابك.
        </p>
        <p className={styles.authSwitch}>
          <Link href="/auth/login">العودة إلى صفحة تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
};

export default CheckEmailPage;
