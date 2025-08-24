"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';
import { useAuth } from '@/app/context/AuthContext';

// تحديد متغير البيئة لعنوان الـ API
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const VerifyEmailPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState('جارٍ التحقق من بريدك الإلكتروني...');
  const [isSuccess, setIsSuccess] = useState(false);
  const { login } = useAuth();
  const [username, setUsername] = useState<string | null>(null); // هذا يمثل 'user_login' من الـ URL

  useEffect(() => {
    const key = searchParams.get('key');
    const userFromUrl = searchParams.get('user'); // استخدم اسم متغير مختلف لتجنب الالتباس

    setUsername(userFromUrl); // قم بتحديث حالة اسم المستخدم من الـ URL

    if (!key || !userFromUrl) {
      setVerificationStatus('رمز التحقق أو اسم المستخدم مفقود. يرجى التأكد من أن الرابط صحيح.');
      setIsSuccess(false);
      return;
    }

    const verifyEmail = async () => {
      if (!WORDPRESS_API_ROOT) {
        setVerificationStatus('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
        setIsSuccess(false);
        console.error('Environment variable NEXT_PUBLIC_WORDPRESS_API_ROOT is not set.');
        return;
      }

      try {
        const wpVerifyApiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/verify-email`;

        const response = await fetch(wpVerifyApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, user: userFromUrl }),
        });

        const data = await response.json();
        // يمكنك طباعة الـ data هنا للتحقق من الاستجابة
        // console.log('API Response Data:', data);

        if (response.ok && data.token) {
          const userLocale = data.user_locale || 'en-US';
          // === التعديل هنا: استخدام data.user_email بدلاً من username ===
          login(data.token, data.user_display_name, data.user_email, userLocale);

          setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! أنت الآن مسجل دخول.');
          setIsSuccess(true);
          
          setTimeout(() => {
            router.push('/donor/dashboard');
          }, 2000);
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
  }, [searchParams, router, login]); // لا تحتاج لإضافة username إلى مصفوفة التبعيات هنا

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
