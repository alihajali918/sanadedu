"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Import the Link component
import styles from '../login/login.module.css'; // Reusing login/signup styles

// تحديد متغير البيئة لعنوان الـ API
// يجب التأكد أن هذا المتغير متاح في ملف .env.local وعلى Vercel
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const VerifyEmailPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState('جارٍ التحقق من بريدك الإلكتروني...');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // استخراج 'key' و 'user' من معلمات URL
    const key = searchParams.get('key');
    const username = searchParams.get('user');

    if (!key || !username) {
      setVerificationStatus('رمز التحقق أو اسم المستخدم مفقود. يرجى التأكد من أن الرابط صحيح.');
      setIsSuccess(false);
      return;
    }

    const verifyEmail = async () => {
      // التحقق من وجود متغير البيئة
      if (!WORDPRESS_API_ROOT) {
        setVerificationStatus('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
        setIsSuccess(false);
        console.error('Environment variable NEXT_PUBLIC_WORDPRESS_API_ROOT is not set.');
        return;
      }

      try {
        const wpVerifyApiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/verify-email`;

        const response = await fetch(wpVerifyApiUrl, {
          method: 'POST', // التأكد من استخدام POST
          headers: {
            'Content-Type': 'application/json',
          },
          // إرسال 'key' و 'user' في جسم الطلب
          body: JSON.stringify({ key, user: username }), 
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.');
          setIsSuccess(true);
          // إعادة التوجيه إلى صفحة تسجيل الدخول بعد تأخير قصير
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        } else {
          setVerificationStatus(data.message || 'فشل تفعيل الحساب. يرجى المحاولة لاحقاً أو التواصل مع الدعم.');
          setIsSuccess(false);
        }
      } catch (error) {
        setVerificationStatus('حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
        setIsSuccess(false);
        console.error('Email verification API call error:', error);
      }
    };

    verifyEmail();
  }, [searchParams, router]); // Re-run effect if searchParams or router changes

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>تفعيل البريد الإلكتروني</h2>
        <p className={isSuccess ? styles.successMessage : styles.errorMessage}>
          {verificationStatus}
        </p>
        {!isSuccess && (
          <p className={styles.authSwitch}>
            <Link href="/auth/signup">العودة إلى صفحة التسجيل</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
