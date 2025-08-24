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
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const key = searchParams.get('key');
    const user = searchParams.get('user');

    setUsername(user);

    if (!key || !user) {
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
          body: JSON.stringify({ key, user: user }),
        });

        const data = await response.json();

        // الشرط الذي يتحقق من وجود رمز المصادقة (token)
        if (response.ok && data.token) {
          // استخدام دالة login من سياق المصادقة لتخزين الرمز
          const userLocale = data.user_locale || 'en-US';
          login(data.token, data.user_display_name, user, userLocale);

          setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! أنت الآن مسجل دخول.');
          setIsSuccess(true);
          
          // التوجيه المباشر إلى لوحة التحكم
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
  }, [searchParams, router, login, username]);

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