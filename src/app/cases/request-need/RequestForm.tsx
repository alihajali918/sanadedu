"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CaseItem } from "lib/types";
import styles from "@/app/request-documentation/page.module.css";

interface RequestFormProps {
  caseItem: CaseItem;
  caseId: string;
}

const RequestForm: React.FC<RequestFormProps> = ({ caseItem, caseId }) => {
  const [entityName, setEntityName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [goals, setGoals] = useState<string>("");
  const [contactTime, setContactTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // مسح أي أخطاء سابقة

    if (!entityName || !email || !phone || !goals) {
      setError("الرجاء تعبئة جميع الحقول المطلوبة.");
      return;
    }

    const formData = {
      caseId,
      entityName,
      email,
      phone,
      budget,
      goals,
      contactTime,
      notes,
    };

    console.log("بيانات طلب الاحتياج:", formData);
    setIsSubmitted(true);
  };

  return (
    <div className={styles.requestDocContainer}>
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>طلب تفصيلي للإحتياج</h1>
          <p className={styles.pageDescription}>
            يرجى تعبئة النموذج التالي لطلب الدعم التعليمي من فريق سند لدعم
            التعليم.
            <br />
            <strong className="font-bold">
              هذا الطلب مخصص للمؤسسة التالية: {caseItem.title}
            </strong>
          </p>
          <p className={styles.pageDescription}>
            بعد استلام الطلب، سيتواصل معكم فريقنا لترتيب موعد وتزويدكم
            بالمعلومات والملف التفصيلي.
          </p>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.container}>
          {isSubmitted ? (
            <div className={styles.thankYouMessage}>
              <h2 className={styles.thankYouTitle}>شكراً لك!</h2>
              <p>
                تم استلام طلبكم بنجاح. سيتواصل معكم فريق سند لدعم التعليم في
                أقرب وقت.
              </p>
              <Link href={`/cases/${caseId}`} className={styles.homeLink}>
                العودة إلى صفحة الحالة
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.documentationForm}>
              {error && (
                <div
                  className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg"
                  role="alert"
                >
                  <p className="font-bold">خطأ</p>
                  <p>{error}</p>
                </div>
              )}
              <div className={styles.formGroup}>
                <label htmlFor="entityName" className={styles.formLabel}>
                  الاسم الكامل / اسم الجهة:
                </label>
                <input
                  type="text"
                  id="entityName"
                  className={styles.formInput}
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>
                  البريد الإلكتروني للتواصل:
                </label>
                <input
                  type="email"
                  id="email"
                  className={styles.formInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.formLabel}>
                  رقم الموبايل / الواتساب:
                </label>
                <input
                  type="tel"
                  id="phone"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="budget" className={styles.formLabel}>
                  قيمة الدعم أو الميزانية المبدئية المخصصة:
                </label>
                <input
                  type="text"
                  id="budget"
                  className={styles.formInput}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="مثال: 5,000 ريال سعودي"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="goals" className={styles.formLabel}>
                  ما هي الأهداف أو المجالات التي تودون أن يُستخدم فيها مبلغ
                  التبرع الخاص بكم؟
                </label>
                <textarea
                  id="goals"
                  className={styles.formTextarea}
                  rows={4}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  required
                  placeholder="مثال: دعم رسوم دراسية للطلاب المحتاجين، تمويل مشروع تعليمي..."
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="contactTime" className={styles.formLabel}>
                  الموعد/الأوقات المناسبة للتواصل أو الاجتماع:
                </label>
                <input
                  type="text"
                  id="contactTime"
                  className={styles.formInput}
                  value={contactTime}
                  onChange={(e) => setContactTime(e.target.value)}
                  placeholder="مثال: أيام الأحد والثلاثاء، بعد الساعة 3 مساءً"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="notes" className={styles.formLabel}>
                  ملاحظات أو تفاصيل إضافية ترونها مهمة:
                </label>
                <textarea
                  id="notes"
                  className={styles.formTextarea}
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي معلومات أخرى تودون إضافتها..."
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                إرسال طلب الاحتياج
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
