// src/app/cases/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getCases } from "lib/api";
import styles from "./page.module.css";
import { CaseItem } from "lib/types";

// ✅ تم تفعيل منطق الفلترة بالكامل
const CasesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const resolvedSearchParams = await searchParams;
  const allCases: CaseItem[] = await getCases();

  const typeFilter = resolvedSearchParams?.type;
  let filteredCases = allCases;

  if (typeFilter && typeof typeFilter === "string") {
    filteredCases = allCases.filter((caseItem) => caseItem.type === typeFilter);
  }
  return (
    <main className={styles.casesPageContent}>
      <section
        className={`${styles.browseCasesSection} ${styles.py80} ${styles.bgLightGrey}`}
      >
        <div className={styles.container}>
                             
          <h2
            className={`${styles.sectionTitle} ${styles.textCenter} ${styles.mb60}`}
          >
            المؤسسات التعليمية والدينية المحتاجة للدعم
          </h2>
                             
          {filteredCases.length > 0 ? (
            <div className={styles.casesGrid}>
                                         
              {filteredCases.map((caseItem) => {
                // ✅ إضافة قيم افتراضية لمنع الأخطاء
                const progress = caseItem.progress || 0;
                const fundRaised = caseItem.fundRaised || 0;
                const fundNeeded = caseItem.fundNeeded || 0;
                const remainingFunds = fundNeeded - fundRaised;

                // ✅ استخدام الصورة الافتراضية إذا لم تكن هناك صور
                const displayImage =
                  caseItem.images && caseItem.images.length > 0
                    ? caseItem.images[0]
                    : "/images/default.jpg";

                return (
                  <div
                    key={caseItem.id}
                    className={`${styles.caseCard} ${
                      caseItem.needLevel === "عالي" ? styles.urgentCase : ""
                    }`.trim()}
                  >
                    <div className={styles.caseImageWrapper}>
                      <Image
                        src={displayImage}
                        alt={caseItem.title}
                        fill
                        objectFit="cover"
                        className={styles.caseImage}
                      />
                    </div>
                    <div className={styles.caseContent}>
                      <h3 className={styles.caseTitle}>{caseItem.title}</h3>
                      <p className={styles.caseGovernorate}>
                        <i className="fas fa-map-marker-alt"></i>
                        {caseItem.governorate}
                      </p>
                      <p className={styles.caseNeedLevel}>
                        <i className="fas fa-exclamation-circle"></i> درجة
                        الاحتياج: {caseItem.needLevel}
                      </p>
                      <p className={styles.caseDescription}>
                        {caseItem.description}
                      </p>

                      <div className={styles.caseProgressBarWrapper}>
                        <div
                          className={styles.caseProgressBar}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className={styles.caseStats}>
                        <span>
                          تم جمع: ${fundRaised.toLocaleString("en-US")}
                        </span>
                        <span>
                          المتبقي: ${remainingFunds.toLocaleString("en-US")}
                        </span>
                        <span>% {progress}</span>
                      </div>
                      <Link
                        href={`/cases/${caseItem.id}`}
                        className={`${styles.btn} ${styles.btnCtaPrimary} ${styles.caseCardBtn}`}
                      >
                        ادعم الآن
                      </Link>
                    </div>
                  </div>
                );
              })}
                                     
            </div>
          ) : (
            <p className={`${styles.textCenter} ${styles.noCasesMessage}`}>
              لا توجد حالات مطابقة.
            </p>
          )}
                         
        </div>
                   
      </section>
             
    </main>
  );
};

export default CasesPage;
