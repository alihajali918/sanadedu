// ==========================================================
// FILE: src/app/(auth)/forgot-password/page.tsx
// DESCRIPTION: Page for requesting a password reset link.
// ==========================================================

"use client";

import Link from 'next/link';
import React, { useState } from 'react';
import styles from '../login/login.module.css'; // Reusing login/signup styles for consistency

// تحديد متغير البيئة لعنوان الـ API
// يجب التأكد أن هذا المتغير متاح في ملف .env.local وعلى Vercel
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);
    setIsLoading(true);

    // التحقق من وجود متغير البيئة
    if (!WORDPRESS_API_ROOT) {
      setMessage('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
      setIsError(true);
      setIsLoading(false);
      console.error('Environment variable NEXT_PUBLIC_WORDPRESS_API_ROOT is not set.');
      return;
    }

    try {
      // تم تحديث هذا السطر لاستخدام متغير البيئة بدلاً من الرابط الثابت
      const wpForgotPasswordApiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/forgot-password`;

      const response = await fetch(wpForgotPasswordApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'إذا كان بريدك الإلكتروني مسجلاً لدينا، فستتلقى رابط إعادة تعيين كلمة المرور.');
        setIsError(false);
      } else {
        setMessage(data.message || 'حدث خطأ أثناء طلب إعادة تعيين كلمة المرور. يرجى المحاولة لاحقاً.');
        setIsError(true);
      }
    } catch (error) {
      setMessage('حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
      setIsError(true);
      console.error('Forgot password API call error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>نسيت كلمة المرور؟</h2>
        <p className="text-gray-600 mb-6">
          أدخل بريدك الإلكتروني أدناه وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
        </p>

        {message && (
          <div className={isError ? styles.errorMessage : styles.successMessage}>
            {message}
          </div>
        )}
        
        <form className={styles.authForm} onSubmit={handleForgotPassword}>
          <div className={styles.formGroup}>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="أدخل بريدك الإلكتروني" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={isLoading}
            >
              {isLoading ? 'جارٍ الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
          </div>
        </form>
        <p className={styles.authSwitch}>
          <Link href="/auth/login">العودة إلى تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
