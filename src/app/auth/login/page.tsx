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
import { useAuth } from '@/app/context/AuthContext'; // <--- تم إضافة هذا الاستيراد

const LoginPage: React.FC = () => {
  // State variables to manage form inputs and UI feedback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // To display error messages
  const [isLoading, setIsLoading] = useState(false); // To manage loading state for the button
  
  const router = useRouter(); // Initialize useRouter hook for navigation
  const { login } = useAuth(); // <--- تم إضافة هذا السطر لاستخدام دالة login من السياق

  // Function to handle form submission (login attempt)
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(null); // Clear previous errors
    setIsLoading(true); // Set loading state to true

    try {
      // IMPORTANT: This URL must point to your JWT Authentication plugin's endpoint.
      // Based on our setup, it should be correct now.
      const wpLoginApiUrl = 'https://sanadedu.org/backend/wp-json/jwt-auth/v1/token';
      
      // Make a POST request to the WordPress JWT authentication endpoint
      const response = await fetch(wpLoginApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email, // JWT plugin usually accepts email or username
          password: password,
        }),
      });

      const data = await response.json(); // Parse the JSON response from WordPress

      if (response.ok) {
        // Login successful!
        console.log('Login successful:', data);
        // **********************************************
        // التعديل هنا: تمرير تفضيل اللغة إذا كان الـ API يعيده (مثلاً data.user_locale)
        // افترضنا أن الـ Backend يرسل حقل 'locale' في بيانات الرد بعد تسجيل الدخول.
        // يجب أن تتأكد من أن الـ Backend لديك يرسل هذا الحقل.
        const userLocale = data.user_locale || 'en-US'; // استخدم 'en-US' كافتراضي في حال لم يتم إرساله
        login(data.token, data.user_display_name, email, userLocale); // Pass token, name, email, and locale to context
        // **********************************************

        // Redirect the user to their donor dashboard or home page
        router.push('/donor/dashboard'); 
      } else {
        // Handle login errors from the API
        // **********************************************
        // التعديل هنا: تغيير رسالة الخطأ لتكون أكثر عمومية
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.'); 
        // **********************************************
      }
    } catch (err) {
      // Catch any network errors or issues with the fetch request
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
      console.error('Login API call error:', err); // Log the full error for debugging
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>تسجيل الدخول</h2>
        {/* Display error messages */}
        {error && <div className={styles.errorMessage}>{error}</div>} {/* <--- التعديل هنا */}
        
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
