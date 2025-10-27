"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
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
  unit_price: number;
  line_total: number;
}

interface CheckoutFormProps {
  caseId: string;
  totalPaidAmount: number;
  subtotalAmount: number;
  shippingFees: number;
  customDonation: number;
  donatedItems: DonatedItem[];
  donorName?: string;
  donorEmail?: string;
}

const CURRENCY = "usd";

// 🚨 دالة مساعدة لإضافة تأخير (مهمة لمنع مشاكل سرعة التحميل)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CheckoutForm: React.FC<CheckoutFormProps> = ({
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
  const [paymentRequest, setPaymentRequest] = useState<any | null>(null);

  const effectiveDonorName = (session?.user?.name && session.user.name.trim()) || (donorName && donorName.trim()) || "فاعل خير";
  const effectiveDonorEmail = (session?.user?.email && session.user.email.trim()) || (donorEmail && donorEmail.trim()) || "";
  const effectiveUserId = Number((session as any)?.user?.wordpressUserId || 0) || 0;

  const totalAmountInCents = Math.round(totalPaidAmount * 100);

  // ------------------------------------------------------------------ 
  // 1. دالة تسجيل التبرع في ووردبريس (مُعدَّلة: لا تؤثر على UX)
  // ------------------------------------------------------------------
  const submitDonationToWP = useCallback(async (paymentIntentId: string) => {
    try {
      // ... (منطق إنشاء payload يبقى كما هو)
      const payload = {
        amount: totalAmountInCents,
        subtotal_amount: Math.round(subtotalAmount * 100),
        shipping_fees: Math.round(shippingFees * 100),
        custom_donation: Math.round(customDonation * 100),
        case_ids: [
          ...new Set(
            donatedItems.map((i) => Number(i.case_id)).filter(Boolean)
          ),
        ],
        donated_items: donatedItems,
        transaction_id: paymentIntentId,
        userId: effectiveUserId,
        user_id: effectiveUserId,
        status: "pending",
        payment_method: "Stripe",
        donor_name: effectiveDonorName,
        donor_email: effectiveDonorEmail,
      };

      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const extra = data?.details || data?.got ? ` | details=${JSON.stringify(data.details)} | got=${JSON.stringify(data.got)}` : "";
        // 🛑 لا نُطلق خطأ (throw error) هنا، بل نُسجله فقط.
        console.error(
          `WP RECORDING WARNING: Stripe succeeded but WP failed (HTTP ${response.status}). Error: ${data?.error || "Failed to submit donation"}${extra}`
        );
        return { success: false, error: "WP recording failed." };
      }

      console.log("WP RECORDING SUCCESS: Donation recorded successfully in WordPress.");
      return { success: true };
    } catch (submitError: any) {
      // 🛑 نُسجل خطأ الشبكة/التايم آوت ولا نُطلق خطأ يوقف تدفق UX
      console.error("WP RECORDING FATAL ERROR: Network or internal error during WP submission.", submitError);
      return { success: false, error: submitError.message };
    }
    // ✅ تم حذف setSucceeded, setProcessing, clearCart, router.push
  }, [
    totalAmountInCents, subtotalAmount, shippingFees, customDonation,
    donatedItems, effectiveUserId, effectiveDonorName, effectiveDonorEmail,
  ]);

  // ------------------------------------------------------------------ 
  // 2. تهيئة الدفع (Card + Express)
  // ------------------------------------------------------------------

  const fetchPaymentIntentAndSetupExpress = useCallback(async (): Promise<(() => void) | undefined> => {

    if (totalAmountInCents <= 0 || !stripe) {
      setClientSecret("");
      setPaymentRequest(null);
      return;
    }

    setError(null);
    let secret = "";
    try {
      // ... (منطق جلب clientSecret يبقى كما هو)
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

    // 2. تهيئة الدفع السريع (Apple Pay/Google Pay) - (بدون تغيير)
    const pr = stripe.paymentRequest({
      country: "US",
      currency: CURRENCY,
      total: {
        label: "إجمالي التبرع",
        amount: totalAmountInCents,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      } else {
        setPaymentRequest(null);
      }
    });

    // 3. معالج الدفع السريع (عندما يتم اختيار وسيلة الدفع من المحفظة) - (مُعدَّل)
    const handlePaymentMethod = async (event: any) => {
      if (processing) return;

      setProcessing(true);
      setError(null);

      const { error: confirmError, paymentIntent } =
        await stripe!.confirmCardPayment(
          secret,
          { payment_method: event.paymentMethod.id },
          { handleActions: false }
        );

      if (confirmError) {
        event.complete("fail");
        setError(confirmError.message || "حدث خطأ في تأكيد الدفع السريع.");
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        event.complete("success");
        
        // 🛑 النجاح الفوري في الواجهة الأمامية
        setSucceeded(true); 
        clearCart(); // تفريغ السلة فوراً

        // محاولة تسجيل WP في الخلفية (ننتظرها فقط لتسجيل الأخطاء)
        await submitDonationToWP(paymentIntent.id);
        
        // التوجيه لصفحة الشكر بعد اكتمال التسجيل أو فشله
        router.push(`/thank-you?payment_intent=${paymentIntent.id}`);
        setProcessing(false); // نوقف حالة المعالجة هنا
      } else {
        event.complete("fail");
        setError("تعذّر إكمال الدفع السريع.");
        setProcessing(false);
      }
    };

    pr.on("paymentmethod", handlePaymentMethod);
    return () => {
      pr.off("paymentmethod", handlePaymentMethod);
    };
  }, [
    totalAmountInCents, stripe, subtotalAmount, shippingFees, customDonation,
    donatedItems, effectiveDonorName, effectiveDonorEmail, effectiveUserId,
    processing, submitDonationToWP, clearCart, router,
  ]);

  // ------------------------------------------------------------------ 
  // 3. معالج useEffect للتنظيف 
  // ------------------------------------------------------------------
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    fetchPaymentIntentAndSetupExpress().then(cleanup => {
      cleanupFunction = cleanup;
    }).catch(err => {
      console.error("Payment setup failed:", err);
    });

    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, [fetchPaymentIntentAndSetupExpress]);

  // ------------------------------------------------------------------ 
  // 4. معالج إرسال الدفع بالبطاقة التقليدية (مُعدَّل) 
  // ------------------------------------------------------------------

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    console.log("1. بدء عملية الدفع.");

    // 🚨 يجب أن يتأكد أن جميع العناصر الضرورية جاهزة 
    if (!stripe || !elements || !clientSecret || processing || succeeded || totalAmountInCents <= 0) {
      console.warn("2. الزر معطل بسبب أحد الشروط:", {
        stripe: !!stripe, elements: !!elements, clientSecret: !!clientSecret, processing, succeeded, amount: totalAmountInCents,
      });
      return;
    }

    setProcessing(true);
    setError(null);

    // 🚨 أهم تغيير: نستخدم CardNumberElement للحصول على مرجع العنصر
    const cardNumberElement = elements.getElement(CardNumberElement);

    // 🚨 تأخير بسيط بعد التحقق لمنع مشكلة توقيت التحميل (مهم جداً)
    await sleep(50);

    if (!cardNumberElement) {
      console.error("3. فشل: عنصر رقم البطاقة (CardNumberElement) غير موجود في Elements!");
      setError("عنصر رقم البطاقة غير موجود. يرجى تحديث الصفحة والمحاولة.");
      setProcessing(false);
      return;
    }

    console.log("3. عنصر رقم البطاقة موجود. محاولة تأكيد الدفع.");

    const { error: confirmError, paymentIntent } =
      await stripe!.confirmCardPayment(clientSecret, {
        payment_method: { card: cardNumberElement },
      });

    if (confirmError) {
      console.error("4. فشل: خطأ في تأكيد الدفع:", confirmError.message);
      setError(confirmError.message || "حدث خطأ غير متوقع.");
      setProcessing(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      console.error("5. فشل: حالة الدفع غير ناجحة:", paymentIntent?.status);
      setError("تعذّر إكمال الدفع.");
      setProcessing(false);
      return;
    }

    // =========================================================
    // 🛑 التغيير الحاسم: تنفيذ خطوات النجاح وتفريغ السلة فوراً
    // =========================================================
    console.log("6. نجاح الدفع. تحديث الواجهة وتفريغ السلة.");
    
    // 1. تحديث حالة النجاح في الواجهة الأمامية
    setSucceeded(true); 
    setProcessing(false);
    // 2. تفريغ السلة فوراُ (مطلبك)
    clearCart();

    // 3. محاولة تسجيل ووردبريس (ننتظرها لتسجيل الأخطاء فقط، لا لإيقاف التوجيه)
    await submitDonationToWP(paymentIntent.id); 
    
    // 4. التوجيه لصفحة الشكر (يتم تنفيذه بغض النظر عن نتيجة WP)
    router.push(`/thank-you?payment_intent=${paymentIntent.id}`);
  };

  // ------------------------------------------------------------------ 
  // 5. العرض (Render)
  // ------------------------------------------------------------------

  const elementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": { color: "#aab7c4" },
      },
      invalid: { color: "#9e2146" },
    },
    hidePostalCode: true,
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

      {clientSecret && totalPaidAmount > 0 && !succeeded && ( // 💡 لن نعرض حقول الدفع بعد النجاح
        <>
          {/* 1. زر الدفع السريع */}
          {paymentRequest && (
            <div className={styles.expressCheckoutSection}>
              <p className={styles.expressTitle}>الدفع السريع:</p>
              <PaymentRequestButtonElement
                options={{
                  paymentRequest: paymentRequest,
                  style: { paymentRequestButton: { type: "donate", theme: "dark", height: "56px" } },
                }}
              />
              <div className={styles.divider}>
                <span>أو الدفع بالبطاقة</span>
              </div>
            </div>
          )}

          {/* 2. حقول البطاقة المنفصلة (المرنة) */}
          <div className={styles.cardInputGroup}>
            {/* حقل رقم البطاقة */}
            <div className={styles.formGroup}>
              <label className={styles.cardLabel}>رقم البطاقة</label>
              <div className={styles.cardInputFieldContainer}>
                <CardNumberElement options={elementOptions} />
              </div>
            </div>

            {/* حقل الانتهاء و CVC في صف واحد */}
            <div className={styles.cardSplitRow}>
              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>تاريخ الانتهاء</label>
                <div className={styles.cardInputFieldContainer}>
                  <CardExpiryElement options={elementOptions} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>رمز CVC</label>
                <div className={styles.cardInputFieldContainer}>
                  <CardCvcElement options={elementOptions} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {succeeded && (
        <div className={styles.successMessage}>
          <h2 style={{ color: '#28a745' }}>✅ شكراً لك!</h2>
          <p>تم استلام تبرعك بنجاح، وجاري تجهيز صفحة التأكيد.</p>
        </div>
      )}

      {!succeeded && ( // 💡 لن نعرض زر الدفع بعد النجاح
        <button
          type="submit"
          disabled={
            processing || !stripe || !clientSecret || !!error || totalAmountInCents <= 0
          }
          className={styles.submitButton}
        >
          {processing ? "جاري المعالجة..." : `تبرع الآن (${totalPaidAmount.toFixed(2)}$)`}
        </button>
      )}
      <p className={styles.secureNote}>عملية دفع آمنة ومشفرة بواسطة Stripe.</p>
    </form>
  );
};

export default CheckoutForm;