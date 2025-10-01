// src/lib/types.ts

export type Need = {
    id: number;
    item: string;
    unitPrice: number;
    quantity: number;
    funded: number;
    description: string;
    image: string;
    category: string;
    icon: string;
};

export type CaseItem = {
    id: number;
    title: string;
    description: string;
    governorate: string;
    city: string;
    type: 'school' | 'mosque' | 'general';
    needLevel: string;
    isUrgent: boolean;
    needs: Need[];
    fundNeeded: number;
    fundRaised: number;
    progress: number;
    images: string[];
    
    // 💡 حقول خاصة بالمدارس
    numberOfStudents?: number;
    numberOfClassrooms?: number;
    educationLevel?: string;

    // 💡 حقول خاصة بالمساجد (تم التعديل لاستخدام حقلين مفصلين)
    regularWorshippers?: number; // عدد المصلين في الأيام العادية (بديل لـ numberOfWorshippers)
    fridayWorshippers?: number;  // عدد المصلين يوم الجمعة (بديل لـ numberOfWorshippers)
    mosqueArea?: number;
};