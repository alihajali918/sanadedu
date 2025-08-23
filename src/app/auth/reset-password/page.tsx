// ==========================================================
// FILE: src/app/(auth)/reset-password/page.tsx
// DESCRIPTION: Page for submitting a new password after a reset request.
// ==========================================================

"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import necessary hooks for URL params and navigation
import styles from '../login/login.module.css'; // Reusing login/signup styles for consistency

const ResetPasswordPage: React.FC = () => {
  const searchParams = useSearchParams(); // Hook to access URL query parameters
  const router = useRouter(); // Hook for programmatic navigation

  // State variables for form inputs and UI feedback
  const [token, setToken] = useState(null); // To store the reset token from the URL
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null); // To display success/error messages
  const [isError, setIsError] = useState(false); // To differentiate between success and error messages
  const [isLoading, setIsLoading] = useState(false); // To manage loading state for the button

  // useEffect hook to extract the token from the URL when the component mounts
  useEffect(() => {
    const urlToken = searchParams.get('token'); // Get the 'token' query parameter
    if (urlToken) {
      setToken(urlToken); // Set the token in state
    } else {
      // If no token is found in the URL, display an error message
      setMessage('رمز إعادة تعيين كلمة المرور مفقود. يرجى التأكد من أن الرابط صحيح.');
      setIsError(true);
    }
  }, [searchParams]); // Dependency array: re-run effect if searchParams change

  // Function to handle password reset form submission
  const handleResetPassword = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage(null); // Clear previous messages
    setIsError(false); // Reset error state

    // Client-side validation: Check if token is present
    if (!token) {
      setMessage('رمز إعادة تعيين كلمة المرور غير صالح.');
      setIsError(true);
      return;
    }

    // Client-side validation: Check if passwords match
    if (password !== confirmPassword) {
      setMessage('كلمة المرور وتأكيدها غير متطابقين.');
      setIsError(true);
      return;
    }

    // Basic password length validation
    if (password.length < 6) { 
      setMessage('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
      setIsError(true);
      return;
    }

    setIsLoading(true); // Set loading state

    try {
      // IMPORTANT: This URL must point to your custom WordPress API endpoint for password reset submission.
      // It uses the 'sanad/v1/reset-password' endpoint from our custom plugin.
      const wpResetPasswordApiUrl = 'https://sanadedu.org/backend/wp-json/sanad/v1/reset-password';

      // Make a POST request to the WordPress API
      const response = await fetch(wpResetPasswordApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }), // Send the token and new password
      });

      const data = await response.json(); // Parse the JSON response

      if (response.ok) {
        // If password reset is successful
        setMessage(data.message || 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
        setIsError(false);
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/auth/login'); 
        }, 3000);
      } else {
        // If the API returns an error
        setMessage(data.message || 'فشل إعادة تعيين كلمة المرور. يرجى المحاولة لاحقاً.');
        setIsError(true);
      }
    } catch (error) {
      // Catch network errors
      setMessage('حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
      setIsError(true);
      console.error('Reset password API call error:', error); // Log for debugging
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>إعادة تعيين كلمة المرور</h2>

        {/* Display messages (error or success) */}
        {message && (
          <div className={isError ? styles.errorMessage : styles.successMessage}>
            {message}
          </div>
        )}

        {/* Display the form only if a token is present and no initial error */}
        {token && !isError && ( 
          <form className={styles.authForm} onSubmit={handleResetPassword}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">كلمة المرور الجديدة</label>
              <input 
                type="password" 
                id="newPassword" 
                name="newPassword" 
                placeholder="أدخل كلمة المرور الجديدة" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmNewPassword">تأكيد كلمة المرور الجديدة</label>
              <input 
                type="password" 
                id="confirmNewPassword" 
                name="confirmNewPassword" 
                placeholder="أعد إدخال كلمة المرور الجديدة" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
            <div className={styles.formActions}>
              <button 
                type="submit" 
                className={styles.btnPrimary} 
                disabled={isLoading}
              >
                {isLoading ? 'جارٍ إعادة التعيين...' : 'إعادة تعيين كلمة المرور'}
              </button>
            </div>
          </form>
        )}
        
        <p className={styles.authSwitch}>
          <Link href="/auth/login">العودة إلى تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
