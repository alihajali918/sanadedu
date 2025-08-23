// src/app/checkout/CheckoutForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
// ⭐ CORRECTED: Import from '@stripe/react-stripe-js' for UI components/hooks
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import styles from './CheckoutForm.module.css';
import { useSearchParams } from 'next/navigation'; // لاستيراد useSearchParams

// 1. تعريف واجهة (Interface) لخصائص المكون (Props)
interface CheckoutFormProps {
  caseId: string; // إضافة خاصية caseId من نوع string
}

// 2. تعديل تعريف المكون لقبول caseId كخاصية
const CheckoutForm: React.FC<CheckoutFormProps> = ({ caseId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { getTotalAmount, clearCart } = useCart();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  const totalAmount = getTotalAmount();

  // جلب clientSecret من الخادم عند تحميل المكون
  useEffect(() => {
    // التحقق من وجود caseId والمبلغ قبل إرسال الطلب
    if (totalAmount > 0 && caseId) {
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ⭐ التعديل الرئيسي هنا: إرسال caseId مع المبلغ
        body: JSON.stringify({ amount: totalAmount, caseId: caseId }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          // عرض رسالة خطأ إذا كان هناك مشكلة في الحصول على clientSecret
          setError(data.error || 'Failed to initialize payment.');
        }
      })
      .catch((err) => {
        console.error('Error fetching client secret:', err);
        setError('An error occurred while initializing payment. Please try again.');
      });
    } else if (!caseId) {
      setError('Case ID is missing. Please select a case to donate to.');
    }
  }, [totalAmount, caseId]); // تأكد من أن caseId تابع للمؤثرات

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || processing || succeeded) {
      // إذا كانت هناك أخطاء سابقة أو لم يتم تهيئة Stripe بشكل صحيح
      return;
    }
    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
        setError("Card element not found.");
        setProcessing(false);
        return;
    }

    // تأكيد الدفع باستخدام clientSecret
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
      // ⭐ يمكن إضافة return_url هنا لإعادة التوجيه بعد الدفع
      // confirmParams: {
      //   return_url: `${window.location.origin}/success-page`,
      // },
    });

    if (confirmError) {
      setError(confirmError.message || 'An unexpected error occurred.');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setError(null);
      setSucceeded(true);
      setProcessing(false);
      clearCart(); // مسح السلة بعد نجاح الدفع
      // هنا يمكنك توجيه المستخدم إلى صفحة نجاح أو عرض رسالة تأكيد
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.checkoutForm}>
      <h2 className={styles.formTitle}>تفاصيل الدفع الآمن</h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>} {/* عرض الأخطاء */}

      {!clientSecret && !error && !succeeded && (
        <div className={styles.loadingMessage}>جاري إعداد الدفع...</div> // رسالة تحميل
      )}

      {clientSecret && (
        <div className={styles.cardElementContainer}>
          <CardElement options={{
              style: {
                  base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
                  invalid: { color: '#9e2146' },
              },
          }} />
        </div>
      )}
      
      {succeeded && (
        <div className={styles.successMessage}>
          <p>شكراً لك! تم استلام تبرعك بنجاح.</p>
        </div>
      )}

      <button 
        disabled={processing || succeeded || !stripe || !clientSecret || !!error} // تعطيل الزر إذا كان هناك خطأ
        className={styles.submitButton}
      >
        {processing ? 'جاري المعالجة...' : `تبرع الآن (${totalAmount.toFixed(2)}$)`}
      </button>
    </form>
  );
};

export default CheckoutForm;
