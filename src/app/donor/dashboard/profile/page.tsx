// ==========================================================
// FILE: src/app/donor/dashboard/profile/page.tsx
// DESCRIPTION: Donor profile page component.
// Fetches and displays authenticated user's full profile data from backend.
// FIX: Improved error handling to safely parse non-JSON API error responses.
// ==========================================================
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "@/app/context/LocaleContext";
import styles from "./profile.module.css";

// تعريف واجهة لبيانات الملف الشخصي الكاملة للمستخدم
interface UserProfileData {
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  joinDate: string;
  lastLogin?: string;
  totalDonationsCount: number;
  totalDonationsAmount: number;
}

// 🚀 استخدام متغير البيئة لعنوان الـ API الأساسي
const WORDPRESS_API_BASE_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_API_ROOT ||
  "https://cms.sanadedu.org/wp-json";

const DonorProfilePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  // تأكد من توفر دالة formatCurrency في LocaleContext
  const { formatCurrency } = useLocale();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isAuthenticated = status === "authenticated";
  const isLoadingAuth = status === "loading";

  // دالة مساعدة لتحليل رسالة الخطأ من استجابة غير ناجحة
  const parseErrorResponse = async (response: Response) => {
    try {
      // نحاول قراءة الاستجابة كـ JSON
      const errorData = await response.json();
      return (
        errorData.message || errorData.error || `خطأ HTTP: ${response.status}`
      );
    } catch {
      // إذا فشل تحليل JSON، نقرأها كنص خام (قد تكون HTML أو نص بسيط)
      const errorText = await response.text();
      // نأخذ جزء صغير من النص لطباعته، أو نعتمد على كود الحالة
      const preview =
        errorText.length > 100
          ? errorText.substring(0, 100) + "..."
          : errorText;
      console.error("API Non-JSON Error Body Preview:", preview);

      if (response.status === 401 || response.status === 403) {
        return "غير مصرح به. قد يكون التوكن منتهي الصلاحية. يرجى تسجيل الدخول مجدداً.";
      }
      if (response.status === 500) {
        return "خطأ خادم داخلي (500). يرجى مراجعة سجلات الـ Backend.";
      }

      return `فشل جلب البيانات (Status: ${response.status}).`;
    }
  };

  // useEffect لجلب بيانات الملف الشخصي الكاملة
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (isAuthenticated && session?.user) {
      const fetchUserProfile = async () => {
        setIsLoading(true);
        setError("");
        try {
          // نستخدم الـ 'any' هنا لأن حقول NextAuth المخصصة ليست معرفة في الواجهة القياسية
          const authToken = (session.user as any).wordpressJwt;
          if (!authToken) {
            // استخدام signOut بدلاً من رمي خطأ غير معالج
            signOut({ redirect: true, callbackUrl: "/auth/login" });
            return;
          }

          const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/full-profile`;

          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            // إضافة cache: 'no-store' لضمان عدم استخدام بيانات قديمة
            cache: "no-store",
          });


          if (!response.ok) {
            // 🚀 استخدام الدالة الآمنة لتحليل الخطأ
            const errorMessage = await parseErrorResponse(response);
            throw new Error(errorMessage);
          }

          const data: UserProfileData = await response.json();

          // منطق تحويل التاريخ (يبقى كما هو)
          if (
            data.joinDate &&
            typeof data.joinDate === "string" &&
            data.joinDate.length === 8
          ) {
            const year = data.joinDate.substring(0, 4);
            const month = data.joinDate.substring(4, 6);
            const day = data.joinDate.substring(6, 8);
            data.joinDate = `${year}-${month}-${day}`;
          }
          if (
            data.lastLogin &&
            typeof data.lastLogin === "string" &&
            data.lastLogin.length >= 14
          ) {
            const year = data.lastLogin.substring(0, 4);
            const month = data.lastLogin.substring(4, 6);
            const day = data.lastLogin.substring(6, 8);
            const hour = data.lastLogin.substring(8, 10);
            const minute = data.lastLogin.substring(10, 12);
            data.lastLogin = `${year}-${month}-${day} ${hour}:${minute}`;
          }

          setProfileData(data);
        } catch (err: any) {
          setError(err.message || "حدث خطأ أثناء جلب بيانات الملف الشخصي.");
          console.error("Error fetching user profile:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [isAuthenticated, isLoadingAuth, session, router]);

  // دالة لتحديث قيم حقول النموذج عند التعديل (تبقى كما هي)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prevData) =>
      prevData ? { ...prevData, [name]: value } : null
    );
  };

  // دالة لحفظ التعديلات وإرسالها إلى الـ Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    if (!profileData) return;

    try {
      const authToken = (session?.user as any)?.wordpressJwt;
      if (!authToken) {
        throw new Error("لا يوجد توكن مصادقة في الجلسة. يرجى تسجيل الدخول.");
      }

      const apiUrl = `${WORDPRESS_API_BASE_URL}/sanad/v1/user/update-profile`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fullName: profileData.fullName,
          phoneNumber: profileData.phoneNumber,
          address: profileData.address,
        }),
      });

      if (!response.ok) {
        // 🚀 استخدام الدالة الآمنة لتحليل الخطأ هنا أيضاً
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      setSuccessMessage("تم حفظ التغييرات بنجاح!");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ التغييرات.");
      console.error("Error saving profile:", err);
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
  if (error && !profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.errorMessage}>
          {error}
          {/* إضافة خيار لتسجيل الخروج لإعادة تعيين الجلسة في حالة الخطأ */}
          <button
            onClick={() =>
              signOut({ redirect: true, callbackUrl: "/auth/login" })
            }
            className={styles.logoutButton}
          >
            تسجيل الخروج وإعادة الدخول
          </button>
        </div>
      </div>
    );
  }

  // إذا لم يتم العثور على بيانات المستخدم بعد التحميل
  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.noData}>
          لا يمكن العثور على بيانات الملف الشخصي.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.profileTitle}>ملفي الشخصي</h1>
      <p className={styles.profileDescription}>
        يمكنك هنا عرض وتعديل معلومات حسابك.
      </p>

      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}
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
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phoneNumber">رقم الهاتف:</label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={profileData.phoneNumber || ""}
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
                value={profileData.address || ""}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={styles.cancelButton}
                disabled={isSaving}
              >
                إلغاء
              </button>
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
              <span>{profileData.phoneNumber || "غير متوفر"}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>العنوان:</strong>
              <span>{profileData.address || "غير متوفر"}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>تاريخ الانضمام:</strong>
              <span>
                {profileData.joinDate
                  ? new Date(profileData.joinDate).toLocaleDateString("ar-SY")
                  : "غير متوفر"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <strong>إجمالي التبرعات (عدد):</strong>
              <span>{profileData.totalDonationsCount}</span>
            </div>
            <div className={styles.detailItem}>
              <strong>إجمالي التبرعات (مبلغ):</strong>
              <span>{formatCurrency(profileData.totalDonationsAmount)}</span>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className={styles.editButton}
            >
              تعديل الملف الشخصي
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorProfilePage;
