// src/lib/types.ts

// تعريف الأنواع المحدثة لتعكس هيكل البيانات الجديد
export interface Need {
  id: number;
  item: string;
  quantity: number; // الكمية الكلية المطلوبة
  unitPrice: number; // سعر الوحدة
  funded: number; // الكمية التي تم تمويلها بالفعل
  description: string;
  image: string;
  category: string;
  icon: string;
}

// lib/types.ts
export interface CaseItem {
    id: number;
    title: string;
    governorate: string;
    city: string;
    type: string;
    needLevel: string;
    isUrgent: boolean;
    description: string;
    progress: number; // ADD THIS LINE
    fundNeeded: number;
    fundRaised: number;
    needs: any[]; // Or a more specific type
    images: string[];
}

export interface Need {
    id: number;
    // ... other properties
}