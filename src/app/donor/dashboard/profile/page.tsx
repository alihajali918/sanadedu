// ==========================================================
// FILE: src/app/donor/dashboard/profile/page.tsx
// DESCRIPTION: Donor profile page component.
// Fetches and displays authenticated user's full profile data from backend.
// Allows editing and saving profile information.
// ==========================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext'; // لاستخدام معلومات المستخدم وتوكن المصادقة
import { useLocale } from '@/app/context/LocaleContext'; // لتنسيق التاريخ والأرقام
import styles from './profile.module.css'; // تأكد من إنشاء هذا الملف

// تعريف واجهة لبيانات الملف الشخصي الكاملة للمستخدم
interface UserProfileData {
  fullName: string;
  email: string;
  phoneNumber?: string; // اختياري
  address?: string;     // اختياري
  joinDate: string;
  lastLogin?: string;   // اختياري
  totalDonationsCount: number;
  totalDonationsAmount: number; // يجب أن تكون رقم لـ formatCurrency
}

const DonorProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth(); // جلب معلومات المستخدم وحالة المصادقة
  const { formatCurrency } = useLocale(); // جلب دالة تنسيق العملة

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // للتحميل الأولي لبيانات الملف الشخصي
  const [isSaving, setIsSaving] = useState(false); // لحالة حفظ التعديلات
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // useEffect لجلب بيانات الملف الشخصي الكاملة عند تحميل الصفحة أو تغير حالة المصادقة
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.push('/auth/login'); // إعادة التوجيه لصفحة الدخول إذا لم يكن مصادقاً عليه
      return;
    }

    if (isAuthenticated && user) {
      const fetchUserProfile = async () => {
        setIsLoading(true);
        setError('');
        try {
          const authToken = localStorage.getItem('authToken'); 
          if (!authToken) {
            throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
          }

          // نقطة API جديدة لجلب الملف الشخصي الكامل
          // يجب أن تقوم بإنشاء هذه النقطة في WordPress Backend
          const response = await fetch('https://sanadedu.org/backend/wp-json/sanad/v1/user/full-profile', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل جلب بيانات الملف الشخصي.');
          }

          const data: UserProfileData = await response.json();
          // تحويل التاريخ إلى تنسيق مقروء إذا كان قادماً بتنسيق YYYYMMDD
          if (data.joinDate && typeof data.joinDate === 'string' && data.joinDate.length === 8) {
            const year = data.joinDate.substring(0, 4);
            const month = data.joinDate.substring(4, 6);
            const day = data.joinDate.substring(6, 8);
            data.joinDate = `${year}-${month}-${day}`; // تحويل إلى YYYY-MM-DD
          }
           if (data.lastLogin && typeof data.lastLogin === 'string' && data.lastLogin.length >= 14) { // YYYYMMDDHHMMSS
            const year = data.lastLogin.substring(0, 4);
            const month = data.lastLogin.substring(4, 6);
            const day = data.lastLogin.substring(6, 8);
            const hour = data.lastLogin.substring(8, 10);
            const minute = data.lastLogin.substring(10, 12);
            data.lastLogin = `${year}-${month}-${day} ${hour}:${minute}`;
          }


          setProfileData(data);
        } catch (err) {
          setError(err.message || 'حدث خطأ أثناء جلب بيانات الملف الشخصي.');
          console.error('Error fetching user profile:', err);
          // في حالة الخطأ، من الأفضل مسح التوكن وإعادة توجيه المستخدم
          logout(); // استخدام دالة logout من السياق
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [isAuthenticated, isLoadingAuth, user, router, logout]);

  // دالة لتحديث قيم حقول النموذج عند التعديل
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prevData => prevData ? { ...prevData, [name]: value } : null);
  };

  // دالة لحفظ التعديلات وإرسالها إلى الـ Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    if (!profileData) return;

    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
      }

      // نقطة API لتحديث الملف الشخصي في WordPress Backend
      // يجب أن تقوم بإنشاء هذه النقطة في WordPress Backend
      const response = await fetch('https://sanadedu.org/backend/wp-json/sanad/v1/user/update-profile', {
        method: 'POST', // أو PUT
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // إرسال البيانات التي يمكن تعديلها
          fullName: profileData.fullName,
          phoneNumber: profileData.phoneNumber,
          address: profileData.address,
          // لا ترسل email أو joinDate للتعديل عادةً
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل تحديث الملف الشخصي.');
      }

      setSuccessMessage('تم حفظ التغييرات بنجاح!');
      setIsEditing(false); // الخروج من وضع التعديل بعد الحفظ
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ التغييرات.');
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // عرض حالة التحميل الأولية للصفحة
  if (isLoading || isLoadingAuth) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>جاري تحميل ملفك الشخصي...</p>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا حدثت مشكلة في جلب البيانات
  if (error && !profileData) { // إذا كان هناك خطأ ولم يتم تحميل أي بيانات
    return (
      <div className={styles.profileContainer}>
        <div className={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  // إذا لم يتم العثور على بيانات المستخدم بعد التحميل
  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.noData}>لا يمكن العثور على بيانات الملف الشخصي.</div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.profileTitle}>ملفي الشخصي</h1>
      <p className={styles.profileDescription}>
        يمكنك هنا عرض وتعديل معلومات حسابك.
      </p>

      {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.profileCard}>
        {isEditing ? (
          <form onSubmit={handleSubmit} className={styles.profileForm}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">الاسم الكامل:</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={profileData.fullName}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">البريد الإلكتروني:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className={styles.formInput}
                disabled // البريد الإلكتروني غالباً لا يتم تعديله مباشرة
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phoneNumber">رقم الهاتف:</label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={profileData.phoneNumber || ''}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="address">العنوان:</label>
              <input
                type="text"
                id="address"
                name="address"
                value={profileData.address || ''}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveButton} disabled={isSaving}>
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelButton} disabled={isSaving}>إلغاء</button>
            </div>
          </form>
        ) : (
          <div className={styles.profileDetails}>
            <div className={styles.detailItem}>
              <strong>الاسم الكامل:</strong>
              <span>{profileData.fullName}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>البريد الإلكتروني:</strong>
              <span>{profileData.email}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>رقم الهاتف:</strong>
              <span>{profileData.phoneNumber || 'غير متوفر'}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>العنوان:</strong>
              <span>{profileData.address || 'غير متوفر'}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>تاريخ الانضمام:</strong>
              <span>{profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString('ar-SY') : 'غير متوفر'}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>آخر تسجيل دخول:</strong>
              <span>{profileData.lastLogin || 'غير متوفر'}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>عدد التبرعات الكلي:</strong>
              <span>{profileData.totalDonationsCount}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>إجمالي مبلغ التبرعات:</strong>
              <span>{formatCurrency(profileData.totalDonationsAmount)}</span>
            </div>
            <button onClick={() => setIsEditing(true)} className={styles.editButton}>تعديل الملف الشخصي</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorProfilePage;
