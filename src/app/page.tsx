// src/app/page.tsx

'use client'; // <--- هذا السطر ضروري جداً لاستخدام React Hooks مثل useCart

import { useCart } from './context/CartContext'; // استيراد هوك سلة التبرعات
import Link from 'next/link'; // لاستخدام مكون Link للتنقل

// استيراد المكونات الأخرى للصفحة الرئيسية.
// تم إزالة لاحقات الملفات (.tsx) من عبارات الاستيراد لحل خطأ TypeScript.
import HeroSection from '../components/specific/HeroSection/HeroSection'; // تم إزالة .tsx
import AchievementsSection from '../components/specific/AchievementsSection/AchievementsSection'; // تم إزالة .tsx
import ProcessSection from '../components/specific/ProcessSection/ProcessSection'; // تم إزالة .tsx
// 🚀 تم تحديث هذا السطر لاستخدام متغير البيئة بدلاً من الرابط المباشر
// تأكد من أن متغير البيئة NEXT_PUBLIC_WORDPRESS_API_URL مضبوط بشكل صحيح في ملف .env
const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL
    ? `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/wp/v2/posts`
    : 'https://cms.sanadedu.org/wp-json/wp/v2/posts'; // رابط احتياطي في حال عدم تعيين المتغير

// هذا هو المكون الافتراضي للصفحة الرئيسية (Home Page)
export default function Home() {
    // استدعاء useCart للحصول على وظيفة addItem و getTotalItems
    // هذا يجعل وظائف السلة متاحة داخل هذا المكون
    const { addItem, getTotalItems } = useCart();
    return (
        <main>
            {/* تضمين أقسام الصفحة الرئيسية هنا */}
            <HeroSection />
            <AchievementsSection />
            <ProcessSection /> {/* 🚀 تم استخدام الاسم الصحيح للمكون هنا */}
        </main>
    );
}
