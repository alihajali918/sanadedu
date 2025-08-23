// ==========================================================
// ملف: page.tsx لصفحة "فريقنا"
// الوصف: الصفحة بعد ربطها بملف CSS Module الخاص بها.
// ==========================================================

"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './TeamPage.module.css'; // استيراد الموديول

const TeamPage = () => {
  return (
    <main className={styles.teamPageContent}>
      <div className="container">
        <h1 className={styles.pageTitle}>فريقنا</h1>
        <p className={styles.pageDescription}>
          نحن فريق "سند"، مجموعة من الأفراد المتحمسين والملتزمين، نعمل يداً بيد لتحقيق رؤيتنا في دعم التعليم بسوريا. كل عضو في فريقنا يجلب خبرته وشغفه ليساهم في إحداث فرق حقيقي.
        </p>
        <div className={styles.teamGrid}>
          
          {/* مثال على عضو فريق 1 */}
          <div className={styles.teamMember}>
            <Image src="/images/team-member-1.jpg" alt="صورة أحمد علي" width={200} height={200} className={styles.teamMemberImage} />
            <h3>أحمد نجيب عدل</h3>
            <p>المؤسس والمدير التنفيذي</p>
            <div className={styles.memberSocialIcons}>
              <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            </div>
          </div>

          {/* مثال على عضو فريق 2 */}
          <div className={styles.teamMember}>
            <Image src="/images/team-member-2.jpg" alt="صورة فاطمة الزهراء" width={200} height={200} className={styles.teamMemberImage} />
            <h3>فاطمة الزهراء</h3>
            <p>مديرة المشاريع</p>
            <div className={styles.memberSocialIcons}>
              <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            </div>
          </div>
          
          {/* مثال على عضو فريق 3 */}
          <div className={styles.teamMember}>
            <Image src="/images/team-member-3.jpg" alt="صورة محمد خالد" width={200} height={200} className={styles.teamMemberImage} />
            <h3>محمد خالد</h3>
            <p>مسؤول التوثيق الميداني</p>
            <div className={styles.memberSocialIcons}>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            </div>
          </div>

          {/* مثال على عضو فريق 4 */}
          <div className={styles.teamMember}>
            <Image src="/images/team-member-4.jpg" alt="صورة ليلى حسن" width={200} height={200} className={styles.teamMemberImage} />
            <h3>ليلى حسن</h3>
            <p>مسؤولة التواصل</p>
            <div className={styles.memberSocialIcons}>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
};

export default TeamPage;