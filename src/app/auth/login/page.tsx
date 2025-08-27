// ==========================================================
// FILE: src/app/(auth)/login/page.tsx
// DESCRIPTION: Login page component for Sanad website.
// Handles user authentication with WordPress REST API using JWT.
// ==========================================================

"use client"; // Marks this as a Client Component for hooks like useState and useRouter.

import Link from 'next/link';
import React, { useState } from 'react';
import styles from './login.module.css'; // Import CSS module for styling
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { signIn } from 'next-auth/react'; // <--- جديد: استيراد signIn من NextAuth.js بدلاً من useAuth

// تحديد متغير البيئة لعنوان الـ API (لم يعد يستخدم مباشرة لعملية تسجيل الدخول في NextAuth)
// يجب التأكد أن هذا المتغير متاح في ملف .env.local وعلى Vercel
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const LoginPage: React.FC = () => {
  // State variables to manage form inputs and UI feedback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // To display error messages
  const [isLoading, setIsLoading] = useState(false); // To manage loading state for the button

  const router = useRouter(); // Initialize useRouter hook for navigation
  // const { login } = useAuth(); // <--- تم إزالة: لم نعد نستخدم useAuth

  // Function to handle form submission (login attempt)
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(null); // Clear previous errors
    setIsLoading(true); // Set loading state to true

    // التحقق من وجود متغير البيئة (هذا التحقق أصبح أقل أهمية هنا لأن NextAuth يتعامل مع API)
    // ولكنه جيد لإظهار رسائل خطأ واضحة
    if (!process.env.NEXT_PUBLIC_WORDPRESS_API_URL) { // نستخدم NEXT_PUBLIC_WORDPRESS_API_URL كما هو في route.ts
      setError('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
      setIsLoading(false);
      console.error('Environment variable NEXT_PUBLIC_WORDPRESS_API_URL is not set.');
      return;
    }

    try {
      // **********************************************
      // التعديل هنا: استخدام signIn من NextAuth.js لـ Credential Provider
      // ستحتاج إلى إعداد Credential Provider في ملف route.ts الخاص بك
      // NextAuth سيتولى إرسال بيانات الاعتماد إلى نقطة نهاية WordPress JWT
      const result = await signIn('credentials', {
        redirect: false, // لا تقوم بإعادة التوجيه تلقائيًا، سنتعامل معها يدوياً
        email: email, // NextAuth سيرسل هذا كـ username عادةً لـ jwt-auth/v1/token
        password: password,
        // يمكنك إضافة callbackUrl هنا إذا كنت تريد إعادة التوجيه إلى صفحة معينة بعد النجاح
      });

      if (result?.error) {
        // فشل تسجيل الدخول
        console.error('Login failed:', result.error);
        // **********************************************
        // التعديل هنا: رسالة خطأ أكثر تحديداً
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        // **********************************************
      } else {
        // تسجيل دخول ناجح (NextAuth سيتولى الجلسة)
        console.log('Login successful with NextAuth credentials.');
        router.push('/donor/dashboard'); // إعادة توجيه المستخدم إلى لوحة التحكم الخاصة به
      }
      // **********************************************
    } catch (err) {
      // Catch any network errors or issues
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
      console.error('Login process error:', err); // Log the full error for debugging
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>تسجيل الدخول</h2>
        {/* Display error messages */}
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form className={styles.authForm} onSubmit={handleLogin}>
          {/* Email input field */}
          <div className={styles.formGroup}>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="أدخل بريدك الإلكتروني" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Update state on change
              required 
            />
          </div>
          {/* Password input field */}
          <div className={styles.formGroup}>
            <label htmlFor="password">كلمة المرور</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="أدخل كلمة المرور" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Update state on change
              required 
            />
          </div>
          {/* Submit button */}
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={isLoading} // Disable button during loading
            >
              {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>
        {/* زر تسجيل الدخول باستخدام Google (يمكنك إضافة نمط له) */}
        <div className={styles.formActions}>
          <button 
            onClick={() => signIn('google', { callbackUrl: '/donor/dashboard' })}
            className={`${styles.btnPrimary} ${styles.googleButton}`} // أضف أنماطاً مناسبة
          >
            تسجيل الدخول باستخدام Google
          </button>
        </div>
        {/* Link to signup page */}
        <p className={styles.authSwitch}>
          لا تملك حسابًا؟{' '}
          <Link href="/auth/signup">إنشاء حساب جديد</Link>
        </p>
        {/* Link to forgot password page */}
        <p className={styles.authSwitch}>
          <Link href="/auth/forgot-password">نسيت كلمة المرور؟</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
