// ================================================
// File: /app/cases/[id]/CaseDetailsContent.tsx
// (الإصدار الكامل مع استثناء الصورة الأساسية من السلايدر)
// ================================================
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Settings } from "react-slick";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import styles from "@/app/cases/[id]/page.module.css";
import "@/app/globals.css";

import { useCart, CartItem } from "@/app/context/CartContext";
import { Need, CaseItem } from "lib/types";
import { typeTranslations } from "@/utils/translations";

interface CaseDetailsContentProps {
  caseItem: CaseItem | null;
}

interface MessageState {
  text: string;
  type: "success" | "warning";
}

// أسهم السلايدر المخصصة
const NextArrow = (props: any) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} custom-slick-arrow next-arrow`}
      style={{ ...style, display: "block" }}
      onClick={onClick}
      aria-label="التالي"
      role="button"
    >
      <i className="fas fa-chevron-right" />
    </div>
  );
};

const PrevArrow = (props: any) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} custom-slick-arrow prev-arrow`}
      style={{ ...style, display: "block" }}
      onClick={onClick}
      aria-label="السابق"
      role="button"
    >
      <i className="fas fa-chevron-left" />
    </div>
  );
};

const CaseDetailsContent: React.FC<CaseDetailsContentProps> = ({ caseItem }) => {
  const router = useRouter();
  const { addItem } = useCart();

  // ===== [A] تحقق وجود احتياجات =====
  const hasNeeds = !!(
    caseItem &&
    Array.isArray(caseItem.needs) &&
    caseItem.needs.length > 0
  );

  // ===== [B] فورماتر الأرقام والعملات =====
  const currency = "USD";
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency }),
    [currency]
  );
  const formatNumberWestern = useCallback(
    (n: number) => numberFormatter.format(n),
    [numberFormatter]
  );
  const formatCurrencyWestern = useCallback(
    (n: number) => currencyFormatter.format(n),
    [currencyFormatter]
  );

  // ===== [C] نوع المؤسسة =====
  const normalizedType = useMemo(
    () => String(caseItem?.type ?? "").trim().toLowerCase(),
    [caseItem?.type]
  );
  const isSchool = useMemo(() => normalizedType === "school", [normalizedType]);
  const isMosque = useMemo(() => normalizedType === "mosque", [normalizedType]);

  // ===== [D] الاحتياجات + تصنيفها =====
  const needs: Need[] = useMemo(
    () => (hasNeeds ? (caseItem!.needs as Need[]) : []),
    [hasNeeds, caseItem]
  );
  const needsByCategory = useMemo(() => {
    return needs.reduce((acc, need) => {
      const category = need.category || "أخرى";
      (acc[category] ||= []).push(need);
      return acc;
    }, {} as Record<string, Need[]>);
  }, [needs]);
  const categories = useMemo(() => Object.keys(needsByCategory), [needsByCategory]);

  // ===== [E] الفئة المختارة + تبويب الصفحة =====
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categories[0] || null
  );
  useEffect(() => {
    setSelectedCategory((prev) =>
      prev && categories.includes(prev) ? prev : categories[0] || null
    );
  }, [categories]);

  const [mainContentTab, setMainContentTab] = useState<
    "products" | "about" | "documentation"
  >("products");

  // ===== [F] كميات التبرع الافتراضية =====
  const [donationQuantities, setDonationQuantities] = useState<
    Record<string, number>
  >(() =>
    needs.reduce(
      (acc, need) => ({ ...acc, [String(need.id)]: 1 }),
      {} as Record<string, number>
    )
  );
  useEffect(() => {
    setDonationQuantities(
      needs.reduce(
        (acc, need) => ({ ...acc, [String(need.id)]: 1 }),
        {} as Record<string, number>
      )
    );
  }, [needs]);

  // ===== [G] رسائل عامة + إخفاء تلقائي =====
  const [message, setMessage] = useState<MessageState | null>(null);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
  const handleQuantityChange = useCallback(
    (needId: string, value: string) => {
      let num = Number.isFinite(Number(value)) ? parseInt(value, 10) : 0;
      if (isNaN(num) || num < 0) num = 0;

      const current = needs.find((n) => String(n.id) === needId);
      const maxQ = current
        ? Math.max(0, (current.quantity || 0) - (current.funded || 0))
        : 0;
      if (num > maxQ) num = maxQ;

      setDonationQuantities((prev) => ({ ...prev, [needId]: num }));
    },
    [needs]
  );

  // ===== [J] إضافة للسلة =====
  const addNeedToCart = useCallback(
    (need: Need) => {
      if (!caseItem) return;
      const q = donationQuantities[String(need.id)] || 0;
      const remainingQty = Math.max(0, (need.quantity || 0) - (need.funded || 0));

      if (q <= 0)
        return setMessage({
          text: "⚠️ الرجاء تحديد كمية أكبر من الصفر.",
          type: "warning",
        });
      if (q > remainingQty)
        return setMessage({
          text: "⚠️ الكمية المطلوبة تتجاوز المتبقي.",
          type: "warning",
        });
      if (!need.unitPrice || need.unitPrice <= 0)
        return setMessage({
          text: "⚠️ لا يمكن إضافة منتج بدون سعر وحدة صحيح.",
          type: "warning",
        });

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
        acfFieldId: String(
          (need as any).acfFieldId ?? (need as any).acf?.field_id ?? ""
        ),
      };

      setMessage(null);
      addItem(item);
      setMessage({
        text: `✅ تم إضافة ${formatNumberWestern(q)} × "${item.itemName}" إلى سلة التبرعات.`,
        type: "success",
      });
    },
    [addItem, caseItem, donationQuantities, formatNumberWestern]
  );

  // ===== [X1-X3] التبرع المخصص =====
  const [customDonationAmount, setCustomDonationAmount] = useState<number>(10);

  const handleCustomDonationChange = useCallback(
    (value: string | number) => {
      let num = Number.isFinite(Number(value)) ? Number(value) : 0;
      if (isNaN(num) || num < 0) num = 0;
      const maxAmount = remainingFunds;
      if (num > maxAmount && maxAmount > 0) num = maxAmount;
      if (num > 999999) num = 999999;
      setCustomDonationAmount(Math.round(num * 100) / 100);
    },
    [remainingFunds]
  );

  const addCustomDonationToCart = useCallback(() => {
    if (!caseItem) return;
    const amount = customDonationAmount;

    if (amount <= 0)
      return setMessage({
        text: "⚠️ الرجاء تحديد مبلغ تبرع أكبر من الصفر.",
        type: "warning",
      });
    if (amount > remainingFunds)
      return setMessage({
        text: "⚠️ مبلغ التبرع يتجاوز المبلغ المتبقي لتمويل هذه الحالة.",
        type: "warning",
      });

    const item: CartItem = {
      id: `${caseItem.id}-custom-${Date.now()}`,
      institutionId: String(caseItem.id),
      institutionName: caseItem.title,
      needId: "CUSTOM_DONATION",
      itemName: `تبرع مخصص للحالة ${caseItem.title}`,
      itemImage: caseItem.images?.[0] || "",
      unitPrice: amount,
      quantity: 1,
      totalPrice: amount,
      acfFieldId: "",
    };

    setMessage(null);
    addItem(item);
    setMessage({
      text: `✅ تم إضافة تبرع مخصص بقيمة ${formatCurrencyWestern(
        amount
      )} إلى سلة التبرعات.`,
      type: "success",
    });
    setCustomDonationAmount(10);
  }, [addItem, caseItem, customDonationAmount, remainingFunds, formatCurrencyWestern]);

  // ===== [K] تبنّي كل المتبقي =====
  const handleDonateAllRemainingNeeds = useCallback(() => {
    if (!caseItem) return;
    let count = 0,
      total = 0;
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
          acfFieldId: String(
            (need as any).acfFieldId ?? (need as any).acf?.field_id ?? ""
          ),
        };
        addItem(item);
        count++;
        total += item.totalPrice;
      }
    });
    if (count > 0) {
      setMessage({
        text: `✅ تم إضافة ${formatNumberWestern(
          count
        )} منتجًا (بإجمالي ${formatCurrencyWestern(total)}) إلى السلة.`,
        type: "success",
      });
      router.push("/donation-basket");
    } else {
      setMessage({
        text: "تم تمويل جميع الوحدات في هذه الحالة بالفعل.",
        type: "warning",
      });
    }
  }, [addItem, caseItem, needs, formatCurrencyWestern, formatNumberWestern, router]);

  // ==========================================================
  // [M0] تحديد الصورة الأساسية + قائمة الصور المصفاة للسلايدر (مهم: قبل sliderSettings)
  // ==========================================================
  const primaryImageUrl = useMemo(() => {
    return (
      (caseItem as any)?.featuredImage ||
      (caseItem as any)?.mainImage ||
      (caseItem as any)?.coverImage ||
      (caseItem as any)?.image ||
      null
    );
  }, [caseItem]);

  const galleryImages: string[] = useMemo(() => {
    const raw = (caseItem?.images ?? []).filter(Boolean) as string[];
    const withoutPrimary = primaryImageUrl
      ? raw.filter((u) => u !== primaryImageUrl)
      : raw;
    return Array.from(new Set(withoutPrimary));
  }, [caseItem?.images, primaryImageUrl]);

  // لو تحب تعتمد أن الأولى دائمًا الأساسية، يمكنك بدل الأعلى:
  // const galleryImages = useMemo(() => (caseItem?.images || []).slice(1), [caseItem?.images]);

  // سنستخدم اسم وسيط لتسهيل القراءة
  const sliderImages = galleryImages;

  // ==========================================================
  // [M] إعدادات السلايدر (Slider Settings)
  // ==========================================================
  const sliderSettings: Settings = {
    dots: false,
    infinite: sliderImages.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: "10%",
    autoplay: sliderImages.length > 1,
    autoplaySpeed: 4000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 1, centerMode: true, centerPadding: "10%" },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, centerMode: true, centerPadding: "0px" },
      },
    ],
  };

  // ===== [L] حالة عدم وجود احتياجات =====
  if (!hasNeeds) {
    return (
      <div className={`container ${styles.caseDetailsPageContent}`}>
        <p className={styles.noDataMessage}>
          عذرًا، لا توجد تفاصيل أو احتياجات متوفرة لهذه الحالة.
        </p>
        <div className={styles.backLinkWrapper}>
          <Link href="/cases" className={styles.backLink}>
            العودة إلى الحالات
          </Link>
        </div>
      </div>
    );
  }

  // ===== المكون الفرعي: InstitutionDetails =====
  const InstitutionDetails: React.FC<{ item: CaseItem }> = ({ item }) => {
    const hasValue = (val: any) => {
      if (typeof val === "number") return val != null;
      if (typeof val === "string") return val.trim().length > 0;
      return val != null;
    };

    const showSchoolDetails =
      isSchool &&
      (hasValue(item.numberOfStudents) ||
        hasValue(item.numberOfClassrooms) ||
        hasValue(item.educationLevel));

    const showMosqueDetails =
      isMosque &&
      (hasValue(item.regularWorshippers) ||
        hasValue(item.fridayWorshippers) ||
        hasValue(item.mosqueArea));

    return (
      <>
        <div className={`${styles.caseDescriptionBlock} mb-40`}>
          <h3>معلومات عامة</h3>
          <p>
            <strong>المحافظة:</strong> {item.governorate}،{" "}
            <strong>المدينة:</strong> {item.city}
          </p>
          <p>
            <strong>نوع المؤسسة:</strong>{" "}
            {typeTranslations[item.type] || item.type}
          </p>
          <p>
            <strong>درجة الاحتياج:</strong> {item.needLevel}
          </p>
        </div>

        {showSchoolDetails && (
          <div className={`${styles.caseDescriptionBlock} mb-40`}>
            <h3>تفاصيل المدرسة</h3>
            {item.numberOfStudents != null && (
              <p>
                <strong>عدد الطلاب:</strong>{" "}
                {formatNumberWestern(item.numberOfStudents)} طالب
              </p>
            )}
            {item.numberOfClassrooms != null && (
              <p>
                <strong>عدد الفصول:</strong>{" "}
                {formatNumberWestern(item.numberOfClassrooms)} فصل
              </p>
            )}
            {hasValue(item.educationLevel) && (
              <p>
                <strong>المستوى التعليمي:</strong> {item.educationLevel}
              </p>
            )}
          </div>
        )}

        {showMosqueDetails && (
          <div className={`${styles.caseDescriptionBlock} mb-40`}>
            <h3>تفاصيل المسجد</h3>
            {item.regularWorshippers != null && (
              <p>
                <strong>عدد المصلين (أيام عادية):</strong>{" "}
                {formatNumberWestern(item.regularWorshippers)} مصلٍ/مصلية
              </p>
            )}
            {item.fridayWorshippers != null && (
              <p>
                <strong>عدد المصلين (يوم الجمعة):</strong>{" "}
                {formatNumberWestern(item.fridayWorshippers)} مصلٍ/مصلية
              </p>
            )}
            {item.mosqueArea != null && (
              <p>
                <strong>مساحة المسجد (م²):</strong>{" "}
                {formatNumberWestern(item.mosqueArea)} م²
              </p>
            )}
          </div>
        )}
      </>
    );
  };

  // ===== [O] مكوّن التبرع المخصص =====
  const CustomDonationInput: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
    return (
      <div
        className={
          isMobile ? styles.mobileCustomDonation : styles.desktopCustomDonation
        }
      >
        <div className={styles.quantityControlNew}>
          <button
            className={styles.quantityBtn}
            onClick={() => handleCustomDonationChange(customDonationAmount - 1)}
            disabled={customDonationAmount <= 0}
            aria-label="إنقاص مبلغ التبرع"
            type="button"
          >
            -
          </button>

          <input
            type="number"
            className={styles.quantityInputNew}
            value={String(customDonationAmount)}
            onChange={(e) => handleCustomDonationChange(e.target.value)}
            onBlur={(e) => handleCustomDonationChange(e.target.value)}
            min={1}
            max={remainingFunds > 0 ? remainingFunds : undefined}
            step={1}
            inputMode="numeric"
            aria-label="مبلغ التبرع المخصص"
          />

          <button
            className={styles.quantityBtn}
            onClick={() => handleCustomDonationChange(customDonationAmount + 1)}
            disabled={customDonationAmount >= remainingFunds && remainingFunds > 0}
            aria-label="زيادة مبلغ التبرع"
            type="button"
          >
            +
          </button>
        </div>

        <button
          onClick={addCustomDonationToCart}
          className={`${styles.goldenFillBtn} ${styles.fixedSizeButton} ${
            isMobile ? styles.mobileActionBtn : ""
          }`}
          type="button"
          disabled={customDonationAmount <= 0 || isFullyFunded}
        >
          تبرع مخصص ({formatCurrencyWestern(customDonationAmount)})
        </button>
      </div>
    );
  };

  // ===== [N] العرض =====
  return (
    <main className={styles.caseDetailsPageContent}>
      <div className="container">
        <div className={styles.mainContentArea}>
          {/* شريط الجوال */}
          <div className={styles.mobileHeaderBar}>
            <div className={styles.mobileHeaderRow}>
              <h2 className={styles.mobileTitle} title={caseItem!.title}>
                {caseItem!.title}
              </h2>

              <div className={styles.mobileActions}>
                <button
                  onClick={handleDonateAllRemainingNeeds}
                  className={`${styles.goldenFillBtn} ${styles.fixedSizeButton} ${styles.mobileActionBtn}`}
                  type="button"
                >
                  تبني المؤسسة
                </button>

                <CustomDonationInput isMobile={true} />
              </div>
            </div>
          </div>

          {/* شريط المعلومات للدسكتوب */}
          <div className={styles.caseTopInfoBarInsideContainer}>
            <div className={styles.leftSection}>
              <h2 className={styles.schoolName}>{caseItem!.title}</h2>

              <div className={styles.desktopButtons}>
                <button
                  onClick={handleDonateAllRemainingNeeds}
                  className={`${styles.goldenFillBtn} ${styles.fixedSizeButton}`}
                  type="button"
                >
                  تبني المؤسسة <i className="fas fa-heart" />
                </button>

                <CustomDonationInput isMobile={false} />
              </div>
            </div>

            <div className={styles.rightSection}>
              <div className={styles.remainingFundsDisplay}>
                {(() => {
                  const needed = caseItem!.fundNeeded || 0;
                  const raised = caseItem!.fundRaised || 0;
                  const percentFunded =
                    needed > 0
                      ? Math.max(
                          0,
                          Math.min(100, Math.round((raised / needed) * 100))
                        )
                      : 0;
                  const percentRemaining = Math.max(0, 100 - percentFunded);
                  return (
                    <>
                      <div className={styles.progressHeader}>
                        <span>المتبقي</span>
                        <strong className={styles.percentNumber}>
                          {formatNumberWestern(percentRemaining)}%
                        </strong>
                      </div>
                      <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentFunded}
                      >
                        <div
                          className={styles.progressBar}
                          style={{ width: `${percentFunded}%` }}
                        />
                      </div>
                      <div className={styles.progressFooter}>
                        <span className={styles.amountRaised}>
                          جمع: {formatCurrencyWestern(raised)}
                        </span>
                        <span className={styles.amountNeeded}>
                          الهدف: {formatCurrencyWestern(needed)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* تبويبات الصفحة */}
          <div
            className={`${styles.caseSubNavSectionTabs} ${styles.stickyTabGroup}`}
          >
            <div
              className={`${styles.subNavContainer} ${styles.scrollRow}`}
              role="tablist"
              aria-label="التنقل داخل تفاصيل الحالة"
            >
              <button
                className={`${styles.navItem} ${
                  mainContentTab === "products" ? styles.active : ""
                }`}
                onClick={() => setMainContentTab("products")}
                role="tab"
                aria-selected={mainContentTab === "products"}
                type="button"
              >
               المنتجات
              </button>
              <button
                className={`${styles.navItem} ${
                  mainContentTab === "about" ? styles.active : ""
                }`}
                onClick={() => setMainContentTab("about")}
                role="tab"
                aria-selected={mainContentTab === "about"}
                type="button"
              >
                عن المؤسسة
              </button>
              <button
                className={`${styles.navItem} ${
                  mainContentTab === "documentation" ? styles.active : ""
                }`}
                onClick={() => setMainContentTab("documentation")}
                role="tab"
                aria-selected={mainContentTab === "documentation"}
                type="button"
              >
                توثيق وصور
              </button>
            </div>
          </div>

          {/* إشعار عام */}
          {message && (
            <div
              className={`${styles.infoMessage} ${
                message.type === "warning" ? styles.warningMessage : ""
              }`}
              role="status"
            >
              {message.text}
            </div>
          )}

          {isFullyFunded ? (
            <div
              className={`${styles.infoMessage} ${styles.fullyFundedMessage}`}
              role="status"
            >
              تم تمويل جميع الاحتياجات في هذه الحالة بالكامل. شكرًا لمساهمتكم
              الكريمة.
            </div>
          ) : (
            <div className={styles.tabContentArea}>
              {mainContentTab === "products" &&
                selectedCategory &&
                needsByCategory[selectedCategory]?.length > 0 && (
                  <div className={styles.productsNeedsGridTab}>
                    {/* تصنيفات */}
                    <div
                      className={`${styles.categoryTabsSticky} ${styles.stickyTabGroup}`}
                    >
                      <div
                        className={`${styles.categoryTabsContainer} ${styles.scrollRow}`}
                      >
                        {categories.map((categoryName) => {
                          const icon =
                            needsByCategory[categoryName][0]?.icon ||
                            "fas fa-box-open";
                          return (
                            <button
                              key={categoryName}
                              className={`${styles.categoryTabItem} ${
                                selectedCategory === categoryName
                                  ? styles.activeTab
                                  : ""
                              }`}
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

                    {/* شبكة المنتجات */}
                    <div className={`${styles.productsListSection} mt-40`}>
                      <div className={styles.productsNeedsGrid}>
                        {needsByCategory[selectedCategory].map((need) => {
                          const q = donationQuantities[String(need.id)] || 0;
                          const remainingQty = Math.max(
                            0,
                            (need.quantity || 0) - (need.funded || 0)
                          );
                          const unitPrice = need.unitPrice || 0;
                          const total = unitPrice * q;

                          return (
                            <div
                              key={need.id}
                              className={styles.productCardNewDesign}
                            >
                              <div className={styles.productImageWrapper}>
                                <Image
                                  src={need.image}
                                  alt={need.item}
                                  width={250}
                                  height={200}
                                  style={{
                                    objectFit: "cover",
                                    width: "100%",
                                    height: "100%",
                                  }}
                                />
                              </div>

                              <h5 className={styles.productItemNameNew}>
                                {need.item}
                              </h5>

                              <div className={styles.remainingInfoTop}>
                                <span>المتبقي:</span>
                                <strong>
                                  {formatNumberWestern(remainingQty)}
                                </strong>
                              </div>

                              <div className={styles.productPriceGroup}>
                                <span className={styles.productPriceValue}>
                                  {formatCurrencyWestern(total)}
                                </span>
                              </div>

                              <div className={styles.controlsRow}>
                                <div className={styles.quantityControlNew}>
                                  <button
                                    className={styles.quantityBtn}
                                    onClick={() =>
                                      handleQuantityChange(
                                        String(need.id),
                                        String(Math.max(0, q - 1))
                                      )
                                    }
                                    disabled={q <= 0}
                                    aria-label="إنقاص الكمية"
                                    type="button"
                                  >
                                    -
                                  </button>

                                  <input
                                    type="number"
                                    className={styles.quantityInputNew}
                                    value={String(q)}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        String(need.id),
                                        e.target.value
                                      )
                                    }
                                    min={0}
                                    max={remainingQty}
                                    step={1}
                                    inputMode="numeric"
                                    aria-label="كمية التبرع"
                                  />

                                  <button
                                    className={styles.quantityBtn}
                                    onClick={() =>
                                      handleQuantityChange(
                                        String(need.id),
                                        String(q + 1)
                                      )
                                    }
                                    disabled={q >= remainingQty}
                                    aria-label="زيادة الكمية"
                                    type="button"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  className={styles.btnDonateNew}
                                  onClick={() => addNeedToCart(need)}
                                  disabled={
                                    remainingQty <= 0 ||
                                    q <= 0 ||
                                    !need.unitPrice ||
                                    need.unitPrice <= 0
                                  }
                                  type="button"
                                >
                                  <i className="fas fa-heart" aria-hidden="true" />
                                  <span className={styles.donateText}>تبرع</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              {/* تبويب: عن المؤسسة */}
              {mainContentTab === "about" && caseItem && (
                <div
                  className={`${styles.aboutSchoolTabContent} ${styles.tabPane} py-40`}
                >
                  <h2 className="section-title text-center">عن المؤسسة</h2>
                  <InstitutionDetails item={caseItem} />
                </div>
              )}

              {/* تبويب: توثيق وصور */}
              {mainContentTab === "documentation" && caseItem && (
                <div
                  className={`${styles.inquiriesTabContent} ${styles.tabPane} py-40`}
                >
                  <h2 className="section-title text-center">توثيق وصور</h2>

                  {sliderImages.length === 0 ? (
                    <div className={styles.infoMessage}>
                      لا توجد صور توثيقية متاحة غير الصورة الأساسية.
                    </div>
                  ) : (
                    <div
                      className={`${styles.inquiriesBlock} mb-40 ${styles.sliderContainer} documentation-slider-container`}
                    >
                      <Slider {...sliderSettings}>
                        {sliderImages.map((imgUrl, index) => (
                          <div key={index} className="slick-slide-item">
                            <Image
                              src={imgUrl}
                              alt={`صورة توثيقية رقم ${index + 1}`}
                              width={700}
                              height={450}
                              style={{
                                objectFit: "cover",
                                width: "100%",
                                height: "100%",
                                borderRadius: "10px",
                              }}
                            />
                          </div>
                        ))}
                      </Slider>
                    </div>
                  )}
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
