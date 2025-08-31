// src/app/donation-basket/page.tsx

'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import styles from './DonationBasketPage.module.css';

const DonationBasketPage = () => {
    const { cartItems, removeItem, updateItemQuantity, clearCart, getTotalAmount } = useCart();
    
    const [addTransportFee, setAddTransportFee] = useState(false);

    const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
        return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
    };

    const handleQuantityChange = (id: string, value: string) => {
        const newQuantity = parseInt(value, 10);
        if (!isNaN(newQuantity) && newQuantity >= 0) {
            updateItemQuantity(id, newQuantity);
        }
    };

    const subtotal = getTotalAmount();
    const transactionFeePercentage = 0.10;
    const transportFeeValue = 3;

    const mandatoryTransactionFee = subtotal * transactionFeePercentage;
    const optionalTransportFee = addTransportFee ? transportFeeValue : 0;

    const finalTotal = subtotal + mandatoryTransactionFee + optionalTransportFee;

    const firstItem = cartItems.length > 0 ? cartItems[0] : null;
    const caseId = firstItem?.institutionId || '';

    return (
        <div className={styles.basketContainer}>
            <h1 className={styles.pageTitle}>سلة التبرعات</h1>

            {cartItems.length === 0 ? (
                <div className={styles.emptyCartMessage}>
                    <p>سلة تبرعاتك فارغة حاليًا. لنقم بملئها بالعطاء!</p>
                    <Link href="/cases" className={styles.emptyCartButton}>
                        تصفح الحالات لدعمها <i className={`${styles.emptyCartButtonArrow} fas fa-arrow-left`}></i>
                    </Link>
                </div>
            ) : (
                <div className={styles.cartLayout}>
                    <div className={styles.cartItemsList}>
                        <div className={styles.cartHeader}>
                            <h3>عناصر التبرع</h3>
                            <button
                                onClick={clearCart}
                                className={styles.clearAllButton}
                                disabled={cartItems.length === 0}
                                aria-label="مسح السلة بالكامل"
                            >
                                <i className="fas fa-trash-alt"></i> مسح الكل
                            </button>
                        </div>

                        {cartItems.map((item) => (
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
                        ))}
                    </div>

                    <div className={styles.cartSummary}>
                        <div className={styles.summarySection}>
                            <h3>ملخص الدفع</h3>
                            <div className={styles.summaryRow}>
                                <span>المجموع الفرعي:</span>
                                <span>{formatCurrencyWestern(subtotal)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>رسوم التحويل الدولية (10%):</span>
                                <span>+ {formatCurrencyWestern(mandatoryTransactionFee)}</span>
                            </div>
                        </div>

                        <div className={styles.summarySection}>
                            <div className={styles.feesOptIn}>
                                <input 
                                    type="checkbox"
                                    id="add-transport-fee-checkbox"
                                    checked={addTransportFee}
                                    onChange={(e) => setAddTransportFee(e.target.checked)}
                                    className={styles.feesCheckbox}
                                />
                                <label htmlFor="add-transport-fee-checkbox" className={styles.feesLabel}>
                                    <strong>نعم، أرغب بإضافة {formatCurrencyWestern(transportFeeValue)} لتغطية أجور النقل والتوصيل.</strong>
                                </label>
                            </div>
                        </div>

                        <div className={styles.summarySection}>
                            {addTransportFee && (
                                <div className={styles.summaryRow}>
                                    <span>أجور النقل والتوصيل:</span>
                                    <span>+ {formatCurrencyWestern(optionalTransportFee)}</span>
                                </div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                                <span>الإجمالي الكلي:</span>
                                <span>{formatCurrencyWestern(finalTotal)}</span>
                            </div>
                        </div>
                        
                        <p className={styles.policyNote}>
                            تشمل الرسوم الإجبارية تكاليف التحويل الدولي لضمان وصول 100% من قيمة تبرعك الأساسي. <Link href="/donation-policy">اقرأ سياستنا</Link>.
                        </p>

                        <div className={styles.summaryActions}>
                            <Link 
                                href={`/checkout?caseId=${caseId}&addTransportFee=${addTransportFee}`}
                                className={styles.checkoutButton}
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