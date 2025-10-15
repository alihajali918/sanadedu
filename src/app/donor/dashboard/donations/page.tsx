// File: src/app/donations/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type DonationStatus = "قيد الانتظار" | "مكتمل" | "قيد التنفيذ" | "مسترد" | "ملغي";

interface Donation {
  id: string;
  caseId: string;
  caseName: string;
  amount: number;
  status: DonationStatus | string;
  date: string;
  currency: string;
}

// ====== تطبيع الحالة ======
const normalizeStatus = (s: string): DonationStatus | string => {
  const map: Record<string, DonationStatus> = {
    completed: "مكتمل",
    pending: "قيد الانتظار",
    processing: "قيد التنفيذ",
    cancelled: "ملغي",
    failed: "ملغي",
    refunded: "مسترد",
  };
  return map[s?.toLowerCase()?.trim()] || s || "مكتمل";
};

// ====== ألوان الشارات ======
const statusColors: Record<string, string> = {
  مكتمل: "bg-green-100 text-green-700 border-green-200",
  "قيد الانتظار": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "قيد التنفيذ": "bg-blue-50 text-blue-700 border-blue-200",
  مسترد: "bg-red-50 text-red-700 border-red-200",
  ملغي: "bg-gray-100 text-gray-600 border-gray-200",
};

// ====== صفحة التبرعات ======
const DonationsPage: React.FC = () => {
  const { status: authStatus } = useSession();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // تنسيق التاريخ هجري
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        dateStyle: "long",
        timeZone: "Asia/Qatar",
      }),
    []
  );
  const formatDate = (date: string) => `${dateFmt.format(new Date(date))} هـ`;

  // تنسيق العملة
  const formatCurrency = (amount: number, currency: string = "QAR") =>
    new Intl.NumberFormat("ar-QA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/donations", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.donations)) {
        setDonations(
          data.donations
            .map((d: Donation) => ({
              ...d,
              status: normalizeStatus(d.status),
              caseName: d.caseName?.trim() || "تبرع عام",
            }))
            .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        );
      }
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-600 font-bold">
        جاري تحميل بياناتك...
      </div>
    );

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf9f6] py-10 px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-4xl font-black text-center text-gray-900 mb-2"
          style={{ fontFamily: "var(--font-changa)" }}
        >
          سجل تبرعاتي
        </h1>
        <p className="text-center text-gray-600 mb-10">
          يمكنك هنا متابعة جميع تبرعاتك السابقة بشكل منظم وأنيق.
        </p>

        {/* الشبكة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {donations.map((d) => (
            <div
              key={d.id}
              className="bg-white border-2 border-[rgba(196,155,90,0.3)] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between"
            >
              {/* رأس البطاقة */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className="text-xl font-extrabold text-gray-900 leading-tight"
                    style={{ fontFamily: "var(--font-changa)" }}
                  >
                    {d.caseName}
                  </h3>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[d.status]}`}
                  >
                    {d.status}
                  </span>
                </div>

                <div className="space-y-2 text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      className="opacity-60"
                    >
                      <path
                        fill="currentColor"
                        d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v3H3V5a1 1 0 0 1 1-1h3V2zm14 8H3v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V10z"
                      />
                    </svg>
                    <span>
                      <span className="font-semibold">التاريخ:</span>{" "}
                      {formatDate(d.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      className="opacity-60"
                    >
                      <path
                        fill="currentColor"
                        d="M12 1a1 1 0 0 1 1 1v1.06A6.5 6.5 0 0 1 18.5 9H17a1 1 0 1 1 0-2h1.5A4.5 4.5 0 0 0 14 4.1V6a1 1 0 0 1-2 0V4.1A4.5 4.5 0 0 0 5.5 7H7a1 1 0 1 1 0 2H5.5A6.5 6.5 0 0 1 11 3.06V2a1 1 0 0 1 1-1Zm-7 12h14a2 2 0 1 1 0 4H5a2 2 0 1 1 0-4Z"
                      />
                    </svg>
                    <span>
                      <span className="font-semibold">المبلغ:</span>{" "}
                      <span className="font-extrabold text-[var(--primary-green,#1e7a57)]">
                        {formatCurrency(d.amount, d.currency)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ذيل البطاقة */}
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-between">
                <Link
                  href={`/cases/${d.caseId}`}
                  className="text-sm font-bold text-[var(--highlight-gold,#C49B5A)] hover:underline text-center sm:text-right"
                >
                  عرض تفاصيل الحالة
                </Link>
                <Link
                  href={`/cases/${d.caseId}#donate`}
                  className="bg-[var(--primary-green,#1e7a57)] text-white text-sm font-extrabold px-4 py-2 rounded-xl text-center hover:brightness-110 transition"
                >
                  تبرّع مرة أخرى
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DonationsPage;
