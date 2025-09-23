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

const DonorDashboardOverviewPage: React.FC = () => {
    const { data: session, status } = useSession();
    const { formatCurrency } = useLocale();
    const router = useRouter();

    // القيم الأولية الآن هي null لتعكس حالة عدم وجود بيانات بعد
    const [summaryData, setSummaryData] = useState<DonorSummaryData | null>(null);
    const [donations, setDonations] = useState<Donation[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');

    const isAuthenticated = status === "authenticated";
    const isLoadingAuth = status === "loading";

    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            signOut({ redirect: true, callbackUrl: '/auth/login' });
            return;
        }

        if (isAuthenticated && session?.user) {

            // وظيفة لجلب قائمة التبرعات
            const fetchDonorDonations = async () => {
                setError('');
                try {
                    const response = await fetch('/api/sanad-donations', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    if (!response.ok) {
                        const contentType = response.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'فشل جلب قائمة التبرعات.');
                        } else {
                            throw new Error('حدث خطأ في الخادم: استجابة غير متوقعة.');
                        }
                    }
                    const data = await response.json();
                    
                    if (data.ok && data.donations) {
                        setDonations(data.donations);
                        
                        // ✨ حساب بيانات الملخص من قائمة التبرعات
                        const totalDonationsAmount = data.donations.reduce((sum: number, donation: Donation) => sum + donation.amount, 0);
                        const supportedProjectsCount = new Set(data.donations.map((d: Donation) => d.caseName)).size;
                        const lastDonationStatus = data.donations.length > 0 ? data.donations[0].status : 'غير متوفر';
                        
                        setSummaryData({
                            totalDonationsAmount,
                            supportedProjectsCount,
                            lastDonationStatus
                        });

                    } else {
                        throw new Error('بيانات غير صحيحة من الخادم.');
                    }
                } catch (err: any) {
                    setError(err.message || 'حدث خطأ أثناء جلب قائمة التبرعات.');
                    console.error('Error fetching donor donations:', err);
                } finally {
                    setIsLoadingData(false);
                }
            };
            
            fetchDonorDonations();
        }
    }, [isAuthenticated, isLoadingAuth, session, router]);

    if (isLoadingData) {
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
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContent}>
            <h1 className={styles.pageTitle}>مرحباً بك، {session?.user?.name || session?.user?.email || 'متبرع'}!</h1>
            <p className={styles.pageDescription}>
                هنا يمكنك متابعة نشاطك في &quot;سند&quot; والاطلاع على أحدث المشاريع والإنجازات.
            </p>

            {/* قسم موجز لأنشطة المتبرع */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <h3>إجمالي تبرعاتك</h3>
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
            
            {/* 🌟 قسم جديد لعرض قائمة التبرعات */}
            <div className={styles.donationsSection}>
                <h2 className={styles.sectionTitle}>آخر تبرعاتك</h2>
                {donations === null ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>جاري تحميل قائمة تبرعاتك...</p>
                    </div>
                ) : (
                    donations.length > 0 ? (
                        <ul className={styles.donationsList}>
                            {donations.map((donation, index) => (
                                <li key={index} className={styles.donationItem}>
                                    <div className={styles.donationDetails}>
                                        <span className={styles.donationAmount}>{formatCurrency(donation.amount)}</span>
                                        <span className={styles.donationCase}>لصالح مشروع: {donation.caseName || 'غير محدد'}</span>
                                    </div>
                                    <div className={styles.donationStatus}>الحالة: {donation.status || 'غير محدد'}</div>
                                    <div className={styles.donationDate}>التاريخ: {new Date(donation.donationDate).toLocaleDateString()}</div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.noDataMessage}>لم تقم بأي تبرعات حتى الآن.</p>
                    )
                )}
            </div>

        </div>
    );
};

export default DonorDashboardOverviewPage;
