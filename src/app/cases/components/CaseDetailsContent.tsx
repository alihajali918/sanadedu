// ================================================
// File: /app/cases/[id]/CaseDetailsContent.tsx
// ================================================
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "@/app/cases/[id]/page.module.css";
import { useCart, CartItem } from "@/app/context/CartContext";
import { Need, CaseItem } from "lib/types";
import { typeTranslations } from "@/utils/translations";

interface CaseDetailsContentProps {
  caseItem: CaseItem | null;
}

const CaseDetailsContent: React.FC<CaseDetailsContentProps> = ({ caseItem }) => {
  const router = useRouter();
  const { addItem } = useCart();

  // ===== [A] تحقق وجود احتياجات =====
  const hasNeeds = !!(caseItem && Array.isArray(caseItem.needs) && caseItem.needs.length > 0);

  // ===== [B] فورماتر الأرقام والعملات =====
  const currency = "USD";
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency }),
    [currency]
  );
  const formatNumberWestern = useCallback((n: number) => numberFormatter.format(n), [numberFormatter]);
  const formatCurrencyWestern = useCallback((n: number) => currencyFormatter.format(n), [currencyFormatter]);

  // ===== [C] نوع المؤسسة =====
  const normalizedType = useMemo(() => String(caseItem?.type ?? "").trim().toLowerCase(), [caseItem?.type]);
  const isSchool = useMemo(() => ["school", "مدرسة", "مدرسه"].includes(normalizedType), [normalizedType]);
  const isMosque = useMemo(() => ["mosque", "مسجد", "جامع"].includes(normalizedType), [normalizedType]);

  // ===== [D] الاحتياجات + تصنيفها =====
  const needs: Need[] = useMemo(() => (hasNeeds ? (caseItem!.needs as Need[]) : []), [hasNeeds, caseItem]);
  const needsByCategory = useMemo(() => {
    return needs.reduce((acc, need) => {
      const category = need.category || "أخرى";
      (acc[category] ||= []).push(need);
      return acc;
    }, {} as Record<string, Need[]>);
  }, [needs]);
  const categories = useMemo(() => Object.keys(needsByCategory), [needsByCategory]);

  // ===== [E] الفئة المختارة + تبويب الصفحة =====
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0] || null);
  useEffect(() => {
    setSelectedCategory(prev => (prev && categories.includes(prev) ? prev : categories[0] || null));
  }, [categories]);

  const [mainContentTab, setMainContentTab] =
    useState<"products" | "about" | "inquiries">("products");

  // ===== [F] كميات التبرع الافتراضية =====
  const [donationQuantities, setDonationQuantities] = useState<Record<string, number>>(
    () => needs.reduce((acc, need) => ({ ...acc, [String(need.id)]: 1 }), {} as Record<string, number>)
  );
  useEffect(() => {
    setDonationQuantities(needs.reduce((acc, need) => ({ ...acc, [String(need.id)]: 1 }), {} as Record<string, number>));
  }, [needs]);

  // ===== [G] رسائل عامة =====
  const [message, setMessage] = useState<string | null>(null);

  // ===== [H] المتبقي/التمويل =====
  const remainingFunds = useMemo(() => {
    const needed = caseItem?.fundNeeded || 0;
    const raised = caseItem?.fundRaised || 0;
    return Math.max(0, needed - raised);
  }, [caseItem?.fundNeeded, caseItem?.fundRaised]);
  const isFullyFunded = useMemo(
    () => remainingFunds === 0 && (caseItem?.fundNeeded || 0) > 0,
    [remainingFunds, caseItem?.fundNeeded]
  );

  // ===== [I] عدّاد الكمية =====
  const handleQuantityChange = useCallback((needId: string, value: string) => {
    let num = Number.isFinite(Number(value)) ? parseInt(value, 10) : 0;
    if (isNaN(num) || num < 0) num = 0;

    const current = needs.find(n => String(n.id) === needId);
    const maxQ = current ? Math.max(0, (current.quantity || 0) - (current.funded || 0)) : 0;
    if (num > maxQ) num = maxQ;

    setDonationQuantities(prev => ({ ...prev, [needId]: num }));
  }, [needs]);

  // ===== [J] إضافة للسلة =====
  const addNeedToCart = useCallback((need: Need) => {
    if (!caseItem) return;
    const q = donationQuantities[String(need.id)] || 0;
    const remainingQty = Math.max(0, (need.quantity || 0) - (need.funded || 0));

    if (q <= 0) return setMessage("الرجاء تحديد كمية أكبر من الصفر.");
    if (q > remainingQty) return setMessage("الكمية المطلوبة تتجاوز المتبقي.");
    if (!need.unitPrice || need.unitPrice <= 0) return setMessage("لا يمكن إضافة منتج بدون سعر وحدة صحيح.");

    const item: CartItem = {
      id: `${caseItem.id}-${need.id}`,
      institutionId: String(caseItem.id),
      institutionName: caseItem.title,
      needId: String(need.id),
      itemName: need.item,
      itemImage: need.image,
      unitPrice: need.unitPrice,
      quantity: q,
      totalPrice: q * need.unitPrice,
    };
    addItem(item);
    setMessage(`تم إضافة ${formatNumberWestern(q)} × "${item.itemName}" إلى سلة التبرعات.`);
  }, [addItem, caseItem, donationQuantities, formatNumberWestern]);

  // ===== [K] تبنّي كل المتبقي =====
  const handleDonateAllRemainingNeeds = useCallback(() => {
    if (!caseItem) return;
    let count = 0, total = 0;
    needs.forEach((need) => {
      const rem = Math.max(0, (need.quantity || 0) - (need.funded || 0));
      if (rem > 0 && need.unitPrice && need.unitPrice > 0) {
        const item: CartItem = {
          id: `${caseItem.id}-${need.id}`,
          institutionId: String(caseItem.id),
          institutionName: caseItem.title,
          needId: String(need.id),
          itemName: need.item,
          itemImage: need.image,
          unitPrice: need.unitPrice,
          quantity: rem,
          totalPrice: rem * need.unitPrice,
        };
        addItem(item);
        count++; total += item.totalPrice;
      }
    });
    if (count > 0) {
      setMessage(`تم إضافة ${formatNumberWestern(count)} منتجًا (بإجمالي ${formatCurrencyWestern(total)}) إلى السلة.`);
      router.push("/donation-basket");
    } else {
      setMessage("تم تمويل جميع الوحدات في هذه الحالة.");
    }
  }, [addItem, caseItem, needs, formatCurrencyWestern, formatNumberWestern, router]);

  // ===== [L] شريط معلومات الجوال (اسم + أزرار + دروب داون) =====
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  // ===== [M] حالة عدم وجود احتياجات =====
  if (!hasNeeds) {
    return (
      <div className={`container ${styles.caseDetailsPageContent}`}>
        <p className={styles.noDataMessage}>عذرًا، لا توجد تفاصيل أو احتياجات متوفرة لهذه الحالة.</p>
        <div className={styles.backLinkWrapper}>
          <Link href="/cases" className={styles.backLink}>العودة إلى الحالات</Link>
        </div>
      </div>
    );
  }

  // ===== [N] العرض =====
  return (
    <main className={styles.caseDetailsPageContent}>
      <div className="container">
        <div className={styles.mainContentArea}>

          {/* ========== شريط علوي للجوال: الاسم فوق + الأزرار تحته + دروب داون يحوي الشارات + المتبقي ========== */}
          <div className={styles.mobileHeaderBar}>
            <div className={styles.mobileHeaderRow}>
              <h2 className={styles.mobileTitle} title={caseItem!.title}>
                {caseItem!.title}
              </h2>

              <div className={styles.mobileActions}>
                <button
                  onClick={handleDonateAllRemainingNeeds}
                  className={`${styles.donateGeneralBtn} btn btn-cta-primary`}
                  type="button"
                >
                  تبني
                </button>

                <Link href={`/cases/request-need/${caseItem!.id}`} passHref>
                  <button className={`${styles.requestDetailsBtn} btn`} type="button">
                    تفصيل
                  </button>
                </Link>

                <button
                  className={styles.infoToggle}
                  onClick={() => setMobileInfoOpen(v => !v)}
                  aria-expanded={mobileInfoOpen}
                  aria-controls="mobileInfo"
                  type="button"
                  title="تفاصيل إضافية"
                >
                  <i className="fas fa-chevron-down" />
                </button>
              </div>
            </div>

            <div
              id="mobileInfo"
              className={`${styles.mobileInfoPanel} ${mobileInfoOpen ? styles.open : ""}`}
            >
              {isSchool && (
                <>
                  <p className={styles.mobileBadgeLine}>
                    <i className="fas fa-check-circle" />
                    تصريح رسمي من وزارة الخارجية (HAC)
                  </p>
                  <p className={styles.mobileBadgeLine}>
                    <i className="fas fa-check-circle" />
                    أسعار المنتجات مُعتمدة من وزارة التربية
                  </p>
                </>
              )}
              {isMosque && (
                <>
                  <p className={styles.mobileBadgeLine}>
                    <i className="fas fa-truck" />
                    الشحن يتم عند جمع الكمية المطلوبة مع توثيق كامل
                  </p>
                  <p className={styles.mobileBadgeLine}>
                    <i className="fas fa-check-circle" />
                    أسعار المنتجات مُعتمدة من وزارة الأوقاف
                  </p>
                </>
              )}

              {/* المتبقي داخل التاب للجوال فقط */}
              {(() => {
                const needed = caseItem!.fundNeeded || 0;
                const raised = caseItem!.fundRaised || 0;
                const percentFunded =
                  needed > 0 ? Math.max(0, Math.min(100, Math.round((raised / needed) * 100))) : 0;
                const percentRemaining = Math.max(0, 100 - percentFunded);
                return (
                  <div className={styles.mobileProgressBox}>
                    <div className={styles.progressHeader}>
                      <span>المتبقي</span>
                      <strong className={styles.percentNumber}>{formatNumberWestern(percentRemaining)}%</strong>
                    </div>
                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentFunded}
                    >
                      <div className={styles.progressBar} style={{ width: `${percentFunded}%` }} />
                    </div>
                    <div className={styles.progressFooter}>
                      <span className={styles.amountRaised}>جمع: {formatCurrencyWestern(raised)}</span>
                      <span className={styles.amountNeeded}>الهدف: {formatCurrencyWestern(needed)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ========== شريط المعلومات العادي للدِسك توب (مخفي على الجوال) ========== */}
          <div className={styles.caseTopInfoBarInsideContainer}>
            <div className={styles.leftSection}>
              <h2 className={styles.schoolName}>{caseItem!.title}</h2>

              {isSchool && (
                <>
                  <p className={styles.licensingInfo}>
                    <span className={styles.qualityBadge}><i className="fas fa-check-circle" /></span>
                    تصريح رسمي من وزارة الخارجية – قسم التنسيق للعمل الإنساني (HAC) لتوثيق المدارس ميدانيًا.
                  </p>
                  <p className={styles.educationalPricing}>
                    <span className={styles.qualityBadge}><i className="fas fa-check-circle" /></span>
                    أسعار المنتجات مُعتمدة من وزارة التربية لضمان الشفافية
                  </p>
                </>
              )}
              {isMosque && (
                <>
                  <p className={styles.licensingInfo}>
                    <span className={styles.qualityBadge}><i className="fas fa-truck" /></span>
                    نقوم بالشحن عند جمع كمية كافية من كل منتج، وبأسرع وقت ممكن مع التوثيق الكامل.
                  </p>
                  <p className={styles.educationalPricing}>
                    <span className={styles.qualityBadge}><i className="fas fa-check-circle" /></span>
                    أسعار المنتجات مُعتمدة من وزارة الأوقاف لضمان الشفافية
                  </p>
                </>
              )}
            </div>

            <div className={styles.rightSection}>
              <div className={styles.remainingFundsDisplay}>
                {(() => {
                  const needed = caseItem!.fundNeeded || 0;
                  const raised = caseItem!.fundRaised || 0;
                  const percentFunded = needed > 0 ? Math.max(0, Math.min(100, Math.round((raised / needed) * 100))) : 0;
                  const percentRemaining = Math.max(0, 100 - percentFunded);
                  return (
                    <>
                      <div className={styles.progressHeader}>
                        <span>المتبقي</span>
                        <strong className={styles.percentNumber}>{formatNumberWestern(percentRemaining)}%</strong>
                      </div>
                      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentFunded}>
                        <div className={styles.progressBar} style={{ width: `${percentFunded}%` }} />
                      </div>
                      <div className={styles.progressFooter}>
                        <span className={styles.amountRaised}>جمع: {formatCurrencyWestern(raised)}</span>
                        <span className={styles.amountNeeded}>الهدف: {formatCurrencyWestern(needed)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className={styles.directDonateInput}>
                <Link href={`/cases/request-need/${caseItem!.id}`} passHref>
                  <button className={`${styles.requestDetailsBtn} btn`} type="button">
                    تفصيل الاحتياج <i className="fas fa-list-alt" />
                  </button>
                </Link>
                <button
                  onClick={handleDonateAllRemainingNeeds}
                  className={`${styles.donateGeneralBtn} btn btn-cta-primary`}
                  type="button"
                >
                  تبني المؤسسة <i className="fas fa-heart" />
                </button>
              </div>
            </div>
          </div>

          {/* ========== تبويبات الصفحة (Sticky + صف واحد قابل للسحب) ========== */}
          <div className={`${styles.caseSubNavSectionTabs} ${styles.stickyTabs}`}>
            <div className={`${styles.subNavContainer} ${styles.scrollRow}`} role="tablist" aria-label="التنقل داخل تفاصيل الحالة">
              <button className={`${styles.navItem} ${mainContentTab === "products" ? styles.active : ""}`} onClick={() => setMainContentTab("products")} role="tab" aria-selected={mainContentTab === "products"} type="button">صفحة المنتجات</button>
              <button className={`${styles.navItem} ${mainContentTab === "about" ? styles.active : ""}`} onClick={() => setMainContentTab("about")} role="tab" aria-selected={mainContentTab === "about"} type="button">عن المؤسسة + توثيق وصور</button>
              <button className={`${styles.navItem} ${mainContentTab === "inquiries" ? styles.active : ""}`} onClick={() => setMainContentTab("inquiries")} role="tab" aria-selected={mainContentTab === "inquiries"} type="button">أسئلة واستفسارات</button>
            </div>
          </div>

          {/* === رسائل الحالة === */}
          {message && <div className={styles.infoMessage} role="status">{message}</div>}
          {isFullyFunded ? (
            <div className={`${styles.infoMessage} ${styles.fullyFundedMessage}`} role="status">
              تم تمويل جميع الاحتياجات في هذه الحالة بالكامل. شكرًا لمساهمتكم الكريمة.
            </div>
          ) : (
            <div className={styles.tabContentArea}>
              {mainContentTab === "products" && selectedCategory && needsByCategory[selectedCategory]?.length > 0 && (
                <div className={styles.productsNeedsGridTab}>

                  {/* ========== التصنيفات (Sticky + صف واحد قابل للسحب + بدون خلفية) ========== */}
                  <div className={`${styles.categoryTabsSticky}`}>
                    <div className={`${styles.categoryTabsContainer} ${styles.scrollRow}`}>
                      {categories.map((categoryName) => {
                        const icon = needsByCategory[categoryName][0]?.icon || "fas fa-box-open";
                        return (
                          <button
                            key={categoryName}
                            className={`${styles.categoryTabItem} ${selectedCategory === categoryName ? styles.activeTab : ""}`}
                            onClick={() => setSelectedCategory(categoryName)}
                            aria-pressed={selectedCategory === categoryName}
                            type="button"
                            title={categoryName}
                          >
                            <i className={icon} aria-hidden="true" />
                            <span>{categoryName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ========== شبكة المنتجات ========== */}
                  <div className={`${styles.productsListSection} mt-40`}>
                    <div className={styles.productsNeedsGrid}>
                      {needsByCategory[selectedCategory].map((need) => {
                        const q = donationQuantities[String(need.id)] || 0;
                        const remainingQty = Math.max(0, (need.quantity || 0) - (need.funded || 0));
                        const unitPrice = need.unitPrice || 0;
                        const total = unitPrice * q;

                        return (
                          <div key={need.id} className={styles.productCardNewDesign}>
                            {/* الصورة (يمين) */}
                            <div className={styles.productImageWrapper}>
                              <Image
                                src={need.image}
                                alt={need.item}
                                width={250}
                                height={200}
                                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                              />
                            </div>

                            {/* العنوان */}
                            <h5 className={styles.productItemNameNew}>{need.item}</h5>

                            {/* السعر = سعر الوحدة × الكمية + توضيح سعر الوحدة */}
                            <div className={styles.productPriceGroup}>
                              <span className={styles.productPriceValue}>
                                {formatCurrencyWestern(total)}
                              </span>
                            </div>

                            {/* صف التحكّم */}
                            <div className={styles.controlsRow}>
                              <button
                                className={styles.btnDonateNew}
                                onClick={() => addNeedToCart(need)}
                                disabled={remainingQty <= 0 || q <= 0 || !need.unitPrice || need.unitPrice <= 0}
                                type="button"
                              >
                                <i className="fas fa-heart" aria-hidden="true" />
                                <span className={styles.donateText}>تبرع</span>
                              </button>

                              <span className={styles.remainingBadge}>
                                <span>متبقي</span>
                                <strong>{formatNumberWestern(remainingQty)}</strong>
                              </span>

                              <div className={styles.quantityControlNew}>
                                <button
                                  className={styles.quantityBtn}
                                  onClick={() => handleQuantityChange(String(need.id), String(Math.max(0, q - 1)))}
                                  disabled={q <= 0}
                                  aria-label="إنقاص الكمية"
                                  type="button"
                                >-</button>

                                <input
                                  type="number"
                                  className={styles.quantityInputNew}
                                  value={String(q)}
                                  onChange={(e) => handleQuantityChange(String(need.id), e.target.value)}
                                  min={0}
                                  max={remainingQty}
                                  step={1}
                                  inputMode="numeric"
                                  aria-label="كمية التبرع"
                                />

                                <button
                                  className={styles.quantityBtn}
                                  onClick={() => handleQuantityChange(String(need.id), String(q + 1))}
                                  disabled={q >= remainingQty}
                                  aria-label="زيادة الكمية"
                                  type="button"
                                >+</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {mainContentTab === "about" && (
                <div className={`${styles.aboutSchoolTabContent} ${styles.tabPane} py-40`}>
                  <h2 className="section-title text-center">عن المؤسسة + توثيق وصور</h2>
                  <div className={`${styles.caseDescriptionBlock} mb-40`}>
                    <p>{caseItem!.description}</p>
                    <p><strong>المحافظة:</strong> {caseItem!.governorate}، <strong>المدينة:</strong> {caseItem!.city}</p>
                    <p><strong>نوع المؤسسة:</strong> {typeTranslations[caseItem!.type]}</p>
                    <p><strong>درجة الاحتياج:</strong> {caseItem!.needLevel}</p>
                  </div>
                </div>
              )}

              {mainContentTab === "inquiries" && (
                <div className={`${styles.inquiriesTabContent} ${styles.tabPane} py-40`}>
                  <h2 className="section-title text-center">أسئلة واستفسارات</h2>
                  <div className={`${styles.inquiriesBlock} mb-40`}>
                    <p>هنا يمكنك إضافة محتوى صفحة الأسئلة والاستفسارات.</p>
                    <p>يمكن أن يتضمن نموذجًا للأسئلة الشائعة أو نموذج اتصال.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CaseDetailsContent;
