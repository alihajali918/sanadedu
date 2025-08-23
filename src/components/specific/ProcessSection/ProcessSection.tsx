// ==========================================================
// FILE: src/components/specific/ProcessSection.jsx
// DESCRIPTION: Displays a single, centered step with a fade transition.
// ==========================================================

"use client";

import React from 'react';
import styles from './ProcessSection.module.css';

// ✅ 1. Import EffectFade for the new transition
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';

// Import Swiper's core styles, including the new effect
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade'; // ✅ Import fade effect styles

// The data for the steps remains the same
const processSteps = [
    { stepNum: "01", title: "اختيار المحافظة", description: "ستختار المحافظة التي ترغب بدعمها من داخل الموقع..." },
    { stepNum: "02", title: "تصفح المدارس", description: "سيظهر لك قائمة بالمدارس التي تمت زيارتها وتوثيق احتياجاتها..." },
    { stepNum: "03", title: "اختيار الاحتياج", description: "يمكنك اختيار منتج معين (مثال: طاولة - سبورة) أو تبني احتياجات مؤسسة..." },
    { stepNum: "04", title: "إتمام التبرع", description: "تقوم بإتمام التبرع الكترونياً عبر وسائل دفع آمنة وشفافة..." },
    { stepNum: "05", title: "تنفيذ الشراء محلياً", description: "فريق 'سند' يتولى شراء المنتج المطلوب بنفس السعر الموضح..." },
    { stepNum: "06", title: "توصيل المنتج", description: "يتم إيصال المنتج إلى المؤسسة المستفيدة خلال فترة قصيرة..." },
    { stepNum: "07", title: "توثيق التركيب أو الاستخدام", description: " تصوير المنتج أو استخدامه في المدرسة (مثل السبورة، تركيب الأبواب، توزيع الطاولات...)." },
    { stepNum: "08", title: "إشعار المتبرع", description: "نرسل للمتبرع إشعاراً أو رسالة مفصلة بـ 'تم تنفيذ تبرعك - إليك صورة النتيجة'." },
];

const ProcessSection = () => {
    return (
        <section className={styles.processSection} aria-labelledby="process-heading">
            <div className={styles.container}>
                <h2 id="process-heading" className={styles.sectionHeading}>كيف يعمل مشروع سند ؟</h2>
                <p className={styles.sectionDescription}>شفافية كاملة، من تبرعك حتى وصول المساعدة.</p>

                {/* ✅ 2. Updated Swiper settings for the fade effect */}
                <Swiper
                    dir="rtl"
                    modules={[Navigation, Pagination, EffectFade]}
                    effect={'fade'} // Use the fade effect
                    slidesPerView={1} // Show only one slide
                    spaceBetween={30}
                    loop={true}
                    navigation
                    pagination={{ clickable: true }}
                    className="processFadeSwiper" // New class name for clarity
                >
                    {processSteps.map((step, index) => (
                        <SwiperSlide key={index}>
                            <div className={styles.stepCard}>
                                <div className={styles.stepNumber}>{step.stepNum}</div>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepDescription}>{step.description}</p>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
};

export default React.memo(ProcessSection);