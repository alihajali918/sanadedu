// ==========================================================
// FILE: src/app/donor/dashboard/settings/page.tsx
// DESCRIPTION: Settings page component for the donor dashboard.
// Allows authenticated users to change password and manage notification preferences.
// ==========================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; // <--- تم التعديل: استخدام useSession و signOut من NextAuth
import styles from './settings.module.css'; // تأكد من إنشاء هذا الملف

// تعريف واجهة لبيانات الإعدادات (تفضيلات الإشعارات فقط)
interface UserSettingsData {
    emailNotifications: boolean;
    smsNotifications: boolean;
}

// 🚀 استخدام متغير البيئة لعنوان الـ API الأساسي
// تأكد من أن NEXT_PUBLIC_WORDPRESS_API_ROOT مضبوط في ملف .env أو .env.local
const WORDPRESS_API_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT || 'https://cms.sanadedu.org/wp-json';


const DonorSettingsPage: React.FC = () => {
    const router = useRouter();
    // const { isAuthenticated, isLoadingAuth, logout } = useAuth(); // <--- تم الإزالة: لم نعد نستخدم useAuth
    const { data: session, status } = useSession(); // <--- جديد: استخدام useSession

    const [settingsData, setSettingsData] = useState<UserSettingsData | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [isLoading, setIsLoading] = useState(true); // للتحميل الأولي لبيانات الإعدادات
    const [isChangingPassword, setIsChangingPassword] = useState(false); // لحالة تغيير كلمة المرور
    const [isSavingNotifications, setIsSavingNotifications] = useState(false); // لحالة حفظ تفضيلات الإشعارات

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isAuthenticated = status === "authenticated"; // تعريف isAuthenticated بناءً على status
    const isLoadingAuth = status === "loading"; // تعريف isLoadingAuth بناءً على status

    // useEffect لجلب تفضيلات الإشعارات عند تحميل الصفحة
    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            router.push('/auth/login');
            return;
        }

        if (isAuthenticated && session?.user) { // <--- استخدام session.user للتحقق من وجود بيانات المستخدم
            const fetchUserSettings = async () => {
                setIsLoading(true);
                setError('');
                try {
                    const authToken = session.user.wordpressJwt; // <--- استخدام wordpressJwt من جلسة NextAuth
                    if (!authToken) {
                        throw new Error('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
                    }

                    // 🚀 تم تحديث نقطة API لجلب بيانات الملف الشخصي والإعدادات
                    // هذه النقطة نهاية قد لا تعيد emailNotifications و smsNotifications مباشرة.
                    // ستحتاج إلى التأكد من أن الـ backend الخاص بك يرسلها، أو جلبها من نقطة نهاية مخصصة للإعدادات.
                    const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/full-profile`;

                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'فشل جلب بيانات الإعدادات.');
                    }

                    const data = await response.json();
                    setSettingsData({
                        // <--- تأكد من أن الـ backend يعيد هذه الحقول
                        emailNotifications: data.emailNotifications ?? false, // استخدام nullish coalescing لتجنب undefined
                        smsNotifications: data.smsNotifications ?? false,    // افتراضي false إذا لم يتم إرجاعها
                    });
                } catch (err: any) { // تم إضافة "any" لتجنب خطأ TypeScript
                    setError(err.message || 'حدث خطأ أثناء جلب بيانات الإعدادات.');
                    console.error('Error fetching user settings:', err);
                    signOut({ redirect: true, callbackUrl: '/auth/login' }); // <--- استخدام signOut من NextAuth
                } finally {
                    setIsLoading(false);
                }
            };

            fetchUserSettings();
        }
    }, [isAuthenticated, isLoadingAuth, session, router]); // <--- تم تعديل التبعيات

    // دالة لتغيير كلمة المرور
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChangingPassword(true);
        setError('');
        setSuccessMessage('');

        if (newPassword !== confirmNewPassword) {
            setError('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
            setIsChangingPassword(false);
            return;
        }
        if (!currentPassword || !newPassword) {
            setError('يرجى ملء جميع حقول كلمة المرور.');
            setIsChangingPassword(false);
            return;
        }

        try {
            const authToken = session?.user?.wordpressJwt; // <--- استخدام wordpressJwt من جلسة NextAuth
            if (!authToken) {
                throw new Error('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
            }

            // 🚀 تم تحديث نقطة API لتغيير كلمة المرور
            const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/change-password`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل تغيير كلمة المرور. يرجى التحقق من كلمة المرور الحالية.');
            }

            setSuccessMessage('تم تغيير كلمة المرور بنجاح!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) { // تم إضافة "any" لتجنب خطأ TypeScript
            setError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
            console.error('Error changing password:', err);
        } finally {
            setIsChangingPassword(false);
        }
    };

    // دالة لحفظ تفضيلات الإشعارات
    const handleSaveNotifications = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingNotifications(true);
        setError('');
        setSuccessMessage('');

        if (!settingsData) return;

        try {
            const authToken = session?.user?.wordpressJwt; // <--- استخدام wordpressJwt من جلسة NextAuth
            if (!authToken) {
                throw new Error('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
            }

            // 🚀 تم تحديث نقطة API لتحديث الملف الشخصي
            // تأكد من أن نقطة النهاية هذه (user/update-profile) تدعم تحديث تفضيلات الإشعارات.
            // إذا لم يكن الأمر كذلك، ستحتاج إلى نقطة نهاية API مخصصة في WordPress لذلك.
            const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/update-profile`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    emailNotifications: settingsData.emailNotifications,
                    smsNotifications: settingsData.smsNotifications,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل حفظ تفضيلات الإشعارات.');
            }

            setSuccessMessage('تم حفظ تفضيلات الإشعارات بنجاح!');
        } catch (err: any) { // تم إضافة "any" لتجنب خطأ TypeScript
            setError(err.message || 'حدث خطأ أثناء حفظ تفضيلات الإشعارات.');
            console.error('Error saving notifications:', err);
        } finally {
            setIsSavingNotifications(false);
        }
    };

    // عرض حالة التحميل الأولية للصفحة
    if (isLoading || isLoadingAuth) {
        return (
            <div className={styles.settingsContainer}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>جاري تحميل إعداداتك...</p>
                </div>
            </div>
        );
    }

    // عرض رسالة خطأ إذا حدثت مشكلة في جلب البيانات
    if (error && !settingsData) {
        return (
            <div className={styles.settingsContainer}>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }

    // إذا لم يتم العثور على بيانات المستخدم بعد التحميل
    if (!settingsData) {
        return (
            <div className={styles.settingsContainer}>
                <div className={styles.noData}>لا يمكن العثور على بيانات الإعدادات.</div>
            </div>
        );
    }

    return (
        <div className={styles.settingsContainer}>
            <h1 className={styles.settingsTitle}>كلمة المرور والإعدادات</h1>
            <p className={styles.settingsDescription}>
                قم بإدارة كلمة المرور الخاصة بك وتفضيلات الإشعارات.
            </p>

            {/* رسائل النجاح أو الخطأ العامة */}
            {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* قسم تغيير كلمة المرور */}
            <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>تغيير كلمة المرور</h2>
                <form onSubmit={handleChangePassword} className={styles.settingsForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="currentPassword">كلمة المرور الحالية</label>
                        <input
                            type="password"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword">كلمة المرور الجديدة</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="confirmNewPassword">تأكيد كلمة المرور الجديدة</label>
                        <input
                            type="password"
                            id="confirmNewPassword"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" className={styles.saveButton} disabled={isChangingPassword}>
                            {isChangingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                        </button>
                    </div>
                </form>
            </div>

            {/* قسم تفضيلات الإشعارات */}
            <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>تفضيلات الإشعارات</h2>
                <form onSubmit={handleSaveNotifications} className={styles.settingsForm}>
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="emailNotifications"
                            checked={settingsData.emailNotifications}
                            onChange={(e) => setSettingsData(prevData => prevData ? { ...prevData, emailNotifications: e.target.checked } : null)}
                            className={styles.checkboxInput}
                        />
                        <label htmlFor="emailNotifications" className={styles.checkboxLabel}>
                            تلقي إشعارات عبر البريد الإلكتروني
                        </label>
                    </div>
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="smsNotifications"
                            checked={settingsData.smsNotifications}
                            onChange={(e) => setSettingsData(prevData => prevData ? { ...prevData, smsNotifications: e.target.checked } : null)}
                            className={styles.checkboxInput}
                        />
                        <label htmlFor="smsNotifications" className={styles.checkboxLabel}>
                            تلقي إشعارات عبر الرسائل القصيرة (SMS)
                        </label>
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" className={styles.saveButton} disabled={isSavingNotifications}>
                            {isSavingNotifications ? 'جاري الحفظ...' : 'حفظ التفضيلات'}
                        </button>
                    </div>
                </form>
            </div>

            {/* يمكن إضافة أقسام أخرى مثل "حذف الحساب" هنا */}
        </div>
    );
};

export default DonorSettingsPage;
