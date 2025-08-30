// ==========================================================
// FILE: src/app/(auth)/login/page.tsx
// DESCRIPTION: Login page component for Sanad website.
// Handles user authentication with NextAuth Credentials (WordPress JWT) + Google OAuth.
// ==========================================================

"use client";

import Link from "next/link";
import React, { useState } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const LoginPage: React.FC = () => {
  // Form & UI state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  // ----------------------------------------------------------
  // Handle Login (Credentials via NextAuth -> fallback WP check)
  // ----------------------------------------------------------
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
    if (!baseUrl) {
      setError("خطأ في الإعداد: عنوان API غير موجود. يرجى التحقق من متغير البيئة.");
      setIsLoading(false);
      console.error("Environment variable NEXT_PUBLIC_WORDPRESS_API_URL is not set.");
      return;
    }

    try {
      // 1) حاول تسجيل الدخول عبر NextAuth (Credentials)
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        console.error("Login failed:", result.error);

        // 2) إن فشل، نفحص مباشرة مع WP JWT endpoint لمعرفة السبب الحقيقي
        try {
          const wpResp = await fetch(`${baseUrl}/jwt-auth/v1/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password }),
          });

          const data = await wpResp.json();
          const code = data?.code || "";
          const message = (data?.message || "").toString().toLowerCase();

          if (code === "rest_email_not_verified" || message.includes("not verified")) {
            setError("البريد الإلكتروني غير مُفعَّل. يرجى فتح رابط التفعيل المرسل إلى بريدك.");
          } else if (
            code.includes("invalid_email") ||
            code.includes("invalid_username") ||
            code.includes("incorrect_password") ||
            message.includes("invalid") ||
            message.includes("incorrect")
          ) {
            setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
          } else {
            console.warn("WP token endpoint response:", data);
            setError("تعذّر تسجيل الدخول. يرجى المحاولة لاحقاً أو التواصل مع الدعم.");
          }
        } catch (wpErr) {
          console.error("Secondary WP check failed:", wpErr);
          setError("تعذّر التحقق من السبب. يرجى المحاولة لاحقاً.");
        }

        return; // لا تُكمل التدفّق بعد معالجة الخطأ
      }

      // نجاح
      router.push("/donor/dashboard");
    } catch (err) {
      setError("حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.");
      console.error("Login process error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>تسجيل الدخول</h2>

        {/* Error box */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form className={styles.authForm} onSubmit={handleLogin}>
          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit */}
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
              {isLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </div>
        </form>

        {/* Google OAuth */}
        <div className={styles.formActions}>
          <button
            onClick={() => signIn("google", { callbackUrl: "/donor/dashboard" })}
            className={`${styles.btnPrimary} ${styles.googleButton}`}
            disabled={isLoading}
          >
            تسجيل الدخول باستخدام Google
          </button>
        </div>

        {/* Links */}
        <p className={styles.authSwitch}>
          لا تملك حسابًا؟ <Link href="/auth/signup">إنشاء حساب جديد</Link>
        </p>
        <p className={styles.authSwitch}>
          <Link href="/auth/forgot-password">نسيت كلمة المرور؟</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
