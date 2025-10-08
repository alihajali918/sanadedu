// app/checkout/page.tsx
'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
// 🛑 استيراد userName و userEmail من Context
import { useCart } from '../context/CartContext'; 
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// -----------------------------------------------------------
// تعريف الواجهة
// -----------------------------------------------------------
interface DonatedItemForDisplay {
    case_id: number;
    line_total: number;
    item_quantity: number;
    acf_field_id: string; 
    need_id?: string;
    item_name: string; 
    unit_price: number; 
}

const CheckoutPage = () => {
    // 🛑 يتم استخدام userName و userEmail هنا
    const { isLoading, isLoggedIn, userName, userEmail } = useCart(); 
    const searchParams = useSearchParams();

    // بيانات الضيف (تُستخدم فقط إذا كان isLoggedIn هو false)
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');

    // 1) قراءة بارامترات الحمولة الموحدة الجديدة من الـ URL
    const donatedItemsString = searchParams.get('donatedItems');
    
    // 2) فك تشفير وتحويل الحمولة إلى مصفوفة
    let richDonatedItems: DonatedItemForDisplay[] = [];
    let apiPayload: any[] = []; 

    if (donatedItemsString) {
        try {
            const decodedString = decodeURIComponent(donatedItemsString);
            const rawPayload: any[] = JSON.parse(decodedString);
            apiPayload = rawPayload; 

            // نحول الحمولة لتشمل الحقول المطلوبة للعرض
            richDonatedItems = rawPayload.map(item => {
                let itemName = '';
                let unitPrice = 0;

                if (item.case_id > 0) {
                    itemName = item.item_quantity > 0 
                        ? `تبرع عيني للحالة ${item.case_id} (${item.item_quantity} وحدة)`
                        : `تبرع نقدي للحالة ${item.case_id}`;
                    unitPrice = item.item_quantity > 0 
                        ? Number((item.line_total / item.item_quantity).toFixed(2)) 
                        : item.line_total;

                } else if (item.need_id === 'operational-costs') {
                    if (item.line_total === 5) {
                        itemName = 'أجور النقل والتوصيل';
                    } else {
                        itemName = 'تبرع مخصص إضافي (ميزانية تشغيل)';
                    }
                    unitPrice = item.line_total;
                } else {
                    itemName = 'بند تبرع غير محدد';
                    unitPrice = item.line_total;
                }

                return {
                    case_id: item.case_id,
                    line_total: item.line_total,
                    item_quantity: item.item_quantity,
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

    // 3) استخلاص المجاميع
    let subtotal = 0; 
    let optionalShippingFees = 0; 
    let parsedCustomDonation = 0; 
    let finalTotal = 0;

    apiPayload.forEach(item => {
        finalTotal += item.line_total || 0;

        if (item.case_id > 0) {
            subtotal += item.line_total || 0;
        } else if (item.need_id === 'operational-costs') {
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

    // 🛑 المنطق لتحديد الاسم والإيميل النهائيين للدفع
    const finalDonorName = isLoggedIn ? userName : guestName;
    const finalDonorEmail = isLoggedIn ? userEmail : guestEmail;


    if (isLoading) {
        return (
            <main className={styles.checkoutPage} dir="rtl">
                <div className={styles.container}>
                    <p style={{ textAlign: 'center', fontSize: '1.2em' }}>جاري تحميل سلة تبرعاتك...</p>
                </div>
            </main>
        );
    }

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

    const firstCaseItem = richDonatedItems.find(item => item.case_id > 0);
    const firstCaseId = firstCaseItem?.case_id ? String(firstCaseItem.case_id) : '';

    return (
        <main className={styles.checkoutPage} dir="rtl">
            <div className={styles.container}>
                <h1 className={styles.pageTitle}>إتمام عملية التبرع</h1>

                <div className={styles.checkoutLayout}>
                    <div className={styles.formContainer}>
                        {/* 💡 يظهر هذا الجزء فقط إذا لم يكن المستخدم مسجلاً دخولًا */}
                        {!isLoggedIn && (
                            <><p style={{marginBottom: '20px', color: '#666', fontSize: '0.9em'}}>
                                    بإدخال اسمك وإيميلك يصلك إشعار وصور التوثيق، وبدونها يبقى التبرع مجهول
                                </p>
                                <div className={styles.formGroup}>
                                    <label htmlFor="guestName">الاسم الكامل (اختياري):</label>
                                    <input
                                        id="guestName"
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className={styles.inputField}
                                        placeholder="الاسم"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="guestEmail">البريد الإلكتروني (اختياري):</label>
                                    <input
                                        id="guestEmail"
                                        type="email"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        className={styles.inputField}
                                        placeholder="البريد الإلكتروني"
                                    />
                                </div>
                            </>
                        )}

                        {/* 💡 يظهر هذا الجزء إذا كان المستخدم مسجلاً دخولاً */}
                        {isLoggedIn && (
                             <div className={styles.loggedInInfo} style={{marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
                                <h2 className={styles.sectionTitle} style={{marginTop: 0, marginBottom: '5px'}}>معلومات المتبرع المسجل</h2>
                                <p style={{margin: '5px 0'}}>
                                    <strong style={{minWidth: '100px', display: 'inline-block'}}>الاسم:</strong> {userName || 'لا يوجد اسم مسجل'}
                                </p>
                                <p style={{margin: '5px 0'}}>
                                    <strong style={{minWidth: '100px', display: 'inline-block'}}>الإيميل:</strong> {userEmail || 'لا يوجد بريد مسجل'}
                                </p>
                                <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
                                    سيتم إتمام التبرع باستخدام بيانات حسابك المسجل.
                                </p>
                            </div>
                        )}
                        
                        <Elements stripe={stripePromise}>
                            <CheckoutForm
                                caseId={firstCaseId}
                                totalPaidAmount={Number(finalTotal.toFixed(2))}
                                subtotalAmount={Number(subtotal.toFixed(2))}
                                shippingFees={Number(optionalShippingFees.toFixed(2))}
                                customDonation={Number(parsedCustomDonation.toFixed(2))}
                                donatedItems={richDonatedItems}
                                // 🛑 تمرير الاسم والإيميل النهائيين (الحقيقي للمسجل أو المدخل للضيف)
                                donorName={finalDonorName} 
                                donorEmail={finalDonorEmail}
                            />
                        </Elements>
                    </div>

                    <aside className={styles.orderSummary}>
                        <h2 className={styles.summaryTitle}>ملخص تبرعك</h2>
                        {/* ... (باقي ملخص الطلب) ... */}
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