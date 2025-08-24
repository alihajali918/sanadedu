"use client";

import React, { useState } from 'react';
import styles from './signup.module.css';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";
import Link from 'next/link';

// استيراد أيقونة الايميل
import { FaEnvelope } from 'react-icons/fa';

const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT;

const SignupPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    if (!validateEmail(email)) {
      setError('البريد الإلكتروني غير صحيح. يرجى إدخال بريد إلكتروني صالح.');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور ضعيفة جداً. يجب أن تكون 8 أحرف على الأقل.');
      return;
    }

    setIsLoading(true);

    if (!WORDPRESS_API_ROOT) {
      setError('خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.');
      setIsLoading(false);
      console.error('Environment variable NEXT_PUBLIC_WORDPRESS_API_ROOT is not set.');
      return;
    }

    try {
      const wpSignupApiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/register`;
      const response = await fetch(wpSignupApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('تم إنشاء حسابك بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
        setTimeout(() => {
          router.push('/auth/check-email');
        }, 2000);
      } else {
        setError(data.message || 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
      console.error('Signup API call error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    signIn("google", { callbackUrl: "/donor/dashboard" });
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>إنشاء حساب جديد</h2>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}
        
        <form className={styles.authForm} onSubmit={handleSignup}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                placeholder="الاسم"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                placeholder="الكنية"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required 
              />
            </div>
            
            <div className={`${styles.formGroup} ${styles.formGroupFullWidth} ${styles.iconInputGroup}`}>
              <FaEnvelope className={styles.inputIcon} />
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="البريد الإلكتروني" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="كلمة المرور" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                placeholder="إعادة كلمة المرور" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={isLoading}
            >
              {isLoading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}
            </button>
          </div>
        </form>

        <div className={styles.socialLoginSeparator}>
          <span>أو</span>
        </div>
        <div className={styles.socialLoginButtons}>
          <button 
            type="button" 
            className={styles.googleSignInButton} 
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <img src="/images/google-icon.svg" alt="Google icon" className={styles.googleIcon} />
            إنشاء حساب باستخدام جوجل
          </button>
        </div>

        <p className={styles.authSwitch}>
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login">سجل دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;