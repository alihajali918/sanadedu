// src/app/request-documentation/page.tsx

'use client'; // ضروري لأن الصفحة تحتوي على نموذج تفاعلي (useState, handleSubmit)

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // إذا أردت إضافة صورة توضيحية
import styles from './page.module.css'; // ✨ استيراد الستايلات الخاصة بالصفحة ✨

const RequestDocumentationPage = () => {
  // حالات لحفظ قيم حقول النموذج
  const [institutionName, setInstitutionName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  // يمكنك إضافة حالة لرفع الملفات إذا لزم الأمر

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // منع سلوك الإرسال الافتراضي للصفحة

    // التحقق البسيط من صحة البيانات (يمكن تحسينه لاحقاً)
    if (!institutionName || !contactPerson || !email || !phone || !description) {
      alert('الرجاء تعبئة جميع الحقول المطلوبة.');
      return;
    }

    // هنا يمكنك جمع البيانات وإرسالها إلى API (باستخدام fetch أو axios)
    const formData = {
      institutionName,
      contactPerson,
      email,
      phone,
      description,
      // أي بيانات ملفات مرفوعة
    };

    console.log('بيانات طلب التوثيق:', formData);

    // مثال على إرسال البيانات (ستحتاج لتعديل هذا للـ API الفعلي الخاص بك)
    // fetch('/api/submit-documentation-request', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(formData),
    // })
    // .then(response => response.json())
    // .then(data => {
    //   alert('تم إرسال طلبك بنجاح! سنتواصل معك قريباً.');
    //   // إعادة تعيين النموذج بعد الإرسال
    //   setInstitutionName('');
    //   setContactPerson('');
    //   setEmail('');
    //   setPhone('');
    //   setDescription('');
    // })
    // .catch(error => {
    //   console.error('حدث خطأ أثناء إرسال الطلب:', error);
    //   alert('حدث خطأ أثناء إرسال الطلب. الرجاء المحاولة مرة أخرى.');
    // });

    alert('تم إرسال طلبك بنجاح (تجريبي)! سنتواصل معك قريباً.'); // رسالة تأكيد مؤقتة

    // إعادة تعيين النموذج بعد الإرسال التجريبي
    setInstitutionName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setDescription('');
  };

  return (
    <div className={styles.requestDocContainer}>
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>طلب توثيق مؤسستك</h1>
          <p className={styles.pageDescription}>
            لتوثيق مؤسستك لدى منصة سند، الرجاء تعبئة النموذج التالي. سيتم مراجعة طلبك والتواصل معك قريباً.
          </p>
          {/* يمكنك إضافة صورة توضيحية هنا */}
          {/* <Image src="/images/documentation-hero.jpg" alt="Request Documentation" width={600} height={400} className={styles.heroImage} priority /> */}
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.container}>
          <form onSubmit={handleSubmit} className={styles.documentationForm}>
            <div className={styles.formGroup}>
              <label htmlFor="institutionName" className={styles.formLabel}>اسم المؤسسة:</label>
              <input
                type="text"
                id="institutionName"
                className={styles.formInput}
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
                placeholder="مثال: مؤسسة الأمل الخيرية"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="contactPerson" className={styles.formLabel}>اسم الشخص المسؤول:</label>
              <input
                type="text"
                id="contactPerson"
                className={styles.formInput}
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
                placeholder="مثال: أحمد محمود"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>البريد الإلكتروني:</label>
              <input
                type="email"
                id="email"
                className={styles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="مثال: info@yourinstitution.org"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.formLabel}>رقم الهاتف (مع رمز الدولة):</label>
              <input
                type="tel"
                id="phone"
                className={styles.formInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="مثال: +963 9XXXXXXXXX"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.formLabel}>وصف موجز عن المؤسسة وأهدافها:</label>
              <textarea
                id="description"
                className={styles.formTextarea}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="الرجاء وصف مؤسستكم وأهدافها وكيف تخدمون المجتمع..."
              />
            </div>

            {/* يمكنك إضافة حقل لرفع الملفات هنا (يتطلب منطقاً إضافياً في Next.js للتعامل مع الرفع) */}
            {/*
            <div className={styles.formGroup}>
              <label htmlFor="documents" className={styles.formLabel}>الوثائق الداعمة (اختياري - شهادة تسجيل، تقارير نشاط، إلخ.):</label>
              <input
                type="file"
                id="documents"
                className={styles.formInputFile} // ستايل مخصص لرفع الملفات
                multiple // للسماح برفع عدة ملفات
              />
              <p className={styles.fileHint}>صيغ الملفات المدعومة: PDF, DOC, DOCX. الحد الأقصى للحجم: 5MB.</p>
            </div>
            */}

            <button type="submit" className={styles.submitButton}>
              إرسال طلب التوثيق <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      {/* يمكنك إضافة أقسام أخرى هنا مثل:
          - خطوات عملية التوثيق
          - أسئلة شائعة
          - فوائد التوثيق
      */}
    </div>
  );
};

export default RequestDocumentationPage;