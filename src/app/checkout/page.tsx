// src/app/checkout/page.tsx

'use client';

import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import { useCart } from '../context/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutPage = () => {
    const { cartItems, getTotalAmount, isLoading } = useCart();
    const searchParams = useSearchParams();
    
    if (isLoading) {
        return (
            <main className={styles.checkoutPage}>
                <div className={styles.container}>
                    <p style={{ textAlign: 'center', fontSize: '1.2em' }}>جاري تحميل سلة تبرعاتك...</p>
                </div>
            </main>
        );
    }

    const addTransportFeeString = searchParams.get('addTransportFee');
    const addTransportFee = addTransportFeeString === 'true';

    const subtotal = getTotalAmount();
    const transactionFeePercentage = 0.10;
    const transportFeeValue = 3;

    const mandatoryTransactionFee = subtotal * transactionFeePercentage;
    const optionalTransportFee = addTransportFee ? transportFeeValue : 0;
    const finalTotal = subtotal + mandatoryTransactionFee + optionalTransportFee;

    const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
        return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
    };

    if (cartItems.length === 0) {
        return (
            <main className={styles.checkoutPage}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle} style={{ color: '#d9534f' }}>خطأ: سلة التبرعات فارغة.</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1em', marginTop: '20px' }}>
                        الرجاء العودة إلى <Link href="/cases" style={{ color: '#007bff', textDecoration: 'underline' }}>صفحة الحالات</Link> وتحديد المشروع الذي تود التبرع له.
                    </p>
                </div>
            </main>
        );
    }
    
    const caseId = cartItems[0].institutionId;

    return (
        <main className={styles.checkoutPage}>
            <div className={styles.container}>
                <h1 className={styles.pageTitle}>إتمام عملية التبرع</h1>
                <div className={styles.checkoutLayout}>
                    <div className={styles.formContainer}>
                        <Elements stripe={stripePromise}>
                            <CheckoutForm caseId={caseId} totalAmount={finalTotal} />
                        </Elements>
                    </div>

                    <aside className={styles.orderSummary}>
                        <h2 className={styles.summaryTitle}>ملخص تبرعك</h2>
                        <div className={styles.summaryItems}>
                            <div className={styles.summaryItem}>
                                <span>المجموع الفرعي:</span>
                                <span>{formatCurrencyWestern(subtotal)}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>رسوم التحويل الدولية (10%):</span>
                                <span>{formatCurrencyWestern(mandatoryTransactionFee)}</span>
                            </div>
                            {addTransportFee && (
                                <div className={styles.summaryItem}>
                                    <span>أجور النقل والتوصيل:</span>
                                    <span>{formatCurrencyWestern(optionalTransportFee)}</span>
                                </div>
                            )}
                        </div>
                        <div className={`${styles.summaryTotal} ${styles.summaryItem}`}>
                            <span>الإجمالي الكلي:</span>
                            <span>{formatCurrencyWestern(finalTotal)}</span>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default CheckoutPage;