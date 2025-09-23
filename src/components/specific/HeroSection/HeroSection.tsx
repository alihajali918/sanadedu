'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { StaticImageData } from 'next/image';

// استيراد مكونات ووحدات Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

// استيراد ملفات الأنماط الخاصة بـ Swiper
import 'swiper/css';
import 'swiper/css/effect-fade';

import styles from './HeroSection.module.css';

// استيراد الصور وتنظيمها في مصفوفة ليسهل استخدامها في السلايدر
import b1 from './1.jpg';
import skinChair from './2.jpg';
import whiteboard from './3.jpg';
import hiteboard from './4.jpg';

// تحديد نوع مصفوفة الصور
const sliderImages: { src: StaticImageData; alt: string }[] = [
    { src: b1, alt: 'مدرسة' },
    { src: skinChair, alt: 'كرسي' },
    { src: whiteboard, alt: 'سبورة' },
    { src: hiteboard, alt: 'سبورة' }
];

const HeroSection: React.FC = () => {
    return (
        <section className={styles.heroSection}>
            <div className={styles.gridContainer}>
                {/* المحتوى النصي */}
                <div className={styles.heroTextContent}>
                    <h1 className={styles.heroTitle}>
                        سند لدعم التعليم
                    </h1>
                    <p className={styles.heroDescription}>
نمنح أطفالنا فرصة جديدة للعلم، ونحوّل التبرع إلى مستقبل حيّ               بالأمل.
                    </p>
                    <div className={styles.buttonsContainer}>
                        <div className={styles.heroCtaButtons}>
                            {/* زر "ادعم مدرسة" - يبقى بالستايل الأساسي */}
                            <Link href="/cases?type=schools" className={`${styles.btnHeroCta} ${styles.btnPrimary}`}>
                                ادعم مدرسة
                            </Link>
                            {/* زر "ادعم مسجد" - الآن بنفس ستايل الزر الأساسي */}
                            <Link href="/cases?type=mosques" className={`${styles.btnHeroCta} ${styles.btnPrimary}`}>
                                ادعم مسجد
                            </Link>
                        </div>
                        {/* زر "ادعم جمعية سند" - الآن بنفس ستايل الزر الثانوي القديم */}
                        <Link href="/support-staff" className={`${styles.btnHeroCta} ${styles.btnSecondary} ${styles.btnFullSpan}`}>
                            ادعم جمعية سند لدعم التعليم
                        </Link>
                    </div>
                </div>

                {/* سلايدر الصور */}
                <div className={styles.heroSliderContainer}>
                    <Swiper
                        modules={[Autoplay, EffectFade]}
                        spaceBetween={0}
                        slidesPerView={1}
                        loop={true}
                        effect="fade"
                        autoplay={{
                            delay: 3000,
                            disableOnInteraction: false,
                        }}
                        className={styles.heroSwiper}
                    >
                        {sliderImages.map((image, index) => (
                            <SwiperSlide key={index}>
                                <Image 
                                    src={image.src} 
                                    alt={image.alt} 
                                    fill 
                                    style={{ objectFit: 'cover' }}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;