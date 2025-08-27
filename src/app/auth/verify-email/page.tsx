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
import { signIn } from 'next-auth/react'; // <--- جديد: استيراد signIn من NextAuth.js بدلاً من useAuth

// تحديد متغير البيئة لعنوان الـ API
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const VerifyEmailPage: React.FC = () => {
    // === رسالة تصحيح جديدة هنا ===
    console.log('[VerifyEmailPage] Component is rendering.');

    const searchParams = useSearchParams();
    const router = useRouter();
    const [verificationStatus, setVerificationStatus] = useState('جارٍ التحقق من بريدك الإلكتروني...');
    const [isSuccess, setIsSuccess] = useState(false);
    // const { login } = useAuth(); // <--- تم الإزالة: لم نعد نستخدم useAuth
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        console.log('[VerifyEmailPage] useEffect is running.'); // رسالة تصحيح إضافية داخل useEffect
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
                    // **********************************************
                    // التعديل هنا: استخدام signIn من NextAuth.js بعد التحقق
                    // هذا سيقوم بإنشاء جلسة NextAuth.js للمستخدم الذي تم تفعيل حسابه
                    console.log('[VerifyEmailPage] Verification successful. Attempting NextAuth signIn...');
                    const result = await signIn('credentials', {
                        redirect: false,
                        email: data.user_email, // افترض أن ووردبريس يعيد user_email بعد التحقق
                        // كلمة المرور غير متاحة هنا، لذا قد تحتاج إلى معالجة خاصة في Credential Provider
                        // أو توجيه المستخدم لتعيين كلمة مرور بعد التحقق.
                        // حالياً، سنعتمد على أن Credential Provider يمكنه التعامل مع هذا السيناريو
                        // أو أن المصادقة الاجتماعية كانت قد تمت بالفعل.
                        // إذا كان هذا المستخدم قد سجل بالطريقة التقليدية ويحتاج كلمة مرور،
                        // فهذا التدفق قد لا يكون مثالياً لـ signIn('credentials') مباشرة.
                        // لكنه سيعمل إذا كان Credential Provider الخاص بك يمكنه التحقق من الـ JWT.
                        // الأفضل هنا هو أن يقوم الـ Backend بإنشاء JWT وإعادته، ثم نستخدمه مباشرة.
                        // ولكن بما أننا نستخدم signIn('credentials') في login/page، سنستمر هنا بنفس الطريقة.
                        // إذا كان الـ Backend يعيد JWT فقط، يمكننا استخدام signIn('jwt', { token: data.token })
                        // ولكن هذا يتطلب Credential Provider مخصصاً لـ JWT.
                        // للتبسيط، سنفترض أن الـ Backend يعيد معلومات كافية لـ Credential Provider.
                        // الأفضل هو أن تعيد نقطة نهاية verify-email JWT فقط.
                    });

                    if (result?.error) {
                        console.error('[VerifyEmailPage] NextAuth signIn failed after verification:', result.error);
                        setVerificationStatus('تم تفعيل حسابك، ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
                        setIsSuccess(true); // لا يزال التفعيل ناجحاً
                        setTimeout(() => {
                            router.push('/auth/login');
                        }, 2000);
                    } else {
                        console.log('[VerifyEmailPage] NextAuth signIn successful. Preparing for redirection...');
                        setVerificationStatus(data.message || 'تم تفعيل حسابك بنجاح! أنت الآن مسجل دخول.');
                        setIsSuccess(true);
                        setTimeout(() => {
                            console.log('[VerifyEmailPage] Redirecting to /donor/dashboard');
                            router.push('/donor/dashboard');
                        }, 2000);
                    }
                    // **********************************************
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
    }, [searchParams, router]); // <--- تم إزالة 'login' من التبعيات لأنه لم يعد مستخدماً

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
