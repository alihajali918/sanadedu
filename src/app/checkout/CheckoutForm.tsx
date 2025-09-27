// components/CheckoutForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSession } from "next-auth/react";
import { useCart } from "../context/CartContext";
import styles from "./CheckoutForm.module.css";
import { useRouter } from "next/navigation";

interface DonatedItem {
  case_id: number;
  institution_name?: string;
  need_id?: string;
  acf_field_id: string;
  item_name: string;
  item_quantity: number;
  unit_price: number;  // بالدولار
  line_total: number;  // بالدولار
}

interface CheckoutFormProps {
  caseId: string; // اختياري للتوافق الخلفي
  totalPaidAmount: number;   // بالدولار
  subtotalAmount: number;    // بالدولار
  shippingFees: number;      // بالدولار
  customDonation: number;    // بالدولار
  donatedItems: DonatedItem[];
  donorName?: string;        // من حقول الضيف
  donorEmail?: string;       // من حقول الضيف
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  caseId,
  totalPaidAmount,
  subtotalAmount,
  shippingFees,
  customDonation,
  donatedItems,
  donorName,
  donorEmail,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");

  // اسم المتبرع النهائي (جلسة أو ضيف أو "فاعل خير")
  const effectiveDonorName =
    (session?.user?.name && session.user.name.trim()) ||
    (donorName && donorName.trim()) ||
    "فاعل خير";

  const effectiveDonorEmail =
    (session?.user?.email && session.user.email.trim()) ||
    (donorEmail && donorEmail.trim()) ||
    "";

  // user id من ووردبريس إن وجد
  const effectiveUserId = Number((session as any)?.user?.wordpressUserId || 0) || 0;

  useEffect(() => {
    const init = async () => {
      try {
        if (totalPaidAmount > 0) {
          const body = {
            amount: Math.round(totalPaidAmount * 100),          // سنت
            subtotal_amount: Math.round(subtotalAmount * 100),   // سنت
            shipping_fees: Math.round(shippingFees * 100),       // سنت
            custom_donation: Math.round(customDonation * 100),   // سنت

            case_ids: [...new Set(donatedItems.map((i) => Number(i.case_id)).filter(Boolean))],
            donated_items: JSON.stringify(donatedItems), // نرسل سترنغ هنا

            donor_name: effectiveDonorName,
            donor_email: effectiveDonorEmail,
            user_id: effectiveUserId,
          };

          const res = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
  }, [
    totalPaidAmount,
    subtotalAmount,
    shippingFees,
    customDonation,
    JSON.stringify(donatedItems),
    effectiveDonorName,
    effectiveDonorEmail,
    effectiveUserId,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || processing || succeeded) return;

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

    // تسجيل التبرع في ووردبريس عبر بروكسي Next.js
    try {
      const payload = {
        amount: Math.round(totalPaidAmount * 100),         // سنت
        subtotal_amount: Math.round(subtotalAmount * 100), // سنت
        shipping_fees: Math.round(shippingFees * 100),     // سنت
        custom_donation: Math.round(customDonation * 100), // سنت

        case_ids: [...new Set(donatedItems.map(i => Number(i.case_id)).filter(Boolean))],
        donated_items: donatedItems, // الراوت سيحوّلها لسترنغ تلقائيًا

        transaction_id: paymentIntent.id,
        userId: effectiveUserId,       // camelCase
        user_id: effectiveUserId,      // snake_case للتوافق

        status: "pending",
        payment_method: "Stripe",
        donor_name: effectiveDonorName,
        donor_email: effectiveDonorEmail,
      };

      console.log("[DONATE] submitting payload =>", payload);

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
    <form onSubmit={handleSubmit} className={styles.checkoutForm} dir="rtl">
      <h2 className={styles.formTitle}>تفاصيل الدفع الآمن</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {!clientSecret && !error && !succeeded && totalPaidAmount > 0 && (
        <div className={styles.loadingMessage}>جاري إعداد الدفع...</div>
      )}

      {totalPaidAmount <= 0 && (
        <div className={styles.errorMessage}>لا يمكن المتابعة، المبلغ الإجمالي صفر.</div>
      )}

      {clientSecret && totalPaidAmount > 0 && (
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
        type="submit"
        disabled={processing || succeeded || !stripe || !clientSecret || !!error || totalPaidAmount <= 0}
        className={styles.submitButton}
      >
        {processing ? "جاري المعالجة..." : `تبرع الآن (${totalPaidAmount.toFixed(2)}$)`}
      </button>
    </form>
  );
};

export default CheckoutForm;
