// ==========================================================
// FILE: src/components/common/Footer/Footer.tsx
// DESCRIPTION: Footer Component for Sanad Website.
// Includes contact info, quick links, social media, and copyright.
// ==========================================================

"use client"; // Marks this component as a Client Component if it uses useState/useEffect or event listeners (good practice for UI components).

import Link from 'next/link';
import Image from 'next/image'; // For logo if used in footer
import styles from '../Footer/Footer.module.css'; // ✨ استيراد الستايلات ككائن 'styles' ✨

const Footer = () => {
  return (
    <footer className={styles.mainFooter}> {/* ✅ تم التعديل */}
      <div className={`${styles.container} ${styles.footerContent}`}> {/* ✅ تم التعديل */}
        {/* ========================================================== */}
        {/* FOOTER INFO: Logo and Description */}
        {/* ========================================================== */}
        <div className={`${styles.footerSection} ${styles.footerInfo}`}> {/* ✅ تم التعديل */}
          <Link href="/" className={styles.footerLogoContainer}> {/* ✅ تم التعديل */}
            {/* استخدام مكون Image لشعار سند في الفوتر */}
            {/* تأكد من أن sanadlogo.svg موجود في مجلد public/ */}
            <Image src="/sanadlogo.svg" alt="Sanad Logo" width={60} height={46} className={styles.sanadlogoFooter} /> {/* ✅ تم التعديل */}
            <span className={styles.logoText}>سند</span> {/* ✅ تم التعديل */}
          </Link>
          <p className={styles.footerDescription}> {/* ✅ تم التعديل */}
            سند هي منصة إنسانية تهدف إلى ربط المتبرعين بالمؤسسات التعليمية والدينية المحتاجة في سوريا، لضمان مستقبل أفضل لأجيالنا.
          </p>
        </div>

        {/* ========================================================== */}
        {/* FOOTER QUICK LINKS */}
        {/* ========================================================== */}
        <div className={`${styles.footerSection} ${styles.footerLinks}`}> {/* ✅ تم التعديل */}
          <h3>روابط سريعة</h3>
          <ul>
            <li><Link href="/">الصفحة الرئيسية</Link></li>
            <li><Link href="/about">من نحن</Link></li>
            <li><Link href="/cases">الحالات</Link></li>
            <li><Link href="/success-stories">آخر المتبرعين</Link></li>
            <li><Link href="/request-documentation">طلب توثيق مؤسسة</Link></li>
            <li><Link href="/support-staff">ادعم الكادر</Link></li>
          </ul>
        </div>

        {/* ========================================================== */}
        {/* FOOTER CONTACT INFO */}
        {/* ========================================================== */}
        <div className={`${styles.footerSection} ${styles.footerContact}`}> {/* ✅ تم التعديل */}
          <h3>تواصل معنا</h3>
          <p><i className="fas fa-map-marker-alt"></i> بريطانيا / سوريا</p>
          <p><i className="fas fa-phone"></i>7340995735 44+ </p>
          <p><i className="fas fa-envelope"></i> info@sanadedu.org</p>
        </div>

        {/* ========================================================== */}
        {/* FOOTER SOCIAL MEDIA */}
        {/* ========================================================== */}
        <div className={`${styles.footerSection} ${styles.footerSocial}`}> {/* ✅ تم التعديل */}
          <h3>تابعنا</h3>
          <div className={styles.socialIcons}> {/* ✅ تم التعديل */}
            <a href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="https://twitter.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            <a href="https://instagram.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="https://linkedin.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* FOOTER COPYRIGHT BAR */}
      {/* ========================================================== */}
      <div className={styles.footerBottom}> {/* ✅ تم التعديل */}
        <div className={styles.container}> {/* ✅ تم التعديل */}
          <p>&copy; {new Date().getFullYear()} سند. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;