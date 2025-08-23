// ==========================================================
// FILE: src/app/donor/dashboard/page.tsx
// DESCRIPTION: Overview page for the donor dashboard.
// This page provides a welcome message and a summary for the authenticated donor.
// ==========================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext'; // لاستخدام معلومات المستخدم وتوكن المصادقة
import { useLocale } from '@/app/context/LocaleContext'; // لتنسيق العملة والأرقام
import styles from './dashboard.module.css'; // استخدام نفس ستايلات الداشبورد العامة

// تعريف واجهة لبيانات ملخص المتبرع (يمكن توسيعها حسب ما يعيده الـ Backend)
interface DonorSummaryData {
  totalDonationsAmount: number;
  supportedProjectsCount: number;
  lastDonationStatus: string; // يمكن أن يكون تاريخ أو نص يصف الحالة
}

const DonorDashboardOverviewPage: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth(); // جلب معلومات المستخدم وحالة المصادقة
  const { formatCurrency } = useLocale(); // جلب دالة تنسيق العملة
  
  const [summaryData, setSummaryData] = useState<DonorSummaryData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');

  // useEffect لجلب بيانات ملخص المتبرع بعد المصادقة
  useEffect(() => {
    // تأكد من أن المستخدم مصادق عليه وأن بياناته جاهزة
    if (!isLoadingAuth && isAuthenticated && user) {
      const fetchDonorSummary = async () => {
        setIsLoadingData(true);
        setError('');
        try {
          // جلب التوكن من localStorage (أو يمكن تمريره من AuthContext إذا كان متاحاً في السياق)
          const authToken = localStorage.getItem('authToken'); 
          if (!authToken) {
            setError('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
            setIsLoadingData(false);
            return;
          }

          // هذا هو الـ API Endpoint الافتراضي. يجب أن تقوم بإنشائه في WordPress Backend.
          // هذا الـ Endpoint يجب أن يعيد ملخصاً لبيانات المتبرع.
          const response = await fetch('https://sanadedu.org/backend/wp-json/sanad/v1/donor/summary', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`, // إرسال التوكن للمصادقة
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل جلب بيانات الملخص.');
          }

          const data: DonorSummaryData = await response.json();
          setSummaryData(data);
        } catch (err) {
          setError(err.message || 'حدث خطأ أثناء جلب بيانات الملخص.');
          console.error('Error fetching donor summary:', err);
        } finally {
          setIsLoadingData(false);
        }
      };

      fetchDonorSummary();
    }
  }, [isAuthenticated, isLoadingAuth, user]); // يعاد تشغيله عند تغير حالة المصادقة أو بيانات المستخدم

  // عرض حالة التحميل
  if (isLoadingData) {
    return (
      <div className={styles.dashboardContent}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>جاري تحميل ملخص حسابك...</p>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ
  if (error) {
    return (
      <div className={styles.dashboardContent}>
        <div className={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.pageTitle}>مرحباً بك، {user?.name || user?.email}!</h1>
      <p className={styles.pageDescription}>
        هنا يمكنك متابعة نشاطك في &quot;سند&quot; والاطلاع على أحدث المشاريع والإنجازات.
      </p>

      {/* قسم موجز لأنشطة المتبرع */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3>إجمالي تبرعاتك</h3>
          {/* استخدام formatCurrency لتنسيق المبلغ */}
          <p className={styles.summaryValue}>{summaryData ? formatCurrency(summaryData.totalDonationsAmount) : formatCurrency(0)}</p> 
          <p className={styles.summaryLabel}>المبلغ الإجمالي الذي ساهمت به.</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>مشاريعك المدعومة</h3>
          <p className={styles.summaryValue}>{summaryData ? summaryData.supportedProjectsCount : 0}</p> 
          <p className={styles.summaryLabel}>عدد المشاريع التي دعمتها حتى الآن.</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>حالة آخر تبرع</h3>
          <p className={styles.summaryValue}>{summaryData ? summaryData.lastDonationStatus : 'غير متوفر'}</p> 
          <p className={styles.summaryLabel}>آخر تبرع لك حالياً في مرحلة التنفيذ.</p>
        </div>
      </div>

      {/* يمكن إضافة المزيد من الأقسام هنا مثل:
          - آخر الأخبار من سند
          - المشاريع المقترحة لك
          - رابط سريع لتبرع جديد
      */}
    </div>
  );
};

export default DonorDashboardOverviewPage;
