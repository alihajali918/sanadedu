// src/app/checkout/CheckoutForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import styles from './CheckoutForm.module.css';
import { useRouter } from 'next/navigation';

interface CheckoutFormProps {
  caseId: string;
  totalAmount: number;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ caseId, totalAmount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCart();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    if (totalAmount > 0 && caseId) {
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount, caseId: caseId }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || 'فشل تهيئة الدفع.');
        }
      })
      .catch((err) => {
        console.error('Error fetching client secret:', err);
        setError('حدث خطأ أثناء تهيئة عملية الدفع. يرجى المحاولة مرة أخرى.');
      });
    }
  }, [totalAmount, caseId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || processing || succeeded) {
      return;
    }
    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("عنصر البطاقة غير موجود.");
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'حدث خطأ غير متوقع.');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // استدعاء API Route الجديد لتسجيل التبرع
        const response = await fetch('/api/donations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalAmount,
            caseId: caseId,
            stripePaymentIntentId: paymentIntent.id,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errorMessage = errorBody.error || 'Failed to submit donation to backend.';
          throw new Error(errorMessage);
        }

        setError(null);
        setSucceeded(true);
        setProcessing(false);
        clearCart();
        router.push(`/thank-you?payment_intent=${paymentIntent.id}`);
        
      } catch (submitError: any) {
        console.error('Failed to submit donation to backend:', submitError);
        setError(`تم الدفع بنجاح، لكن حدث خطأ في تسجيل التبرع: ${submitError.message}. يرجى الاتصال بالدعم.`);
        setProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.checkoutForm}>
      <h2 className={styles.formTitle}>تفاصيل الدفع الآمن</h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>}

      {!clientSecret && !error && !succeeded && (
        <div className={styles.loadingMessage}>جاري إعداد الدفع...</div>
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
        disabled={processing || succeeded || !stripe || !clientSecret || !!error}
        className={styles.submitButton}
      >
        {processing ? 'جاري المعالجة...' : `تبرع الآن (${totalAmount.toFixed(2)}$)`}
      </button>
    </form>
  );
};

export default CheckoutForm;