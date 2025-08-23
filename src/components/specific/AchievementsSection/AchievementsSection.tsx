// ==========================================================
// FILE: src/components/specific/AchievementsSection.tsx
// DESCRIPTION: Achievements Section Component for Sanad Website.
// Displays key statistics with animated counters using Intersection Observer.
// ==========================================================

"use client"; // Marks this component as a Client Component, necessary for useState, useEffect, and useRef.

import { useState, useEffect, useRef } from 'react'; // useRef for DOM element reference
import styles from './AchievementsSection.module.css'; // استيراد الـ CSS Module الجديد

const AchievementsSection = () => {
  // تحديد نوع الـ ref بشكل صريح لـ TypeScript
  const achievementsRef = useRef<HTMLElement | null>(null); // Reference to the section DOM element for Intersection Observer
  const [countersAnimated, setCountersAnimated] = useState(false); // State to prevent counters from animating multiple times

  // دالة لمسح أي مؤقتات سابقة قبل بدء مؤقت جديد
  // هذا يساعد في منع التحذيرات المتعلقة بـ window.mapResizeTimer إذا كان موجوداً
  const clearExistingTimer = () => {
    // التأكد من أن window موجود (لبيئة المتصفح) وأن mapResizeTimer معرف
    if (typeof window !== 'undefined' && (window as any).mapResizeTimer) {
      clearTimeout((window as any).mapResizeTimer);
      (window as any).mapResizeTimer = undefined; // تعيينه إلى undefined بعد المسح
    }
  };

  // useEffect hook to set up Intersection Observer
  // This observer detects when the Achievements Section enters the viewport.
  useEffect(() => {
    // التقاط قيمة الـ ref الحالية في متغير محلي
    const currentAchievementsRef = achievementsRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the section is intersecting (visible) and counters haven't been animated yet
          if (entry.isIntersecting && !countersAnimated) {
            startCounters(); // Call the function to start the counter animation
            setCountersAnimated(true); // Set state to true to prevent re-animation
            // يجب أن نوقف المراقبة فقط إذا كانت القيمة الحالية للـ ref لا تزال موجودة
            if (currentAchievementsRef) {
              observer.unobserve(currentAchievementsRef); // Stop observing after animation starts
            }
          }
        });
      },
      {
        root: null, // Observing relative to the viewport
        rootMargin: '0px', // No margin around the root
        threshold: 0.5, // Trigger when 50% of the target element is visible
      }
    );

    // If the ref is attached to a DOM element, start observing it
    if (currentAchievementsRef) { // استخدم المتغير المحلي
      observer.observe(currentAchievementsRef);
    }

    // Cleanup function: Unobserves the element when the component unmounts or before the effect re-runs
    return () => {
      if (currentAchievementsRef) { // استخدم المتغير المحلي في دالة التنظيف أيضاً
        observer.unobserve(currentAchievementsRef);
      }
      // لا تنسى مسح أي مؤقتات معلقة عند التنظيف إذا كانت موجودة
      clearExistingTimer();
    };
  }, [countersAnimated]); // Effect re-runs only if `countersAnimated` changes

  // Function to animate the numerical counters
  const startCounters = () => {
    // Select all elements with the class 'achievement-number'
    // تحديد نوع العنصر بشكل صريح كـ HTMLElement لحل خطأ 'dataset'
    document.querySelectorAll<HTMLElement>(`.${styles.achievementNumber}`).forEach((counter) => { // تم التغيير هنا
      // التأكد من وجود dataset.target قبل التحويل
      const target = counter.dataset.target ? +counter.dataset.target : 0; // Get the target number from the 'data-target' attribute
      const duration = 2000; // Duration of the animation in milliseconds (2 seconds)
      let start = 0; // Starting value of the counter
      let startTime: number | null = null; // To keep track of animation start time, تحديد نوع صريح لـ TypeScript

      // Animation frame function
      const animateCounter = (timestamp: number) => { // تحديد نوع صريح لـ timestamp
        if (!startTime) startTime = timestamp; // Set start time on the first frame
        const progress = (timestamp - startTime) / duration; // Calculate animation progress (0 to 1)
        const current = Math.min(progress * target, target); // Calculate current value, capping at target

        // تحويل الرقم إلى نص قبل تعيينه لـ textContent لحل خطأ 'number is not assignable to string'
        counter.textContent = Math.ceil(current).toString(); // Update the text content (round up to nearest integer)

        if (progress < 1) {
          requestAnimationFrame(animateCounter); // Request next animation frame if not finished
        } else {
          // تحويل الرقم إلى نص قبل تعيينه لـ textContent
          counter.textContent = target.toString(); // Set the final target value to ensure accuracy
        }
      };

      requestAnimationFrame(animateCounter); // Start the animation
    });
  };

  return (
    // Attach the ref to the section element for Intersection Observer
    <section className={styles.achievementsSection} ref={achievementsRef}> {/* تم التغيير هنا */}
      <div className="container"> {/* يبقى هذا كلاس عام إذا كان يستخدمه أكثر من مكون */}
        <h2 className={styles.sectionTitle}>أرقام تتحدث عن إنجازاتنا</h2> {/* تم التغيير هنا */}
        <div className={styles.achievementsGrid}> {/* تم التغيير هنا */}
          {/* Achievement Item 1: الحالات المكتملة */}
          <div className={styles.achievementItem}> {/* تم التغيير هنا */}
            <div className={styles.achievementIcon}> {/* تم التغيير هنا */}
              <i className="fas fa-clipboard-check"></i> {/* كلاس Font Awesome يبقى كما هو */}
            </div>
            {/* data-target attribute holds the final number for animation */}
            <div className={styles.achievementNumber} data-target="123">0</div> {/* تم التغيير هنا */}
            <p className={styles.achievementTitle}>الحالات المكتملة</p> {/* تم التغيير هنا */}
          </div>

          {/* Achievement Item 2: الطلاب المستفيدون */}
          <div className={styles.achievementItem}> {/* تم التغيير هنا */}
            <div className={styles.achievementIcon}> {/* تم التغيير هنا */}
              <i className="fas fa-user-graduate"></i>
            </div>
            <div className={styles.achievementNumber} data-target="124">0</div> {/* تم التغيير هنا */}
            <p className={styles.achievementTitle}>الطلاب المستفيدون</p> {/* تم التغيير هنا */}
          </div>

          {/* Achievement Item 3: المناطق التي تم العمل بها */}
          <div className={styles.achievementItem}> {/* تم التغيير هنا */}
            <div className={styles.achievementIcon}> {/* تم التغيير هنا */}
              <i className="fas fa-globe-africa"></i>
            </div>
            <div className={styles.achievementNumber} data-target="124">0</div> {/* تم التغيير هنا */}
            <p className={styles.achievementTitle}>المناطق التي تم العمل بها</p> {/* تم التغيير هنا */}
          </div>

          {/* Achievement Item 4: الحالات الموثقة (COMPLETE THIS ITEM) */}
          <div className={styles.achievementItem}> {/* تم التغيير هنا */}
            <div className={styles.achievementIcon}> {/* تم التغيير هنا */}
              <i className="fas fa-book"></i>
            </div>
            <div className={styles.achievementNumber} data-target="423">0</div> {/* تم التغيير هنا */}
            <p className={styles.achievementTitle}>الحالات الموثقة</p> {/* تم التغيير هنا */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;