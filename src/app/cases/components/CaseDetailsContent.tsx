'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from '@/app/cases/[id]/page.module.css';
import { useCart, CartItem } from '@/app/context/CartContext';
import { Need, CaseItem } from 'lib/types';

interface CaseDetailsContentProps {
  caseItem: CaseItem | null;
}

const CaseDetailsContent: React.FC<CaseDetailsContentProps> = ({ caseItem }) => {
  const router = useRouter();
  const { addItem } = useCart();

  // ✅ لا نعمل return مبكر قبل الهُوكس — بدلاً من ذلك نستخدم فلاق
  const hasNeeds = !!(caseItem && Array.isArray(caseItem.needs) && caseItem.needs.length > 0);

  // 🌟 Number/Currency formatters
  const currency = 'USD';
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency }),
    [currency]
  );
  const formatNumberWestern = useCallback((num: number) => numberFormatter.format(num), [numberFormatter]);
  const formatCurrencyWestern = useCallback((amount: number) => currencyFormatter.format(amount), [currencyFormatter]);

  // 🧩 مصدر واحد للـ needs يعتمد على البيانات لو موجودة وإلا مصفوفة فاضية
  const needs: Need[] = useMemo(() => (hasNeeds ? (caseItem!.needs as Need[]) : []), [hasNeeds, caseItem]);

  // 🌟 تصنيف الاحتياجات
  const needsByCategory = useMemo(() => {
    return needs.reduce((acc, need) => {
      const category = need.category || 'أخرى';
      (acc[category] ||= []).push(need);
      return acc;
    }, {} as Record<string, Need[]>);
  }, [needs]);

  const categories = useMemo(() => Object.keys(needsByCategory), [needsByCategory]);

  // ✅ الفئة المختارة + إعادة ضبط عند تغيّر البيانات
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0] || null);
  useEffect(() => {
    setSelectedCategory((prev) => (prev && categories.includes(prev) ? prev : categories[0] || null));
  }, [categories]);

  // ✅ كميات التبرع الافتراضية = 1 لكل عنصر (وتتحدّث عند تغيّر القائمة)
  const [donationQuantities, setDonationQuantities] = useState<Record<string, number>>(() =>
    needs.reduce((acc, need) => {
      acc[String(need.id)] = 1;
      return acc;
    }, {} as Record<string, number>)
  );
  useEffect(() => {
    setDonationQuantities(
      needs.reduce((acc, need) => {
        acc[String(need.id)] = 1;
        return acc;
      }, {} as Record<string, number>)
    );
  }, [needs]);

  const [mainContentTab, setMainContentTab] = useState<'products' | 'about' | 'inquiries'>('products');
  const [message, setMessage] = useState<string | null>(null);

  // 🧮 حساب المتبقي آمن
  const remainingFunds = useMemo(() => {
    const needed = caseItem?.fundNeeded || 0;
    const raised = caseItem?.fundRaised || 0;
    return Math.max(0, needed - raised);
  }, [caseItem?.fundNeeded, caseItem?.fundRaised]);

  const handleQuantityChange = useCallback(
    (needId: string, value: string) => {
      let numValue = Number.isFinite(Number(value)) ? parseInt(value, 10) : 0;
      if (isNaN(numValue) || numValue < 0) numValue = 0;

      const currentNeed = needs.find((n) => String(n.id) === needId);
      const maxQuantity = currentNeed ? Math.max(0, (currentNeed.quantity || 0) - (currentNeed.funded || 0)) : 0;

      if (numValue > maxQuantity) numValue = maxQuantity;

      setDonationQuantities((prev) => ({ ...prev, [needId]: numValue }));
    },
    [needs]
  );

  const handleAddToCart = useCallback(
    (need: Need) => {
      if (!caseItem) return;

      const quantity = donationQuantities[String(need.id)] || 0;
      const remaining = Math.max(0, (need.quantity || 0) - (need.funded || 0));

      if (quantity <= 0) {
        setMessage('الرجاء تحديد كمية أكبر من الصفر.');
        return;
      }
      if (quantity > remaining) {
        setMessage('الكمية المطلوبة تتجاوز المتبقي.');
        return;
      }
      if (!need.unitPrice || need.unitPrice <= 0) {
        setMessage('لا يمكن إضافة منتج بدون سعر وحدة صحيح.');
        return;
      }

      const itemToAdd: CartItem = {
        id: `${caseItem.id}-${need.id}`,
        institutionId: String(caseItem.id),
        institutionName: caseItem.title,
        needId: String(need.id),
        itemName: need.item,
        itemImage: need.image,
        unitPrice: need.unitPrice,
        quantity,
        totalPrice: quantity * need.unitPrice,
      };

      addItem(itemToAdd);
      setMessage(`تم إضافة ${formatNumberWestern(quantity)} × "${itemToAdd.itemName}" إلى سلة التبرعات.`);
    },
    [addItem, caseItem, donationQuantities, formatNumberWestern]
  );

  const handleDonateAllRemainingNeeds = useCallback(() => {
    if (!caseItem) return;

    let itemsAddedCount = 0;
    let totalAmountToDonate = 0;

    needs.forEach((need) => {
      const remainingQuantity = Math.max(0, (need.quantity || 0) - (need.funded || 0));
      if (remainingQuantity > 0 && need.unitPrice && need.unitPrice > 0) {
        const itemToAdd: CartItem = {
          id: `${caseItem.id}-${need.id}`,
          institutionId: String(caseItem.id),
          institutionName: caseItem.title,
          needId: String(need.id),
          itemName: need.item,
          itemImage: need.image,
          unitPrice: need.unitPrice,
          quantity: remainingQuantity,
          totalPrice: remainingQuantity * need.unitPrice,
        };
        addItem(itemToAdd);
        itemsAddedCount++;
        totalAmountToDonate += itemToAdd.totalPrice;
      }
    });

    if (itemsAddedCount > 0) {
      setMessage(
        `تم إضافة ${formatNumberWestern(itemsAddedCount)} منتجًا (بإجمالي ${formatCurrencyWestern(
          totalAmountToDonate
        )}) إلى السلة.`
      );
      router.push('/donation-basket');
    } else {
      setMessage('تم تمويل جميع الوحدات في هذه الحالة.');
    }
  }, [addItem, caseItem, needs, formatCurrencyWestern, formatNumberWestern, router]);

  // ✅ العرض: الآن مسموح نرجع مبكّر — بعد كل الهُوكس
  if (!hasNeeds) {
    return (
      <div className={`container ${styles.caseDetailsPageContent}`}>
        <p className={styles.noDataMessage}>عذرًا، لا توجد تفاصيل أو احتياجات متوفرة لهذه الحالة.</p>
        <div className={styles.backLinkWrapper}>
          <Link href="/cases" className={styles.backLink}>
            العودة إلى الحالات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.caseDetailsPageContent}>
      <div className="container">
        <div className={styles.mainContentArea}>
          <div className={styles.caseTopInfoBarInsideContainer}>
            <div className={styles.leftSection}>
              <h2 className={styles.schoolName}>{caseItem!.title}</h2>
              <p className={styles.licensingInfo}>
                <span className={styles.qualityBadge}>
                  <i className="fas fa-check-circle" />
                </span>
                تصريح رسمي من وزارة الخارجية – قسم التنسيق للعمل الإنساني (HAC) لتوثيق المدارس ميدانيًا.
              </p>
              <p className={styles.educationalPricing}>
                <span className={styles.qualityBadge}>
                  <i className="fas fa-check-circle" />
                </span>
                تسعير وزارة التربية والتعليم
              </p>
            </div>

            <div className={styles.rightSection}>
              <div className={styles.remainingFundsDisplay}>
                <p>
                  المتبقي:{' '}
                  <span className={styles.highlightGold}>{formatCurrencyWestern(remainingFunds)}</span>{' '}
                  من أصل{' '}
                  <span className={styles.highlightGreen}>
                    {formatCurrencyWestern(caseItem!.fundNeeded || 0)}
                  </span>
                </p>
              </div>
              <div className={styles.directDonateInput}>
                <button className={`${styles.requestDetailsBtn} btn`} type="button">
                  طلب تفصيل الاحتياج <i className="fas fa-list-alt" />
                </button>
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

          {/* تبويبات */}
          <div className={styles.caseSubNavSectionTabs}>
            <div className={styles.subNavContainer} role="tablist" aria-label="التنقل داخل تفاصيل الحالة">
              <button
                className={`${styles.navItem} ${mainContentTab === 'products' ? styles.active : ''}`}
                onClick={() => setMainContentTab('products')}
                role="tab"
                aria-selected={mainContentTab === 'products'}
                type="button"
              >
                صفحة المنتجات
              </button>
              <button
                className={`${styles.navItem} ${mainContentTab === 'about' ? styles.active : ''}`}
                onClick={() => setMainContentTab('about')}
                role="tab"
                aria-selected={mainContentTab === 'about'}
                type="button"
              >
                عن المدرسة + توثيق وصور
              </button>
              <button
                className={`${styles.navItem} ${mainContentTab === 'inquiries' ? styles.active : ''}`}
                onClick={() => setMainContentTab('inquiries')}
                role="tab"
                aria-selected={mainContentTab === 'inquiries'}
                type="button"
              >
                أسئلة واستفسارات
              </button>
            </div>
          </div>

          {/* منطقة الرسائل */}
          {message && (
            <div className={styles.infoMessage} role="status">
              {message}
            </div>
          )}

          <div className={styles.tabContentArea}>
            {mainContentTab === 'products' && selectedCategory && needsByCategory[selectedCategory]?.length > 0 && (
              <div className={styles.productsNeedsGridTab}>
                <div className={`${styles.categoryTabsContainer} mb-40`}>
                  {categories.length > 0 ? (
                    categories.map((categoryName) => {
                      const firstNeedInCat = needsByCategory[categoryName][0];
                      const categoryIcon = firstNeedInCat?.icon || 'fas fa-box-open';
                      return (
                        <button
                          key={categoryName}
                          className={`${styles.categoryTabItem} ${
                            selectedCategory === categoryName ? styles.activeTab : ''
                          }`}
                          onClick={() => setSelectedCategory(categoryName)}
                          aria-pressed={selectedCategory === categoryName}
                          title={categoryName}
                          type="button"
                        >
                          <i className={categoryIcon} aria-hidden="true" />
                          <span>{categoryName}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className={`text-center ${styles.noProductsMessage}`}>لا توجد فئات متاحة.</p>
                  )}
                </div>

                <div className={`${styles.productsListSection} mt-40`}>
                  <h3 className={styles.productCategoryTitle}>{selectedCategory}</h3>
                  <div className={styles.productsNeedsGrid}>
                    {needsByCategory[selectedCategory].map((need) => {
                      const currentQuantity = donationQuantities[String(need.id)] || 0;
                      const remainingQuantity = Math.max(0, (need.quantity || 0) - (need.funded || 0));
                      const totalPriceForCurrentQuantity = currentQuantity * (need.unitPrice || 0);

                      return (
                        <div key={need.id} className={styles.productCardNewDesign}>
                          <div className={styles.productImageWrapper}>
                            <Image
                              src={need.image}
                              alt={need.item}
                              width={250}
                              height={200}
                              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            />
                          </div>
                          <h5 className={styles.productItemNameNew}>{need.item}</h5>

                          <div className={styles.productPriceAndControls}>
                            <div className={styles.productPriceGroup}>
                              <span className={styles.productPriceValue}>
                                {formatCurrencyWestern(totalPriceForCurrentQuantity)}
                              </span>
                            </div>

                            <div className={styles.quantityControlNew}>
                              <button
                                className={styles.quantityBtn}
                                onClick={() =>
                                  handleQuantityChange(String(need.id), String(Math.max(0, currentQuantity - 1)))
                                }
                                disabled={currentQuantity <= 0}
                                aria-label="إنقاص الكمية"
                                type="button"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className={styles.quantityInputNew}
                                value={String(currentQuantity)}
                                onChange={(e) => handleQuantityChange(String(need.id), e.target.value)}
                                min={0}
                                max={remainingQuantity}
                                step={1}
                                inputMode="numeric"
                                aria-label="كمية التبرع"
                              />
                              <button
                                className={styles.quantityBtn}
                                onClick={() => handleQuantityChange(String(need.id), String(currentQuantity + 1))}
                                disabled={currentQuantity >= remainingQuantity}
                                aria-label="زيادة الكمية"
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {remainingQuantity > 0 ? (
                            <p className={styles.remainingUnitsInfo}>
                              متبقي: {formatNumberWestern(remainingQuantity)} وحدات
                            </p>
                          ) : (
                            <p className={`${styles.remainingUnitsInfo} ${styles.soldOut}`}>تم تمويل جميع الوحدات</p>
                          )}

                          <button
                            className={styles.btnDonateNew}
                            onClick={() => handleAddToCart(need)}
                            disabled={remainingQuantity <= 0 || currentQuantity <= 0 || !need.unitPrice || need.unitPrice <= 0}
                            type="button"
                          >
                            <i className="fas fa-heart" aria-hidden="true" />
                            <span className={styles.donateText}>تبرع</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {mainContentTab === 'about' && (
              <div className={`${styles.aboutSchoolTabContent} ${styles.tabPane} py-40`}>
                <h2 className="section-title text-center">عن المدرسة + توثيق وصور</h2>
                <div className={`${styles.caseDescriptionBlock} mb-40`}>
                  <p>{caseItem!.description}</p>
                  <p>
                    <strong>المحافظة:</strong> {caseItem!.governorate}، <strong>المدينة:</strong> {caseItem!.city}
                  </p>
                  <p>
                    <strong>نوع المؤسسة:</strong> {caseItem!.type}
                  </p>
                  <p>
                    <strong>درجة الاحتياج:</strong> {caseItem!.needLevel}
                  </p>
                </div>
                <div className={styles.caseGalleryBlock}>
                  <h3 className="section-subtitle">معرض الصور</h3>
                  <div className={styles.caseGalleryGrid}>
                    {caseItem!.images.map((imgSrc, index) => (
                      <div key={index} className={styles.galleryItem}>
                        <Image
                          src={imgSrc}
                          alt={`${caseItem!.title} - صورة ${formatNumberWestern(index + 1)}`}
                          width={400}
                          height={300}
                          style={{ objectFit: 'cover' }}
                          className={styles.responsiveImage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mainContentTab === 'inquiries' && (
              <div className={`${styles.inquiriesTabContent} ${styles.tabPane} py-40`}>
                <h2 className="section-title text-center">أسئلة واستفسارات</h2>
                <div className={`${styles.inquiriesBlock} mb-40`}>
                  <p>هنا يمكنك إضافة محتوى صفحة الأسئلة والاستفسارات.</p>
                  <p>يمكن أن يتضمن نموذجًا للأسئلة الشائعة أو نموذج اتصال.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CaseDetailsContent;
