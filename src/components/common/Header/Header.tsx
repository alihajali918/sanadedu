// ==========================================================
// FILE: src/components/common/Header/Header.tsx
// DESCRIPTION: Main Header for Sanad Website (Top Bar and Main Nav).
// ==========================================================

"use client"; // مهم جداً لأننا نستخدم React Hooks مثل useState و useContext

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
// تأكد من صحة مسار استيراد CartContext الخاص بك
import { useCart } from "@/app/context/CartContext";
import { useSession, signOut } from "next-auth/react"; // <--- تم التعديل: استخدام useSession و signOut من NextAuth
import styles from "./Header.module.css"; // استيراد الستايلات ككائن 'styles'

// هذا المكون يمثل الرأس الرئيسي للموقع (Header) الذي يضم شريطي Top Bar و Main Nav
const Header = () => {
  // حالة لتعقب ما إذا كانت قائمة الجوال مفتوحة أو مغلقة
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // حالة لتعقب القائمة المنسدلة المفتوحة داخل قائمة الجوال (مثلاً "من نحن" أو "الحالات")
  const [openMobileDropdown, setOpenMobileDropdown] = useState<number | null>(
    null
  );

  // **********************************************
  // استخدام هوك useSession لجلب حالة المصادقة ووظيفة تسجيل الخروج
  const { data: session, status } = useSession(); // <--- تم التعديل: استخدام useSession
  const isAuthenticated = status === "authenticated"; // تعريف isAuthenticated بناءً على status
  const isLoadingAuth = status === "loading"; // تعريف isLoadingAuth بناءً على status
  // **********************************************

  // استخدام هوك سلة التبرعات لجلب عدد العناصر الإجمالي
  const { getTotalItems } = useCart();

  // وظيفة لتبديل حالة قائمة الجوال (فتح/إغلاق)
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    if (isMobileMenuOpen) {
      setOpenMobileDropdown(null);
    }
  };

  // وظيفة لتبديل حالة القوائم المنسدلة داخل قائمة الجوال
  const toggleMobileDropdown = (index: number) => {
    setOpenMobileDropdown(openMobileDropdown === index ? null : index);
  };

  // تأثير (Effect) لإدارة كلاس 'no-scroll' على وسم <body>
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [isMobileMenuOpen]);

  // **********************************************
  // تم إزالة جزء المحاكاة المؤقت لأنه أصبح غير ضروري مع استخدام NextAuth.js
  // **********************************************

  // إذا كانت حالة المصادقة قيد التحميل، يمكن عرض أيقونة تحميل أو لا شيء
  // لا نرجع null هنا بشكل صارم، لأننا نريد أن يتم تحديث الهيدر بمجرد أن تصبح
  // حالة isAuthenticated صحيحة، حتى لو كانت isLoadingAuth لا تزال صحيحة للحظة.
  if (isLoadingAuth) {
    // يمكنك هنا إرجاع هيدر مبسط أو Placeholder إذا أردت، لكننا نفضل عرضه بمجرد جاهزيته
    // For now, we'll let the rest of the component render if isAuthenticated becomes true.
    // If we return null here always, then the header will not show until isLoadingAuth is false.
    // However, if isAuthenticated is already true due to login, we want it to render.
    // So, we'll remove the strict 'return null' and let the conditional rendering handle it.
  }

  return (
    <header className={styles.mainHeader}>
      {/* الشريط العلوي للمعلومات والروابط الثانوية */}
      <div className={styles.topBar}>
        <div className={styles.container}>
          {/* الروابط على اليمين (في الاتجاه العربي) */}
          <div className={styles.topBarRight}>
            <Link
              href="/faq"
              className={styles.topLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الأسئلة الشائعة
            </Link>
            <Link
              href="/contact"
              className={styles.topLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              تواصل معنا
            </Link>
          </div>
          {/*<span className={styles.separator}>|</span> <a href="#" className={`${styles.lang} ${styles.topLink}`} onClick={(e) => e.preventDefault()}>عربي / إنجليزي</a>*/}
          <div className={styles.topBarLeft}>
            {/* ********************************************** */}
            {/* المنطق الشرطي لعرض أزرار تسجيل الدخول/الحساب */}
            {isAuthenticated ? (
              // إذا كان المستخدم مسجلاً للدخول
              <>
                {/* عرض اسم المستخدم أو بريده الإلكتروني */}
                <Link
                  href="/donor/dashboard"
                  className={styles.topLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fas fa-user"></i> &nbsp;{" "}
                  {session?.user?.name || session?.user?.email}{" "}
                  {/* <--- استخدام session.user */}
                </Link>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/login" }); // <--- استخدام signOut من NextAuth
                    setIsMobileMenuOpen(false); // إغلاق قائمة الجوال عند تسجيل الخروج
                  }}
                  className={`${styles.topLink} ${styles.logoutButton}`}
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              // إذا لم يكن المستخدم مسجلاً للدخول
              <Link
                href="/auth/login"
                className={styles.topLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                تسجيل دخول / تسجيل
              </Link>
            )}
            {/* ********************************************** */}

            {/* <div className={styles.langCurrencySwitcher}>
              <a href="#" className={`${styles.currency} ${styles.topLink}`} onClick={(e) => e.preventDefault()}>
                $ دولار
              </a>
            </div>*/}
            <Link
              href="/donation-basket"
              className={styles.cartIcon}
              aria-label="سلة التسوق"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className="fas fa-shopping-cart"></i>
              {getTotalItems() > 0 && (
                <span className={styles.cartCount}>{getTotalItems()}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* شريط التنقل الرئيسي (Main Nav) */}
      <nav className={styles.mainNav}>
        <div className={styles.container}>
          {/* شعار الموقع والرابط للصفحة الرئيسية */}
          <Link
            href="/"
            className={styles.logoContainer}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Image
              src="/sanadlogo.svg"
              alt="Sanad Logo"
              width={50}
              height={50}
              className={styles.sanadlogo}
              priority
            />
          </Link>

          {/* زر قائمة الهامبرغر - يفتح قائمة الجوال عند النقر عليه */}
          <Link
            href="/donation-basket"
            className={styles.cartIconMobile}
            aria-label="سلة التسوق"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-shopping-cart"></i>
            {getTotalItems() > 0 && (
              <span className={styles.cartCount}>{getTotalItems()}</span>
            )}
          </Link>
          {/* إضافة أيقونة الدخول للموبايل تستخدم حالة المصادقة */}
          {isAuthenticated ? (
            <Link
              href="/donor/dashboard"
              className={styles.authIconMobile}
              aria-label="حسابي"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className="fas fa-user"></i>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className={styles.authIconMobile}
              aria-label="الدخول"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className="fas fa-user"></i>
            </Link>
          )}

          <button
            className={styles.hamburgerMenu}
            aria-label="فتح القائمة"
            onClick={toggleMobileMenu}
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* روابط التنقل الرئيسية (للدسك توب) */}
          <ul className={styles.navLinks}>
            <li>
              <Link href="/">الصفحة الرئيسية</Link>
            </li>
            <li className={styles.hasDropdown}>
              <Link href="/about" className={styles.navLink}>
                من نحن
              </Link>
              <ul className={styles.dropdownMenu}>
                <li>
                  <Link href="/about/vision">رؤيتنا</Link>
                </li>
                <li>
                  <Link href="/about/founder">عن المؤسس</Link>
                </li>
                <li>
                  <Link href="/about/team">فريقنا</Link>
                </li>
              </ul>
            </li>
            <li className={styles.hasDropdown}>
              <Link
                href="/cases"
                className={`${styles.navLink} ${styles.btn} ${styles.btnCtaPrimary}`}
              >
                الحالات
              </Link>
              <ul className={styles.dropdownMenu}>
                <li>
                  <Link href="/cases">تصفح كل الحالات</Link>
                </li>
                <li>
                  <Link href="/cases?type=schools">تصفح المدارس</Link>
                </li>
                <li>
                  <Link href="/cases?type=mosques">تصفح المساجد</Link>
                </li>
              </ul>
            </li>
            <li>
              <Link
                href="/support-staff"
                className={`${styles.navLink} ${styles.btn} ${styles.btnCtaPrimary}`}
              >
                ادعم الكادر
              </Link>
            </li>
            <li>
              <Link href="/request-documentation">طلب توثيق المؤسسة</Link>
            </li>
            <li>
              <Link href="/latest-donors">آخر المتبرعين</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* القائمة الجانبية للموبايل (Mobile Menu) */}
      <div
        className={`${styles.mobileMenu} ${
          isMobileMenuOpen ? styles.active : ""
        }`}
      >
        <button className={styles.closeMobileMenu} onClick={toggleMobileMenu}>
          &times;
        </button>
        <ul className={styles.mobileNavLinks}>
          {isAuthenticated ? (
            <>
              <li>
                <Link href="/donor/dashboard" onClick={toggleMobileMenu}>
                  حسابي
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/login" }); // <--- استخدام signOut من NextAuth
                    toggleMobileMenu();
                  }}
                  className={`${styles.topLink} ${styles.logoutButton}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    fontSize: "1em",
                    width: "100%",
                    textAlign: "right",
                  }}
                >
                  تسجيل الخروج
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link href="/auth/login" onClick={toggleMobileMenu}>
                تسجيل دخول / تسجيل &nbsp;&nbsp;&nbsp;
                <i className="fas fa-user"></i>
              </Link>
            </li>
          )}

          <li>
            <Link href="/" onClick={toggleMobileMenu}>
              الصفحة الرئيسية
            </Link>
          </li>
          <li
            className={`${styles.hasDropdown} ${
              openMobileDropdown === 0 ? styles.open : ""
            }`}
          >
            <Link
              href="/about"
              onClick={(e) => {
                if (openMobileDropdown !== 0) {
                  e.preventDefault();
                }
                toggleMobileDropdown(0);
              }}
              className={styles.mobileNavLink}
            >
              من نحن
              <span
                className={`${styles.dropdownArrow} ${
                  openMobileDropdown === 0 ? styles.arrowRotate : ""
                }`}
              ></span>
            </Link>
            {openMobileDropdown === 0 && (
              <ul className={styles.mobileDropdownMenu}>
                <li>
                  <Link href="/about/vision" onClick={toggleMobileMenu}>
                    رؤيتنا
                  </Link>
                </li>
                <li>
                  <Link href="/about/founder" onClick={toggleMobileMenu}>
                    عن المؤسس
                  </Link>
                </li>
                <li>
                  <Link href="/about/team" onClick={toggleMobileMenu}>
                    فريقنا
                  </Link>
                </li>
              </ul>
            )}
          </li>

          <li
            className={`${styles.hasDropdown} ${
              openMobileDropdown === 1 ? styles.open : ""
            }`}
          >
            <Link
              href="/cases"
              onClick={(e) => {
                if (openMobileDropdown !== 1) {
                  e.preventDefault();
                }
                toggleMobileDropdown(1);
              }}
              className={`${styles.navLink} ${styles.btn} ${styles.btnCtaPrimary}`}
            >
              الحالات
              <span
                className={`${styles.dropdownArrow} ${
                  openMobileDropdown === 1 ? styles.arrowRotate : ""
                }`}
              ></span>
            </Link>
            {openMobileDropdown === 1 && (
              <ul className={styles.mobileDropdownMenu}>
                <li>
                  <Link href="/cases">تصفح كل الحالات</Link>
                </li>
                <li>
                  <Link href="/cases?type=schools">تصفح المدارس</Link>
                </li>
                <li>
                  <Link href="/cases?type=mosques">تصفح المساجد</Link>
                </li>
              </ul>
            )}
          </li>

          <li>
            <Link
              href="/support-staff"
              className={`${styles.btn} ${styles.btnCtaPrimary}`}
              onClick={toggleMobileMenu}
            >
              ادعم الكادر
            </Link>
          </li>
          <li>
            <Link href="/request-documentation" onClick={toggleMobileMenu}>
              طلب توثيق المؤسسة
            </Link>
          </li>
          <li>
            <Link href="/latest-donors" onClick={toggleMobileMenu}>
              آخر المتبرعين
            </Link>
          </li>

          <li>
            <Link href="/contact" onClick={toggleMobileMenu}>
              تواصل معنا
            </Link>
          </li>
          <li>
            <Link href="/faq" onClick={toggleMobileMenu}>
              الأسئلة الشائعة
            </Link>
          </li>
          {/*  <li><a href="#" onClick={(e) => { e.preventDefault(); toggleMobileMenu(); }}>$ دولار</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); toggleMobileMenu(); }}>عربي / إنجليزي</a></li>*/}
        </ul>
      </div>
      {/* Overlay لتغطية المحتوى عند فتح قائمة الهامبرغر */}
      {isMobileMenuOpen && (
        <div className={styles.overlay} onClick={toggleMobileMenu}></div>
      )}
    </header>
  );
};

export default Header;
