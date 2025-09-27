'use client';

import { useState } from 'react';
import { useCart, CartItem } from '../context/CartContext'; // استيراد CartItem
import Image from 'next/image';
import Link from 'next/link';
import styles from './DonationBasketPage.module.css';

// -----------------------------------------------------------
// 1. تعريف هيكل البيانات الذي يتوقعه ووردبريس
// -----------------------------------------------------------
interface DonationItemForWP {
    case_id: number;
    line_total: number;
    item_quantity: number;
    acf_field_id?: string;
    need_id?: string; // لرسوم التشغيل (case_id: 0)
}

// -----------------------------------------------------------
// 2. دالة بناء الحمولة الموحدة
// -----------------------------------------------------------
/**
 * تبني مصفوفة العناصر المتبرع بها بالشكل الذي يتوقعه ووردبريس، 
 * وتدمج عناصر السلة، رسوم النقل، والتبرع المخصص.
 */
const buildDonatedItemsPayload = (
    items: CartItem[], 
    shippingFees: number, 
    customDonation: number
): DonationItemForWP[] => {
    const payload: DonationItemForWP[] = [];

    // أ. إضافة عناصر السلة (الحالات المخصصة)
    items.forEach(item => {
        // نستخدم item_quantity و acfFieldId لتحديث الكميات العينية
        payload.push({
            case_id: Number(item.institutionId), // مُعرّف الحالة
            line_total: item.totalPrice, // المبلغ النقدي لهذه الحالة
            item_quantity: item.quantity, // الكمية العينية
            acf_field_id: item.acfFieldId, // مفتاح ACF (مثلاً: 'received_quantity')
            need_id: item.needId, // مُعرّف الاحتياج إن وُجد
        });
    });

    // ب. إضافة أجور النقل (لميزانية التشغيل)
    if (shippingFees > 0) {
        payload.push({
            case_id: 0, // 0 يعني تبرع عام أو تشغيلي
            line_total: shippingFees,
            item_quantity: 0,
            need_id: 'operational-costs', // مفتاح المعالجة في ووردبريس
        });
    }

    // ج. إضافة التبرع المخصص (لميزانية التشغيل)
    if (customDonation > 0) {
        payload.push({
            case_id: 0, // 0 يعني تبرع عام أو تشغيلي
            line_total: customDonation,
            item_quantity: 0,
            need_id: 'operational-costs', // مفتاح المعالجة في ووردبريس
        });
    }

    return payload;
};

// -----------------------------------------------------------
// 3. مكون الصفحة (DonationBasketPage)
// -----------------------------------------------------------
const DonationBasketPage = () => {
    const { cartItems, removeItem, updateItemQuantity, clearCart, getTotalAmount } = useCart();
    
    // 1. حالة إضافة أجور النقل (رسوم ثابتة 5$)
    const [addShippingFees, setAddShippingFees] = useState(false);
    // 2. حالة التحكم بظهور حقل التبرع المخصص
    const [showCustomDonationInput, setShowCustomDonationInput] = useState(false);
    // 3. حالة مبلغ التبرع الإضافي غير المحدد
    const [customDonationAmount, setCustomDonationAmount] = useState<string>('');

    const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
        return amount.toLocaleString('en-US', { 
            style: 'currency', 
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleQuantityChange = (id: string, value: string) => {
        const newQuantity = parseInt(value, 10);
        // نُضيف شرط لتجنب تحديث الكمية إلى 0، حيث يُفضل أن يتم الحذف بدلاً من ذلك.
        if (!isNaN(newQuantity) && newQuantity > 0) { 
            updateItemQuantity(id, newQuantity);
        } else if (newQuantity === 0) {
            removeItem(id); // حذف العنصر إذا كانت الكمية صفر
        }
    };

    // الحسابات
    const subtotal = getTotalAmount();
    const shippingFeeValue = 5; 
    
    const parsedCustomDonation = showCustomDonationInput 
        ? (parseFloat(customDonationAmount) || 0) 
        : 0;

    const optionalShippingFees = addShippingFees ? shippingFeeValue : 0;
    const finalTotal = subtotal + optionalShippingFees + parsedCustomDonation;

    // التحقق من صلاحية التبرع المخصص (رقم غير سالب)
    const isCustomDonationValid = parsedCustomDonation >= 0 && !isNaN(parseFloat(customDonationAmount));
    
    // التحقق النهائي قبل الدفع
    const canProceedToCheckout = finalTotal > 0 && 
                                 (showCustomDonationInput ? (isCustomDonationValid || parsedCustomDonation === 0) : true);

    // 💡 بناء الحمولة الموحدة للإرسال عبر رابط الدفع
    const finalPayload = buildDonatedItemsPayload(
        cartItems, 
        optionalShippingFees, 
        parsedCustomDonation
    );
    
    // 💡 تشفير الحمولة الموحدة لـ URL
    const encodedDonatedItems = encodeURIComponent(JSON.stringify(finalPayload));

    return (
        <div className={styles.basketContainer} dir="rtl">
            <h1 className={styles.pageTitle}>سلة التبرعات</h1>

            {/* تم تبسيط شرط رسالة السلة الفارغة */}
            {cartItems.length === 0 && optionalShippingFees === 0 && parsedCustomDonation === 0 ? (
                // رسالة السلة الفارغة
                <div className={styles.emptyCartMessage}>
                    <p>سلة تبرعاتك فارغة حاليًا. لنقم بملئها بالعطاء!</p>
                    <Link href="/cases" className={styles.emptyCartButton}>
                        تصفح الحالات لدعمها <i className={`${styles.emptyCartButtonArrow} fas fa-arrow-left`}></i>
                    </Link>
                </div>
            ) : (
                <div className={styles.cartLayout}>
                    {/* ... (بقية كود عرض العناصر - لم يتغير) ... */}
                    <div className={styles.cartItemsList}>
                        <div className={styles.cartHeader}>
                            <h3>عناصر التبرع المخصصة</h3>
                            <button
                                onClick={clearCart}
                                className={styles.clearAllButton}
                                disabled={cartItems.length === 0}
                                aria-label="مسح عناصر التبرع المخصصة"
                            >
                                <i className="fas fa-trash-alt"></i> مسح المخصص
                            </button>
                        </div>

                        {cartItems.length === 0 ? (
                            <p className={styles.noSpecificItems}>لا يوجد عناصر محددة في السلة.</p>
                        ) : (
                            cartItems.map((item) => (
                                <div key={item.id} className={styles.cartItemCard}>
                                    <div className={styles.cartItemImageContainer}>
                                        <Image
                                            src={item.itemImage || 'https://placehold.co/100x80/EEE/31343C?text=صورة'}
                                            alt={item.itemName}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            className={styles.itemImage}
                                        />
                                    </div>
                                    <div className={styles.cartItemDetails}>
                                        <h2 className={styles.itemName}>{item.itemName}</h2>
                                        <p className={styles.itemInstitution}>المؤسسة: <strong>{item.institutionName}</strong></p>
                                        <p className={styles.itemUnitPrice}>سعر الوحدة: <strong>{formatCurrencyWestern(item.unitPrice)}</strong></p>

                                        <div className={styles.cartItemControls}>
                                            <div className={styles.quantityControl}>
                                                <button
                                                    className={styles.quantityButton}
                                                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    id={`quantity-${item.id}`}
                                                    min="0"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    className={styles.quantityInput}
                                                />
                                                <button
                                                    className={styles.quantityButton}
                                                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className={styles.itemActions}>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className={styles.deleteButton}
                                                    aria-label={`إزالة ${item.itemName}`}
                                                >
                                                    <i className="fas fa-trash-alt"></i> حذف
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.itemTotalPrice}>
                                        {formatCurrencyWestern(item.totalPrice)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {/* ... (بقية كود ملخص الدفع - لم يتغير) ... */}
                    <div className={styles.cartSummary}>
                        <div className={styles.summarySection}>
                            <h3>ملخص الدفع</h3>
                        </div>

                        {/* مربع اختيار رسوم النقل الثابتة (5$) */}
                        <div className={styles.summarySection}>
                            <div className={styles.feesOptIn}>
                                <input 
                                    type="checkbox"
                                    id="add-shipping-fees-checkbox"
                                    checked={addShippingFees}
                                    onChange={(e) => setAddShippingFees(e.target.checked)}
                                    className={styles.feesCheckbox}
                                />
                                <label htmlFor="add-shipping-fees-checkbox" className={styles.feesLabel}>
                                    <strong>نعم، أرغب بإضافة أجور النقل والتوصيل بمبلغ <span className={styles.goldenText}>{formatCurrencyWestern(shippingFeeValue)}</span>.</strong>
                                </label>
                            </div>
                            {optionalShippingFees > 0 && (
                                <div className={styles.summaryRow}>
                                    <span>أجور النقل والتوصيل:</span>
                                    <span>+ {formatCurrencyWestern(optionalShippingFees)}</span>
                                </div>
                            )}
                        </div>

                        {/* مربع اختيار إضافة مبلغ مخصص للتحكم بظهور حقل الإدخال */}
                        <div className={styles.summarySection}>
                            <div className={styles.feesOptIn}>
                                <input 
                                    type="checkbox"
                                    id="toggle-custom-donation-input"
                                    checked={showCustomDonationInput}
                                    onChange={(e) => {
                                        setShowCustomDonationInput(e.target.checked);
                                        // عند إزالة التحديد، قم بتصفير حقل الإدخال لضمان عدم احتساب القيمة
                                        if (!e.target.checked) {
                                            setCustomDonationAmount('');
                                        }
                                    }}
                                    className={styles.feesCheckbox}
                                />
                                <label htmlFor="toggle-custom-donation-input" className={styles.feesLabel}>
                                    <strong>أرغب في <span className={styles.goldenText}>إضافة مبلغ مخصص إضافي</span>.</strong>
                                </label>
                            </div>
                        </div>
                        
                        {/* حقل التبرع المخصص (يظهر فقط عند التحديد) */}
                        {showCustomDonationInput && (
                            <div className={styles.summarySection}>
                                <label htmlFor="custom-donation-input" className={styles.customDonationLabel}>
                                    أدخل المبلغ الإضافي (بالدولار الأمريكي USD)
                                </label>
                                <div className={styles.customDonationInputGroup}>
                                    <input
                                        type="number"
                                        id="custom-donation-input"
                                        min="0"
                                        step="1"
                                        placeholder="أدخل المبلغ..."
                                        value={customDonationAmount}
                                        onChange={(e) => setCustomDonationAmount(e.target.value)}
                                        className={`${styles.quantityInput} ${styles.customDonationInput}`}
                                        aria-invalid={!isCustomDonationValid}
                                    />
                                    <span className={styles.currencySuffix}>USD</span>
                                </div>
                                {/* رسالة خطأ إذا كان الإدخال غير صالح */}
                                {!isCustomDonationValid && customDonationAmount !== '' && (
                                    <p className={styles.errorNote}>الرجاء إدخال رقم صحيح غير سالب.</p>
                                )}
                                {parsedCustomDonation > 0 && (
                                    <div className={styles.summaryRow}>
                                        <span>المبلغ المخصص الإضافي:</span>
                                        <span>+ {formatCurrencyWestern(parsedCustomDonation)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* عرض المجموع الفرعي */}
                        {subtotal > 0 && (
                            <div className={styles.summaryRow}>
                                <span>إجمالي تبرعات العناصر المخصصة:</span>
                                <span>{formatCurrencyWestern(subtotal)}</span>
                            </div>
                        )}

                        <div className={styles.summarySection}>
                            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                                <span>الإجمالي الكلي للدفع:</span>
                                <span>{formatCurrencyWestern(finalTotal)}</span>
                            </div>
                        </div>
                        
                        <p className={styles.policyNote}>
                            يذهب كامل مبلغ **الإجمالي الكلي ($$ {formatCurrencyWestern(finalTotal)} $$)** لدعم الحالات والمشاريع الإنسانية (بما في ذلك أجور النقل التي تغطي تكاليف التسليم للمستفيدين). <Link href="/donation-policy">اقرأ سياستنا</Link>.
                        </p>

                        <div className={styles.summaryActions}>
                            {/* 💡 التعديل الرئيسي: تمرير الحمولة الموحدة المشفرة بدلاً من العناصر المنفصلة */}
                            <Link 
                                href={`/checkout?donatedItems=${encodedDonatedItems}&totalAmount=${finalTotal}`}
                                className={styles.checkoutButton}
                                onClick={(e) => { 
                                    if (!canProceedToCheckout) e.preventDefault(); 
                                }}
                                aria-disabled={!canProceedToCheckout}
                            >
                                المتابعة للدفع
                            </Link>
                            <Link href="/cases" className={styles.continueShoppingButton}>
                                الاستمرار في التصفح
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DonationBasketPage;