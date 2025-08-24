// ==========================================================
// FILE: src/app/context/AuthContext.tsx
// DESCRIPTION: React Context for managing global authentication state.
// ==========================================================
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// تعريف الواجهة لـ AuthContext
interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; email: string; locale?: string } | null; // <--- تم إضافة locale هنا
  login: (token: string, userName: string, userEmail: string, userLocale?: string) => void; // <--- تم إضافة userLocale
  logout: () => void;
  isLoadingAuth: boolean; 
}

// إنشاء السياق بقيم افتراضية
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// تعريف Props لمزود السياق
interface AuthProviderProps {
  children: ReactNode;
}

// مكون مزود السياق
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; email: string; locale?: string } | null>(null); // <--- تم إضافة locale
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true); 

  // عند تحميل التطبيق، تحقق من وجود التوكن وبيانات المستخدم في localStorage
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
    const storedUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    const storedUserLocale = typeof window !== 'undefined' ? localStorage.getItem('userLocale') : null; // <--- جلب Locale

    if (token && storedUserName && storedUserEmail) {
      setIsAuthenticated(true);
      setUser({ name: storedUserName, email: storedUserEmail, locale: storedUserLocale || 'en-US' }); // <--- حفظ Locale
    }
    setIsLoadingAuth(false); 
  }, []);

  // دالة تسجيل الدخول
  const login = (token: string, userName: string, userEmail: string, userLocale?: string) => { // <--- إضافة userLocale
    localStorage.setItem('authToken', token);
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail); 
    if (userLocale) {
      localStorage.setItem('userLocale', userLocale); // <--- حفظ Locale في localStorage
    } else {
      localStorage.removeItem('userLocale'); // إذا لم يتم تمرير locale، قم بإزالته
    }
    setIsAuthenticated(true);
    setUser({ name: userName, email: userEmail, locale: userLocale }); // <--- حفظ Locale في حالة السياق
  };

  // دالة تسجيل الخروج
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail'); 
    localStorage.removeItem('userLocale'); // <--- مسح Locale أيضاً
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// هوك مخصص لاستخدام السياق بسهولة
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};