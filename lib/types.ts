// src/lib/types.ts
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
};

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