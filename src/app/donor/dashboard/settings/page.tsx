// ==========================================================
// FILE: src/app/donor/dashboard/settings/page.tsx
// DESCRIPTION: Settings page component for the donor dashboard.
// Allows authenticated users to change password and manage notification preferences.
// ==========================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './settings.module.css';

// تعريف واجهة لبيانات الإعدادات (تفضيلات الإشعارات فقط)
interface UserSettingsData {
    emailNotifications: boolean;
    smsNotifications: boolean;
}

// 🚀 استخدام متغير البيئة لعنوان الـ API الأساسي
// تأكد من أن NEXT_PUBLIC_WORDPRESS_API_ROOT مضبوط في ملف .env أو .env.local
const WORDPRESS_API_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT || 'https://cms.sanadedu.org/wp-json';

/**
 * دالة مساعدة لاستخراج رسالة خطأ واضحة من استجابة API.
 * تعالج أخطاء REST API الشائعة (مثل 400 Bad Request وأخطاء التحقق).
 */
const extractErrorMessage = (errorData: any): string => {
    if (errorData?.message) {
        return errorData.message;
    }
    if (errorData?.code === 'rest_no_route') {
        return 'خطأ في نقطة النهاية: لا يمكن العثور على مسار API. تحقق من إعدادات الخادم.';
    }
    if (errorData?.data?.status === 403) {
        return 'غير مصرح لك: يرجى تسجيل الدخول مرة أخرى.';
    }
    // معالجة أخطاء التحقق من صحة البيانات في WordPress
    if (errorData?.data?.params && Object.keys(errorData.data.params).length > 0) {
        const fieldErrors = Object.entries(errorData.data.params)
            .map(([key, value]) => `[${key}]: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(' | ');
        return `فشل التحقق: ${fieldErrors}`;
    }
    return 'حدث خطأ غير معروف أثناء الاتصال بالخادم.';
};


const DonorSettingsPage: React.FC = () => {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [settingsData, setSettingsData] = useState<UserSettingsData | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isAuthenticated = status === "authenticated";
    const isLoadingAuth = status === "loading";

    // ✅ دالة لمسح رسائل الحالة بعد فترة زمنية
    const clearMessages = () => {
        setError('');
        setSuccessMessage('');
    };

    /**
     * دالة مساعدة للتحقق من المصادقة بعد فشل API.
     * إذا كان الخطأ يدل على مشكلة مصادقة (401/403)، فسيتم إجبار تسجيل الخروج.
     */
    const handleAuthError = (err: any) => {
        const errorMsg = err.message || 'حدث خطأ أثناء الاتصال بالخادم.';
        setError(errorMsg);
        console.error('API Error:', err);

        // إذا كان الخطأ يدل على انتهاء صلاحية الجلسة أو عدم المصادقة، قم بتسجيل الخروج.
        if (errorMsg.includes('لا يوجد توكن مصادقة') || errorMsg.includes('غير مصرح لك') || errorMsg.includes('403') || errorMsg.includes('401')) {
            // توجيه المستخدم لصفحة تسجيل الدخول
            signOut({ redirect: true, callbackUrl: '/auth/login' });
        }
    }


    // useEffect لجلب تفضيلات الإشعارات عند تحميل الصفحة
    useEffect(() => {
        // 1. التحقق من إعدادات API
        if (!WORDPRESS_API_BASE_URL || !WORDPRESS_API_BASE_URL.startsWith('http')) {
            setError('خطأ في إعدادات البيئة: NEXT_PUBLIC_WORDPRESS_API_ROOT غير محدد أو غير صحيح.');
            setIsLoading(false);
            return;
        }

        // 2. التحقق من المصادقة والتوجيه
        if (!isLoadingAuth && !isAuthenticated) {
            router.push('/auth/login');
            return;
        }

        // 3. جلب بيانات الإعدادات
        if (isAuthenticated && session?.user) {
            const fetchUserSettings = async () => {
                setIsLoading(true);
                clearMessages(); // مسح الرسائل القديمة قبل طلب جديد
                try {
                    const authToken = session.user.wordpressJwt;
                    if (!authToken) {
                        throw new Error('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
                    }

                    const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/full-profile`;

                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                    });

                    if (!response.ok) {
                        let errorData = {};
                        try { errorData = await response.json(); } catch { }
                        const extractedError = extractErrorMessage(errorData);
                        // رمي خطأ يتضمن رمز الحالة لكي تستطيع الدالة المساعدة handleAuthError التعرف عليه
                        throw new Error(extractedError || `فشل جلب بيانات الإعدادات. رمز الخطأ: ${response.status}`);
                    }

                    const data = await response.json();
                    setSettingsData({
                        emailNotifications: data.emailNotifications ?? false,
                        smsNotifications: data.smsNotifications ?? false,
                    });
                } catch (err: any) {
                    handleAuthError(err); // استخدام الدالة المساعدة الجديدة
                } finally {
                    setIsLoading(false);
                }
            };

            fetchUserSettings();
        }
    }, [isAuthenticated, isLoadingAuth, session, router]);

    // دالة لتغيير كلمة المرور
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChangingPassword(true);
        clearMessages(); // مسح الرسائل القديمة عند بدء العملية

        if (newPassword !== confirmNewPassword) {
            setError('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
            setIsChangingPassword(false);
            setTimeout(clearMessages, 5000); // إخفاء الخطأ بعد 5 ثوانٍ
            return;
        }
        if (!currentPassword || !newPassword) {
            setError('يرجى ملء جميع حقول كلمة المرور.');
            setIsChangingPassword(false);
            setTimeout(clearMessages, 5000); // إخفاء الخطأ بعد 5 ثوانٍ
            return;
        }

        try {
            const authToken = session?.user?.wordpressJwt;
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
                let errorData = {};
                try { errorData = await response.json(); } catch { }
                const extractedError = extractErrorMessage(errorData);
                // رمي خطأ يتضمن رمز الحالة لكي تستطيع الدالة المساعدة handleAuthError التعرف عليه
                throw new Error(extractedError || `فشل تغيير كلمة المرور. رمز الخطأ: ${response.status}`);
            }

            setSuccessMessage('تم تغيير كلمة المرور بنجاح!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

            setTimeout(clearMessages, 5000); // إخفاء رسالة النجاح بعد 5 ثوانٍ
        } catch (err: any) {
            handleAuthError(err); // استخدام الدالة المساعدة الجديدة
            setTimeout(clearMessages, 5000); // إخفاء رسالة الخطأ بعد 5 ثوانٍ
        } finally {
            setIsChangingPassword(false);
        }
    };

    // دالة لحفظ تفضيلات الإشعارات
    const handleSaveNotifications = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingNotifications(true);
        clearMessages(); // مسح الرسائل القديمة عند بدء العملية

        if (!settingsData) return;

        try {
            const authToken = session?.user?.wordpressJwt;
            if (!authToken) {
                throw new Error('لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.');
            }

            // 🚀 تم تحديث نقطة API لتحديث الملف الشخصي
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
                let errorData = {};
                try { errorData = await response.json(); } catch { }
                const extractedError = extractErrorMessage(errorData);
                // رمي خطأ يتضمن رمز الحالة لكي تستطيع الدالة المساعدة handleAuthError التعرف عليه
                throw new Error(extractedError || `فشل حفظ تفضيلات الإشعارات. رمز الخطأ: ${response.status}`);
            }

            setSuccessMessage('تم حفظ تفضيلات الإشعارات بنجاح!');
            setTimeout(clearMessages, 5000); // إخفاء رسالة النجاح بعد 5 ثوانٍ
        } catch (err: any) {
            handleAuthError(err); // استخدام الدالة المساعدة الجديدة
            setTimeout(clearMessages, 5000); // إخفاء رسالة الخطأ بعد 5 ثوانٍ
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
            {/* الرسائل ستختفي الآن بعد 5 ثوانٍ */}
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
        </div>
    );
};

export default DonorSettingsPage;
