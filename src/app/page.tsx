// src/app/page.tsx

'use client'; // <--- هذا السطر ضروري جداً لاستخدام React Hooks مثل useCart

import { useCart } from './context/CartContext'; // استيراد هوك سلة التبرعات
import Link from 'next/link'; // لاستخدام مكون Link للتنقل

// استيراد المكونات الأخرى للصفحة الرئيسية.
// تم إزالة لاحقات الملفات (.tsx) من عبارات الاستيراد لحل خطأ TypeScript.
import HeroSection from '../components/specific/HeroSection/HeroSection'; // تم إزالة .tsx
import AchievementsSection from '../components/specific/AchievementsSection/AchievementsSection'; // تم إزالة .tsx
import ProcessSection from '../components/specific/ProcessSection/ProcessSection'; // تم إزالة .tsx
// يمكنك إضافة المزيد من المكونات هنا مثل:
// import WhySanadSection from '../components/WhySanadSection';
// import AboutUsSection from '../components/AboutUsSection';
// import MostNeedyCasesSection from '../components/MostNeedyCasesSection';

const WORDPRESS_API_URL = 'https://cms.sanadedu.org/wp-json/wp/v2/posts';
// هذا هو المكون الافتراضي للصفحة الرئيسية (Home Page)
export default function Home() {
    // استدعاء useCart للحصول على وظيفة addItem و getTotalItems
    // هذا يجعل وظائف السلة متاحة داخل هذا المكون
    const { addItem, getTotalItems } = useCart();

    // دالة لإضافة عنصر تجريبي إلى السلة
    const addTestItem = () => {
        // تحديد الكمية الافتراضية
        const quantity = 1; 
        const unitPrice = 75000; // سعر تجريبي

        const testItem = {
            id: `test-item-${Date.now()}`, // معرف فريد مؤقت بناءً على الوقت
            institutionId: 'inst-test-001',
            institutionName: 'مؤسسة الاختبار التعليمية',
            needId: `need-${Math.random().toString(36).substring(7)}`, // معرف حاجة عشوائي
            itemName: `مستلزم تعليمي جديد #${getTotalItems() + 1}`, // اسم توضيحي للعنصر
            itemImage: '/images/placeholder.jpg', // تأكد أن هذه الصورة موجودة في مجلد public/images
            unitPrice: unitPrice, // سعر الوحدة
            quantity: quantity, // الكمية المطلوبة (تمت إضافتها لحل الخطأ)
            totalPrice: unitPrice * quantity, // السعر الإجمالي (تمت إضافته لحل الخطأ)
        };
        console.log("Attempting to add item to cart:", testItem); // رسالة للتحقق في Console
        addItem(testItem); // استدعاء وظيفة إضافة العنصر إلى السلة
        // تم استبدال alert() بـ console.log() وفقاً للتعليمات
        console.log(`تمت إضافة "${testItem.itemName}" إلى سلة التبرعات!`); 
    };

    return (
        <main>
            {/* تضمين أقسام الصفحة الرئيسية هنا */}
            <HeroSection />
            <AchievementsSection />
            <ProcessSection /> {/* 🚀 تم استخدام الاسم الصحيح للمكون هنا */}
            {/* ... أضف المزيد من أقسامك هنا ... */}

            {/* زر تجريبي لإضافة عنصر إلى السلة (لأغراض الاختبار) */}
            {/* يمكنك إزالة هذا الزر بعد الانتهاء من الاختبار */}
            {/* <button onClick={addTestItem} style={{ margin: '20px', padding: '10px', cursor: 'pointer' }}>
                أضف عنصر تجريبي إلى السلة (عدد العناصر: {getTotalItems()})
            </button> */}
        </main>
    );
}