// FILE: src/app/components/common/LoadingPage/LoadingPage.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './LoadingPage.module.css';

const LoadingPage = () => {
  // ... كل منطقك يبقى كما هو ...
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const startFadeOut = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  useEffect(() => {
    // ... useEffect يبقى كما هو ...
    const MAX_LOAD_TIME = 1000;
    let loadEventFired = false;
    const handleLoad = () => {
      loadEventFired = true;
      startFadeOut();
    };
    const timerId = setTimeout(() => {
      if (!loadEventFired) {
        startFadeOut();
      }
    }, MAX_LOAD_TIME);
    window.addEventListener('load', handleLoad);
    return () => {
      window.removeEventListener('load', handleLoad);
      clearTimeout(timerId);
    };
  }, [startFadeOut]);


  if (!isLoading) {
    return null;
  }

  return (
    <div className={`${styles.loadingPage} ${isFadingOut ? styles.fadeOut : ''}`}>
      <Image
        src="/sanadlogo.svg"
        alt="Sanad Logo"
        width={120}
        height={93}
        priority={true}
        className={styles.loadingLogo} // الكلاس الآن يحتوي على كل الستايلات
      />
      <div className={styles.spinner}></div>
    </div>
  );
};

export default LoadingPage;