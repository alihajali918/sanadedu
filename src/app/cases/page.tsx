// src/app/cases/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { getCases } from 'lib/api';
import styles from './page.module.css';
import { CaseItem } from 'lib/types';

export const runtime = 'nodejs';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmtNum = new Intl.NumberFormat('en-US');
const fmtMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// دالة مساعده لتنظيف النص والتحقق من 'قريباً'
const isComingSoonChecker = (needLevel: string | undefined): boolean => {
    const needLevelClean = String(needLevel || '').trim();
    return needLevelClean === 'قريباً' || needLevelClean === 'قريبا';
};

const CaseCardContent = ({ caseItem }: { caseItem: CaseItem }) => {
    const progress = Math.max(0, Math.min(100, caseItem.progress || 0));
    const raised = caseItem.fundRaised || 0;
    const needed = caseItem.fundNeeded || 0;
    const remaining = Math.max(0, needed - raised);
    const isComingSoon = isComingSoonChecker(caseItem.needLevel);
    const isUrgent = caseItem.needLevel === 'عالي'; 

    return (
        <div 
            key={caseItem.id} 
            className={`${styles.caseCard} ${isUrgent ? styles.urgentCase : ''}`.trim()}
        >
            <div className={styles.caseImageWrapper}>
                {Array.isArray(caseItem.images) && caseItem.images[0] && (
                    <Image
                        src={caseItem.images[0]}
                        alt={caseItem.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        className={styles.caseImage}
                    />
                )}
            </div>

            <div className={styles.caseContent}>
                <h3 className={styles.caseTitle}>{caseItem.title}</h3>
                <p className={styles.caseGovernorate}>
                    <i className="fas fa-map-marker-alt" /> {caseItem.governorate}، {caseItem.city}
                </p>
                <p className={styles.caseNeedLevel}>
                    <i className="fas fa-exclamation-circle" /> درجة الاحتياج: {caseItem.needLevel}
                </p>
                <p className={styles.caseDescription}>{caseItem.description}</p>

                <div className={styles.caseProgressBarWrapper} aria-label={`نسبة التقدم ${progress}%`}>
                    <div className={styles.caseProgressBar} style={{ width: `${progress}%` }} />
                </div>

                <div className={styles.caseStats}>
                    <span>تم جمع: {fmtMoney.format(raised)}</span>
                    <span>المتبقي: {fmtMoney.format(remaining)}</span>
                    <span>% {fmtNum.format(progress)}</span>
                </div>

                {isComingSoon ? (
                    <span className={`${styles.btn} ${styles.btnComingSoon} ${styles.caseCardBtn}`}>
                        قريباً ...
                    </span>
                ) : (
                    <Link
                        href={`/cases/${caseItem.id}`}
                        className={`${styles.btn} ${styles.btnCtaPrimary} ${styles.caseCardBtn}`}
                    >
                        ادعم الآن
                    </Link>
                )}
            </div>
        </div>
    );
};


const CasesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
    const sp = await searchParams;
    const params = new URLSearchParams();

    // فلاتر (بدون تغيير)
    const typeParam = Array.isArray(sp?.type) ? sp.type[0] : sp?.type;
    const type = (typeParam || '').toLowerCase();
    if (type === 'schools' || type === 'mosques') {
        params.set('type', type);
    }
    const perPage = Array.isArray(sp?.per_page) ? sp.per_page[0] : sp?.per_page;
    if (perPage) params.set('per_page', String(perPage));
    const page = Array.isArray(sp?.page) ? sp.page[0] : sp?.page;
    if (page) params.set('page', String(page));
    const search = Array.isArray(sp?.search) ? sp.search[0] : sp?.search;
    if (search) params.set('search', String(search));

    // جلب الحالات
    const allCases: CaseItem[] = await getCases(params);

    // 🛑 [التقسيم المطلوب]: فصل الحالات إلى ثلاث مجموعات
    const urgentCases: CaseItem[] = [];
    const comingSoonCases: CaseItem[] = [];
    const normalCases: CaseItem[] = [];

    allCases.forEach(caseItem => {
        const isComingSoon = isComingSoonChecker(caseItem.needLevel);
        const isUrgent = caseItem.needLevel === 'عالي'; // العاجل

        if (isUrgent) {
            urgentCases.push(caseItem);
        } else if (isComingSoon) {
            comingSoonCases.push(caseItem);
        } else {
            normalCases.push(caseItem);
        }
    });

    // عنوان الصفحة والرسالة الفارغة
    const emptyMessage =
        type === 'mosques' ? 'لا توجد مساجد حالياً.'
            : type === 'schools' ? 'لا توجد مدارس حالياً.'
                : 'لا توجد حالات حالياً.';

    return (
        <main className={styles.casesPageContent}>
            <section className={`${styles.browseCasesSection} ${styles.py80} ${styles.bgLightGrey}`}>
                <div className={styles.container}>
                    <div className={styles.headerRow}>
                        <h2 className={`${styles.sectionTitle} ${styles.textCenter} ${styles.mb60}`}>
                            المؤسسات التعليمية والدينية المحتاجة للدعم
                        </h2>
                    </div>

                    {allCases.length === 0 ? (
                        <p className={`${styles.textCenter} ${styles.noCasesMessage}`}>{emptyMessage}</p>
                    ) : (
                        <>
                            {/* 1. 🚨 قسم الحالات العاجلة (صف لحالها) 🚨 */}
                            {urgentCases.length > 0 && (
                                <div className={`${styles.categorySection} ${styles.urgentCategory} ${styles.mb50}`}>
                                    <div className={styles.casesGrid}>
                                        {urgentCases.map(caseItem => (
                                            <CaseCardContent key={caseItem.id} caseItem={caseItem} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. 📚 قسم الحالات العادية 📚 */}
                            {normalCases.length > 0 && (
                                <div className={`${styles.categorySection} ${styles.normalCategory} ${styles.mb50}`}>
                                    <h3 className={`${styles.sectionSubtitle} ${styles.mb30}`}>حالات مفتوحة للدعم</h3>
                                    <div className={styles.casesGrid}>
                                        {normalCases.map(caseItem => (
                                            <CaseCardContent key={caseItem.id} caseItem={caseItem} />
                                        ))}
                                      
                                    </div>
                                </div>
                            )}

                            {/* 3. ⏳ قسم قريباً (صف لحالها) ⏳ */}
                            {comingSoonCases.length > 0 && (
                                <div className={`${styles.categorySection} ${styles.comingSoonCategory}`}><br/>
                                    <div className={styles.casesGrid}>
                                        {comingSoonCases.map(caseItem => (
                                            <CaseCardContent key={caseItem.id} caseItem={caseItem} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default CasesPage;