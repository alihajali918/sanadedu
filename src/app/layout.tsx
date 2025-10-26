// FILE: src/app/layout.tsx
// هذا هو مكون خادم (Server Component).

import "./globals.css";
import React from "react";

import { Changa, Cairo } from "next/font/google";

// ⚠️ ملاحظة: يجب أن تقوم بإنشاء هذا الملف لغرض تغليف SessionProvider
import NextAuthSessionProvider from "@/components/providers/NextAuthSessionProvider";
import ClientProviders from "@/components/providers/ClientProviders";

// تعريف الخطوط...
const changa = Changa({
  /* ... */ subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-changa",
  display: "swap",
});
const cairo = Cairo({
  /* ... */ subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-cairo",
  display: "swap",
});

// يمكن إضافة Metadata هنا إذا أردت
export const metadata = {
  title: "Sanad - Your Project Title",
  description: "Sanad project description.",
};

// التصدير الافتراضي (Default Export) لـ RootLayout هو مطلوب
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <LoadingPage /> تم نقلها إلى ClientProviders لأنها تحتاج إلى state
    <html
      lang="ar"
      dir="rtl"
      className={`${changa.variable} ${cairo.variable}`}
    >
      <head>
        {/* روابط Font Awesome و favicon */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link rel="icon" href="/sanadlogo.svg" sizes="any" />
      </head>

      <body>
        {/* SessionProvider يجب أن يكون حول جميع المكونات التي تستخدم useSession */}
        <NextAuthSessionProvider>
          {/* ClientProviders يغلف كل المكونات التي تحتاج "use client" */}
          <ClientProviders>{children}</ClientProviders>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
