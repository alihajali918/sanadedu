// ================================================
// File: src/lib/api.ts (الكود النهائي والمُعدَّل)
// ================================================

import { unstable_cache } from 'next/cache';
import { z } from 'zod';
// 💡 نستخدم الأنواع كما هي معرفة في الكود السابق
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

export interface AttachmentObject {
    ID?: number;
    id?: number;
    title?: string;
    alt: string;
    url: string; 
    guid: string; 
}

export type NeedLevel = 'عالي' | 'متوسط' | 'منخفض' | 'قريباً' | string; 
export interface CaseItem {
    id: number;
    title: string;
    description: string;
    governorate: string;
    city: string;
    type: 'school' | 'mosque'; 
    needLevel: NeedLevel; 
    isUrgent: boolean;
    needs: Need[];
    fundNeeded: number;
    fundRaised: number;
    progress: number;
    images: string[];
    gallery_images?: AttachmentObject[]; 
    educationLevel?: string;
    numberOfStudents?: number;
    numberOfClassrooms?: number;
    directorName?: string;
    phoneNumber?: string;
    email?: string;
    socialMediaLinks?: string; 
    complexManagerName?: string;
    complexPhone?: string;
    complexEmail?: string;
    numberOfStaff?: number; 
    projectStatus?: string; 
    locationMap?: { lat: number; lng: number; address: string; }; 
    officialDocuments?: any; 
    regularWorshippers?: number;
    fridayWorshippers?: number;
    mosqueArea?: number;
}


/**
 * جلب بيانات من WordPress REST API
 */
export async function fetchWordPressData(
    endpoint: string,
    params?: URLSearchParams
): Promise<{ data: any; headers: Headers } | null> {
    const RAW = process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.trim();
    if (!RAW) {
        console.error('NEXT_PUBLIC_WORDPRESS_API_URL غير معرّف.');
        return null;
    }
    const hasWpJson = /\/wp-json\/?$/.test(RAW);
    const apiBase = hasWpJson ? RAW.replace(/\/+$/, '') : `${RAW.replace(/\/+$/, '')}/wp-json`;
    const baseV2 = `${apiBase}/wp/v2`;

    const isAbsolute = /^https?:\/\//i.test(endpoint);
    const finalUrlStr = isAbsolute
        ? endpoint
        : `${baseV2}/${endpoint.replace(/^\/+/, '')}${params ? `?${params.toString()}` : ''}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(finalUrlStr, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`[WP API ERROR] ${res.status} ${res.statusText} @ ${finalUrlStr}`);
        }

        return { data: await res.json(), headers: res.headers };
    } catch (err: any) {
        clearTimeout(timeout);
        console.error('[WP FETCH FAILED]', { url: finalUrlStr, name: err?.name, message: err?.message, code: err?.code });
        return null;
    }
}

/* ========================= Schemas ========================= */
const needItemDetailSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.any().optional(),
    _embedded: z.any().optional(),
});

const schoolsSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.any().optional().nullable(),
    _embedded: z.any().optional(),
});

const mosquesSchema = z.object({
    id: z.number(),
    title: z.object({ rendered: z.string() }).optional(),
    acf: z.any().optional().nullable(),
    _embedded: z.any().optional(),
});

/* =================== Helpers =================== */

function extractLocationNames(terms: any[]) {
    const locTerms = (terms || []).filter((t: any) => t?.taxonomy === 'locations');

    let governorate = 'غير محدد';
    let city = 'غير محدد';

    const governorateTerm = locTerms.find((t: any) => !t?.parent || t.parent === 0);
    const cityTerm = locTerms.find((t: any) => t?.parent && t.parent !== 0);

    if (governorateTerm) {
        governorate = governorateTerm.name;
    }

    if (cityTerm) {
        city = cityTerm.name;
    }

    if (locTerms.length === 2 && governorate === 'غير محدد' && city === 'غير محدد') {
        governorate = locTerms[0].name;
        city = locTerms[1].name;
    } else if (locTerms.length === 2 && governorate !== 'غير محدد' && city === 'غير محدد') {
        const otherTerm = locTerms.find((t: any) => t?.id !== governorateTerm?.id);
        if (otherTerm) {
            city = otherTerm.name;
        }
    }

    if (city !== 'غير محدد' && governorate !== 'غير محدد') {
        const governorateTest = locTerms.find((t: any) => t?.name === governorate);
        const cityTest = locTerms.find((t: any) => t?.name === city);

        if (cityTest && (!cityTest.parent || cityTest.parent === 0) && governorateTest && governorateTest.parent !== 0) {
            const temp = governorate;
            governorate = city;
            city = temp;
        }
    }

    return {
        governorate,
        city,
    };
}

function dedupeImages(imgs: string[]) {
    return Array.from(new Set(imgs.filter(Boolean)));
}

function parseQuantitiesMap(text: string | undefined | null) {
    const map = new Map<string, number>();
    if (!text || typeof text !== 'string') return map;

    try {
        const jsonObject = JSON.parse(text);
        if (typeof jsonObject === 'object' && jsonObject !== null) {
            for (const key in jsonObject) {
                const value = jsonObject[key];
                if (typeof value === 'number' && !isNaN(value) && value >= 0) {
                    map.set(String(key), value);
                }
            }
            if (map.size > 0) return map;
        }
    } catch (e) {
        // فشل التحليل كـ JSON. نستمر في المحاولة بالطريقة القديمة
    }

    text
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .forEach(pair => {
            const [id, q] = pair.split('=').map(s => s.trim());
            if (id && q && !isNaN(Number(q))) map.set(String(id), Number(q));
        });

    return map;
}

const safeParseNumber = (val: any): number | undefined => {
    if (val == null || val === '') return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : undefined;
};

/* =================== Formatters =================== */

// ✅ [مُستعاد] دالة تنسيق بيانات الاحتياج المفرد
export const formatNeedItemDetailData = (needItem: any): Need => {
    const acf = needItem?.acf || {};

    const category =
        (acf?.category && typeof acf.category === 'object' && 'name' in acf.category && (acf.category as any).name) ||
        'غير محدد';

    const terms = needItem?._embedded?.['wp:term']?.flat?.() || [];
    const needsCategoryTerm = terms.find((t: any) => typeof t?.taxonomy === 'string' && t.taxonomy.includes('needs_categories'));
    const icon = needsCategoryTerm?.acf?.category_icon || 'fas fa-box-open';

    let imageUrl = '/images/default-need.jpg';
    if (typeof acf?.image === 'string' && acf.image) {
        imageUrl = acf.image;
    } else if (needItem?._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
        imageUrl = String(needItem._embedded['wp:featuredmedia'][0].source_url);
    }

    const unitPrice = acf?.unit_price != null && !isNaN(Number(acf.unit_price)) ? Number(acf.unit_price) : 0;

    const description =
        typeof acf?.description === 'string'
            ? acf.description
            : (needItem?.excerpt?.rendered ? String(needItem.excerpt.rendered).replace(/<[^>]+>/g, '').trim() : '');

    return {
        id: Number(needItem.id) || 0,
        item: needItem?.title?.rendered || 'بدون عنوان',
        unitPrice,
        description,
        image: imageUrl,
        category,
        icon,
        quantity: 0,
        funded: 0,
    };
};

export const formatCaseData = async (
    caseItem: any,
    type: 'school' | 'mosque',
    // ✅ [مُستعاد] الآن تستقبل الخريطة
    allNeedsMap: Map<string, Need> 
): Promise<CaseItem> => {
    const acf = caseItem?.acf || {};
    const terms = caseItem?._embedded?.['wp:term']?.flat?.() || [];

    const title =
        type === 'school'
            ? acf?.organization_name || caseItem?.title?.rendered || 'بدون عنوان'
            : acf?.mosque_name || caseItem?.title?.rendered || 'بدون عنوان';

    const { governorate, city } = extractLocationNames(terms);

    const description = acf?.description || '';
    const totalNeeded = Number(acf?.total_needed) || 0;
    const totalDonated = Number(acf?.total_donated) || 0;
    const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
    
    const needLevelRaw = String(acf?.need_level || '').trim();
    const needLevel: NeedLevel = needLevelRaw || 'غير محدد';
    const isUrgent = needLevelRaw === 'عالي';

    let images: string[] = []; 
    let rawGalleryImages: AttachmentObject[] = []; 

    const featured = caseItem?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    if (featured) images.push(String(featured));
    
    const gallery = acf?.gallery_images; 

    if (Array.isArray(gallery)) {
        rawGalleryImages = gallery as AttachmentObject[]; 
        
        for (const img of rawGalleryImages) {
            const imageUrl = img?.url || img?.guid;
            if (imageUrl) images.push(String(imageUrl)); 
        }
    } else if (gallery && typeof gallery === 'object' && (gallery.url || gallery.guid)) {
        rawGalleryImages = [gallery as AttachmentObject];
        images.push(String(gallery.url || gallery.guid));
    }

    if (images.length === 0) images.push('/images/default.jpg');
    images = dedupeImages(images);

    const quantitiesMap = parseQuantitiesMap(acf?.project_needs_quantities_text);
    const selectedNeedsRaw = Array.isArray(acf?.selected_project_needs) ? acf.selected_project_needs : [];

    const needs: Need[] = selectedNeedsRaw.map((sel: any) => {
        const idStr = String(typeof sel === 'number' ? sel : sel?.ID ?? sel?.id ?? '');
        const safeId = Number.isFinite(Number(idStr)) ? Number(idStr) : 0;

        // ✅ [مُصحَّح] جلب كائن الاحتياج الكامل من الخريطة
        const base = allNeedsMap.get(idStr); 

        // 💡 الآن نعتمد بشكل أساسي على "base" للحصول على البيانات المفقودة (السعر، الصورة، الفئة)
        const item = (typeof sel === 'object' && sel?.post_title) || base?.item || 'بدون عنوان';
        
        // ✅ السعر الآن يأتي من الكائن الكامل
        const unitPrice = base?.unitPrice ?? 0;

        const quantity = quantitiesMap.get(idStr) || 0;

        const description =
            (typeof sel === 'object' && typeof sel?.acf?.description === 'string')
                ? sel.acf.description // في حال تم إدخال وصف مخصص للحالة
                : base?.description || ''; // وإلا، نستخدم الوصف من كائن الاحتياج الكامل (base)

        // ✅ الصورة الآن تأتي من الكائن الكامل
        let image = base?.image || '/images/default-need.jpg'; 
        if (typeof sel === 'object' && sel?.acf?.image?.url) {
            image = String(sel.acf.image.url); // override if image is specifically set on the case
        }

        // ✅ الفئة والأيقونة الآن تأتي من الكائن الكامل
        const category =
            (typeof sel === 'object' && sel?.acf?.category?.name)
                ? sel.acf.category.name
                : (base?.category ?? 'غير محدد');

        const icon = base?.icon || 'fas fa-box-open';

        return { id: safeId, item, unitPrice, quantity, funded: 0, description, image, category, icon } as Need;
    });

    let locationMap: { lat: number, lng: number, address: string } | undefined;
    let officialDocuments: any; 
    
    const locationRaw = acf?.location;
    if (locationRaw && typeof locationRaw === 'object' && locationRaw.lat && locationRaw.lng) {
        locationMap = {
            lat: safeParseNumber(locationRaw.lat) ?? 0,
            lng: safeParseNumber(locationRaw.lng) ?? 0,
            address: String(locationRaw.address || ''),
        };
    }
    
    officialDocuments = acf?.documents;

    let numberOfStudents: number | undefined;
    let numberOfClassrooms: number | undefined;
    let educationLevel: string | undefined;

    let directorName: string | undefined;
    let phoneNumber: string | undefined;
    let email: string | undefined;
    let socialMediaLinks: string | undefined;
    let complexManagerName: string | undefined;
    let complexPhone: string | undefined;
    let complexEmail: string | undefined;
    let numberOfStaff: number | undefined;
    let projectStatus: string | undefined;

    let regularWorshippers: number | undefined;
    let fridayWorshippers: number | undefined;
    let mosqueArea: number | undefined;

    if (type === 'school') {
        numberOfStudents = safeParseNumber(acf?.number_of_students);
        numberOfClassrooms = safeParseNumber(acf?.number_of_classrooms);
        educationLevel = typeof acf?.education_level === 'string' ? acf.education_level : undefined;
        
        directorName = typeof acf?.director_name === 'string' ? acf.director_name : undefined;
        phoneNumber = typeof acf?.phone_number === 'string' ? acf.phone_number : undefined;
        email = typeof acf?.email === 'string' ? acf.email : undefined;
        socialMediaLinks = typeof acf?.social_media_links === 'string' ? acf.social_media_links : undefined;
        
        complexManagerName = typeof acf?.complex_manager_name === 'string' ? acf.complex_manager_name : undefined;
        complexPhone = typeof acf?.complex_phone === 'string' ? acf.complex_phone : undefined;
        complexEmail = typeof acf?.complex_email === 'string' ? acf.complex_email : undefined;
        
        numberOfStaff = safeParseNumber(acf?.number_of_staff);
        
        projectStatus = typeof acf?.project_status === 'string' ? acf.project_status : undefined;
    }
    
    if (type === 'mosque') {
        const worshippersGroup = acf?.number_of_worshippers; 

        if (worshippersGroup && typeof worshippersGroup === 'object') {
            regularWorshippers = safeParseNumber(worshippersGroup?.regular_days);
            fridayWorshippers = safeParseNumber(worshippersGroup?.friday_prayer);
        }
        
        mosqueArea = safeParseNumber(acf?.mosque_area);
    }

    return {
        id: caseItem.id,
        title,
        description,
        governorate,
        city,
        type,
        needLevel, 
        isUrgent,
        needs,
        fundNeeded: totalNeeded,
        fundRaised: totalDonated,
        progress,
        images,
        
        gallery_images: rawGalleryImages, 
        
        locationMap,
        officialDocuments,
        
        ...(type === 'school' && {
            numberOfStudents,
            numberOfClassrooms,
            educationLevel,
            directorName,
            phoneNumber,
            email,
            socialMediaLinks,
            complexManagerName,
            complexPhone,
            complexEmail,
            numberOfStaff,
            projectStatus,
        }),
        ...(type === 'mosque' && {
            regularWorshippers, 
            fridayWorshippers, 
            mosqueArea,
        }),
    };
};

/* ============ Needs Lists (cached) ============ */
// ✅ [مُستعاد] دوال جلب الاحتياجات مع التخزين المؤقت
async function getNeedsList(postType: 'school_needs' | 'mosque_needs') {
    const p = new URLSearchParams();
    p.set('_embed', '');
    p.set('per_page', '100');
    const res = await fetchWordPressData(postType, p);
    const needs = res?.data;

    if (!needs) return [];
    const parsed = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
    if (!parsed.success) {
        console.error(`فشل في التحقق من بيانات احتياجات ${postType === 'school_needs' ? 'المدارس' : 'المساجد'}:`, parsed.error);
        return [];
    }
    return parsed.data.map(formatNeedItemDetailData);
}

export const getSchoolNeedsList = unstable_cache(
    () => getNeedsList('school_needs'),
    ['school-needs-list'],
    { revalidate: 3600, tags: ['needs-lists'] }
);

export const getMosqueNeedsList = unstable_cache(
    () => getNeedsList('mosque_needs'),
    ['mosque-needs-list'],
    { revalidate: 3600, tags: ['needs-lists'] }
);

/* ============ Case APIs ============ */

export async function getCaseById(id: number): Promise<CaseItem | null> {
    // ✅ [مُصحَّح] جلب قوائم الاحتياجات واستخدامها لإنشاء الخريطة
    const [schoolNeedsList, mosqueNeedsList] = await Promise.all([getSchoolNeedsList(), getMosqueNeedsList()]);
    const allNeedsMap = new Map([...schoolNeedsList, ...mosqueNeedsList].map(n => [String(n.id), n]));

    const [schoolsRes, mosquesRes] = await Promise.allSettled([
        fetchWordPressData(`schools/${id}`, new URLSearchParams('_embed')),
        fetchWordPressData(`mosques/${id}`, new URLSearchParams('_embed')),
    ]);

    let caseData: any = null;
    let postType: 'schools' | 'mosques' | null = null;

    if (schoolsRes.status === 'fulfilled' && schoolsRes.value?.data?.id) {
        caseData = schoolsRes.value.data;
        postType = 'schools';
    } else if (mosquesRes.status === 'fulfilled' && mosquesRes.value?.data?.id) {
        caseData = mosquesRes.value.data;
        postType = 'mosques';
    }
    if (!caseData) return null;

    if (postType === 'schools') {
        const parsed = schoolsSchema.safeParse(caseData);
        if (!parsed.success) return null;
        // ✅ [مُصحَّح] تمرير allNeedsMap
        return await formatCaseData(parsed.data, 'school', allNeedsMap);
    } else {
        const parsed = mosquesSchema.safeParse(caseData);
        if (!parsed.success) return null;
        // ✅ [مُصحَّح] تمرير allNeedsMap
        return await formatCaseData(parsed.data, 'mosque', allNeedsMap);
    }
}

export async function getCases(params: URLSearchParams = new URLSearchParams()): Promise<CaseItem[]> {
    const paramsString = params.toString();
    const typeKey = (params.get('type') || 'all').toLowerCase();
    const pageKey = params.get('page') || '1';
    const searchKey = params.get('search') || 'none';
    const perPageKey = params.get('per_page') || '10';

    const cachedFn = unstable_cache(
        async () => {
            const p = new URLSearchParams(paramsString);
            p.set('_embed', '');
            const fetchSchools = typeKey === 'all' || typeKey === 'schools';
            const fetchMosques = typeKey === 'all' || typeKey === 'mosques';

            // ✅ [مُصحَّح] جلب قوائم الاحتياجات (مخزنة مؤقتًا)
            const [schoolsPromise, mosquesPromise, schoolNeedsList, mosqueNeedsList] = await Promise.all([
                fetchSchools ? fetchWordPressData('schools', p) : Promise.resolve(null), 
                fetchMosques ? fetchWordPressData('mosques', p) : Promise.resolve(null),
                getSchoolNeedsList(), 
                getMosqueNeedsList()
            ]);

            const allNeedsMap = new Map([...schoolNeedsList, ...mosqueNeedsList].map(n => [String(n.id), n]));
            const allCases: CaseItem[] = [];

            if (Array.isArray(schoolsPromise?.data)) {
                const parsed = z.array(schoolsSchema).safeParse(schoolsPromise.data);
                if (parsed.success) {
                    const formatted = await Promise.all(parsed.data.map(d => formatCaseData(d, 'school', allNeedsMap)));
                    allCases.push(...formatted);
                }
            }
            if (Array.isArray(mosquesPromise?.data)) {
                const parsed = z.array(mosquesSchema).safeParse(mosquesPromise.data);
                if (parsed.success) {
                    const formatted = await Promise.all(parsed.data.map(d => formatCaseData(d, 'mosque', allNeedsMap)));
                    allCases.push(...formatted);
                }
            }
            return allCases;
        },
        ['cases-fetch', typeKey, pageKey, searchKey, perPageKey], 
        { revalidate: 3600, tags: ['cases'] }
    );

    return cachedFn();
}
// واجهة لضمان نوع البيانات
export interface Donation {
    id: string;
    date: string;
    caseName: string;
    amount: string;
    currency: string;
    status: string;
    detailsLink: string;
}

/** جلب تبرعات المستخدم من WordPress REST API */
export const getDonations = unstable_cache(
    async (userId: string): Promise<Donation[]> => {
        try {
            const endpoint = `/my-donations?userId=${userId}`;
            const res = await fetchWordPressData(endpoint, undefined);
            const data = res?.data;

            if (!Array.isArray(data)) {
                console.error('API did not return an array of donations.');
                return [];
            }

            return data;
        } catch (err) {
            console.error('Failed to fetch user donations:', err);
            return [];
        }
    },
    ['user-donations'],
    { revalidate: 3600 }
);