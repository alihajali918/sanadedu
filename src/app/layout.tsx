// ==========================================================
// FILE: src/app/layout.tsx
// DESCRIPTION: Root Layout Component for Sanad Website
// This component wraps all pages, imports global styles,
// defines fonts, and includes core UI elements (Header, Footer, LoadingPage).
// Now includes AuthProvider, LocaleProvider, CartProvider, and NextAuth's SessionProvider.
// ==========================================================

"use client"; // Mark this file as a Client Component because it uses React Context

// --- CORE IMPORTS ---
import './globals.css'; // Global CSS styles for the entire application

// --- UI COMPONENT IMPORTS ---
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import LoadingPage from '../components/common/Loading/LoadingPage'; // Preloader for initial page load
import { CartProvider } from './context/CartContext'; // CartProvider for shopping cart state
import { AuthProvider, useAuth } from './context/AuthContext'; // <--- NEW: AuthProvider and useAuth hook
import { LocaleProvider } from './context/LocaleContext'; // <--- NEW: LocaleProvider for language/locale state

// --- FONT AWESOME (Icons) ---
import '@fortawesome/fontawesome-free/css/all.min.css';

// --- FONT IMPORTS (from next/font/google) ---
import { Changa, Cairo } from 'next/font/google';

// --- NEXT-AUTH ---
import { SessionProvider } from "next-auth/react"; // SessionProvider for NextAuth (if used)

// Define Changa font (for headings)
const changa = Changa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-changa',
  display: 'swap',
});

// Define Cairo font (for body text)
const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-cairo',
  display: 'swap',
});

// --- AppProviders Component ---
// This component wraps all other providers and ensures correct order
// It also handles the initial loading state for authentication
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoadingAuth } = useAuth(); // Get user and loading state from AuthContext

  // Show a simple loading indicator while authentication status is being checked
  if (isLoadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F8F9FA' }}>
        <p style={{ fontSize: '1.2em', color: '#4A6C47' }}>جاري تهيئة التطبيق... يرجى الانتظار.</p>
      </div>
    );
  }

  return (
    // LocaleProvider wraps the main content and receives the initial locale from AuthContext
    // This ensures locale is set based on the authenticated user's preference
    <LocaleProvider initialLocale={user?.locale}> 
      {/* Header Component: Appears at the top of every page. */}
      {/* Moved inside providers to access AuthContext and LocaleContext */}
      <Header /> 
      {/* Page Content: This is where the specific page content will be rendered. */}
      {children}
      {/* Footer Component: Appears at the bottom of every page. */}
      {/* Moved inside providers to access AuthContext and LocaleContext */}
      <Footer />
    </LocaleProvider>
  );
};


// --- ROOT LAYOUT COMPONENT ---
// This is the main layout component that wraps every page in your Next.js application.
// `children` prop represents the content of the specific page being rendered.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ==========================================================
    // REACT FRAGMENT: Wraps all elements as a single parent.
    // ==========================================================
    <>
      {/* ========================================================== */}
      {/* LOADING PAGE COMPONENT (PRELOADER) */}
      {/* This renders globally, outside the main HTML structure, during initial page load */}
      {/* ========================================================== */}
      <LoadingPage />

      {/* ========================================================== */}
      {/* HTML DOCUMENT STRUCTURE */}
      {/* Base HTML tag with language, direction, and font CSS variables. */}
      {/* ========================================================== */}
      <html lang="ar" dir="rtl" className={`${changa.variable} ${cairo.variable}`}>
        {/* ========================================================== */}
        {/* HEAD SECTION */}
        {/* Contains metadata, external CSS links (like Font Awesome). */}
        {/* ========================================================== */}
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
          <link rel="icon" href="/sanadlogo.svg" sizes="any" />
        </head>

        {/* ========================================================== */}
        {/* BODY SECTION */}
        {/* Contains the main visible content of the page. */}
        {/* All main providers are nested here in the correct order */}
        {/* ========================================================== */}
        <body>
          {/* AuthProvider comes first as other providers/components might depend on authentication status */}
          <AuthProvider>
            {/* SessionProvider from next-auth/react is nested inside AuthProvider if it uses AuthContext */}
            {/* If NextAuth is independent, it can be outside AuthProvider */}
            <SessionProvider>
              {/* CartProvider is for shopping cart state */}
              <CartProvider>
                {/* AppProviders component encapsulates Header, children (page content), and Footer */}
                <AppProviders>
                  {children}
                </AppProviders>
              </CartProvider>
            </SessionProvider>
          </AuthProvider>
        </body>
      </html>
    </>
  );
}
