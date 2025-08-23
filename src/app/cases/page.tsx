// src/app/cases/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { getCases } from 'lib/api';
import styles from './page.module.css';
import { CaseItem } from 'lib/types';

// The CaseItem type definition needs to be updated in lib/types.ts
// to include the 'progress' property.

// ✅ تم تعديل نوع searchParams ليكون Promise ليناسب Next.js 15
const CasesPage = async ({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
    // 📝 يجب استخدام await على searchParams للحصول على القيمة الفعلية
    const resolvedSearchParams = await searchParams;

    const allCases: CaseItem[] = await getCases();

    // The filtering logic is disabled, so we just use all cases.
    let filteredCases = allCases;

    // 📝 يمكنك الآن استخدام resolvedSearchParams هنا للتصفية
    // مثال:
    // const statusFilter = resolvedSearchParams?.status;
    // if (statusFilter && typeof statusFilter === 'string') {
    //   filteredCases = allCases.filter(caseItem => caseItem.status === statusFilter);
    // }

    return (
        <main className={styles.casesPageContent}>
            <section className={`${styles.browseCasesSection} ${styles.py80} ${styles.bgLightGrey}`}>
                <div className={styles.container}>
                    <h2 className={`${styles.sectionTitle} ${styles.textCenter} ${styles.mb60}`}>المؤسسات التعليمية والدينية المحتاجة للدعم</h2>

                    {filteredCases.length > 0 ? (
                        <div className={styles.casesGrid}>
                            {filteredCases.map((caseItem) => (
                                <div
                                    key={caseItem.id}
                                    className={`${styles.caseCard} ${caseItem.needLevel === 'عالي' ? styles.urgentCase : ''}`.trim()}
                                >
                                    <div className={styles.caseImageWrapper}>
                                        {/* CORRECTED: Use caseItem.images[0] as an array exists, not a single 'image' */}
                                        {/* This assumes the first image in the array is the one to display on the card */}
                                        {caseItem.images && caseItem.images.length > 0 && (
                                            <Image src={caseItem.images[0]} alt={caseItem.title} fill objectFit="cover" className={styles.caseImage} />
                                        )}
                                    </div>
                                    <div className={styles.caseContent}>
                                        <h3 className={styles.caseTitle}>{caseItem.title}</h3>
                                        <p className={styles.caseGovernorate}><i className="fas fa-map-marker-alt"></i> {caseItem.governorate}</p>
                                        <p className={styles.caseNeedLevel}><i className="fas fa-exclamation-circle"></i> درجة الاحتياج: {caseItem.needLevel}</p>
                                        <p className={styles.caseDescription}>{caseItem.description}</p>

                                        <div className={styles.caseProgressBarWrapper}>
                                            {/* CORRECTED: The 'progress' property now exists on CaseItem */}
                                            <div className={styles.caseProgressBar} style={{ width: `${caseItem.progress}%` }}></div>
                                        </div>
                                        <div className={styles.caseStats}>
                                            <span>تم جمع: ${caseItem.fundRaised.toLocaleString('en-US')}</span>
                                            <span>المتبقي: ${(caseItem.fundNeeded - caseItem.fundRaised).toLocaleString('en-US')}</span>

                                            {/* CORRECTED: The 'progress' property now exists on CaseItem */}
                                            <span>% {caseItem.progress}</span>
                                        </div>
                                        <Link href={`/cases/${caseItem.id}`} className={`${styles.btn} ${styles.btnCtaPrimary} ${styles.caseCardBtn}`}>ادعم الآن</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`${styles.textCenter} ${styles.noCasesMessage}`}>لا توجد حالات مطابقة.</p>
                    )}
                </div>
            </section>
        </main>
    );
};

export default CasesPage;
