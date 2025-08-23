// src/app/contact/page.tsx

'use client'; // ضروري لأن الصفحة تحتوي على نموذج تفاعلي (useState, handleSubmit)

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // إذا أردت إضافة صور للأيقونات أو الخريطة
import styles from './page.module.css'; // ✨ استيراد الستايلات الخاصة بالصفحة ✨

const ContactPage = () => {
  // حالات لحفظ قيم حقول النموذج
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // منع سلوك الإرسال الافتراضي للصفحة

    // التحقق البسيط من صحة البيانات (يمكن تحسينه لاحقاً)
    if (!name || !email || !subject || !message) {
      alert('الرجاء تعبئة جميع الحقول المطلوبة.');
      return;
    }

    // هنا يمكنك جمع البيانات وإرسالها إلى API (باستخدام fetch أو axios)
    const formData = {
      name,
      email,
      subject,
      message,
    };

    console.log('بيانات نموذج الاتصال:', formData);

    // مثال على إرسال البيانات (ستحتاج لتعديل هذا للـ API الفعلي الخاص بك)
    // fetch('/api/submit-contact-form', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(formData),
    // })
    // .then(response => response.json())
    // .then(data => {
    //   alert('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
    //   // إعادة تعيين النموذج بعد الإرسال
    //   setName('');
    //   setEmail('');
    //   setSubject('');
    //   setMessage('');
    // })
    // .catch(error => {
    //   console.error('حدث خطأ أثناء إرسال الرسالة:', error);
    //   alert('حدث خطأ أثناء إرسال الرسالة. الرجاء المحاولة مرة أخرى.');
    // });

    alert('تم إرسال رسالتك بنجاح (تجريبي)! سنتواصل معك قريباً.'); // رسالة تأكيد مؤقتة

    // إعادة تعيين النموذج بعد الإرسال التجريبي
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className={styles.contactContainer}>
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>تواصل معنا</h1>
          <p className={styles.pageDescription}>
            نحن هنا لمساعدتك والإجابة على استفساراتك. لا تتردد في التواصل معنا عبر النموذج التالي أو معلومات الاتصال المباشرة.
          </p>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            {/* قسم نموذج الاتصال */}
            <div className={styles.contactFormSection}>
              <h2 className={styles.sectionTitle}>أرسل لنا رسالة</h2>
              <form onSubmit={handleSubmit} className={styles.contactForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.formLabel}>الاسم الكامل:</label>
                  <input
                    type="text"
                    id="name"
                    className={styles.formInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="اسمك كاملاً"
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
                    placeholder="بريدك الإلكتروني"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="subject" className={styles.formLabel}>الموضوع:</label>
                  <input
                    type="text"
                    id="subject"
                    className={styles.formInput}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="موضوع رسالتك"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.formLabel}>رسالتك:</label>
                  <textarea
                    id="message"
                    className={styles.formTextarea}
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="اكتب رسالتك هنا..."
                  />
                </div>

                <button type="submit" className={styles.submitButton}>
                  إرسال الرسالة <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>

            {/* قسم معلومات الاتصال */}
            <div className={styles.contactInfoSection}>
              <h2 className={styles.sectionTitle}>معلومات الاتصال</h2>
              <div className={styles.infoItem}>
                <i className="fas fa-map-marker-alt"></i>
                <p>العنوان: دمشق، سوريا</p>
              </div>
              <div className={styles.infoItem}>
                <i className="fas fa-phone"></i>
                <p>الهاتف: +963 9XXXXXXXX</p>
              </div>
              <div className={styles.infoItem}>
                <i className="fas fa-envelope"></i>
                <p>البريد الإلكتروني: info@sanadedu.org</p>
              </div>

              <div className={styles.socialIcons}>
                <a href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="https://twitter.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="https://instagram.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                <a href="https://linkedin.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              </div>
            </div>
          </div>

          {/* قسم الخريطة (اختياري) */}
          {/*
          <div className={styles.mapSection}>
            <h2 className={styles.sectionTitle}>موقعنا على الخريطة</h2>
            <div className={styles.mapContainer}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.6930064299944!2d36.29051871490234!3d33.51322988075773!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1518e6dc4043b23b%3A0x6b7b2b7b2b7b2b7b!2sDamascus%2C%20Syria!5e0!3m2!1sen!2sus!4v1678901234567!5m2!1sen!2sus"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Map of Damascus"
              ></iframe>
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;