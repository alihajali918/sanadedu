// ================================================
// File: src/lib/types.ts (الكود النهائي والمُعدَّل)
// ================================================

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

// 💡 تعريف هيكل كائن المرفق المتوقع من WordPress/ACF (Post Object)
export interface AttachmentObject {
    ID?: number;
    id?: number;
    title?: string;
    alt: string;
    url: string; // الرابط الذي يوفره ACF عند اختيار Return Format: Object
    guid: string; // رابط ووردبريس الدائم (احتياطي)
}

export interface CaseItem {
    id: number;
    title: string;
    description: string;
    governorate: string;
    city: string;
    // تم توسيع النوع ليشمل 'general' إن وجد
    type: 'school' | 'mosque' | 'general'; 
    needLevel: string;
    isUrgent: boolean;
    needs: Need[];
    fundNeeded: number;
    fundRaised: number;
    progress: number;
    images: string[];
    
    // ✅ [مُضاف/مُعدَّل] الحقل الذي يحمل كائنات المرفقات الكاملة
    gallery_images?: AttachmentObject[]; 
    
    // حقول خاصة بالمدارس
    numberOfStudents?: number;
    numberOfClassrooms?: number;
    educationLevel?: string;
    directorName?: string;
    phoneNumber?: string;
    email?: string;
    socialMediaLinks?: string; 
    complexManagerName?: string;
    complexPhone?: string;
    complexEmail?: string;
    numberOfStaff?: number; 
    projectStatus?: string; 
    
    // حقول مشتركة
    locationMap?: { lat: number; lng: number; address: string; }; 
    officialDocuments?: any; 

    // حقول خاصة بالمساجد
    regularWorshippers?: number; 
    fridayWorshippers?: number; 
    mosqueArea?: number;
}