// src/components/CaseCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/app/cases/page.module.css';

interface CaseCardProps {
  caseData: {
    id: number;
    title: string;
    governorate: string;
    city: string;
    description: string;
    image: string;
    progress: number;
    fundNeeded: number;
    fundRaised: number;
    isUrgent: boolean;
  };
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData }) => {
  return (
    <div key={caseData.id} className={`${styles.caseCard} ${caseData.isUrgent ? styles.urgentCase : ''}`.trim()}>
      <div className={styles.caseImageWrapper}>
        <Image src={caseData.image} alt={caseData.title} fill objectFit="cover" className={styles.caseImage} />
      </div>
      <div className={styles.caseContent}>
        <h3 className={styles.caseTitle}>{caseData.title}</h3>
        <p className={styles.caseGovernorate}><i className="fas fa-map-marker-alt"></i> {caseData.governorate}</p>
        
        <div className={styles.caseProgressBarWrapper}>
          <div className={styles.caseProgressBar} style={{ width: `${caseData.progress}%` }}></div>
        </div>
        <div className={styles.caseStats}>
          <span>تم جمع: ${caseData.fundRaised.toLocaleString()}</span>
          <span>المتبقي: ${ (caseData.fundNeeded - caseData.fundRaised).toLocaleString() }</span>
          <span>% {caseData.progress}</span>
        </div>
        
        <Link href={`/cases/${caseData.id}`} className={`${styles.btn} ${styles.btnCtaPrimary} ${styles.caseCardBtn}`}>ادعم الآن</Link>
      </div>
    </div>
  );
};

export default CaseCard;