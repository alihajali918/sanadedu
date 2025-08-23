// ==========================================================
// FILE: src/app/(auth)/signup/page.tsx
// DESCRIPTION: Signup page component for Sanad website.
// Handles new user registration with WordPress REST API with email validation and Google OAuth.
// ==========================================================

"use client"; // Marks this as a Client Component for hooks like useState and useRouter.

import Link from 'next/link';
import React, { useState } from 'react';
import styles from './signup.module.css'; // Import CSS module for styling
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { signIn } from "next-auth/react"; // Import signIn function from next-auth

const SignupPage: React.FC = () => {
  // State variables to manage form inputs and UI feedback
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null); // To display error messages
  const [success, setSuccess] = useState(null); // To display success messages
  const [isLoading, setIsLoading] = useState(false); // To manage loading state for the button
  
  const router = useRouter(); // Initialize useRouter hook for navigation

  // Function to validate email format
  const validateEmail = (email) => {
    // Basic regex for email validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Function to handle traditional email/password signup
  const handleSignup = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    // Client-side validation: Check if passwords match
    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقين.');
      return; // Stop the function if passwords don't match
    }

    // Client-side validation: Check email format
    if (!validateEmail(email)) {
      setError('البريد الإلكتروني غير صحيح. يرجى إدخال بريد إلكتروني صالح.');
      return; // Stop the function if email format is invalid
    }

    setIsLoading(true); // Set loading state to true

    try {
      // IMPORTANT: This URL must point to your custom WordPress API endpoint for email registration.
      const wpSignupApiUrl = 'https://sanadedu.org/backend/wp-json/sanad/v1/register'; 
      
      // Make a POST request to the WordPress API
      const response = await fetch(wpSignupApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email, // WordPress often uses email as username for new registrations
          email: email,
          password: password,
          name: fullName, // Optional: Some plugins support 'name' field directly
        }),
      });

      const data = await response.json(); // Parse the JSON response from WordPress

      if (response.ok) {
        // If the response status is OK (e.g., 200, 201)
        setSuccess('تم إنشاء حسابك بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
        // Redirect the user to a new page informing them to check their email
        setTimeout(() => {
          router.push('/auth/check-email'); 
        }, 2000); // Redirect after 2 seconds
      } else {
        // If the response status indicates an error
        setError(data.message || 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      // Catch any network errors or issues with the fetch request
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
      console.error('Signup API call error:', err); // Log the full error for debugging
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Function to handle Google Sign-Up
  const handleGoogleSignUp = () => {
    // 💡 هذا هو التعديل الأساسي: تم إضافة خيار callbackUrl
    // هذا يوجه المستخدم إلى لوحة التحكم بعد إتمام التسجيل بنجاح
    signIn("google", { callbackUrl: "/donor/dashboard" });
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>إنشاء حساب جديد</h2>
        {/* Display error messages */}
        {error && <div className={styles.errorMessage}>{error}</div>}
        {/* Display success messages */}
        {success && <div className={styles.successMessage}>{success}</div>}
        
        <form className={styles.authForm} onSubmit={handleSignup}>
          {/* Form fields */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">الاسم الكامل (اختياري)</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                placeholder="أدخل اسمك الكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)} // Update state on change
              />
            </div>
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
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                placeholder="أعد إدخال كلمة المرور" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} // Update state on change
                required 
              />
            </div>
          </div>
          {/* Form actions (submit button) */}
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={isLoading} // Disable button during loading
            >
              {isLoading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}
            </button>
          </div>
        </form>

        {/* Google Sign-Up Button */}
        {/*<div className={styles.socialLoginSeparator}>
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
        </div>*/}

        {/* Link to login page */}
        <p className={styles.authSwitch}>
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login">سجل دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;