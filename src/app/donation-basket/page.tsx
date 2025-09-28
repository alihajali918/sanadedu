"use client";

import { useState, useMemo, useCallback } from "react";
// 💡 استيراد الخصائص الحقيقية من CartContext
import { useCart, CartItem } from "../context/CartContext";
import Image from "next/image";
import Link from "next/link";
import styles from "./DonationBasketPage.module.css";

// -----------------------------------------------------------
// 1. تعريف هيكل البيانات الذي يتوقعه ووردبريس
// -----------------------------------------------------------
interface DonationItemForWP {
  case_id: number;
  line_total: number;
  item_quantity: number;
  acf_field_id?: string;
  need_id?: string;
}

// -----------------------------------------------------------
// 2. دالة بناء الحمولة الموحدة (تم التأكيد على المنطق)
// -----------------------------------------------------------
const buildDonatedItemsPayload = (
  items: CartItem[],
  shippingFees: number,
  customDonation: number
): DonationItemForWP[] => {
  const payload: DonationItemForWP[] = [];

  // أ. إضافة عناصر السلة (الحالات المخصصة)
  items.forEach((item) => {
    // التحقق من صلاحية البيانات قبل الإضافة
    if (item.totalPrice > 0 && item.quantity > 0) {
      payload.push({
        case_id: Number(item.institutionId),
        line_total: item.totalPrice,
        item_quantity: item.quantity,
        acf_field_id: item.acfFieldId,
        need_id: item.needId,
      });
    }
  });

  // ب. إضافة أجور النقل (لميزانية التشغيل)
  if (shippingFees > 0) {
    payload.push({
      case_id: 0, // تبرع عام
      line_total: shippingFees,
      item_quantity: 0,
      need_id: "operational-costs-shipping", // مفتاح تفريغ واضح
    });
  }

  // ج. إضافة التبرع المخصص (لميزانية التشغيل)
  if (customDonation > 0) {
    payload.push({
      case_id: 0, // تبرع عام
      line_total: customDonation,
      item_quantity: 0,
      need_id: "operational-costs-custom", // مفتاح تفريغ واضح
    });
  }

  return payload;
};

// -----------------------------------------------------------
// 3. مكون الصفحة (DonationBasketPage) - يستخدم البيانات الحية
// -----------------------------------------------------------
const DonationBasketPage = () => {
  // 💡 استخدام الـ Context الحقيقي
  const {
    cartItems,
    removeItem,
    updateItemQuantity,
    clearCart,
    getTotalAmount,
  } = useCart();

  // 1. حالة إضافة أجور النقل (رسوم ثابتة 5$)
  const [addShippingFees, setAddShippingFees] = useState(false);
  // 2. حالة التحكم بظهور حقل التبرع المخصص
  const [showCustomDonationInput, setShowCustomDonationInput] = useState(false);
  // 3. حالة مبلغ التبرع الإضافي غير المحدد
  const [customDonationAmount, setCustomDonationAmount] = useState<string>("");

  // دالة تنسيق العملة
  const formatCurrencyWestern = (amount: number, currency: string = "USD") => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // دالة معالجة تغيير الكمية
  const handleQuantityChange = useCallback(
    (id: string, value: string) => {
      const newQuantity = parseInt(value, 10);

      if (isNaN(newQuantity) || newQuantity < 0) {
        // لا تفعل شيئًا إذا كان الإدخال غير صالح
        return;
      }

      if (newQuantity === 0) {
        removeItem(id); // حذف العنصر إذا كانت الكمية صفر
      } else {
        updateItemQuantity(id, newQuantity);
      }
    },
    [removeItem, updateItemQuantity]
  );

  // 💡 الحسابات (مع useMemo لضمان الكفاءة)
  const {
    subtotal,
    shippingFeeValue,
    parsedCustomDonation,
    optionalShippingFees,
    finalTotal,
    isCustomDonationValid,
  } = useMemo(() => {
    const currentSubtotal = getTotalAmount();
    const currentShippingFeeValue = 5;

    const currentParsedCustomDonation = showCustomDonationInput
      ? parseFloat(customDonationAmount) || 0
      : 0;

    // تحقق من صلاحية إدخال المبلغ المخصص
    const currentIsCustomDonationValid =
      currentParsedCustomDonation >= 0 &&
      !isNaN(parseFloat(customDonationAmount) || 0);

    const currentOptionalShippingFees = addShippingFees
      ? currentShippingFeeValue
      : 0;
    const currentFinalTotal =
      currentSubtotal +
      currentOptionalShippingFees +
      currentParsedCustomDonation;

    return {
      subtotal: currentSubtotal,
      shippingFeeValue: currentShippingFeeValue,
      parsedCustomDonation: currentParsedCustomDonation,
      optionalShippingFees: currentOptionalShippingFees,
      finalTotal: currentFinalTotal,
      isCustomDonationValid: currentIsCustomDonationValid,
    };
  }, [
    getTotalAmount,
    addShippingFees,
    customDonationAmount,
    showCustomDonationInput,
  ]);

  // التحقق النهائي قبل الدفع
  const canProceedToCheckout = finalTotal > 0 && isCustomDonationValid;

  // 💡 بناء الحمولة الموحدة للإرسال
  const finalPayload = buildDonatedItemsPayload(
    cartItems,
    optionalShippingFees,
    parsedCustomDonation
  );

  // 💡 تشفير الحمولة الموحدة لـ URL
  const encodedDonatedItems = encodeURIComponent(JSON.stringify(finalPayload));

  // ------------------- العرض -------------------

  const isCartTotallyEmpty =
    cartItems.length === 0 &&
    optionalShippingFees === 0 &&
    parsedCustomDonation === 0;

  if (isCartTotallyEmpty) {
    return (
      <div className={styles.basketContainer} dir="rtl">
        <h1 className={styles.pageTitle}>سلة التبرعات</h1>
        <div className={styles.emptyCartMessage}>
          <p>سلة تبرعاتك فارغة حاليًا. لنقم بملئها بالعطاء!</p>
          <Link href="/cases" className={styles.emptyCartButton}>
            تصفح الحالات لدعمها <i className={`fas fa-arrow-left`}></i>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.basketContainer} dir="rtl">
      <h1 className={styles.pageTitle}>سلة التبرعات </h1>

      <div className={styles.cartLayout}>
        {/* ------------------- A. قائمة العناصر المخصصة ------------------- */}
        <div className={styles.cartItemsList}>
          <div className={styles.cartHeader}>
            <h3>عناصر التبرع المخصصة ({cartItems.length})</h3>
            <button
              onClick={clearCart}
              className={styles.clearAllButton}
              disabled={cartItems.length === 0}
            >
              <i className="fas fa-trash-alt"></i> مسح السلة
            </button>
          </div>

          {cartItems.length === 0 ? (
            <p className={styles.noSpecificItems}>
              لا يوجد عناصر محددة في السلة حاليًا. يمكنك إضافة تبرع تشغيلي من
              الملخص.
            </p>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className={styles.cartItemCard}>
                {/* الصورة */}
                <div className={styles.cartItemImageContainer}>
                  <Image
                    src={
                      item.itemImage ||
                      "https://placehold.co/100x80/EEE/31343C?text=صورة"
                    }
                    alt={item.itemName}
                    fill
                    style={{ objectFit: "cover" }}
                    className={styles.itemImage}
                  />
                </div>

                {/* التفاصيل والكمية */}
                <div className={styles.cartItemDetails}>
                  <h2 className={styles.itemName}>{item.itemName}</h2>
                  <p className={styles.itemInstitution}>
                    المؤسسة: <strong>{item.institutionName}</strong>
                  </p>

                  <div className={styles.cartItemControls}>
                    <div className={styles.quantityControl}>
                      <button
                        className={styles.quantityButton}
                        onClick={() =>
                          handleQuantityChange(
                            item.id,
                            (item.quantity - 1).toString()
                          )
                        }
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1" // يجب أن تكون 1 على الأقل لكي لا يحذف
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                        className={styles.quantityInput}
                      />
                      <button
                        className={styles.quantityButton}
                        onClick={() =>
                          updateItemQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      onClick={() => removeItem(item.id)}
                      className={styles.deleteButton}
                    >
                      <i className="fas fa-trash-alt"></i> حذف
                    </button>
                  </div>
                </div>

                {/* الإجمالي الفرعي للعنصر */}
                <div className={styles.itemTotalPrice}>
                  {formatCurrencyWestern(item.totalPrice)}
                </div>
              </div>
            ))
          )}

          {cartItems.length > 0 && (
            <div className={styles.cartItemsFooter}>
              <span>
                إجمالي عناصر الحالات:
                <strong className={styles.primaryGreenText}>
                  {" "}
                  {formatCurrencyWestern(subtotal)}
                </strong>
              </span>
              <Link href="/cases" className={styles.continueShoppingLink}>
                <i className="fas fa-arrow-left"></i> تصفح الحالات
              </Link>
            </div>
          )}
        </div>

        {/* ------------------- B. ملخص الدفع (Sticky) ------------------- */}
        <div className={styles.cartSummary}>
          <div className={styles.summarySection}>
            <h3>ملخص الدفع والتشغيل</h3>
          </div>

          {/* خيار رسوم النقل */}
          <div className={styles.summarySection}>
            <div className={styles.feesOptIn}>
              <input
                type="checkbox"
                id="add-shipping-fees-checkbox"
                checked={addShippingFees}
                onChange={(e) => setAddShippingFees(e.target.checked)}
                className={styles.feesCheckbox}
              />
              <label
                htmlFor="add-shipping-fees-checkbox"
                className={styles.feesLabel}
              >
                أجور النقل والتوصيل
                <span className={styles.goldenText}>
                  {" "}
                  ({formatCurrencyWestern(shippingFeeValue)})
                </span>
              </label>
            </div>
          </div>

          {/* خيار التبرع المخصص (لإظهار الحقل) */}
          <div className={styles.summarySection}>
            <div className={styles.feesOptIn}>
              <input
                type="checkbox"
                id="toggle-custom-donation-input"
                checked={showCustomDonationInput}
                onChange={(e) => {
                  setShowCustomDonationInput(e.target.checked);
                  if (!e.target.checked) setCustomDonationAmount("");
                }}
                className={styles.feesCheckbox}
              />
              <label
                htmlFor="toggle-custom-donation-input"
                className={styles.feesLabel}
              >
                تبرع إضافي لميزانية التشغيل
              </label>
            </div>
          </div>

          {/* حقل التبرع المخصص (يظهر فقط عند التحديد) */}
          {showCustomDonationInput && (
            <div className={styles.summarySection}>
              <div className={styles.customDonationInputGroup}>
                <input
                  type="number"
                  id="custom-donation-input"
                  min="0"
                  step="1"
                  placeholder="أدخل المبلغ..."
                  value={customDonationAmount}
                  onChange={(e) => setCustomDonationAmount(e.target.value)}
                  className={`${styles.customDonationInput} ${
                    !isCustomDonationValid && customDonationAmount !== ""
                      ? styles.invalidInput
                      : ""
                  }`}
                />
                <span className={styles.currencySuffix}>USD</span>
              </div>
              {!isCustomDonationValid && customDonationAmount !== "" && (
                <p className={styles.errorNote}>
                  الرجاء إدخال رقم صحيح غير سالب.
                </p>
              )}
            </div>
          )}

          {/* تفاصيل الإجمالي */}
          <div className={styles.summarySectionBreakdown}>
            {subtotal > 0 && (
              <div className={styles.summaryRow}>
                <span>إجمالي تبرعات الحالات:</span>
                <span>{formatCurrencyWestern(subtotal)}</span>
              </div>
            )}
            {optionalShippingFees > 0 && (
              <div className={styles.summaryRow}>
                <span>أجور النقل:</span>
                <span className={styles.goldenText}>
                  + {formatCurrencyWestern(optionalShippingFees)}
                </span>
              </div>
            )}
            {parsedCustomDonation > 0 && (
              <div className={styles.summaryRow}>
                <span>تبرع مخصص للتشغيل:</span>
                <span className={styles.goldenText}>
                  + {formatCurrencyWestern(parsedCustomDonation)}
                </span>
              </div>
            )}
          </div>

          {/* الإجمالي الكلي للدفع وزر الدفع */}
          <div className={styles.summarySection}>
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>الإجمالي الكلي للدفع:</span>
              <span className={styles.finalTotalAmount}>
                {formatCurrencyWestern(finalTotal)}
              </span>
            </div>

            <Link
              href={`/checkout?donatedItems=${encodedDonatedItems}&totalAmount=${finalTotal}`}
              className={styles.checkoutButton}
              onClick={(e) => {
                if (!canProceedToCheckout) e.preventDefault();
              }}
              aria-disabled={!canProceedToCheckout}
            >
              <i className="fas fa-lock"></i> المتابعة للدفع
            </Link>

            <p className={styles.policyNote}>
              مبلغ ($$ {formatCurrencyWestern(finalTotal)} $$) يذهب لدعم
              مشاريعنا الإنسانية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationBasketPage;
