// src/app/checkout/page.tsx

'use client'; // هذا السطر ضروري لجعل المكون يعمل في بيئة العميل

import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import { useCart } from '../context/CartContext';
import { useSearchParams } from 'next/navigation'; // ⭐ استيراد Hook لجلب معاملات URL
import Link from 'next/link'; // ⭐ تم الإضافة: استيراد مكون Link

import styles from './page.module.css';

// تحميل Stripe بمفتاحك العام (Publishable Key)
// ❗ تأكد من استبدال هذا المتغير بمفتاحك العام الحقيقي من Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutPage = () => {
  const { cartItems, getTotalAmount } = useCart();
  const searchParams = useSearchParams(); // استخدام Hook لجلب معاملات البحث من URL
  const caseId = searchParams.get('caseId'); // ⭐ التقاط معرف الحالة (caseId) من الـ URL

  // دالة لتنسيق الأرقام كعملة بالنمط الغربي (مثل $1,234.56)
  const formatCurrencyWestern = (amount: number, currency: string = 'USD') => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
  };

  // ⭐ التحقق من وجود caseId:
  // إذا كان caseId مفقوداً في الرابط، نعرض رسالة خطأ بدلاً من متابعة عملية الدفع.
  if (!caseId) {
    return (
      <main className={styles.checkoutPage}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle} style={{color: '#d9534f'}}>خطأ: معرف الحالة مفقود.</h1>
          <p style={{textAlign: 'center', fontSize: '1.1em', marginTop: '20px'}}>
            الرجاء العودة إلى <Link href="/donation-basket" style={{color: '#007bff', textDecoration: 'underline'}}>سلة التبرعات</Link> أو <Link href="/cases" style={{color: '#007bff', textDecoration: 'underline'}}>صفحة الحالات</Link> وتحديد المشروع الذي تود التبرع له.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.checkoutPage}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>إتمام عملية التبرع</h1>
        <div className={styles.checkoutLayout}>
          
          {/* العمود الأيسر: نموذج الدفع (Stripe Elements) */}
          <div className={styles.formContainer}>
            <Elements stripe={stripePromise}>
              {/* ⭐ تمرير caseId الذي تم التقاطه من URL كـ prop إلى مكون CheckoutForm */}
              <CheckoutForm caseId={caseId} /> 
            </Elements>
          </div>

          {/* العمود الأيمن: ملخص الطلب */}
          <aside className={styles.orderSummary}>
            <h2 className={styles.summaryTitle}>ملخص تبرعك</h2>
            <div className={styles.summaryItems}>
              {cartItems.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  <span className={styles.itemName}>{item.itemName} (x{item.quantity})</span>
                  <span className={styles.itemPrice}>{formatCurrencyWestern(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>المجموع الإجمالي:</span>
              <span>{formatCurrencyWestern(getTotalAmount())}</span>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
