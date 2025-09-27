// app/checkout/page.tsx
'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import { useCart, CartItem } from '../context/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutPage = () => {
  const { cartItems, getTotalAmount, isLoading } = useCart();
  const searchParams = useSearchParams();

  // رسمياً: نجمع بيانات الضيف لو ما في جلسة
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // 1) قراءة بارامترات اختيارية
  const shippingFeesString = searchParams.get('shippingFees');
  const customDonationString = searchParams.get('customDonation');

  // 2) تحويل للأرقام
  const optionalShippingFees = parseFloat(shippingFeesString || '0') || 0;
  const parsedCustomDonation = parseFloat(customDonationString || '0') || 0;

  // 3) subtotal من السلة (بالدولار)
  const subtotal = Number(getTotalAmount().toFixed(2));
  const mandatoryTransactionFee = 0;

  // 4) الإجمالي النهائي
  const finalTotal =
    subtotal + optionalShippingFees + parsedCustomDonation + mandatoryTransactionFee;

  // 5) تحويل عناصر السلة إلى payload
  const donatedItemsPayload = cartItems.map((item: CartItem) => ({
    case_id: Number(item.institutionId),
    institution_name: item.institutionName,
    need_id: item.needId || '',
    acf_field_id: item.acfFieldId || '',
    item_name: item.itemName,
    item_quantity: item.quantity,
    unit_price: item.unitPrice, // بالدولار
    line_total: Number((item.unitPrice * item.quantity).toFixed(2)), // بالدولار
  }));

  const formatCurrencyWestern = (amount: number, currency: string = 'USD') =>
    amount.toLocaleString('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (isLoading) {
    return (
      <main className={styles.checkoutPage} dir="rtl">
        <div className={styles.container}>
          <p style={{ textAlign: 'center', fontSize: '1.2em' }}>جاري تحميل سلة تبرعاتك...</p>
        </div>
      </main>
    );
  }

  if (finalTotal <= 0 || (cartItems.length === 0 && (optionalShippingFees + parsedCustomDonation === 0))) {
    return (
      <main className={styles.checkoutPage} dir="rtl">
        <div className={styles.container}>
          <h1 className={styles.pageTitle} style={{ color: '#d9534f' }}>خطأ: لا يوجد مبلغ للدفع.</h1>
          <p style={{ textAlign: 'center', fontSize: '1.1em', marginTop: '20px' }}>
            الرجاء العودة إلى <Link href="/cases" style={{ color: '#007bff', textDecoration: 'underline' }}>صفحة الحالات</Link> لتحديد مشروعك.
          </p>
        </div>
      </main>
    );
  }

  const firstCaseId = cartItems[0]?.institutionId ? String(cartItems[0].institutionId) : '';

  return (
    <main className={styles.checkoutPage} dir="rtl">
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>إتمام عملية التبرع</h1>

        <div className={styles.checkoutLayout}>
          <div className={styles.formContainer}>
            {/* حقول الضيف */}
            <div className={styles.guestBox}>
              <label className={styles.label}>
                الاسم (اختياري):
                <input
                  className={styles.input}
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="اكتب اسمك أو اتركه فارغًا"
                />
              </label>
              <label className={styles.label}>
                البريد الإلكتروني (اختياري):
                <input
                  className={styles.input}
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </label>
            </div>

            <Elements stripe={stripePromise}>
              <CheckoutForm
                caseId={firstCaseId}
                totalPaidAmount={Number(finalTotal.toFixed(2))}
                subtotalAmount={Number(subtotal.toFixed(2))}
                shippingFees={Number(optionalShippingFees.toFixed(2))}
                customDonation={Number(parsedCustomDonation.toFixed(2))}
                donatedItems={donatedItemsPayload}
                donorName={guestName}
                donorEmail={guestEmail}
              />
            </Elements>
          </div>

          <aside className={styles.orderSummary}>
            <h2 className={styles.summaryTitle}>ملخص تبرعك</h2>
            <div className={styles.summaryItems}>
              {subtotal > 0 && (
                <div className={styles.summaryItem}>
                  <span>إجمالي التبرعات المخصصة:</span>
                  <span>{formatCurrencyWestern(subtotal)}</span>
                </div>
              )}

              {optionalShippingFees > 0 && (
                <div className={styles.summaryItem}>
                  <span>أجور النقل والتوصيل:</span>
                  <span>{formatCurrencyWestern(optionalShippingFees)}</span>
                </div>
              )}

              {parsedCustomDonation > 0 && (
                <div className={styles.summaryItem}>
                  <span>مبلغ التبرع المخصص الإضافي:</span>
                  <span>{formatCurrencyWestern(parsedCustomDonation)}</span>
                </div>
              )}
            </div>

            <div className={`${styles.summaryTotal} ${styles.summaryItem}`}>
              <span>الإجمالي الكلي للدفع:</span>
              <span>{formatCurrencyWestern(finalTotal)}</span>
            </div>

            <p className={styles.note}>
              **{formatCurrencyWestern(finalTotal)}** هو المبلغ الإجمالي الذي سيتم تحصيله لدعم الحالات والمصاريف التشغيلية (إن وجدت).
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
