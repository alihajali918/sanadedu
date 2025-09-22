// src/lib/api.ts
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { CaseItem, Need } from './types';

/** جلب بيانات من WordPress REST API */
export async function fetchWordPressData(
  endpoint: string,
  params?: URLSearchParams
): Promise<any> {
  const RAW = process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.trim();
  if (!RAW) {
    console.error('NEXT_PUBLIC_WORDPRESS_API_URL غير معرّف.');
    return null;
  }
  const hasWpJson = /\/wp-json\/?$/.test(RAW);
  const apiBase = hasWpJson ? RAW.replace(/\/+$/,'') : `${RAW.replace(/\/+$/,'')}/wp-json`;
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
      if (res.status !== 404) console.error(`[WP API ERROR] ${res.status} ${res.statusText} @ ${finalUrlStr}`);
      return null;
    }
    return await res.json();
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

/** استخراج المحافظة (parent) والمدينة (child) من تصنيف locations */
function extractLocationNames(terms: any[]) {
  const locTerms = (terms || []).filter((t: any) => t?.taxonomy === 'locations');
  const governorateTerm = locTerms.find((t: any) => !t?.parent || t.parent === 0);
  const cityTerm = locTerms.find((t: any) => t?.parent && t.parent !== 0);
  return {
    governorate: governorateTerm?.name || 'غير محدد',
    city: cityTerm?.name || 'غير محدد',
  };
}

function dedupeImages(imgs: string[]) {
  return Array.from(new Set(imgs.filter(Boolean)));
}

function parseQuantitiesMap(text: string | undefined | null) {
  const map = new Map<string, number>();
  if (!text || typeof text !== 'string') return map;
  text.split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .forEach(pair => {
      const [id, q] = pair.split('=').map(s => s.trim());
      if (id && q && !isNaN(Number(q))) map.set(String(id), Number(q));
    });
  return map;
}

/* =================== Formatters =================== */

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
  allNeedsMap: Map<string, Need>
): Promise<CaseItem> => {
  const acf = caseItem?.acf || {};
  const terms = caseItem?._embedded?.['wp:term']?.flat?.() || [];

  // عنوان
  const title =
    type === 'school'
      ? acf?.organization_name || caseItem?.title?.rendered || 'بدون عنوان'
      : acf?.mosque_name || caseItem?.title?.rendered || 'بدون عنوان';

  // المحافظة/المدينة بالمنطق الصحيح
  const { governorate, city } = extractLocationNames(terms);

  const description = acf?.description || 'لا يوجد وصف.';
  const totalNeeded = Number(acf?.total_needed) || 0;
  const totalDonated = Number(acf?.total_donated) || 0;
  const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
  const isUrgent = String(acf?.need_level || '').trim() === 'عالي';

  // صور
  let images: string[] = [];
  const featured = caseItem?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (featured) images.push(String(featured));
  const gallery = acf?.gallery_images;
  if (Array.isArray(gallery)) {
    for (const img of gallery) if (img?.url) images.push(String(img.url));
  } else if (gallery?.url) {
    images.push(String(gallery.url));
  }
  if (images.length === 0) images.push('/images/default.jpg');
  images = dedupeImages(images);

  // كميات الاحتياجات
  const quantitiesMap = parseQuantitiesMap(acf?.project_needs_quantities_text);
  const selectedNeedsRaw = Array.isArray(acf?.selected_project_needs) ? acf.selected_project_needs : [];

  const needs: Need[] = selectedNeedsRaw.map((sel: any) => {
    const idStr = String(typeof sel === 'number' ? sel : sel?.ID ?? sel?.id ?? '');
    const idNum = Number(idStr);
    const safeId = Number.isFinite(idNum) ? idNum : 0;

    const base = allNeedsMap.get(idStr);

    const item =
      (typeof sel === 'object' && sel?.post_title) || base?.item || 'بدون عنوان';

    const selUnitRaw = typeof sel === 'object'
      ? (sel?.acf?.unit_price ?? sel?.acf?.unitPrice ?? sel?.acf?.price)
      : undefined;
    const unitPrice =
      selUnitRaw != null && !isNaN(Number(selUnitRaw))
        ? Number(selUnitRaw)
        : (base?.unitPrice ?? 0);

    const quantity = quantitiesMap.get(idStr) || 0;

    const description =
      (typeof sel === 'object' && typeof sel?.acf?.description === 'string')
        ? sel.acf.description
        : base?.description || '';

    let image = base?.image || '/images/default-need.jpg';
    if (typeof sel === 'object' && sel?.acf?.image?.url) {
      image = String(sel.acf.image.url);
    }

    const category =
      (typeof sel === 'object' && sel?.acf?.category?.name)
        ? sel.acf.category.name
        : (base?.category ?? 'غير محدد');

    const icon = base?.icon || 'fas fa-box-open';

    return { id: safeId, item, unitPrice, quantity, funded: 0, description, image, category, icon } as Need;
  });

  // 👇 نضيف label عربي ونُرجِع type الأصلي للمنطق/الفلترة
  const typeLabel = type === 'school' ? 'مدرسة' : 'مسجد';

  return {
    id: caseItem.id,
    title,
    description,
    governorate,
    city,
    type,        // 'school' | 'mosque' (للمنطق والفلترة)
    // @ts-expect-error: أضف الحقل في lib/types.ts
    typeLabel,   // 'مدرسة' | 'مسجد' (للعرض)
    needLevel: acf?.need_level || 'غير محدد',
    isUrgent,
    needs,
    fundNeeded: totalNeeded,
    fundRaised: totalDonated,
    progress,
    images,
  };
};

/* ============ Needs Lists (cached) ============ */

export const getSchoolNeedsList = unstable_cache(
  async () => {
    const p = new URLSearchParams();
    p.set('_embed', '');
    p.set('per_page', '100');
    const needs = await fetchWordPressData('school_needs', p);
    if (!needs) return [];
    const parsed = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
    if (!parsed.success) {
      console.error('فشل في التحقق من بيانات احتياجات المدارس:', parsed.error);
      return [];
    }
    return parsed.data.map(formatNeedItemDetailData);
  },
  ['school-needs-list'],
  { revalidate: 3600 }
);

export const getMosqueNeedsList = unstable_cache(
  async () => {
    const p = new URLSearchParams();
    p.set('_embed', '');
    p.set('per_page', '100');
    const needs = await fetchWordPressData('mosque_needs', p);
    if (!needs) return [];
    const parsed = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
    if (!parsed.success) {
      console.error('فشل في التحقق من بيانات احتياجات المساجد:', parsed.error);
      return [];
    }
    return parsed.data.map(formatNeedItemDetailData);
  },
  ['mosque-needs-list'],
  { revalidate: 3600 }
);

/* ============ Case APIs ============ */

export async function getCaseById(id: number): Promise<CaseItem | null> {
  const [schoolNeedsList, mosqueNeedsList] = await Promise.all([getSchoolNeedsList(), getMosqueNeedsList()]);
  const allNeedsMap = new Map([...schoolNeedsList, ...mosqueNeedsList].map(n => [String(n.id), n]));

  const [schoolsResult, mosquesResult] = await Promise.allSettled([
    fetchWordPressData(`schools/${id}`, new URLSearchParams('_embed')),
    fetchWordPressData(`mosques/${id}`, new URLSearchParams('_embed')),
  ]);

  let caseData: any = null;
  let postType: 'schools' | 'mosques' | null = null;

  if (schoolsResult.status === 'fulfilled' && schoolsResult.value?.id) {
    caseData = schoolsResult.value;
    postType = 'schools';
  } else if (mosquesResult.status === 'fulfilled' && mosquesResult.value?.id) {
    caseData = mosquesResult.value;
    postType = 'mosques';
  }
  if (!caseData) return null;

  if (postType === 'schools') {
    const parsed = schoolsSchema.safeParse(caseData);
    if (!parsed.success) return null;
    return await formatCaseData(parsed.data, 'school', allNeedsMap);
  } else {
    const parsed = mosquesSchema.safeParse(caseData);
    if (!parsed.success) return null;
    return await formatCaseData(parsed.data, 'mosque', allNeedsMap);
  }
}

/** getCases مع مفتاح كاش يعتمد على type وغيرها */
export async function getCases(params: URLSearchParams = new URLSearchParams()): Promise<CaseItem[]> {
  const paramsString = params.toString();
  const typeKey = (params.get('type') || 'all').toLowerCase();
  const pageKey = params.get('page') || '';
  const searchKey = params.get('search') || '';
  const perPageKey = params.get('per_page') || '';

  const cachedFn = unstable_cache(
    async () => {
      const p = new URLSearchParams(paramsString);
      p.set('_embed', '');
      const fetchSchools = typeKey === 'all' || typeKey === 'schools';
      const fetchMosques = typeKey === 'all' || typeKey === 'mosques';

      const schoolsPromise = fetchSchools ? fetchWordPressData('schools', p) : Promise.resolve([]);
      const mosquesPromise = fetchMosques ? fetchWordPressData('mosques', p) : Promise.resolve([]);

      const [schoolsData, mosquesData, schoolNeedsList, mosqueNeedsList] = await Promise.all([
        schoolsPromise, mosquesPromise, getSchoolNeedsList(), getMosqueNeedsList()
      ]);

      const allNeedsMap = new Map([...schoolNeedsList, ...mosqueNeedsList].map(n => [String(n.id), n]));
      const allCases: CaseItem[] = [];

      if (Array.isArray(schoolsData)) {
        const parsed = z.array(schoolsSchema).safeParse(schoolsData);
        if (parsed.success) {
          const formatted = await Promise.all(parsed.data.map(d => formatCaseData(d, 'school', allNeedsMap)));
          allCases.push(...formatted);
        }
      }
      if (Array.isArray(mosquesData)) {
        const parsed = z.array(mosquesSchema).safeParse(mosquesData);
        if (parsed.success) {
          const formatted = await Promise.all(parsed.data.map(d => formatCaseData(d, 'mosque', allNeedsMap)));
          allCases.push(...formatted);
        }
      }
      return allCases;
    },
    ['cases', typeKey, pageKey, searchKey, perPageKey],
    { revalidate: 3600 }
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
    // بناء الرابط لنقطة النهاية المخصصة
    const endpoint = `/my-donations?userId=${userId}`;
    const data = await fetchWordPressData(endpoint, undefined); // لاحظ عدم وجود بارامترات

    if (!Array.isArray(data)) {
      console.error('API did not return an array of donations.');
      return [];
    }
    
    return data;
  },
  ['user-donations'],
  { revalidate: 3600 }
);
