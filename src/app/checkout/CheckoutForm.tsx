"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    CardElement, 
    useStripe, 
    useElements,
    PaymentRequestButtonElement, // 🚀 عنصر زر الدفع السريع
    // تمت إزالة StripePaymentRequest لأنه ليس عضواً مصدراً من هذه الوحدة
} from "@stripe/react-stripe-js";
import { useSession } from "next-auth/react";
import { useCart } from "../context/CartContext";
import styles from "./CheckoutForm.module.css";
import { useRouter } from "next/navigation";

// ------------------------------------------------------------------
// تعريف الواجهات (Interfaces)
// ------------------------------------------------------------------
interface DonatedItem {
  case_id: number;
  institution_name?: string;
  need_id?: string;
  acf_field_id: string;
  item_name: string;
  item_quantity: number;
  unit_price: number;  // بالدولار
  line_total: number;  // بالدولار
}

interface CheckoutFormProps {
  caseId: string; // اختياري للتوافق الخلفي
  totalPaidAmount: number;   // بالدولار
  subtotalAmount: number;    // بالدولار
  shippingFees: number;      // بالدولار
  customDonation: number;    // بالدولار
  donatedItems: DonatedItem[];
  donorName?: string;        // من حقول الضيف
  donorEmail?: string;       // من حقول الضيف
}

const CURRENCY = "usd"; // ثابت للعملة

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
  
  // 🚀 حالة لزر الدفع السريع (Apple Pay/Google Pay) - تم تغيير النوع إلى 'any' لتفادي خطأ Typescript
  const [paymentRequest, setPaymentRequest] = useState<any | null>(null);

  // تحديد بيانات المتبرع النهائية
  const effectiveDonorName =
    (session?.user?.name && session.user.name.trim()) ||
    (donorName && donorName.trim()) ||
    "فاعل خير";

  const effectiveDonorEmail =
    (session?.user?.email && session.user.email.trim()) ||
    (donorEmail && donorEmail.trim()) ||
    "";

  // استخراج User ID من ووردبريس
  const effectiveUserId = Number((session as any)?.user?.wordpressUserId || 0) || 0;

  // تحويل المبلغ الإجمالي إلى سنتات
  const totalAmountInCents = Math.round(totalPaidAmount * 100);

  // ------------------------------------------------------------------
  // 1. دالة تسجيل التبرع في ووردبريس بعد نجاح الدفع
  // ------------------------------------------------------------------
  const submitDonationToWP = async (paymentIntentId: string) => {
    try {
      const payload = {
        amount: totalAmountInCents,         // سنت
        subtotal_amount: Math.round(subtotalAmount * 100), // سنت
        shipping_fees: Math.round(shippingFees * 100),     // سنت
        custom_donation: Math.round(customDonation * 100), // سنت

        case_ids: [...new Set(donatedItems.map(i => Number(i.case_id)).filter(Boolean))],
        donated_items: donatedItems, 

        transaction_id: paymentIntentId,
        userId: effectiveUserId,       
        user_id: effectiveUserId,      

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
        const extra = data?.details || data?.got ? ` | details=${JSON.stringify(data.details)} | got=${JSON.stringify(data.got)}` : "";
        throw new Error(`${data?.error || "Failed to submit donation"}${extra}`);
      }

      setSucceeded(true);
      setProcessing(false);
      clearCart();
      router.push(`/thank-you?payment_intent=${paymentIntentId}`);
    } catch (submitError: any) {
      setError(
        `تم الدفع بنجاح، لكن حدث خطأ في تسجيل التبرع: ${submitError.message}. يرجى الاتصال بالدعم.`
      );
      setProcessing(false);
    }
  };


  // ------------------------------------------------------------------
  // 2. تهيئة الدفع (Card + Express) عند تحميل المكون
  // ------------------------------------------------------------------
  const fetchPaymentIntentAndSetupExpress = useCallback(async () => {
    // التحقق من الشروط الأساسية
    if (totalAmountInCents <= 0 || !stripe) {
      setClientSecret("");
      setPaymentRequest(null);
      return;
    }

    setError(null);

    // 1. جلب clientSecret
    let secret = "";
    try {
      const body = {
        amount: totalAmountInCents,            
        subtotal_amount: Math.round(subtotalAmount * 100),   
        shipping_fees: Math.round(shippingFees * 100),       
        custom_donation: Math.round(customDonation * 100),   
        case_ids: [...new Set(donatedItems.map((i) => Number(i.case_id)).filter(Boolean))],
        donated_items: JSON.stringify(donatedItems), 
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
      secret = data.clientSecret;
      setClientSecret(secret);

    } catch (err) {
      setError("حدث خطأ أثناء تهيئة عملية الدفع. يرجى المحاولة مرة أخرى.");
      return;
    }

    // 2. تهيئة الدفع السريع (Apple Pay/Google Pay)
    const pr = stripe.paymentRequest({
      country: 'US', // ⚠️ تم التغيير من 'SA' إلى 'US'. رمز البلد المستهدف لزر الدفع السريع (Stripe لا يدعم SA لهذا الزر).
      currency: CURRENCY,
      total: {
        label: "إجمالي التبرع",
        amount: totalAmountInCents, // المبلغ بالـ سنت
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      // 🛠️ DEBUG LOG: يساعد هذا على تحديد ما إذا كان Stripe يعتقد أن الجهاز مؤهل
      console.log("[STRIPE DEBUG] canMakePayment result:", result); 
      if (result) {
        setPaymentRequest(pr);
      } else {
        setPaymentRequest(null);
      }
    });

    // 3. معالج الدفع السريع (عندما يتم اختيار وسيلة الدفع من المحفظة)
    const handlePaymentMethod = async (event: any) => {
      if (processing) return;

      setProcessing(true);
      setError(null);

      // استخدام clientSecret الذي تم جلبه مسبقاً
      const { error: confirmError, paymentIntent } = await stripe!.confirmCardPayment(
        secret, 
        {
          payment_method: event.paymentMethod.id,
        },
        { handleActions: false } 
      );

      if (confirmError) {
        event.complete('fail');
        setError(confirmError.message || "حدث خطأ في تأكيد الدفع السريع.");
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        event.complete('success');
        // تسجيل التبرع بعد نجاح الدفع السريع
        await submitDonationToWP(paymentIntent.id); 
      } else {
        event.complete('fail');
        setError("تعذّر إكمال الدفع السريع.");
        setProcessing(false);
      }
    };

    // ربط الـ listener بطلب الدفع
    pr.on('paymentmethod', handlePaymentMethod);
    
    // تنظيف الـ listener عند إزالة المكون
    return () => {
      pr.off('paymentmethod', handlePaymentMethod);
    };

  }, [
    totalAmountInCents,
    stripe, 
    subtotalAmount,
    shippingFees,
    customDonation,
    donatedItems,
    effectiveDonorName,
    effectiveDonorEmail,
    effectiveUserId,
    processing 
  ]);

  useEffect(() => {
    // تشغيل دالة التهيئة عند تحميل المكون أو تغير البيانات الأساسية
    fetchPaymentIntentAndSetupExpress();
  }, [fetchPaymentIntentAndSetupExpress]);


  // ------------------------------------------------------------------
  // 3. معالج إرسال الدفع بالبطاقة التقليدية (CardElement)
  // ------------------------------------------------------------------
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // تحقق من الضروريات قبل البدء
    if (!stripe || !elements || !clientSecret || processing || succeeded || totalAmountInCents <= 0) return;

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("عنصر البطاقة غير موجود.");
      setProcessing(false);
      return;
    }

    // تأكيد الدفع
    const { error: confirmError, paymentIntent } = await stripe!.confirmCardPayment(
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

    // تسجيل التبرع بعد نجاح الدفع بالبطاقة
    await submitDonationToWP(paymentIntent.id);
  };

  // ------------------------------------------------------------------
  // 4. العرض (Render)
  // ------------------------------------------------------------------
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
        <>
          {/* 🚀 عرض زر الدفع السريع إذا كان مدعوماً */}
          {paymentRequest && (
            <div className={styles.expressCheckoutSection}>
              <p className={styles.expressTitle}>الدفع السريع:</p>
              <PaymentRequestButtonElement 
                options={{ 
                  paymentRequest: paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'donate', // يظهر زر "تبرع" بدلاً من "دفع"
                      theme: 'dark', 
                      height: '56px',
                    },
                  },
                }}
              />
              <div className={styles.divider}>
                <span>أو الدفع بالبطاقة</span>
              </div>
            </div>
          )}

          {/* حقول البطاقة التقليدية */}
          <div className={styles.cardElementContainer}>
            <CardElement
              options={{
                style: {
                  base: { fontSize: "16px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
                  invalid: { color: "#9e2146" },
              },
              hidePostalCode: true,
            }}
          />
          </div>
        </>
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
      
      <p className={styles.secureNote}>
        عملية دفع آمنة ومشفرة بواسطة Stripe.
      </p>
    </form>
  );
};

export default CheckoutForm;
