'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLocale } from '@/app/context/LocaleContext';
import styles from './dashboard.module.css';
import { useRouter } from 'next/navigation';

// تعريف واجهة لبيانات ملخص المتبرع
interface DonorSummaryData {
    totalDonationsAmount: number;
    supportedProjectsCount: number;
    lastDonationStatus: string;
}

// واجهة لبيانات التبرع الفردي
interface Donation {
    amount: number;
    caseName: string;
    status: string;
    donationDate: string;
}

// قيمة أولية ثابتة لملخص المتبرع في حالة عدم وجود بيانات
const EMPTY_SUMMARY: DonorSummaryData = {
    totalDonationsAmount: 0,
    supportedProjectsCount: 0,
    lastDonationStatus: 'لا توجد تبرعات',
};

const DonorDashboardOverviewPage: React.FC = () => {
    const { data: session, status } = useSession();
    const { formatCurrency } = useLocale();
    const router = useRouter();

    // القيمة الأولية هي null للدلالة على عدم انتهاء التحميل
    const [summaryData, setSummaryData] = useState<DonorSummaryData | null>(null);
    const [donations, setDonations] = useState<Donation[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');

    const isAuthenticated = status === "authenticated";
    const isLoadingAuth = status === "loading";

    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            // توجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مصادقاً
            signOut({ redirect: true, callbackUrl: '/auth/login' });
            return;
        }

        if (isAuthenticated && session?.user) {

            // وظيفة لجلب قائمة التبرعات
            const fetchDonorDonations = async () => {
                setError('');
                setIsLoadingData(true); // ابدأ التحميل
                try {
                    // يجب أن يتضمن طلب API userId أو آلية مصادقة لاسترجاع تبرعات المستخدم
                    const response = await fetch('/api/sanad-donations', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            // قد تحتاج هنا لإرسال التوكن/المصادقة الخاصة بـ Sanad API إذا لم يكن Next-Auth كافياً
                        },
                    });
                    
                    if (!response.ok) {
                        const contentType = response.headers.get("content-type");
                        let errorMsg = 'فشل جلب قائمة التبرعات: استجابة غير متوقعة.';
                        
                        if (contentType && contentType.includes("application/json")) {
                            const errorData = await response.json();
                            errorMsg = errorData.error || errorData.message || errorMsg;
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    const data = await response.json();
                    
                    // 🚨 تأكد أن الـ API الخلفي يرجع مصفوفة التبرعات تحت مفتاح 'donations' 
                    // وإلا قد تحتاج لتغيير data.donations إلى data إذا كان يرجع المصفوفة مباشرة
                    const receivedDonations: Donation[] = Array.isArray(data.donations) ? data.donations : [];

                    if (receivedDonations.length > 0) {
                        setDonations(receivedDonations);
                        
                        // ✨ حساب بيانات الملخص من قائمة التبرعات
                        const totalDonationsAmount = receivedDonations.reduce((sum: number, donation: Donation) => sum + donation.amount, 0);
                        
                        // جمع أسماء المشاريع (caseName) الفريدة
                        const supportedProjectsCount = new Set(receivedDonations.map(d => d.caseName).filter(name => name && name !== 'غير محدد')).size;
                        
                        // آخر تبرع هو أول عنصر (نفترض أن القائمة مرتبة تنازليًا حسب التاريخ)
                        const lastDonationStatus = receivedDonations[0].status || 'غير متوفر';
                        
                        setSummaryData({
                            totalDonationsAmount,
                            supportedProjectsCount,
                            lastDonationStatus
                        });

                    } else {
                        // حالة عدم وجود تبرعات
                        setDonations([]);
                        setSummaryData(EMPTY_SUMMARY);
                    }

                } catch (err: any) {
                    setError(err.message || 'حدث خطأ غير متوقع أثناء جلب قائمة التبرعات.');
                    setDonations([]);
                    setSummaryData(EMPTY_SUMMARY);
                    console.error('Error fetching donor donations:', err);
                } finally {
                    setIsLoadingData(false);
                }
            };
            
            fetchDonorDonations();
        }
        // إضافة setDonations و setSummaryData كـ dependencies لمنع ESLint warnings 
        // رغم أنهما يتم تعيينهما داخل الدالة fetchDonorDonations
    }, [isAuthenticated, isLoadingAuth, session, router]);

    if (isLoadingData || isLoadingAuth) {
        return (
            <div className={styles.dashboardContent}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>جاري تحميل بيانات حسابك...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.dashboardContent}>
                <div className={styles.errorMessage}>
                    <p>عفواً، لم نتمكن من عرض لوحة التحكم.</p>
                    <p className={styles.errorDetails}>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className={styles.retryButton}
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }
    
    // تأكد من وجود البيانات قبل عرضها
    const displayName = session?.user?.name || session?.user?.email || 'متبرع';
    const currentSummary = summaryData || EMPTY_SUMMARY;
    const currentDonations = donations || [];

    return (
        <div className={styles.dashboardContent}>
            <h1 className={styles.pageTitle}>مرحباً بك، {displayName}!</h1>
            <p className={styles.pageDescription}>
                هنا يمكنك متابعة نشاطك في &quot;سند&quot; والاطلاع على أحدث المشاريع والإنجازات.
            </p>

            {/* قسم موجز لأنشطة المتبرع */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <h3>إجمالي تبرعاتك</h3>
                    <p className={styles.summaryValue}>{formatCurrency(currentSummary.totalDonationsAmount)}</p>
                    <p className={styles.summaryLabel}>المبلغ الإجمالي الذي ساهمت به.</p>
                </div>
                <div className={styles.summaryCard}>
                    <h3>مشاريعك المدعومة</h3>
                    <p className={styles.summaryValue}>{currentSummary.supportedProjectsCount}</p>
                    <p className={styles.summaryLabel}>عدد المشاريع التي دعمتها حتى الآن.</p>
                </div>
                <div className={styles.summaryCard}>
                    <h3>حالة آخر تبرع</h3>
                    <p className={styles.summaryValue}>{currentSummary.lastDonationStatus}</p>
                    <p className={styles.summaryLabel}>آخر تبرع لك حالياً في مرحلة التنفيذ.</p>
                </div>
            </div>
            
            {/* 🌟 قسم جديد لعرض قائمة التبرعات */}
            <div className={styles.donationsSection}>
                <h2 className={styles.sectionTitle}>آخر تبرعاتك</h2>
                {currentDonations.length > 0 ? (
                    <ul className={styles.donationsList}>
                        {currentDonations.map((donation, index) => (
                            <li key={index} className={styles.donationItem}>
                                <div className={styles.donationDetails}>
                                    <span className={styles.donationAmount}>{formatCurrency(donation.amount)}</span>
                                    {/* التأكد من تنسيق التاريخ بشكل آمن */}
                                    <span className={styles.donationDate}>التاريخ: {new Date(donation.donationDate).toLocaleDateString() || 'غير متوفر'}</span>
                                </div>
                                <div className={styles.donationCase}>لصالح مشروع: {donation.caseName || 'تبرع تشغيلي/غير محدد'}</div>
                                <div className={styles.donationStatus}>الحالة: {donation.status || 'غير محدد'}</div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.noDataMessage}>لم تقم بأي تبرعات حتى الآن.</p>
                )}
            </div>

        </div>
    );
};

export default DonorDashboardOverviewPage;
