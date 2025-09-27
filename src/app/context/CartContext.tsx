"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface CartItem {
  id: string;                // مُعرّف السطر داخل السلة (فريد)
  institutionId: string;     // case_id (مدرسة/مسجد...)
  institutionName: string;   // اسم المؤسسة/الحالة (اختياري للعرض)
  needId?: string;           // مُعرّف الاحتياج إن وُجد
  itemName: string;          // اسم العنصر
  itemImage?: string;        // صورة للعرض
  unitPrice: number;         // سعر الوحدة (بالدولار)
  quantity: number;          // الكمية
  totalPrice: number;        // = unitPrice * quantity (بالدولار)
  acfFieldId: string;        // مفتاح ACF الذي سنزيد كميته
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number; // بالدولار
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (cartItems.length > 0) {
        localStorage.setItem("sanad_cart", JSON.stringify(cartItems));
      } else if (localStorage.getItem("sanad_cart")) {
        localStorage.removeItem("sanad_cart");
      }
    }
  }, [cartItems, isLoading]);

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

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        getTotalItems,
        getTotalAmount,
        isLoading,
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
