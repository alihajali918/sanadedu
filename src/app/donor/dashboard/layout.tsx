// ==========================================================
// FILE: src/app/donor/dashboard/layout.tsx
// DESCRIPTION: Layout for all donor dashboard pages, including a sidebar,
//              authentication protection, and logout functionality.
// ==========================================================
"use client"; // This is required for using hooks like useState and useEffect

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // For using useRouter for redirection
// تم إزالة استيراد Header هنا لأنه يتم تضمينه في RootLayout

import { useSession, signOut } from "next-auth/react"; // <--- تم التعديل: استخدام useSession و signOut من NextAuth
import styles from "./dashboard.module.css"; // Import the dashboard specific styles

// Define the DashboardLayout props
interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DonorDashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  // const { isAuthenticated, logout, isLoadingAuth } = useAuth(); // <--- تم الإزالة: لم نعد نستخدم useAuth
  const { data: session, status } = useSession(); // <--- جديد: استخدام useSession

  const isAuthenticated = status === "authenticated"; // تعريف isAuthenticated بناءً على status
  const isLoadingAuth = status === "loading"; // تعريف isLoadingAuth بناءً على status

  // useEffect to handle redirection based on authentication status
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      // استخدام signOut من NextAuth.js لإعادة التوجيه إلى صفحة الدخول
      // هذا يضمن مسح الجلسة بشكل صحيح قبل إعادة التوجيه
      signOut({ redirect: true, callbackUrl: "/auth/login" });
    }
  }, [isLoadingAuth, isAuthenticated, router]); // <--- تم تعديل التبعيات

  // Show a loading screen while checking authentication
  if (isLoadingAuth) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <p>جاري التحقق من هويتك...</p>
      </div>
    );
  }

  // If the user is not authenticated (after checking), don't show anything (as redirection already happened)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className={styles.dashboardContainer}>
        {/* The Sidebar */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>لوحة تحكم المتبرع</h3>
          <nav className={styles.sidebarNav}>
            <ul>
              <li>
                <Link href="/donor/dashboard" className={styles.navLink}>
                  نظرة عامة
                </Link>
              </li>
              <li>
                <Link
                  href="/donor/dashboard/profile"
                  className={styles.navLink}
                >
                  ملفي الشخصي
                </Link>
              </li>
              <li>
                <Link
                  href="/donor/dashboard/donations"
                  className={styles.navLink}
                >
                  تبرعاتي
                </Link>
              </li>
              <li>
                <Link
                  href="/donor/dashboard/settings"
                  className={styles.navLink}
                >
                  الإعدادات
                </Link>
              </li>
              <li>
                {/* هذا الزر لتسجيل الخروج الفعلي باستخدام signOut من NextAuth */}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className={styles.logoutButton}
                >
                  تسجيل الخروج
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* The main content area */}
        <main className={styles.mainContent}>
          {children}{" "}
          {/* This is where the content of the sub-pages will be displayed */}
        </main>
      </div>
    </>
  );
};

export default DonorDashboardLayout;
