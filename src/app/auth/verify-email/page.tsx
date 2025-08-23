// ==========================================================
// FILE: src/app/(auth)/verify-email/page.tsx
// DESCRIPTION: Page to handle email verification process.
// Extracts token from URL and calls WordPress API.
// ==========================================================

"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Import the Link component
import styles from '../login/login.module.css'; // Reusing login/signup styles

const VerifyEmailPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState('جارٍ التحقق من بريدك الإلكتروني...');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token'); // Get the token from the URL query parameters

    if (!token) {
      setVerificationStatus('رمز التحقق مفقود. يرجى التأكد من أن الرابط صحيح.');
      setIsSuccess(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        // IMPORTANT: This URL must point to your custom WordPress API endpoint for email verification.
        // It uses the 'sanad/v1/verify-email' endpoint from our custom plugin.
        const wpVerifyApiUrl = 'https://sanadedu.org/backend/wp-json/sanad/v1/verify-email';

        const response = await fetch(wpVerifyApiUrl, {
          method: 'POST', // Use POST for security when sending tokens
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }), // Send the token in the request body
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.');
          setIsSuccess(true);
          // Redirect to login page after a short delay
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
