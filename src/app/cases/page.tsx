// src/app/cases/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getCases } from "lib/api";
import styles from "./page.module.css";
import { CaseItem } from "lib/types";

// نضمن بيئة Node (تفيد للاتصالات الداخلية مع WP)
export const runtime = "nodejs";

// ✅ Next.js 15: searchParams هو Promise
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CasesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  // نفكّ الـ Promise
  const sp = await searchParams;

  // نبني URLSearchParams لتمريرها إلى getCases
  const params = new URLSearchParams();

  // فلترة النوع: schools | mosques | (بدون → الكل)
  const typeParam = Array.isArray(sp?.type) ? sp.type[0] : sp?.type;
  const type = (typeParam || "").toLowerCase();
  if (type === "schools" || type === "mosques") {
    params.set("type", type);
  }

  // تقدر تضيف فلاتر أخرى مثل الصفحة/البحث
  const perPage = Array.isArray(sp?.per_page) ? sp.per_page[0] : sp?.per_page;
  if (perPage) params.set("per_page", String(perPage));
  const page = Array.isArray(sp?.page) ? sp.page[0] : sp?.page;
  if (page) params.set("page", String(page));
  const search = Array.isArray(sp?.search) ? sp.search[0] : sp?.search;
  if (search) params.set("search", String(search));

  // نجلب الحالات حسب الفلاتر
  const allCases: CaseItem[] = await getCases(params);

  // عنوان الصفحة والرسالة الفارغة حسب النوع
  const title =
    type === "mosques"
      ? "المساجد"
      : type === "schools"
      ? "المدارس"
      : "كل الحالات";

  const emptyMessage =
    type === "mosques"
      ? "لا توجد مساجد حالياً."
      : type === "schools"
      ? "لا توجد مدارس حالياً."
      : "لا توجد حالات حالياً.";

  // مهيئ أرقام/عملة بسيط
  const fmtNum = new Intl.NumberFormat("en-US");
  const fmtMoney = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <main className={styles.casesPageContent}>
      <section
        className={`${styles.browseCasesSection} ${styles.py80} ${styles.bgLightGrey}`}
      >
        <div className={styles.container}>
          <div className={styles.headerRow}>
            <h2
              className={`${styles.sectionTitle} ${styles.textCenter} ${styles.mb60}`}
            >
              المؤسسات التعليمية والدينية المحتاجة للدعم
            </h2>
            <div className={styles.filtersRow}>
              <Link href="/cases" className={styles.filterLink}>
                الكل
              </Link>
              <Link href="/cases?type=schools" className={styles.filterLink}>
                تصفّح المدارس
              </Link>
              <Link href="/cases?type=mosques" className={styles.filterLink}>
                تصفّح المساجد
              </Link>
            </div>
            <h3 className={styles.listTitle}>{title}</h3>
          </div>

          {allCases.length > 0 ? (
            <div className={styles.casesGrid}>
              {allCases.map((caseItem) => {
                const progress = Math.max(
                  0,
                  Math.min(100, caseItem.progress || 0)
                );
                const raised = caseItem.fundRaised || 0;
                const needed = caseItem.fundNeeded || 0;
                const remaining = Math.max(0, needed - raised);

                return (
                  <div
                    key={caseItem.id}
                    className={`${styles.caseCard} ${
                      caseItem.needLevel === "عالي" ? styles.urgentCase : ""
                    }`.trim()}
                  >
                    <div className={styles.caseImageWrapper}>
                      {Array.isArray(caseItem.images) && caseItem.images[0] && (
                        <Image
                          src={caseItem.images[0]}
                          alt={caseItem.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          style={{ objectFit: "cover" }}
                          className={styles.caseImage}
                        />
                      )}
                    </div>

                    <div className={styles.caseContent}>
                      <h3 className={styles.caseTitle}>{caseItem.title}</h3>
                      <p className={styles.caseGovernorate}>
                        <i className="fas fa-map-marker-alt" />{" "}
                        {caseItem.governorate}، {caseItem.city}
                      </p>
                      <p className={styles.caseNeedLevel}>
                        <i className="fas fa-exclamation-circle" /> درجة
                        الاحتياج: {caseItem.needLevel}
                      </p>
                      <p className={styles.caseDescription}>
                        {caseItem.description}
                      </p>

                      <div
                        className={styles.caseProgressBarWrapper}
                        aria-label={`نسبة التقدم ${progress}%`}
                      >
                        <div
                          className={styles.caseProgressBar}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className={styles.caseStats}>
                        <span>تم جمع: {fmtMoney.format(raised)}</span>
                        <span>المتبقي: {fmtMoney.format(remaining)}</span>
                        <span>% {fmtNum.format(progress)}</span>
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
              {emptyMessage}
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default CasesPage;
