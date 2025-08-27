// ==========================================================
// FILE: src/app/donor/dashboard/page.tsx
// DESCRIPTION: Overview page for the donor dashboard.
// This page provides a welcome message and a summary for the authenticated donor.
// ==========================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react'; // <--- تم التعديل: استخدام useSession و signOut من NextAuth
import { useLocale } from '@/app/context/LocaleContext'; // لتنسيق العملة والأرقام
import styles from './dashboard.module.css'; // استخدام نفس ستايلات الداشبورد العامة
import { useRouter } from 'next/navigation'; // لاستخدام useRouter لإعادة التوجيه

// تعريف واجهة لبيانات ملخص المتبرع (يمكن توسيعها حسب ما يعيده الـ Backend)
interface DonorSummaryData {
    totalDonationsAmount: number;
    supportedProjectsCount: number;
    lastDonationStatus: string; // يمكن أن يكون تاريخ أو نص يصف الحالة
}

// 🚀 استخدام متغير البيئة لعنوان الـ API الأساسي
// تأكد من أن NEXT_PUBLIC_WORDPRESS_API_URL مضبوط في ملف .env
const WORDPRESS_API_ROOT = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://cms.sanadedu.org/wp-json';

const DonorDashboardOverviewPage: React.FC = () => {
    // const { user, isAuthenticated, isLoadingAuth } = useAuth(); // <--- تم الإزالة: لم نعد نستخدم useAuth
    const { data: session, status } = useSession(); // <--- جديد: استخدام useSession
    const { formatCurrency } = useLocale(); // جلب دالة تنسيق العملة
    const router = useRouter(); // لاستخدام useRouter لإعادة التوجيه

    const [summaryData, setSummaryData] = useState<DonorSummaryData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');

    const isAuthenticated = status === "authenticated"; // تعريف isAuthenticated بناءً على status
    const isLoadingAuth = status === "loading"; // تعريف isLoadingAuth بناءً على status

    // useEffect لجلب بيانات ملخص المتبرع بعد المصادقة
    useEffect(() => {
        // إذا لم يتم التحقق من المصادقة بعد، أو لم يكن المستخدم مصادقاً عليه، أعد التوجيه
        if (!isLoadingAuth && !isAuthenticated) {
            signOut({ redirect: true, callbackUrl: '/auth/login' });
            return;
        }

        // تأكد من أن المستخدم مصادق عليه وأن بياناته جاهزة
        if (isAuthenticated && session?.user) { // <--- استخدام session.user بدلاً من user القديم
            const fetchDonorSummary = async () => {
                setIsLoadingData(true);
                setError('');
                try {
                    // جلب التوكن من جلسة NextAuth
                    const authToken = session.user.wordpressJwt; // <--- استخدام wordpressJwt من جلسة NextAuth
                    if (!authToken) {
                        setError('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
                        setIsLoadingData(false);
                        return;
                    }

                    // 🚀 تم تحديث هذا السطر لاستخدام متغير البيئة `WORDPRESS_API_ROOT`
                    // يضيف الجزء المتبقي من المسار للـ endpoint المحدد.
                    const apiUrl = `${WORDPRESS_API_ROOT}/sanad/v1/donor/summary`;

                    const response = await fetch(apiUrl, {
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
                } catch (err: any) { // تم إضافة "any" لتجنب خطأ TypeScript
                    setError(err.message || 'حدث خطأ أثناء جلب بيانات الملخص.');
                    console.error('Error fetching donor summary:', err);
                    signOut({ redirect: true, callbackUrl: '/auth/login' }); // <--- استخدام signOut لإعادة التوجيه
                } finally {
                    setIsLoadingData(false);
                }
            };

            fetchDonorSummary();
        }
    }, [isAuthenticated, isLoadingAuth, session, router]); // <--- تم تعديل التبعيات

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
            <h1 className={styles.pageTitle}>مرحباً بك، {session?.user?.name || session?.user?.email || 'متبرع'}!</h1> {/* <--- استخدام session.user */}
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
