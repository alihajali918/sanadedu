'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLocale } from '@/app/context/LocaleContext';
import styles from './dashboard.module.css';

// ---- الأنواع ----
interface DonorSummaryData {
  totalDonationsAmount: number;
  supportedProjectsCount: number;
  lastDonationStatus: string;
}

interface Donation {
  amount: number;
  caseName: string;
  status: string;
  donationDate: string; // ISO
}

const EMPTY_SUMMARY: DonorSummaryData = {
  totalDonationsAmount: 0,
  supportedProjectsCount: 0,
  lastDonationStatus: 'لا توجد تبرعات',
};

const DonorDashboardOverviewPage: React.FC = () => {
  const { data: session, status: authStatus } = useSession();
  const { formatCurrency: formatCurrencyFromCtx } = useLocale();

  // --- حالة الواجهة ---
  const [summaryData, setSummaryData] = useState<DonorSummaryData | null>(null);
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const isAuthenticated = authStatus === 'authenticated';
  const isLoadingAuth = authStatus === 'loading';

  // --- تنسيق التاريخ والعملة ---
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeZone: 'Asia/Qatar' }),
    []
  );
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(+d) ? '—' : dateFmt.format(d);
  };

  // إصلاح TS2554: استخدام دالة السياق بوسيط واحد فقط (amount)
  const safeFormatCurrency = (amount: number, currency = 'QAR') => {
    if (typeof formatCurrencyFromCtx === 'function') {
      try {
        // بعض السياقات قد تقبل وسيطين مستقبلاً؛ نتعامل ديناميكياً بدون كسر الأنواع
        return formatCurrencyFromCtx.length > 1
          ? // @ts-expect-error شرح أعلاه
            formatCurrencyFromCtx(amount, currency)
          : formatCurrencyFromCtx(amount);
      } catch {
        // سقوط للفورمات المحلي بالأسفل
      }
    }
    try {
      return new Intl.NumberFormat('ar-QA', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      signOut({ redirect: true, callbackUrl: '/auth/login' });
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/sanad-donations', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          signal: ac.signal,
        });

        if (!res.ok) {
          let msg = `فشل جلب قائمة التبرعات (الحالة: ${res.status}).`;
          try {
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('application/json')) {
              const j = await res.json();
              msg = j?.error || j?.message || msg;
            }
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();

        // قد يرجع { donations: [] } أو يرجع المصفوفة مباشرة
        const received: Donation[] = Array.isArray(data?.donations)
          ? data.donations
          : Array.isArray(data)
          ? data
          : [];

        // ترتيب تنازلي حسب التاريخ
        const sorted = received
          .filter((d) => d && typeof d.amount === 'number')
          .sort((a, b) => +new Date(b.donationDate) - +new Date(a.donationDate));

        setDonations(sorted);

        if (sorted.length === 0) {
          setSummaryData(EMPTY_SUMMARY);
          return;
        }

        const totalDonationsAmount = sorted.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const supportedProjectsCount = new Set(
          sorted.map((d) => d.caseName).filter((n) => n && n !== 'غير محدد')
        ).size;
        const lastDonationStatus = sorted[0]?.status || 'غير متوفر';

        setSummaryData({
          totalDonationsAmount,
          supportedProjectsCount,
          lastDonationStatus,
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'حدث خطأ أثناء جلب بيانات لوحة التحكم.');
        setDonations([]);
        setSummaryData(EMPTY_SUMMARY);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [isAuthenticated, isLoadingAuth]);

  // --- حالات العرض ---
  if (loading || isLoadingAuth) {
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
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const displayName = session?.user?.name || session?.user?.email || 'متبرع';
  const currentSummary = summaryData || EMPTY_SUMMARY;
  const currentDonations = donations || [];

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.pageTitle}>مرحباً بك، {displayName}!</h1>
      <p className={styles.pageDescription}>
        هنا يمكنك متابعة نشاطك في &quot;سند&quot; والاطلاع على أحدث المشاريع والإنجازات.
      </p>

      {/* موجز المتبرع */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3>إجمالي تبرعاتك</h3>
          <p className={styles.summaryValue}>
            {safeFormatCurrency(currentSummary.totalDonationsAmount)}
          </p>
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

      {/* قائمة التبرعات */}
      <div className={styles.donationsSection}>
        <h2 className={styles.sectionTitle}>آخر تبرعاتك</h2>
        {currentDonations.length > 0 ? (
          <ul className={styles.donationsList}>
            {currentDonations.map((donation, idx) => (
              <li key={`${donation.donationDate}-${idx}`} className={styles.donationItem}>
                <div className={styles.donationDetails}>
                  <span className={styles.donationAmount}>
                    {safeFormatCurrency(donation.amount)}
                  </span>
                  <span className={styles.donationDate}>
                    التاريخ: {formatDate(donation.donationDate)}
                  </span>
                </div>
                <div className={styles.donationCase}>
                  لصالح مشروع: {donation.caseName || 'تبرع تشغيلي/غير محدد'}
                </div>
                <div className={styles.donationStatus}>
                  الحالة: {donation.status || 'غير محدد'}
                </div>
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
