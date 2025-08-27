// ==========================================================
// FILE: src/app/(auth)/verify-email/page.tsx
// DESCRIPTION: Email verification page component.
// Handles user email verification with WordPress REST API.
// ==========================================================
"use client"; // Marks this as a Client Component for hooks like useState and useRouter.

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';
import { signIn } from 'next-auth/react'; // <--- استيراد signIn من NextAuth.js

// تحديد متغير البيئة لعنوان الـ API
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const VerifyEmailPage: React.FC = () => {
    console.log('[VerifyEmailPage] Component is rendering.');

    const searchParams = useSearchParams();
    const router = useRouter();
    const [verificationStatus, setVerificationStatus] = useState('جارٍ التحقق من بريدك الإلكتروني...');
    const [isSuccess, setIsSuccess] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        console.log('[VerifyEmailPage] useEffect is running.');
        const key = searchParams.get('key');
        const userFromUrl = searchParams.get('user');

        console.log('[VerifyEmailPage] URL Params - key:', key ? '***key-present***' : '***key-missing***', 'user:', userFromUrl);

        setUsername(userFromUrl);

        if (!key || !userFromUrl) {
            setVerificationStatus('رمز التحقق أو اسم المستخدم مفقود. يرجى التأكد من أن الرابط صحيح.');
            setIsSuccess(false);
            console.error('[VerifyEmailPage] Missing URL parameters: key or user.');
            return;
        }

        const verifyEmail = async () => {
            if (!WORDPRESS_API_ROOT) {
                setVerificationStatus('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
                setIsSuccess(false);
                console.error('[VerifyEmailPage] Environment variable NEXT_PUBLIC_WORDPRESS_API_ROOT is not set.');
                return;
            }

            try {
                const wpVerifyApiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/verify-email`;
                console.log('[VerifyEmailPage] Sending verification request to:', wpVerifyApiUrl);
                console.log('[VerifyEmailPage] Request body:', { key: key ? '***key-present***' : '***key-missing***', user: userFromUrl });

                const response = await fetch(wpVerifyApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ key, user: userFromUrl }),
                });

                const data = await response.json();
                console.log('[VerifyEmailPage] API Response Data:', data);

                if (response.ok && data.token) {
                    console.log('[VerifyEmailPage] Verification successful. Attempting NextAuth signIn with JWT...');
                    const result = await signIn('jwt-token', {
                        redirect: false,
                        token: data.token,
                        user_id: data.user_id,
                        user_display_name: data.user_display_name,
                        user_email: data.user_email,
                        user_locale: data.user_locale || 'en-US',
                    });

                    if (result?.error) {
                        console.error('[VerifyEmailPage] NextAuth signIn failed after verification:', result.error);
                        setVerificationStatus('تم تفعيل حسابك، ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
                        setIsSuccess(true);
                        // إعادة التوجيه إلى صفحة تسجيل الدخول إذا فشل signIn التلقائي
                        router.push('/auth/login'); // <--- تم إزالة setTimeout
                    } else {
                        console.log('[VerifyEmailPage] NextAuth signIn successful. Preparing for redirection...');
                        setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! أنت الآن مسجل دخول.');
                        setIsSuccess(true);
                        // إعادة التوجيه مباشرة إلى الداشبورد
                        router.push('/donor/dashboard'); // <--- تم إزالة setTimeout
                    }
                } else {
                    console.error('[VerifyEmailPage] Verification failed:', data.message);
                    setVerificationStatus(data.message || 'فشل تفعيل الحساب. يرجى المحاولة لاحقاً أو التواصل مع الدعم.');
                    setIsSuccess(false);
                }
            } catch (error) {
                setVerificationStatus('حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
                setIsSuccess(false);
                console.error('[VerifyEmailPage] Email verification API call error:', error);
            }
        };

        verifyEmail();
    }, [searchParams, router]);

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
