import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { CaseItem, Need } from './types';

// دالة أساسية لجلب البيانات من WordPress REST API
export async function fetchWordPressData(endpoint: string, params: URLSearchParams | undefined = undefined): Promise<any> {
    const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;

    if (!WP_API_URL) {
        console.error("متغير البيئة NEXT_PUBLIC_WORDPRESS_API_URL غير معرف.");
        return null;
    }

    const url = new URL(`${WP_API_URL}/wp/v2/${endpoint}`);
    if (params) {
        url.search = params.toString();
    }

    try {
        const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
        if (!response.ok) {
            console.error(`واجهة برمجة تطبيقات ووردبريس (WordPress API) أرجعت خطأ لـ ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`فشل في جلب البيانات من نقطة النهاية (endpoint) ${endpoint}:`, error);
        return null;
    }
}

// تعريف هيكل بيانات مصطلح التصنيف المضمن (embedded term)
const embeddedTermSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    taxonomy: z.string(),
});

// schema لكائن الصورة من ACF
const acfImageObjectSchema = z.object({
    id: z.number().optional(),
    alt: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    sizes: z.record(z.string(), z.string().or(z.number()).nullable().optional()).optional(),
});

// Schema للمدارس بناءً على ملف الـ JSON
const schoolsSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.object({
        organization_name: z.string().optional(),
        location: z.any().optional(),
        education_level: z.string().optional(),
        description: z.string().optional(),
        need_level: z.string().optional(),
        director_name: z.string().optional(),
        phone_number: z.string().optional(),
        email: z.string().optional(),
        social_media_links: z.string().optional(),
        complex_manager_name: z.string().optional(),
        complex_phone: z.string().optional(),
        complex_email: z.string().optional(),
        number_of_students: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
        number_of_staff: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
        number_of_classrooms: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
        total_needed: z.union([z.coerce.number(), z.string().transform(() => NaN), z.literal('')]).optional().nullable(),
        total_donated: z.union([z.coerce.number(), z.string().transform(() => NaN), z.literal('')]).optional().nullable(),
        project_status: z.string().optional(),
        selected_project_needs: z.union([
            z.array(z.object({
                ID: z.number(),
                post_title: z.string(),
            })),
            z.null()
        ]).optional(),
        project_needs_quantities_text: z.string().optional(),
        gallery_images: z.union([
            z.array(acfImageObjectSchema),
            acfImageObjectSchema,
            z.boolean(),
            z.null()
        ]).optional(),
        documents: z.any().optional(),
    }).optional().nullable(),
    _embedded: z.object({
        'wp:featuredmedia': z.array(z.object({ source_url: z.string() })).optional(),
        'wp:term': z.array(z.array(embeddedTermSchema)).optional(),
    }).optional(),
});

// Schema للمساجد بناءً على ملف الـ JSON
const mosquesSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.object({
        mosque_name: z.string().optional(),
        location_data: z.any().optional(),
        number_of_floors: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
        number_of_worshippers: z.object({
            regular_days: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
            friday_prayer: z.union([z.coerce.number(), z.string().transform(() => NaN)]).optional().nullable(),
        }).optional().nullable(),
        mosque_area: z.string().optional(),
        supervisor_body: z.string().optional(),
        has_responsible_committee: z.boolean().optional(),
        responsible_committee_info: z.object({
            responsible_person_name: z.string().optional(),
            contact_phone: z.string().optional(),
            contact_email: z.string().optional(),
            social_media_links: z.union([
                z.array(z.object({ platform_name: z.string(), url: z.string() })),
                z.null()
            ]).optional(),
        }).optional(),
        total_needed: z.union([z.coerce.number(), z.string().transform(() => NaN), z.literal('')]).optional().nullable(),
        total_donated: z.union([z.coerce.number(), z.string().transform(() => NaN), z.literal('')]).optional().nullable(),
        project_status: z.string().optional(),
        selected_project_needs: z.union([
            z.array(z.object({
                ID: z.number(),
                post_title: z.string(),
            })),
            z.null()
        ]).optional(),
        project_needs_quantities_text: z.string().optional(),
        gallery_images: z.union([
            z.array(acfImageObjectSchema),
            acfImageObjectSchema,
            z.boolean(),
            z.null()
        ]).optional(),
        documents: z.any().optional(),
        description: z.string().optional(),
        need_level: z.string().optional(),
    }).optional().nullable(),
    _embedded: z.object({
        'wp:featuredmedia': z.array(z.object({ source_url: z.string() })).optional(),
        'wp:term': z.array(z.array(embeddedTermSchema)).optional(),
    }).optional(),
});

const needItemDetailSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.object({
        unit_price: z.union([z.string(), z.number(), z.null(), z.literal('')]).optional(),
        image: z.union([z.string(), acfImageObjectSchema, z.array(acfImageObjectSchema), z.boolean(), z.null()]).optional(),
        category: z.any().optional(),
    }).optional(),
    _embedded: z.object({
        'wp:term': z.array(z.array(embeddedTermSchema)).optional(),
    }).optional(),
});

const formatNeedItemDetailData = (needItem: z.infer<typeof needItemDetailSchema>): Need => {
    const acf = needItem.acf || {};
    const terms = needItem._embedded?.['wp:term']?.flat() || [];
    
    const needsCategoryTerms = terms.filter(term => term.taxonomy === 'school_needs_categories' || term.taxonomy === 'mosque_needs_categories');

    const category = needsCategoryTerms.length > 0 ? needsCategoryTerms[0].name : 'غير محدد';
    const icon = 'fas fa-box-open';
    const description = '';

    let imageUrl = '/images/default-need.jpg';
    if (typeof acf.image === 'object' && acf.image !== null && 'url' in acf.image) {
        imageUrl = acf.image.url;
    } else if (typeof acf.image === 'string' && acf.image) {
        imageUrl = acf.image;
    } else if (Array.isArray(acf.image) && acf.image.length > 0 && typeof acf.image[0] === 'object' && 'url' in acf.image[0]) {
        imageUrl = acf.image[0].url;
    }

    const unitPrice = Number(acf.unit_price) || 0;

    return {
        id: needItem.id,
        item: needItem.title?.rendered || 'بدون عنوان',
        unitPrice: unitPrice,
        description: description,
        image: imageUrl,
        category: category,
        icon: icon,
        quantity: 0,
        funded: 0,
    };
};

const formatSchoolData = async (caseItem: z.infer<typeof schoolsSchema>): Promise<CaseItem> => {
    const acf = caseItem.acf || {};

    const terms = caseItem._embedded?.['wp:term']?.flat() || [];
    const locationTerms = terms.filter(term => term.taxonomy === 'locations');

    const title = acf.organization_name || caseItem.title?.rendered || 'بدون عنوان';
    const type = acf.education_level || 'مدرسة';
    const governorate = locationTerms.length > 0 ? locationTerms[0].name : 'غير محدد';
    const city = locationTerms.length > 1 ? locationTerms[1].name : 'غير محدد';
    const description = acf.description || 'لا يوجد وصف.';

    const totalNeeded = Number(acf.total_needed) || 0;
    const totalDonated = Number(acf.total_donated) || 0;
    const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
    const isUrgent = acf.need_level === 'عالي';

    let caseImages: string[] = [];
    const featuredMediaUrl = caseItem._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    if (featuredMediaUrl) {
        caseImages.push(featuredMediaUrl);
    }
    const galleryImages = acf.gallery_images;
    if (Array.isArray(galleryImages) && galleryImages.length > 0) {
        galleryImages.forEach(img => {
            if (typeof img === 'object' && img !== null && 'url' in img) {
                caseImages.push(img.url);
            }
        });
    } else if (typeof galleryImages === 'object' && galleryImages !== null && 'url' in galleryImages && galleryImages.url) {
        caseImages.push(galleryImages.url);
    }
    if (caseImages.length === 0) {
        caseImages.push('/images/default.jpg');
    }

    const quantitiesMap = new Map<string, number>();
    if (acf.project_needs_quantities_text) {
        const pairs = acf.project_needs_quantities_text.split(',');
        pairs.forEach(pair => {
            // إضافة مرونة في التحليل
            const trimmedPair = pair.trim();
            const [needId, quantity] = trimmedPair.split('=').map(s => s.trim());
            if (needId && quantity && !isNaN(Number(quantity))) {
                quantitiesMap.set(String(needId), Number(quantity));
            }
        });
    }

    const needsList = await getSchoolNeedsList();
    const allNeedsMap = new Map(needsList.map(n => [String(n.id), n]));

    const selectedNeeds = acf.selected_project_needs;
    const needs = (Array.isArray(selectedNeeds) ? selectedNeeds : []).map((selectedNeed: any) => {
        const fullNeedData = allNeedsMap.get(String(selectedNeed.ID));
        const retrievedQuantity = quantitiesMap.get(String(selectedNeed.ID)) || 0;
        
        return {
            id: selectedNeed.ID,
            item: selectedNeed.post_title,
            unitPrice: fullNeedData?.unitPrice || 0,
            quantity: retrievedQuantity,
            funded: 0,
            description: fullNeedData?.description || '',
            image: fullNeedData?.image || '/images/default-need.jpg',
            category: fullNeedData?.category || 'غير محدد',
            icon: fullNeedData?.icon || 'fas fa-box-open',
        } as Need;
    });

    return {
        id: caseItem.id,
        title: title,
        description: description,
        governorate: governorate,
        city: city,
        type: type,
        needLevel: acf.need_level || 'غير محدد',
        isUrgent: isUrgent,
        needs: needs,
        fundNeeded: totalNeeded,
        fundRaised: totalDonated,
        progress: progress,
        images: caseImages,
    };
};

const formatMosqueData = async (caseItem: z.infer<typeof mosquesSchema>): Promise<CaseItem> => {
    const acf = caseItem.acf || {};

    const terms = caseItem._embedded?.['wp:term']?.flat() || [];
    const locationTerms = terms.filter(term => term.taxonomy === 'locations');

    const title = acf.mosque_name || caseItem.title?.rendered || 'بدون عنوان';
    const type = 'مسجد';
    const governorate = locationTerms.length > 0 ? locationTerms[0].name : 'غير محدد';
    const city = locationTerms.length > 1 ? locationTerms[1].name : 'غير محدد';
    const description = acf.description || 'لا يوجد وصف.';

    const totalNeeded = Number(acf.total_needed) || 0;
    const totalDonated = Number(acf.total_donated) || 0;
    const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
    const isUrgent = acf.need_level === 'عالي';

    let caseImages: string[] = [];
    const featuredMediaUrl = caseItem._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    if (featuredMediaUrl) {
        caseImages.push(featuredMediaUrl);
    }
    const galleryImages = acf.gallery_images;
    if (Array.isArray(galleryImages) && galleryImages.length > 0) {
        galleryImages.forEach(img => {
            if (typeof img === 'object' && img !== null && 'url' in img) {
                caseImages.push(img.url);
            }
        });
    } else if (typeof galleryImages === 'object' && galleryImages !== null && 'url' in galleryImages && galleryImages.url) {
        caseImages.push(galleryImages.url);
    }
    if (caseImages.length === 0) {
        caseImages.push('/images/default.jpg');
    }

    const quantitiesMap = new Map<string, number>();
    if (acf.project_needs_quantities_text) {
        const pairs = acf.project_needs_quantities_text.split(',');
        pairs.forEach(pair => {
            // إضافة مرونة في التحليل
            const trimmedPair = pair.trim();
            const [needId, quantity] = trimmedPair.split('=').map(s => s.trim());
            if (needId && quantity && !isNaN(Number(quantity))) {
                quantitiesMap.set(String(needId), Number(quantity));
            }
        });
    }

    const needsList = await getMosqueNeedsList();
    const allNeedsMap = new Map(needsList.map(n => [String(n.id), n]));

    const selectedNeeds = acf.selected_project_needs;
    const needs = (Array.isArray(selectedNeeds) ? selectedNeeds : []).map((selectedNeed: any) => {
        const fullNeedData = allNeedsMap.get(String(selectedNeed.ID));
        const retrievedQuantity = quantitiesMap.get(String(selectedNeed.ID)) || 0;
        
        return {
            id: selectedNeed.ID,
            item: selectedNeed.post_title,
            unitPrice: fullNeedData?.unitPrice || 0,
            quantity: retrievedQuantity,
            funded: 0,
            description: fullNeedData?.description || '',
            image: fullNeedData?.image || '/images/default-need.jpg',
            category: fullNeedData?.category || 'غير محدد',
            icon: fullNeedData?.icon || 'fas fa-box-open',
        } as Need;
    });

    return {
        id: caseItem.id,
        title: title,
        description: description,
        governorate: governorate,
        city: city,
        type: type,
        needLevel: acf.need_level || 'غير محدد',
        isUrgent: isUrgent,
        needs: needs,
        fundNeeded: totalNeeded,
        fundRaised: totalDonated,
        progress: progress,
        images: caseImages,
    };
};

export const getSchoolNeedsList = unstable_cache(
    async () => {
        const needs = await fetchWordPressData('school_needs', new URLSearchParams('_embed'));
        if (!needs) {
            return [];
        }
        const parsedNeeds = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
        if (!parsedNeeds.success) {
            console.error("فشل في التحقق من بيانات احتياجات المدارس:", parsedNeeds.error);
            return [];
        }
        const formattedNeeds = parsedNeeds.data.map(formatNeedItemDetailData);
        return formattedNeeds;
    },
    ['school-needs-list'],
    { revalidate: 3600 }
);

export const getMosqueNeedsList = unstable_cache(
    async () => {
        const needs = await fetchWordPressData('mosque_needs', new URLSearchParams('_embed'));
        if (!needs) {
            return [];
        }
        const parsedNeeds = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
        if (!parsedNeeds.success) {
            console.error("فشل في التحقق من بيانات احتياجات المساجد:", parsedNeeds.error);
            return [];
        }
        const formattedNeeds = parsedNeeds.data.map(formatNeedItemDetailData);
        return formattedNeeds;
    },
    ['mosque-needs-list'],
    { revalidate: 3600 }
);

// الدالة المُعدلة لـ getCaseById
export async function getCaseById(id: number): Promise<CaseItem | null> {
    let caseData = null;
    let postType = null;

    // 1. محاولة جلب بيانات من نقطة نهاية المدارس أولاً
    const schoolsData = await fetchWordPressData(`schools/${id}`, new URLSearchParams('_embed'));
    if (schoolsData && typeof schoolsData.id === 'number') {
        caseData = schoolsData;
        postType = 'schools';
    }

    // 2. إذا فشل الطلب الأول، جرب نقطة نهاية المساجد
    if (!caseData) {
        const mosquesData = await fetchWordPressData(`mosques/${id}`, new URLSearchParams('_embed'));
        if (mosquesData && typeof mosquesData.id === 'number') {
            caseData = mosquesData;
            postType = 'mosques';
        }
    }
    
    // 3. إذا لم يتم العثور على بيانات في أي من النقطتين، أرجع null
    if (!caseData) {
        console.error(`فشل في جلب بيانات الحالة لـ ID: ${id}`);
        return null;
    }

    // 4. معالجة البيانات التي تم جلبها بنجاح
    if (postType === 'schools') {
        const parsedCase = schoolsSchema.safeParse(caseData);
        if (!parsedCase.success) {
            console.error("فشل في التحقق من بيانات الحالة (مدارس):", parsedCase.error);
            return null;
        }
        return await formatSchoolData(parsedCase.data);
    } else if (postType === 'mosques') {
        const parsedCase = mosquesSchema.safeParse(caseData);
        if (!parsedCase.success) {
            console.error("فشل في التحقق من بيانات الحالة (مساجد):", parsedCase.error);
            return null;
        }
        return await formatMosqueData(parsedCase.data);
    }
    
    return null; // Fallback in case of unexpected logic
}

/**
 * دالة تجلب جميع حالات المدارس والمساجد وتدمجها في قائمة واحدة.
 */
export const getCases = unstable_cache(
    async (): Promise<CaseItem[]> => {
        const schoolsData = await fetchWordPressData('schools', new URLSearchParams('_embed'));
        const mosquesData = await fetchWordPressData('mosques', new URLSearchParams('_embed'));
        
        const allCases: CaseItem[] = [];

        if (schoolsData && Array.isArray(schoolsData)) {
            const parsedSchools = z.array(schoolsSchema).safeParse(schoolsData);
            if (parsedSchools.success) {
                const formattedSchools = await Promise.all(parsedSchools.data.map(formatSchoolData));
                allCases.push(...formattedSchools);
            } else {
                console.error("فشل في التحقق من بيانات المدارس:", parsedSchools.error);
            }
        }
        
        if (mosquesData && Array.isArray(mosquesData)) {
            const parsedMosques = z.array(mosquesSchema).safeParse(mosquesData);
            if (parsedMosques.success) {
                const formattedMosques = await Promise.all(parsedMosques.data.map(formatMosqueData));
                allCases.push(...formattedMosques);
            } else {
                console.error("فشل في التحقق من بيانات المساجد:", parsedMosques.error);
            }
        }

        return allCases;
    },
    ['all-cases'],
    { revalidate: 3600 }
);