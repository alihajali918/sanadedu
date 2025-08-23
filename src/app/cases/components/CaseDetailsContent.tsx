// src/components/CaseDetailsContent.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from '@/app/cases/[id]/page.module.css';
import { useCart, CartItem } from '@/app/context/CartContext';
import { Need, CaseItem } from 'lib/types'; // استيراد الأنواع من ملف types.ts الجديد

interface CaseDetailsContentProps {
  caseItem: CaseItem;
}

const CaseDetailsContent: React.FC<CaseDetailsContentProps> = ({ caseItem }) => {
  const router = useRouter(); 
  const { addItem } = useCart(); 

  const needsByCategory = caseItem?.needs.reduce((acc, need) => {
    const category = need.category || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(need);
    return acc;
  }, {} as { [key: string]: Need[] });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const initialCategory = Object.keys(needsByCategory || {})[0] || null;
    return initialCategory;
  });

  const [donationQuantities, setDonationQuantities] = useState<{ [key: string]: number }>(() => {
    const initialQuantities = caseItem?.needs.reduce((acc, need) => {
      acc[String(need.id)] = 1; // تعيين الكمية الافتراضية إلى 1 لكل احتياج
      return acc;
    }, {} as { [key: string]: number }) || {};
    return initialQuantities;
  });

  const [mainContentTab, setMainContentTab] = useState('products');
  
  const formatNumberWestern = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
  };
  
  const handleQuantityChange = (needId: string, value: string) => {
    const numValue = parseInt(value, 10);
    const currentNeed = caseItem.needs.find(need => String(need.id) === needId);
    const maxQuantity = currentNeed ? currentNeed.quantity - currentNeed.funded : 0; 
    setDonationQuantities(prevQuantities => ({
      ...prevQuantities,
      [needId]: Math.min(maxQuantity, Math.max(0, isNaN(numValue) ? 0 : numValue))
    }));
  };

  const handleAddToCart = (need: Need) => {
    const quantity = donationQuantities[need.id.toString()] || 0;
    if (quantity > 0) {
      const itemToAdd: CartItem = {
        id: `${caseItem.id}-${need.id}`, // معرف فريد للعنصر في السلة (مزيج من معرف الحالة ومعرف الاحتياج)
        institutionId: caseItem.id.toString(),
        institutionName: caseItem.title,
        needId: need.id.toString(),
        itemName: need.item,
        itemImage: need.image,
        unitPrice: need.unitPrice,
        quantity: quantity,
        totalPrice: quantity * need.unitPrice,
      };
      addItem(itemToAdd); // هذه الدالة هي التي تحتاج إلى منطق التحديث
      console.log(`تم إضافة ${quantity} من "${itemToAdd.itemName}" إلى سلة التبرعات!`);
    } else {
      console.log("الرجاء تحديد كمية أكبر من الصفر.");
    }
  };

  const handleDonateAllRemainingNeeds = () => {
    if (!caseItem || !caseItem.needs || caseItem.needs.length === 0) {
      console.log("No products available to donate to this case.");
      return;
    }
    let itemsAddedCount = 0;
    let totalAmountToDonate = 0;
    caseItem.needs.forEach(need => {
      const remainingQuantity = need.quantity - need.funded;
      if (remainingQuantity > 0) {
        const itemToAdd: CartItem = {
          id: `${caseItem.id}-${need.id}`, // معرف فريد للعنصر في السلة
          institutionId: caseItem.id.toString(),
          institutionName: caseItem.title,
          needId: need.id.toString(),
          itemName: need.item,
          itemImage: need.image,
          unitPrice: need.unitPrice,
          quantity: remainingQuantity,
          totalPrice: remainingQuantity * need.unitPrice,
        };
        addItem(itemToAdd); // هذه الدالة هي التي تحتاج إلى منطق التحديث
        itemsAddedCount++;
        totalAmountToDonate += remainingQuantity * need.unitPrice;
      }
    });
    if (itemsAddedCount > 0) {
      console.log(`تم إضافة ${itemsAddedCount} نوعًا من المنتجات (بإجمالي ${formatCurrencyWestern(totalAmountToDonate)}) إلى سلة التبرعات!`);
      router.push('/donation-basket');
    } else {
      console.log("تم تمويل جميع الوحدات في هذه الحالة، لا توجد منتجات متبقية للتبرع بها.");
    }
  };

  return (
    <main className={styles.caseDetailsPageContent}>
      <div className={`container`}>
        <div className={styles.mainContentArea}>
          {/* شريط معلومات الحالة العلوي */}
          <div className={styles.caseTopInfoBarInsideContainer}>
            <div className={styles.schoolNameDisplay}>
              <h2 className={styles.schoolName}>
                {caseItem.title}
                <span className={styles.qualityBadge}>
                  <i className="fas fa-check-circle"></i>
                  <span className={styles.tooltipText}>تصريح رسمي من وزارة الخارجية – قسم التنسيق للعمل الإنساني (HAC) لتوثيق المدارس ميدانيًا.</span>
                </span>
              </h2>
            </div>
            <div className={styles.remainingFundsDisplay}>
              <p>المتبقي: <span className={styles.highlightGold}>{formatCurrencyWestern(caseItem.fundNeeded - caseItem.fundRaised)}</span> من أصل <span className={styles.highlightGreen}>{formatCurrencyWestern(caseItem.fundNeeded)}</span></p>
            </div>
            <div className={styles.directDonateInput}>
              <button className={`${styles.requestDetailsBtn} btn`}>طلب تفصيل الاحتياج <i className="fas fa-list-alt"></i></button>
              <button onClick={handleDonateAllRemainingNeeds} className={`${styles.donateGeneralBtn} btn btn-cta-primary`}>تبني المؤسسة <i className="fas fa-heart"></i></button>
            </div>
          </div>

          {/* شريط التبويبات الرئيسي */}
          <div className={styles.caseSubNavSectionTabs}>
            <div className={styles.subNavContainer}>
              <button className={`${styles.navItem} ${mainContentTab === 'products' ? styles.active : ''}`} onClick={() => setMainContentTab('products')}>صفحة المنتجات</button>
              <button className={`${styles.navItem} ${mainContentTab === 'about' ? styles.active : ''}`} onClick={() => setMainContentTab('about')}>عن المدرسة + توثيق وصور</button>
            </div>
          </div>

          {/* محتوى التبويبات */}
          <div className={styles.tabContentArea}>
            {mainContentTab === 'products' && (
              <div className={styles.productsNeedsGridTab}>
                {/* Product Categories Tabs */}
                <div className={`${styles.categoryTabsContainer} mb-40`}>
                  {Object.keys(needsByCategory).length > 0 ? (
                    Object.keys(needsByCategory).map((categoryName) => {
                      const firstNeedInCat = needsByCategory[categoryName][0];
                      const categoryIcon = firstNeedInCat?.icon || "fas fa-box-open";
                      return (
                        <button 
                          key={categoryName} 
                          className={`${styles.categoryTabItem} ${selectedCategory === categoryName ? styles.activeTab : ''}`}
                          onClick={() => setSelectedCategory(categoryName)}
                        >
                          <i className={categoryIcon}></i>
                          <span>{categoryName}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className={`text-center ${styles.noProductsMessage}`}>لا توجد فئات متاحة.</p>
                  )}
                </div>

                {/* Products List */}
                {selectedCategory && (
                  <div className={`${styles.productsListSection} mt-40`}>
                    <h3 className={styles.productCategoryTitle}>{selectedCategory}</h3>
                    <div className={styles.productsNeedsGrid}>
                      {needsByCategory[selectedCategory].map((need) => {
                        const currentQuantity = donationQuantities[String(need.id)] || 0;
                        const remainingQuantity = need.quantity - need.funded;
                        const totalPriceForCurrentQuantity = currentQuantity * need.unitPrice;

                        return (
                          <div key={need.id} className={styles.productCardNewDesign}>
                            <div className={styles.productImageWrapper}>
                              <Image
                                src={need.image}
                                alt={need.item}
                                width={250}
                                height={200}
                                style={{ objectFit: "cover", width: '100%', height: '100%' }}
                              />
                            </div>
                            <h5 className={styles.productItemNameNew}>{need.item}</h5>
                            <div className={styles.productPriceAndControls}>
                              <div className={styles.productPriceGroup}>
                                <span className={styles.productPriceValue}>{formatCurrencyWestern(totalPriceForCurrentQuantity)}</span>
                              </div>
                              <div className={styles.quantityControlNew}>
                                <button 
                                  className={styles.quantityBtn} 
                                  onClick={() => handleQuantityChange(String(need.id), String(Math.max(1, (currentQuantity) - 1)))}
                                  disabled={currentQuantity <= 1}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className={styles.quantityInputNew}
                                  value={String(currentQuantity)} 
                                  onChange={(e) => handleQuantityChange(String(need.id), e.target.value)}
                                  min="1"
                                  max={remainingQuantity} 
                                />
                                <button 
                                  className={styles.quantityBtn} 
                                  onClick={() => handleQuantityChange(String(need.id), String((currentQuantity) + 1))}
                                  disabled={currentQuantity >= remainingQuantity} 
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            {remainingQuantity > 0 && (
                              <p className={styles.remainingUnitsInfo}>
                                متبقي: {formatNumberWestern(remainingQuantity)} وحدات
                              </p>
                            )}
                            {remainingQuantity <= 0 && (
                              <p className={`${styles.remainingUnitsInfo} ${styles.soldOut}`}>
                                تم تمويل جميع الوحدات
                              </p>
                            )}
                            <button
                              className={styles.btnDonateNew}
                              onClick={() => handleAddToCart(need)}
                              disabled={remainingQuantity <= 0} 
                            >
                              <i className="fas fa-heart"></i>
                              <span className={styles.donateText}>تبرع</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mainContentTab === 'about' && (
              <div className={`${styles.aboutSchoolTabContent} ${styles.tabPane} py-40`}>
                <h2 className="section-title text-center">عن المدرسة + توثيق وصور</h2>
                <div className={`${styles.caseDescriptionBlock} mb-40`}>
                  <h3 className="section-subtitle">وصف الحالة</h3>
                  <p>{caseItem.description}</p>
                  <p><strong>المحافظة:</strong> {caseItem.governorate}، <strong>المدينة:</strong> {caseItem.city}</p>
                  <p><strong>نوع المؤسسة:</strong> {caseItem.type}</p>
                  <p><strong>درجة الاحتياج:</strong> {caseItem.needLevel}</p>
                </div>
                <div className={styles.caseGalleryBlock}>
                  <h3 className="section-subtitle">معرض الصور</h3>
                  <div className={styles.caseGalleryGrid}>
                    {caseItem.images.map((imgSrc, index) => (
                      <div key={index} className={styles.galleryItem}>
                        <Image src={imgSrc} alt={`${caseItem.title} - صورة ${formatNumberWestern(index + 1)}`} width={400} height={300} style={{objectFit:"cover"}} className={styles.responsiveImage} />
                      </div>
                    ))}
                  </div>
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
