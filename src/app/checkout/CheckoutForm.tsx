"use client";

import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSession } from "next-auth/react";
import { useCart } from "../context/CartContext";
import styles from "./CheckoutForm.module.css";
import { useRouter } from "next/navigation";

interface CheckoutFormProps {
  caseId: string;
  totalAmount: number;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ caseId, totalAmount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        if (totalAmount > 0 && caseId) {
          const res = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(totalAmount),
              caseId: Number(caseId),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.clientSecret) {
            setError(data?.error || "فشل تهيئة الدفع.");
            return;
          }
          setClientSecret(data.clientSecret);
        }
      } catch {
        setError("حدث خطأ أثناء تهيئة عملية الدفع. يرجى المحاولة مرة أخرى.");
      }
    };
    init();
  }, [totalAmount, caseId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || processing || succeeded) return;

    // تم حذف التحقق من وجود userId هنا للسماح للمستخدمين غير المسجلين بالتبرع.

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("عنصر البطاقة غير موجود.");
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (confirmError) {
      setError(confirmError.message || "حدث خطأ غير متوقع.");
      setProcessing(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setError("تعذّر إكمال الدفع.");
      setProcessing(false);
      return;
    }

    try {
      const payload = {
        amount: Number(totalAmount),
        caseId: Number(caseId),
        stripePaymentIntentId: paymentIntent.id,
        // أرسِل userId إذا كان موجوداً، وإلا أرسل قيمة فارغة.
        userId: session?.user?.wordpressUserId || null,
        status: "مكتمل",
        payment_method: "Stripe",
      };

      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const extra =
          data?.details || data?.got
            ? ` | details=${JSON.stringify(data.details)} | got=${JSON.stringify(data.got)}`
            : "";
        throw new Error(`${data?.error || "Failed to submit donation"}${extra}`);
      }

      setSucceeded(true);
      setProcessing(false);
      clearCart();
      router.push(`/thank-you?payment_intent=${paymentIntent.id}`);
    } catch (submitError: any) {
      setError(
        `تم الدفع بنجاح، لكن حدث خطأ في تسجيل التبرع: ${submitError.message}. يرجى الاتصال بالدعم.`
      );
      setProcessing(false);
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
          <CardElement
            options={{
              style: {
                base: { fontSize: "16px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
                invalid: { color: "#9e2146" },
              },
            }}
          />
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
        {processing ? "جاري المعالجة..." : `تبرع الآن (${totalAmount.toFixed(2)}$)`}
      </button>
    </form>
  );
};

export default CheckoutForm;
