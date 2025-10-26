// FILE: src/components/providers/ClientProviders.tsx
"use client";

import React from "react";
import { CartProvider } from "@/app/context/CartContext";
import { LocaleProvider } from "@/app/context/LocaleContext";
import Header from "../common/Header/Header";
import Footer from "../common/Footer/Footer";
import LoadingPage from "../common/Loading/LoadingPage";
import { useSession } from "next-auth/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// --- AppProviders Component (نفس منطقك السابق) ---
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    // منطق شاشة التحميل
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
          {" "}
          جاري تهيئة التطبيق... يرجى الانتظار.{" "}
        </p>
      </div>
    );
  }

  // استخدام الخاصية المصححة: wordpressUserLocale
  return (
    <LocaleProvider
      initialLocale={session?.user?.wordpressUserLocale || "en-US"}
    >
      <LoadingPage />
      <Header />
      {children}
      <SpeedInsights />
      <Footer />
    </LocaleProvider>
  );
};

// --- التصدير الافتراضي ---
export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <AppProviders>{children}</AppProviders>
    </CartProvider>
  );
}
