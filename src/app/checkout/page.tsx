// app/checkout/page.tsx
'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import { useCart } from '../context/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// -----------------------------------------------------------
// تعريف الواجهة الموسعة والمصححة لتلبية متطلبات 'DonatedItem'
// -----------------------------------------------------------
interface DonatedItemForDisplay {
    case_id: number;
    line_total: number;
    item_quantity: number;
    // 💡 تصحيح الخطأ: acf_field_id أصبح مطلوباً الآن
    acf_field_id: string; 
    need_id?: string;
    // الحقول الإضافية المطلوبة للعرض
    item_name: string; 
    unit_price: number; 
}

const CheckoutPage = () => {
    const { isLoading } = useCart(); 
    const searchParams = useSearchParams();

    // رسمياً: نجمع بيانات الضيف لو ما في جلسة
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');

    // 1) قراءة بارامترات الحمولة الموحدة الجديدة من الـ URL
    const donatedItemsString = searchParams.get('donatedItems');
    // totalAmountString: يمكن استخدامه للتحقق إذا لزم الأمر

    // 2) فك تشفير وتحويل الحمولة إلى مصفوفة (النسخة التي سيتم تمريرها للـ CheckoutForm)
    let richDonatedItems: DonatedItemForDisplay[] = [];
    let apiPayload: any[] = []; 

    if (donatedItemsString) {
        try {
            const decodedString = decodeURIComponent(donatedItemsString);
            const rawPayload: any[] = JSON.parse(decodedString);
            apiPayload = rawPayload; 

            // نحول الحمولة لتشمل الحقول المطلوبة للعرض (item_name, unit_price, acf_field_id)
            richDonatedItems = rawPayload.map(item => {
                let itemName = '';
                let unitPrice = 0;

                if (item.case_id > 0) {
                    // تبرع للحالة: يمكن أن يكون نقدي أو عيني
                    itemName = item.item_quantity > 0 
                        ? `تبرع عيني للحالة ${item.case_id} (${item.item_quantity} وحدة)`
                        : `تبرع نقدي للحالة ${item.case_id}`;

                    // حساب سعر الوحدة (وإلا يكون السعر هو الإجمالي)
                    unitPrice = item.item_quantity > 0 
                        ? Number((item.line_total / item.item_quantity).toFixed(2)) 
                        : item.line_total;

                } else if (item.need_id === 'operational-costs') {
                    // رسوم تشغيلية (نقل أو مخصص)
                    if (item.line_total === 5) {
                        itemName = 'أجور النقل والتوصيل';
                    } else {
                        itemName = 'تبرع مخصص إضافي (ميزانية تشغيل)';
                    }
                    unitPrice = item.line_total; // سعر الوحدة هو الإجمالي في هذه الحالة
                } else {
                    itemName = 'بند تبرع غير محدد';
                    unitPrice = item.line_total;
                }

                return {
                    case_id: item.case_id,
                    line_total: item.line_total,
                    item_quantity: item.item_quantity,
                    // 💡 التصحيح: ضمان أن القيمة هي string دائماً
                    acf_field_id: item.acf_field_id || '', 
                    need_id: item.need_id,
                    item_name: itemName,
                    unit_price: unitPrice,
                } as DonatedItemForDisplay;
            });

        } catch (error) {
            console.error("Error parsing donatedItems payload:", error);
            richDonatedItems = [];
        }
    }

// ... بقية الكود دون تغيير ...

    // 3) استخلاص المجاميع من الحمولة الموحدة (للعرض)
    let subtotal = 0; 
    let optionalShippingFees = 0; 
    let parsedCustomDonation = 0; 
    let finalTotal = 0;

    apiPayload.forEach(item => { // نستخدم الحمولة الأصلية النظيفة للحسابات
        finalTotal += item.line_total || 0;

        if (item.case_id > 0) {
            subtotal += item.line_total || 0;
        } else if (item.need_id === 'operational-costs') {
            // نفترض أن رسوم النقل هي $5
            if (item.line_total === 5 && optionalShippingFees === 0) {
                optionalShippingFees = 5; 
            } else {
                parsedCustomDonation += item.line_total || 0;
            }
        }
    });

    const mandatoryTransactionFee = 0; 
    finalTotal += mandatoryTransactionFee;

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

    // التحقق من أن هناك مبلغاً للدفع
    if (finalTotal <= 0 || richDonatedItems.length === 0) {
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

    // تحديد مُعرّف الحالة الأولى (للتتبع في بعض الأنظمة)
    const firstCaseItem = richDonatedItems.find(item => item.case_id > 0);
    const firstCaseId = firstCaseItem?.case_id ? String(firstCaseItem.case_id) : '';

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
                                donatedItems={richDonatedItems}
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