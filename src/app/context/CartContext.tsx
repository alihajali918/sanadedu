// src/app/context/CartContext.tsx

'use client'; // تأكد من أن هذا المكون يعمل على جانب العميل

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// تعريف واجهة (Interface) لعنصر في السلة
export interface CartItem { // <--- تم إضافة export لتكون متاحة للاستخدام في ملفات أخرى
  id: string; // مثال: 'institution-1-need-abc'
  institutionId: string;
  institutionName: string;
  needId: string;
  itemName: string;
  itemImage: string; // يمكن أن يكون رابط URL أو كلاس Font Awesome
  unitPrice: number;
  quantity: number;
  totalPrice: number; // هذا الحقل مطلوب الآن عند الإضافة
}

// تعريف واجهة (Interface) لسياق السلة
interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
}

// إنشاء سياق السلة بقيم افتراضية
const CartContext = createContext<CartContextType | undefined>(undefined);

// مكون مزود سياق السلة (Cart Provider)
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // تحميل السلة من Local Storage عند تحميل المكون
  useEffect(() => {
    console.log("CartContext: Loading cart from localStorage...");
    const storedCart = localStorage.getItem('sanad_cart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCartItems(parsedCart);
        console.log("CartContext: Cart loaded successfully:", parsedCart);
      } catch (error) {
        console.error("CartContext: Error parsing stored cart from localStorage", error);
        setCartItems([]); // مسح السلة إذا كان هناك خطأ في التحليل
      }
    } else {
      console.log("CartContext: No cart found in localStorage.");
    }
  }, []);

  // حفظ السلة في Local Storage عند كل تغيير
  useEffect(() => {
    console.log("CartContext: cartItems changed, attempting to save to localStorage:", cartItems);
    if (cartItems.length > 0) {
      localStorage.setItem('sanad_cart', JSON.stringify(cartItems));
      console.log("CartContext: Cart saved to localStorage.");
    } else if (localStorage.getItem('sanad_cart')) {
      // إذا أصبحت السلة فارغة، قم بإزالة العنصر من Local Storage
      localStorage.removeItem('sanad_cart');
      console.log("CartContext: Cart is empty, removed from localStorage.");
    }
  }, [cartItems]);

  // إضافة عنصر إلى السلة أو تحديث كميته إذا كان موجودًا
  const addItem = (item: CartItem) => {
    console.log("CartContext: Attempting to add item:", item);
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === item.id);

      if (existingItemIndex > -1) {
        // العنصر موجود بالفعل، قم بتحديث الكمية والسعر الإجمالي
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        // ⭐ تم التعديل هنا: بدلاً من الإضافة، نقوم بتعيين الكمية الممررة مباشرةً
        const newQuantity = item.quantity; 
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: newQuantity * existingItem.unitPrice,
        };
        console.log("CartContext: Item updated in cart:", updatedItems[existingItemIndex]);
        return updatedItems;
      } else {
        // العنصر جديد، أضفه إلى السلة
        console.log("CartContext: New item added to cart:", item);
        return [...prevItems, item];
      }
    });
  };

  // إزالة عنصر من السلة
  const removeItem = (id: string) => {
    console.log("CartContext: Attempting to remove item with ID:", id);
    setCartItems((prevItems) => {
      const filteredItems = prevItems.filter((item) => item.id !== id);
      console.log("CartContext: Items after removal:", filteredItems);
      return filteredItems;
    });
  };

  // تحديث كمية عنصر معين في السلة
  const updateItemQuantity = (id: string, quantity: number) => {
    console.log(`CartContext: Attempting to update item ID: ${id} to quantity: ${quantity}`);
    setCartItems((prevItems) => {
      const updatedItems = prevItems.map((item) =>
        item.id === id
          ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
          : item
      ).filter(item => item.quantity > 0); // إزالة العنصر إذا أصبحت الكمية 0
      console.log("CartContext: Items after quantity update:", updatedItems);
      return updatedItems;
    });
  };

  // مسح السلة بالكامل
  const clearCart = () => {
    console.log("CartContext: Attempting to clear cart.");
    setCartItems([]);
  };

  // حساب إجمالي عدد العناصر في السلة (ليس عدد الأنواع، بل مجموع الكميات)
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // حساب إجمالي المبلغ في السلة
  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// هوك مخصص لاستخدام سياق السلة
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
