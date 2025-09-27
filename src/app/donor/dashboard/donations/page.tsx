"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link"; 

// صفحة التحميل
const LoadingPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="mt-4 text-gray-600">جاري التحميل...</p>
    </div>
  </div>
);

type DonationStatus = "قيد الانتظار" | "مكتمل" | "قيد التنفيذ" | "مسترد" | "ملغي";

interface Donation {
  id: string;
  caseId: string;
  caseName: string;
  amount: number;
  status: DonationStatus | string;
  date: string; // ISO
  currency: string;
}

const DonationsPage: React.FC = () => {
  const { status: authStatus } = useSession();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusClasses: Record<string, string> = {
    "قيد الانتظار": "bg-yellow-100 text-yellow-900", // 🌟 تم تعديل التباين
    "مكتمل": "bg-green-100 text-green-800",
    "قيد التنفيذ": "bg-blue-100 text-blue-800",
    "مسترد": "bg-red-100 text-red-800",
    "ملغي": "bg-red-100 text-red-800",
  };

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeZone: "Asia/Qatar",
      }),
    []
  );

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return Number.isNaN(+d) ? "—" : dateFmt.format(d);
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: currency || "QAR",
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency || "QAR"}`;
    }
  };

  useEffect(() => {
    if (authStatus === "loading") return;

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/donations", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          signal: ac.signal,
        });

        if (!res.ok) {
          let msg = "فشل جلب التبرعات.";
          try {
            const e = await res.json();
            msg = e.error || msg;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();
        if (data?.ok && Array.isArray(data.donations)) {
          setDonations(
            data.donations.map((d: any) => ({
              id: String(d.caseId ?? d.id),
              caseId: String(d.caseId ?? "غير معروف"),
              caseName: String(d.caseName ?? "—"),
              amount: Number(d.totalAmount ?? 0),
              status: String(d.status ?? "مكتمل"),
              date: String(d.date ?? new Date().toISOString()),
              currency: String(d.currency ?? "QAR"),
            })) as Donation[]
          );
        } else {
          setDonations([]);
          console.warn("API returned unexpected data:", data);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Failed to fetch donations:", e);
        setError(e?.message || "حدث خطأ أثناء تحميل التبرعات. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [authStatus]);

  if (loading || authStatus === "loading") return <LoadingPage />;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-2">تبرعاتي</h1>
          <p className="text-base sm:text-lg text-gray-500 text-center mb-8">
            هنا يمكنك مراجعة جميع التبرعات التي قمت بها سابقاً، وتتبع حالتها.
          </p>

          {error ? (
            <p className="text-center text-red-500 font-semibold text-lg">{error}</p>
          ) : donations.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-700 mb-4">
                لم تقم بأي تبرعات حتى الآن. ابدأ بتصفح الحالات لدعم قضايانا!
              </p>
              <Link
                href="/cases"
                className="inline-block py-2 px-6 rounded-full text-white font-bold bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                تصفح الحالات
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {donation.caseName || "تبرع لحالة مجهولة"}
                      </h3>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                          statusClasses[donation.status] ?? "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {donation.status}
                      </span>
                    </div>

                    <div className="border-t border-gray-200 pt-3 text-sm text-gray-700 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">التاريخ:</span>
                        <span>
                          {formatDate(donation.date)} {/* ✅ استخدام دالة formatDate */}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">المبلغ:</span>
                        <span className="text-lg font-extrabold text-blue-600">
                          {formatCurrency(donation.amount, donation.currency)}
                        </span>
                      </div>
                    </div>

                    {donation.caseId !== "غير معروف" && (
                      <div className="mt-4">
                        <Link
                          href={`/cases/${donation.caseId}`}
                          className="block text-center py-2 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                        >
                          عرض تفاصيل الحالة
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationsPage;