"use client";

import { useState, useMemo, useCallback } from "react";
import { useCart, CartItem } from "../context/CartContext";
import Image from "next/image";
import Link from "next/link";
import styles from "./DonationBasketPage.module.css";

// -----------------------------------------------------------
// 1. تعريف هيكل البيانات الذي يتوقعه ووردبريس (بدون تغيير)
// -----------------------------------------------------------
interface DonationItemForWP {
  case_id: number;
  line_total: number;
  item_quantity: number;
  acf_field_id?: string;
  need_id?: string;
}

// -----------------------------------------------------------
// 2. دالة بناء الحمولة الموحدة (تم تعديل منطق دمج التبرع التشغيلي)
// -----------------------------------------------------------
const buildDonatedItemsPayload = (
  items: CartItem[],
  totalOperationalDonation: number // المبلغ الإجمالي الموحد للتشغيل
): DonationItemForWP[] => {
  const payload: DonationItemForWP[] = [];

  // أ. إضافة عناصر السلة (الحالات المخصصة)
  items.forEach((item) => {
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

  // ب. إضافة التبرع التشغيلي الموحد (أجور النقل + الإضافي)
  if (totalOperationalDonation > 0) {
    payload.push({
      case_id: 0, // تبرع عام
      line_total: totalOperationalDonation,
      item_quantity: 0,
      need_id: "operational-costs-combined", // مفتاح تفريغ موحد
    });
  }

  return payload;
};

// -----------------------------------------------------------
// 3. مكون الصفحة (DonationBasketPage)
// -----------------------------------------------------------
const DonationBasketPage = () => {
  const { cartItems, removeItem, updateItemQuantity, clearCart, getTotalAmount } = useCart();

  // 1. الحالة الموحدة: للتحكم بظهور حقل التبرع التشغيلي المدمج
  const [showOperationalFeesInput, setShowOperationalFeesInput] = useState(false);
  // 2. حالة مبلغ التبرع التشغيلي (افتراضياً 5$)
  const SHIPPING_DEFAULT_FEE = 5;
  const [operationalDonationAmount, setOperationalDonationAmount] = useState<string>(
    SHIPPING_DEFAULT_FEE.toString()
  );

  // دالة تنسيق العملة (بدون تغيير)
  const formatCurrencyWestern = (amount: number, currency: string = "USD") => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // دالة معالجة تغيير الكمية (بدون تغيير)
  const handleQuantityChange = useCallback(
    (id: string, value: string) => {
      const newQuantity = parseInt(value, 10);
      if (isNaN(newQuantity) || newQuantity < 0) return;
      if (newQuantity === 0) {
        removeItem(id);
      } else {
        updateItemQuantity(id, newQuantity);
      }
    },
    [removeItem, updateItemQuantity]
  );

  // 💡 الحسابات (مع useMemo) - تم تبسيطها
  const { subtotal, parsedOperationalDonation, finalTotal, isOperationalDonationValid } = useMemo(() => {
    const currentSubtotal = getTotalAmount();

    // المبلغ التشغيلي المدخل
    const currentParsedOperationalDonation = showOperationalFeesInput
      ? parseFloat(operationalDonationAmount) || 0
      : 0;

    // تحقق من صلاحية إدخال المبلغ (أكبر من صفر إذا تم تحديده، وألا يكون قيمة غير صالحة)
    const currentIsOperationalDonationValid =
      currentParsedOperationalDonation >= 0 &&
      !isNaN(parseFloat(operationalDonationAmount) || 0);

    const currentFinalTotal = currentSubtotal + currentParsedOperationalDonation;

    return {
      subtotal: currentSubtotal,
      parsedOperationalDonation: currentParsedOperationalDonation,
      finalTotal: currentFinalTotal,
      isOperationalDonationValid: currentIsOperationalDonationValid,
    };
  }, [getTotalAmount, operationalDonationAmount, showOperationalFeesInput]);

  // التحقق النهائي قبل الدفع
  const canProceedToCheckout = finalTotal > 0 && isOperationalDonationValid;

  // 💡 بناء الحمولة الموحدة للإرسال
  const finalPayload = buildDonatedItemsPayload(
    cartItems,
    parsedOperationalDonation // إرسال المبلغ التشغيلي الموحد
  );

  // 💡 تشفير الحمولة الموحدة لـ URL
  const encodedDonatedItems = encodeURIComponent(JSON.stringify(finalPayload));

  // ------------------- العرض -------------------

  // التحقق من أن السلة ليست فارغة تماماً (لتفادي حقل الإدخال وحده)
  const isCartTotallyEmpty = cartItems.length === 0 && parsedOperationalDonation === 0;

  if (isCartTotallyEmpty) {
    // ... (جزء السلة الفارغة بدون تغيير)
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
        {/* ------------------- A. قائمة العناصر المخصصة (بدون تغيير) ------------------- */}
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
              لا يوجد عناصر محددة في السلة حاليًا. يمكنك إضافة تبرع تشغيلي من الملخص.
            </p>
          ) : (
            // ... (عرض عناصر السلة بدون تغيير)
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
                        min="1"
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

        {/* ------------------- B. ملخص الدفع (المعدّل) ------------------- */}
        <div className={styles.cartSummary}>
          <div className={styles.summarySection}>
            <h3>ملخص الدفع والتشغيل</h3>
          </div>

          {/* الخيار الموحد لرسوم التشغيل (رسوم النقل + الإضافي) */}
          <div className={styles.summarySection}>
            <div className={styles.feesOptIn}>
              <input
                type="checkbox"
                id="toggle-operational-donation-input"
                checked={showOperationalFeesInput}
                onChange={(e) => {
                  setShowOperationalFeesInput(e.target.checked);
                  // عند إلغاء التحديد، نعيد حقل الإدخال إلى القيمة الافتراضية ($5)
                  if (!e.target.checked) {
                    setOperationalDonationAmount(SHIPPING_DEFAULT_FEE.toString());
                  }
                }}
                className={styles.feesCheckbox}
              />
              <label
                htmlFor="toggle-operational-donation-input"
                className={styles.feesLabel}
              >
                أجور النقل والتوصيل ($5.00)
              </label>
            </div>
          </div>

          {/* حقل التبرع التشغيلي الموحد (يظهر فقط عند التحديد) */}
          {showOperationalFeesInput && (
            <div className={styles.summarySection}>
              <div className={styles.customDonationInputGroup}>
                <input
                  type="number"
                  id="operational-donation-input"
                  min="0"
                  step="1"
                  placeholder={`القيمة الافتراضية ${SHIPPING_DEFAULT_FEE}$...`}
                  value={operationalDonationAmount}
                  onChange={(e) => setOperationalDonationAmount(e.target.value)}
                  className={`${styles.customDonationInput} ${
                    !isOperationalDonationValid && operationalDonationAmount !== ""
                      ? styles.invalidInput
                      : ""
                  }`}
                />
                <span className={styles.currencySuffix}>USD</span>
              </div>
              {!isOperationalDonationValid && operationalDonationAmount !== "" && (
                <p className={styles.errorNote}>
                  الرجاء إدخال رقم صحيح غير سالب.
                </p>
              )}
              <p className={styles.operationalNote}>
                هذا المبلغ يغطي رسوم النقل والتوصيل (افتراضياً $5) وأي تبرع إضافي تختاره لتغطية التكاليف التشغيلية.
              </p>
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
            {parsedOperationalDonation > 0 && (
              <div className={styles.summaryRow}>
                <span>تبرع تشغيلي موحد:</span>
                <span className={styles.goldenText}>
                  + {formatCurrencyWestern(parsedOperationalDonation)}
                </span>
              </div>
            )}
          </div>

          {/* الإجمالي الكلي للدفع وزر الدفع (بدون تغيير في المنطق) */}
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
              مبلغ ({formatCurrencyWestern(finalTotal)}) يذهب لدعم
              مشاريعنا الإنسانية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationBasketPage;