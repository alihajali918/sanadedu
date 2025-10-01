// CartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 🛑 الاستيراد الحاسم: لجلب حالة المستخدم من NextAuth
import { useSession } from 'next-auth/react'; 


export interface CartItem {
  id: string;
  institutionId: string;
  institutionName: string;
  needId?: string;
  itemName: string;
  itemImage?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  acfFieldId: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  isLoading: boolean;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);


export const CartProvider = ({ children }: { children: ReactNode }) => {
  
  // -------------------------------------------------------------------
  // 🛑 1. جلب حالة المستخدم من NextAuth
  // -------------------------------------------------------------------
  const { 
      data: session, 
      status: sessionStatus, 
  } = useSession(); 

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // -------------------------------------------------------------------
  // 2. تحديد قيم Context السلة النهائية بناءً على الجلسة
  // -------------------------------------------------------------------
  const isAuthReady = sessionStatus !== 'loading';
  
  const isLoggedIn = isAuthReady && sessionStatus === 'authenticated';
  
  // نستخرج البيانات من كائن session.user الذي قمت بتشكيله في route.ts
  const userName = isLoggedIn ? session?.user?.name || null : null;
  const userEmail = isLoggedIn ? session?.user?.email || null : null;
  
  // حالة التحميل النهائية (ننتظر تحميل الجلسة والسلة)
  const isLoading = sessionStatus === 'loading' || isLoadingCart;

  useEffect(() => {
    // 🛑 يتم تحميل السلة فقط بعد أن يصبح نظام المصادقة جاهزًا
    if (isAuthReady) {
        // تحميل بيانات السلة
        const storedCart = localStorage.getItem("sanad_cart");
        if (storedCart) {
            try {
                const parsedCart = JSON.parse(storedCart);
                setCartItems(parsedCart);
            } catch (error) {
                console.error("Error parsing stored cart:", error);
                setCartItems([]);
            }
        }
        setIsLoadingCart(false);
    }
  }, [isAuthReady]); 
  
  
  // ... (باقي دوال إدارة السلة والتخزين تبقى كما هي) ...

  const addItem = (item: CartItem) => {
    setCartItems((prevItems) => {
        const existingIndex = prevItems.findIndex((i) => i.id === item.id);
        if (existingIndex > -1) {
            const updated = [...prevItems];
            const existing = updated[existingIndex];
            const newQuantity = item.quantity;
            updated[existingIndex] = {
                ...existing,
                quantity: newQuantity,
                totalPrice: Number((newQuantity * existing.unitPrice).toFixed(2)),
                acfFieldId: item.acfFieldId,
            };
            return updated;
        } else {
            return [...prevItems, item];
        }
    });
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    setCartItems((prev) =>
        prev
            .map((item) =>
                item.id === id
                    ? {
                        ...item,
                        quantity,
                        totalPrice: Number((quantity * item.unitPrice).toFixed(2)),
                      }
                    : item
            )
            .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  const getTotalItems = () =>
    cartItems.reduce((total, item) => total + item.quantity, 0);

  const getTotalAmount = () =>
    cartItems.reduce((total, item) => total + item.totalPrice, 0);

  useEffect(() => {
    if (!isLoadingCart) {
      if (cartItems.length > 0) {
        localStorage.setItem("sanad_cart", JSON.stringify(cartItems));
      } else if (localStorage.getItem("sanad_cart")) {
        localStorage.removeItem("sanad_cart");
      }
    }
  }, [cartItems, isLoadingCart]);


  return (
    <CartContext.Provider
      value={{
        cartItems, addItem, removeItem, updateItemQuantity, clearCart,
        getTotalItems, getTotalAmount, isLoading,
        isLoggedIn, 
        userName, 
        userEmail,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
