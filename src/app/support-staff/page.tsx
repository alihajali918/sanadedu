// src/app/support-staff/page.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

import styles from './page.module.css';

const SupportStaffPage = () => {
    const [donationAmount, setDonationAmount] = useState<string>('');
    const predefinedAmounts = [50, 100, 200, 500];

    const router = useRouter();
    const { addItem } = useCart();

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDonationAmount(e.target.value);
    };

    const handlePredefinedAmountClick = (amount: number) => {
        setDonationAmount(amount.toString());
    };

   const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(donationAmount);

    if (isNaN(amount) || amount <= 0) {
        alert('الرجاء إدخال مبلغ تبرع صحيح وكبير عن الصفر.');
        return;
    }

    const donationItem = {
        // ✅ تم إضافة الخصائص المطلوبة هنا
        id: `staff-donation-${Date.now()}`,
        itemName: 'تبرع لدعم كادر سند',
        institutionId: 'staff-support', // قيمة ثابتة وواضحة
        institutionName: 'صندوق دعم كادر سند',
        needId: 'operational-costs',    // قيمة ثابتة وواضحة
        unitPrice: amount,
        quantity: 1,
        itemImage: '/images/staff-icon.png',
        totalPrice: amount,
    };

    addItem(donationItem);
    setDonationAmount('');
    router.push('/donation-basket');
    };

    return (
        <div className={styles.supportPageContainer}>
            <div className={styles.pageLayout}>
                {/* ✅ العمود الأيمن: نبذة عن المشروع */}
                <div className={styles.aboutSection}>
                    <h1 className={styles.mainTitle}>دعمكم يصنع استدامة العطاء</h1>
                    <p className={styles.aboutDescription}>
                        مشروع سند هو مبادرة إنسانية وتعليمية غير ربحية، تهدف إلى بناء جسر من الأمل بين المتبرعين والمؤسسات التعليمية المحتاجة في سوريا. نحن نؤمن بأن التعليم هو حجر الأساس لمستقبل أفضل.
                    </p>
                    <div className={styles.aboutImageContainer}>
                        <Image
                            src="/images/sanad-team-photo.jpg" // تأكد من وجود هذه الصورة
                            alt="فريق عمل سند"
                            width={500}
                            height={300}
                            className={styles.aboutImage}
                        />
                    </div>
                    <h2 className={styles.subTitle}>لماذا ندعم الكادر التشغيلي؟</h2>
                    <p className={styles.aboutDescription}>
                        تبرعكم لصندوق دعم الكادر يساعدنا على تغطية التكاليف التشغيلية الأساسية مثل أجور الفريق الميداني، النقل، وتكاليف توثيق الحالات. هذا الدعم يضمن أن 100% من تبرعات الحالات تذهب مباشرة للمستفيدين، ويحافظ على استمرارية وشفافية عملنا.
                    </p>
                </div>

                {/* ✅ العمود الأيسر: نموذج التبرع */}
                <div className={styles.donationSection}>
                    <h2 className={styles.sectionTitle}>اختر مبلغ تبرعك</h2>
                    <div className={styles.amountOptions}>
                        {predefinedAmounts.map((amount) => (
                            <button
                                key={amount}
                                className={`${styles.amountButton} ${donationAmount === amount.toString() ? styles.activeAmount : ''}`}
                                onClick={() => handlePredefinedAmountClick(amount)}
                            >
                                ${amount}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleDonateSubmit} className={styles.donationForm}>
                        <label htmlFor="customAmount" className={styles.formLabel}>أو أدخل مبلغاً آخر (بالدولار الأمريكي)</label>
                        <input
                            type="number"
                            id="customAmount"
                            min="1"
                            step="0.01"
                            value={donationAmount}
                            onChange={handleAmountChange}
                            className={styles.amountInput}
                            placeholder="مثال: 75.00"
                        />
                        <button type="submit" className={styles.donateButton}>
                            تبرع الآن <i className="fas fa-hand-holding-heart"></i>
                        </button>
                    </form>

                    <p className={styles.thankYouMessage}>
                        شكراً لكم على دعمكم المستمر ومساندتكم لكادر سند.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SupportStaffPage;
