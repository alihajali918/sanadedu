// ==========================================================
// FILE: src/app/layout.tsx
// DESCRIPTION: Root Layout Component for Sanad Website
// This component wraps all pages, imports global styles,
// defines fonts, and includes core UI elements (Header, Footer, LoadingPage).
// Now exclusively uses NextAuth's SessionProvider for authentication.
// ==========================================================

"use client"; // Mark this file as a Client Component because it uses React Hooks

// --- CORE IMPORTS ---
import "./globals.css"; // Global CSS styles for the entire application
import React, { ReactNode } from "react"; // استيراد ReactNode بشكل صريح

// --- UI COMPONENT IMPORTS ---
import Header from "../components/common/Header/Header";
import Footer from "../components/common/Footer/Footer";
import LoadingPage from "../components/common/Loading/LoadingPage"; // Preloader for initial page load
import { CartProvider } from "./context/CartContext"; // CartProvider for shopping cart state
// import { AuthProvider, useAuth } from "./context/AuthContext"; // <--- هذا السطر تم إزالته بالكامل
import { LocaleProvider, useLocale } from "./context/LocaleContext"; // LocaleProvider for language/locale state

// --- FONT AWESOME (Icons) ---
import "@fortawesome/fontawesome-free/css/all.min.css";

// --- FONT IMPORTS (from next/font/google) ---
import { Changa, Cairo } from "next/font/google";

// --- NEXT-AUTH ---
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react"; // استيراد SessionProvider و useSession

// Define Changa font (for headings)
import { SpeedInsights } from "@vercel/speed-insights/next"

const changa = Changa({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-changa",
  display: "swap",
});

// Define Cairo font (for body text)
const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-cairo",
  display: "swap",
});

// --- AppProviders Component (مُعدّل لاستخدام useSession) ---
// هذا المكون يلف جميع الـ providers الأخرى ويتأكد من الترتيب الصحيح
// كما يتعامل مع حالة التحميل الأولية للمصادقة باستخدام NextAuth's useSession
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  // const { user, isLoadingAuth } = useAuth(); // <--- هذا السطر تم إزالته بالكامل
  const { data: session, status } = useSession(); // جديد: استخدام useSession() من NextAuth.js

  // إظهار مؤشر تحميل بسيط أثناء التحقق من حالة المصادقة
  if (status === "loading") { // useSession() يوفر "loading" لحالة التحقق
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#F8F9FA",
        }}
      >
        <p style={{ fontSize: "1.2em", color: "#4A6C47" }}>
          جاري تهيئة التطبيق... يرجى الانتظار.
        </p>
      </div>
    );
  }

  // يمكننا الآن الوصول إلى بيانات المستخدم من `session.user`
  // LocaleProvider يلف المحتوى الرئيسي ويتلقى الـ locale الأولي من `session.user`
  // هذا يضمن تعيين الـ locale بناءً على تفضيل المستخدم المصادق عليه
  return (
    <LocaleProvider initialLocale={session?.user?.locale || "en-US"}> {/* استخدام session.user?.locale */}
      {/* Header Component: يظهر في الجزء العلوي من كل صفحة. */}
      {/* تم نقله داخل الـ providers للوصول إلى LocaleContext و NextAuth Session */}
      <Header />
      {/* محتوى الصفحة: هنا يتم عرض محتوى الصفحة المحدد. */}
      {children}
      <SpeedInsights />
      <Footer />
    </LocaleProvider>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ==========================================================
    // REACT FRAGMENT: يلف جميع العناصر كعنصر أب واحد.
    // ==========================================================
    <>
      {/* ========================================================== */}
      {/* مكون صفحة التحميل (PRELOADER) */}
      {/* يتم عرضه عالمياً، خارج هيكل الـ HTML الرئيسي، أثناء التحميل الأولي للصفحة */}
      {/* ========================================================== */}
      <LoadingPage />

      {/* ========================================================== */}
      {/* هيكل وثيقة HTML */}
      {/* علامة HTML الأساسية مع متغيرات CSS للغة، الاتجاه، والخط. */}
      {/* ========================================================== */}
      <html
        lang="ar"
        dir="rtl"
        className={`${changa.variable} ${cairo.variable}`}
      >
        {/* ========================================================== */}
        {/* قسم HEAD */}
        {/* يحتوي على البيانات الوصفية، روابط CSS الخارجية (مثل Font Awesome). */}
        <head>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
            integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <link rel="icon" href="/sanadlogo.svg" sizes="any" />
        </head>

        {/* ========================================================== */}
        {/* قسم BODY */}
        {/* يحتوي على المحتوى المرئي الرئيسي للصفحة. */}
        {/* الآن، SessionProvider هو أول Provider يلف كل شيء */}
        <body>
          {/* SessionProvider من next-auth/react هو الآن الـ Provider الخارجي المسؤول عن المصادقة */}
          <SessionProvider>
            {/* CartProvider لأجل حالة عربة التسوق */}
            <CartProvider>
              {/* AppProviders Component يلف الـ Header، children (محتوى الصفحة)، والـ Footer */}
              <AppProviders>{children}</AppProviders>
            </CartProvider>
          </SessionProvider>
        </body>
      </html>
    </>
  );
}
