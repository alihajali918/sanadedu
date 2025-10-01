// ==========================================================
// FILE: src/app/context/LocaleContext.tsx
// DESCRIPTION: React Context for managing global locale and currency formatting.
// ==========================================================
"use client"; // هذا السطر ضروري لأننا نستخدم React Hooks (مثل useState, useEffect)

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// تعريف واجهة لسياق اللغة/الأرقام
interface LocaleContextType {
  currentLocale: string; // مثال: 'ar-SY' للأرقام الهندية، 'en-US' للأرقام العربية الغربية // تم تحديث نوع setLocale ليقبل إما سلسلة نصية مباشرة أو دالة تحديث الحالة
  setLocale: React.Dispatch<React.SetStateAction<string>>; // <--- التعديل هنا
  toggleLocale: () => void; // وظيفة لتبديل اللغة/الأرقام
  formatCurrency: (amount: number) => string; // وظيفة مساعدة لتنسيق العملة
}

// إنشاء سياق اللغة/الأرقام بقيم افتراضية
const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// مكون مزود سياق اللغة/الأرقام (Locale Provider)
interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({
  children,
  initialLocale,
}) => {
  // الحالة الأولية: ستكون القيمة الأولية الممررة، أو 'en-US' كافتراضي
  const [currentLocale, setCurrentLocale] = useState<string>(
    initialLocale || "en-US"
  ); // تأثير لمزامنة currentLocale مع initialLocale إذا تغير الأخير

  useEffect(() => {
    if (initialLocale && initialLocale !== currentLocale) {
      setCurrentLocale(initialLocale);
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]); // وظيفة لضبط اللغة بشكل صريح // هذه الدالة ستستدعي setCurrentLocale مباشرة، والتي تستقبل أيضاً دالة تحديث الحالة

  const setLocale = (newLocale: string | ((prevState: string) => string)) => {
    // نستخدم instanceof Function للتحقق إذا كانت newLocale دالة
    if (typeof newLocale === "function") {
      setCurrentLocale(newLocale);
    } else {
      setCurrentLocale(newLocale);
    } // هنا، إذا كنت تريد حفظ تفضيل اللغة في الـ Backend: // يمكنك استدعاء API لإنقاذ تفضيل اللغة الجديد للمستخدم // مثلاً: updateUserLocaleOnBackend(newLocale);
  }; // وظيفة لتبديل اللغة/الأرقام (تستخدم setLocale الآن)
  const toggleLocale = () => {
    // لا يزال يتم استدعاء setLocale هنا بدالة تحديث
    setLocale((prevLocale) => (prevLocale === "en-US" ? "ar-SY" : "en-US"));
  }; // وظيفة مساعدة لتنسيق العملة بناءً على اللغة المختارة

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString(currentLocale, {
      style: "currency",
      currency: "USD",
    });
  };

  return (
    <LocaleContext.Provider
      value={{ currentLocale, setLocale, toggleLocale, formatCurrency }}
    >{children}
    </LocaleContext.Provider>
  );
};

// هوك مخصص لاستخدام سياق اللغة/الأرقام
export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
