// ==========================================================
// FILE: src/components/specific/AchievementsSection.tsx
// DESCRIPTION: Features Section Component for Sanad Website.
// Displays key features (Mizatuna) with relevant icons.
// All previous counter logic has been removed.
// ==========================================================

"use client"; // Retained for consistency, though less necessary without hooks

import styles from './AchievementsSection.module.css'; // استيراد الـ CSS Module

// تعريف مصفوفة الميزات مع الأيقونات (كلاسات Font Awesome)
const features = [
  {
    icon: "fas fa-glasses", // اقتراح أيقونة للشفافية
    title: "شفافية كاملة",
    description: "يتم عرض احتياجات المدارس مع معلوماتها بالصور بالتفصيل والأسعار الرسمية المعتمدة."
  },
  {
    icon: "fas fa-check-circle", // اقتراح أيقونة للتوثيق
    title: "توثيق للمتبرعين",
    description: "كل متبرع مسجّل يتلقى إشعاراً عبر حسابه عند تسليم التبرع، وتُنشر التحديثات على وسائل التواصل الاجتماعي."
  },
  {
    icon: "fas fa-handshake", // اقتراح أيقونة للتنسيق الرسمي
    title: "تنسيق رسمي",
    description: "نعمل بالتعاون مع وزارات التربية، والأوقاف، والخارجية، ومع التنسيق الإنساني (HAC) لضمان الموثوقية القانونية."
  },
  {
    icon: "fas fa-rocket", // اقتراح أيقونة للسرعة
    title: "سرعة التنفيذ",
    description: "نوصل المنتجات بأسرع وقت ممكن فور توفّر الكمية الكافية للشحن."
  },
  {
    icon: "fas fa-bullseye", // اقتراح أيقونة للأثر المباشر
    title: "أثر ملموس و مباشر",
    description: "دعمكم يصل مباشرة إلى المؤسسة التي تم اختيارها ويمكنكم المتابعة المستمرة لمراحل الترميم والتجهيز."
  },
];

const AchievementsSection = () => {
  // تم حذف جميع الـ Hooks الخاصة بالـ Intersection Observer والـ useState

  return (
    // تم تغيير اسم الكلاس ليعكس المحتوى الجديد (أو يمكن إبقائه كما هو إذا كان الـ CSS عامًا)
    <section className={styles.achievementsSection}>
      <div className="container">
        <h2 className={styles.sectionTitle}>ميزاتنا التي تجعلنا خياركم الأول</h2>
        
        {/* تم استخدام نفس كلاس الشبكة (Grid) لكن لعرض الميزات بدلاً من الأرقام */}
        <div className={styles.achievementsGrid}> 
          {features.map((feature, index) => (
            <div className={styles.achievementItem} key={index}> 
              <div className={styles.achievementIcon}>
                {/* استخدام الأيقونة المحددة لكل ميزة */}
                <i className={feature.icon}></i>
              </div>
              
              {/* عنوان الميزة */}
              <h3 className={styles.featureTitle}>{feature.title}</h3> 
              
              {/* وصف الميزة */}
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;