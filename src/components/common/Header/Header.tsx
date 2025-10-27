// ==========================================================
// FILE: src/components/common/Header/Header.tsx
// ==========================================================

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import { useSession, signOut } from "next-auth/react";
import styles from "./Header.module.css";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<number | null>(null);
  const pathname = usePathname();


  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { getTotalItems } = useCart();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    if (isMobileMenuOpen) {
      setOpenMobileDropdown(null);
    }
  };

  const toggleMobileDropdown = (index: number) => {
    setOpenMobileDropdown(openMobileDropdown === index ? null : index);
  };

  // 🚨 التعديل الحاسم لمنع التمرير في الخلفية: تطبيق الكلاس على HTML و BODY 🚨
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("menu-open");
      document.documentElement.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
      document.documentElement.classList.remove("menu-open");
    }
    return () => {
      document.body.classList.remove("menu-open");
      document.documentElement.classList.remove("menu-open");
    };
  }, [isMobileMenuOpen]);

  const getLinkClassName = (href: string) => {
    return pathname === href ? styles.activeLink : "";
  };

  const isParentActive = (paths: string[]) => {
    return paths.some((path) => pathname.startsWith(path));
  };

  return (
    <header className={styles.mainHeader}>
      {/* الشريط العلوي للمعلومات والروابط الثانوية */}
      <div className={styles.topBar}>
        <div className={styles.container}>
          <div className={styles.topBarRight}>
            <Link
              href="/faq"
              className={`${styles.topLink} ${getLinkClassName("/faq")}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الأسئلة الشائعة
            </Link>
            <Link
              href="/contact"
              className={`${styles.topLink} ${getLinkClassName("/contact")}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              تواصل معنا
            </Link>

          </div>
          {/* الروابط على اليسار (في الاتجاه العربي) */}
          <div className={styles.topBarLeft}>
            {isAuthenticated ? (
              <>

                <Link
                  href="/donor/dashboard"
                  className={`${styles.topLink} ${getLinkClassName("/donor/dashboard")}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fas fa-user"></i> &nbsp;{" "}
                  {session?.user?.name || session?.user?.email}
                </Link>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/login" });
                    setIsMobileMenuOpen(false);
                  }}
                  className={`${styles.topLink} ${styles.logoutButton}`}
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className={`${styles.topLink} ${getLinkClassName("/auth/login")}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                تسجيل دخول / تسجيل
              </Link>
            )}
            <Link
              href="/donation-basket"
              className={styles.cartIcon}
              aria-label="سلة التسوق"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className="fas fa-shopping-cart"></i>{" "}
              {getTotalItems() > 0 && <span className={styles.cartCount}>{getTotalItems()}</span>}
            </Link>
          </div>
        </div>
      </div>
      {/* شريط التنقل الرئيسي (Main Nav) */}
      <nav className={styles.mainNav}>
        <div className={styles.container}>
          {/* Logo */}
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
          {/* authIconMobile و hamburgerMenu */}
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

              <Link href="/" className={getLinkClassName("/")}>
                الصفحة الرئيسية
              </Link>
            </li>

            <li // تفعيل الـ Active State للـ li الأب
              className={`${styles.hasDropdown} ${isParentActive(["/about", "/about/"]) ? styles.activeLinkParent : ""
                }`}
            >

              <Link href="/about" className={getLinkClassName("/about")}>
                من نحن
              </Link>

              <ul className={styles.dropdownMenu}>

                <li>
                  <Link href="/about/vision" className={getLinkClassName("/about/vision")}>
                    رؤيتنا
                  </Link>

                </li>
<li>
 <Link href="/about/founder" className={getLinkClassName("/about/founder")}>
                    عن المؤسس
                  </Link>
                </li>

                {/* <li>
                  <Link href="/about/team" className={getLinkClassName("/about/team")}>
                    فريقنا
                  </Link>

                </li> */}

              </ul>
            </li>
            <li // تفعيل الـ Active State للـ li الأب
              className={`${styles.hasDropdown} ${isParentActive(["/cases", "/cases/"]) ? styles.activeLinkParent : ""
                }`}
            >

              <Link
                href="/cases"
                className={`${styles.navLink} ${styles.btn} ${styles.btnCtaPrimary
                  } ${getLinkClassName("/cases")}`}
              >
                الحالات
              </Link>

              <ul className={styles.dropdownMenu}>

                <li>
                  <Link href="/cases" className={getLinkClassName("/cases")}>
                    تصفح كل الحالات
                  </Link>

                </li>

                <li>
                  <Link
                    href="/cases?type=schools"
                    className={getLinkClassName("/cases?type=schools")}
                  >
                    تصفح المدارس
                  </Link>

                </li>

                <li>
                  <Link
                    href="/cases?type=mosques"
                    className={getLinkClassName("/cases?type=mosques")}
                  >
                    تصفح المساجد
                  </Link>

                </li>
              </ul>
            </li>
            <li>

              <Link
                href="/support-staff"
                className={`${styles.navLink} ${styles.btn} ${styles.btnCtaPrimary
                  } ${getLinkClassName("/support-staff")}`}
              >
                ادعم الكادر
              </Link>
            </li>
            <li>

              <Link
                href="/request-documentation"
                className={getLinkClassName("/request-documentation")}
              >
                طلب توثيق المؤسسة
              </Link>
            </li>
            {/* <li>

              <Link href="/latest-donors" className={getLinkClassName("/latest-donors")}>
                آخر المتبرعين
              </Link>
            </li> */}
          </ul>
        </div>
      </nav>
      {/* القائمة الجانبية للموبايل */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.active : ""}`}>

        <button className={styles.closeMobileMenu} onClick={toggleMobileMenu}>
          &times;
        </button>

        <ul className={styles.mobileNavLinks}>

          {/* 🟢 رابط الدخول/لوحة التحكم 🟢 */}
          {isAuthenticated ? (
            <li>
              <Link
                href="/donor/dashboard"
                onClick={toggleMobileMenu}
                className={`${styles.mobileAuthLink} ${getLinkClassName("/donor/dashboard")}`}
              >
                <i className="fas fa-user"></i> &nbsp; لوحة التحكم
              </Link>
            </li>
          ) : (
            <li>
              <Link
                href="/auth/login"
                onClick={toggleMobileMenu}
                className={`${styles.mobileAuthLink} ${getLinkClassName("/auth/login")}`}
              >
                <i className="fas fa-sign-in-alt"></i> &nbsp; تسجيل دخول / تسجيل
              </Link>
            </li>
          )}
          <li>
            <Link href="/" onClick={toggleMobileMenu} className={getLinkClassName("/")}>
              الصفحة الرئيسية
            </Link>

          </li>

          <li
            className={`${styles.hasDropdown} ${openMobileDropdown === 0 ? styles.open : ""} ${isParentActive(["/about", "/about/"]) ? styles.activeLinkParent : ""
              }`}
          >
            <Link
              href="/about"
              className={`${styles.mobileNavLink} ${getLinkClassName("/about")}`}
              onClick={(e) => {
                // يمنع التنقل إذا كانت القائمة مغلقة لفتح الدروب داون بدلاً من ذلك
                if (openMobileDropdown !== 0) {
                  e.preventDefault();
                }
                toggleMobileDropdown(0);
              }}
            >
              من نحن
              <span
                className={`${styles.dropdownArrow} ${openMobileDropdown === 0 ? styles.arrowRotate : ""
                  }`}
              ></span>
            </Link>
            {openMobileDropdown === 0 && (
              <ul className={styles.mobileDropdownMenu}>

                <li>
                  <Link
                    href="/about/vision"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/about/vision")}
                  >
                    رؤيتنا
                  </Link>

                </li>

                <li>
                  <Link
                    href="/about/founder"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/about/founder")}
                  >
                    عن المؤسس
                  </Link>

                </li>

                {/* <li>
                  <Link
                    href="/about/team"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/about/team")}
                  >
                    فريقنا
                  </Link>

                </li> */}

              </ul>
            )}

          </li>

          <li
            className={`${styles.hasDropdown} ${openMobileDropdown === 1 ? styles.open : ""} ${isParentActive(["/cases", "/cases/"]) ? styles.activeLinkParent : ""
              }`}
          >
            <Link
              href="/cases"
              className={`${styles.mobileNavLink} ${styles.btn} ${styles.btnCtaPrimary
                } ${getLinkClassName("/cases")}`}
              onClick={(e) => {
                if (openMobileDropdown !== 1) {
                  e.preventDefault();
                }
                toggleMobileDropdown(1);
              }}
            >
              الحالات
              <span
                className={`${styles.dropdownArrow} ${openMobileDropdown === 1 ? styles.arrowRotate : ""
                  }`}
              ></span>
            </Link>
            {openMobileDropdown === 1 && (
              <ul className={styles.mobileDropdownMenu}>

                <li>
                  <Link
                    href="/cases"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/cases")}
                  >
                    تصفح كل الحالات
                  </Link>

                </li>

                <li>
                  <Link
                    href="/cases?type=schools"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/cases?type=schools")}
                  >
                    تصفح المدارس
                  </Link>

                </li>

                <li>
                  <Link
                    href="/cases?type=mosques"
                    onClick={toggleMobileMenu}
                    className={getLinkClassName("/cases?type=mosques")}
                  >
                    تصفح المساجد
                  </Link>

                </li>

              </ul>
            )}

          </li>

          <li>
            <Link
              href="/support-staff"
              className={`${styles.btn} ${styles.btnCtaPrimary} ${getLinkClassName(
                "/support-staff"
              )}`}
              onClick={toggleMobileMenu}
            >
              ادعم الكادر
            </Link>

          </li>
          <li>
            <Link
              href="/request-documentation"
              onClick={toggleMobileMenu}
              className={getLinkClassName("/request-documentation")}
            >
              طلب توثيق المؤسسة
            </Link>
          </li>
          {/* <li>
            <Link
              href="/latest-donors"
              onClick={toggleMobileMenu}
              className={getLinkClassName("/latest-donors")}
            >
              آخر المتبرعين
            </Link>
          </li> */}

          <li>
            <Link
              href="/contact"
              onClick={toggleMobileMenu}
              className={getLinkClassName("/contact")}
            >
              تواصل معنا
            </Link>
          </li>
          <li>
            <Link href="/faq" onClick={toggleMobileMenu} className={getLinkClassName("/faq")}>
              الأسئلة الشائعة
            </Link>
          </li>

          {/* 🟢 زر تسجيل الخروج في النهاية 🟢 */}
          {isAuthenticated && (
            <>
              <li>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/login" });
                    toggleMobileMenu();
                  }}
                  className={`${styles.logoutButton} ${styles.mobileLogoutButton}`}
                >
                  تسجيل الخروج
                </button>
              </li>
            </>
          )}

        </ul>
      </div>
      {/* زر السلة العائم للموبايل */}
      <Link
        href="/donation-basket"
        className={styles.fixedMobileCart}
        aria-label="سلة التسوق"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <i className="fas fa-shopping-cart"></i>
        {getTotalItems() > 0 && <span className={styles.cartCountFixed}>{getTotalItems()}</span>}
      </Link>
      <div
        className={`${styles.overlay} ${isMobileMenuOpen ? styles.active : ""}`}
        onClick={toggleMobileMenu}
      ></div>
    </header>
  );
};

export default Header;