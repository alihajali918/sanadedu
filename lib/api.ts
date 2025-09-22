// src/lib/api.ts
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { CaseItem, Need } from './types';

/**
 * جلب بيانات من WordPress REST API
 * @param endpoint نقطة النهاية (مثال: 'posts', 'schools/123')
 * @param params بارامترات URL
 * @returns كائن يحتوي على البيانات ورؤوس الاستجابة، أو null في حالة الفشل
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
      // إطلاق خطأ بدلاً من إرجاع null مباشرةً، ما عدا في حالة 404
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

  // البحث عن المحافظة: التصنيف الذي ليس له أب (parent) أو أبوه صفر
  const governorateTerm = locTerms.find((t: any) => !t?.parent || t.parent === 0);
  
  // البحث عن المدينة: التصنيف الذي له أب (parent)
  const cityTerm = locTerms.find((t: any) => t?.parent && t.parent !== 0);

  if (governorateTerm) {
    governorate = governorateTerm.name;
  }

  if (cityTerm) {
    city = cityTerm.name;
  }
  
  // منطق احتياطي في حال وجود تصنيفين غير مرتبطين بعلاقة أب-ابن
  if (locTerms.length === 2 && governorate === 'غير محدد' && city === 'غير محدد') {
    // إذا لم يتمكن من تحديد أي منهما، نعتبر الأول محافظة والثاني مدينة
    governorate = locTerms[0].name;
    city = locTerms[1].name;
  } else if (locTerms.length === 2 && governorate !== 'غير محدد' && city === 'غير محدد') {
    // إذا وجد المحافظة فقط (التصنيف الآخر ليس له أب)
    const otherTerm = locTerms.find((t: any) => t?.id !== governorateTerm?.id);
    if (otherTerm) {
      city = otherTerm.name;
    }
  }

  // تحقق نهائي: إذا كان التصنيف الذي تم تحديده كمدينة هو في الواقع المحافظة
  // (من خلال معرفة أن اسم المحافظة هو تصنيف لا يتبع لشيء آخر)
  // هذا الشرط يعالج مشكلة التبديل
  if (city !== 'غير محدد' && governorate !== 'غير محدد') {
      const governorateTest = locTerms.find((t: any) => t?.name === governorate);
      const cityTest = locTerms.find((t: any) => t?.name === city);
      
      // إذا كانت المدينة هي التصنيف الذي ليس له أب، فهذا يعني أن الترتيب معكوس
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

  const title =
    type === 'school'
      ? acf?.organization_name || caseItem?.title?.rendered || 'بدون عنوان'
      : acf?.mosque_name || caseItem?.title?.rendered || 'بدون عنوان';

  const { governorate, city } = extractLocationNames(terms);

  const description = acf?.description || 'لا يوجد وصف.';
  const totalNeeded = Number(acf?.total_needed) || 0;
  const totalDonated = Number(acf?.total_donated) || 0;
  const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
  const isUrgent = String(acf?.need_level || '').trim() === 'عالي';

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

  const typeLabel = type === 'school' ? 'مدرسة' : 'مسجد';

  return {
    id: caseItem.id,
    title,
    description,
    governorate,
    city,
    type,
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
  { revalidate: 3600 }
);

export const getMosqueNeedsList = unstable_cache(
  () => getNeedsList('mosque_needs'),
  ['mosque-needs-list'],
  { revalidate: 3600 }
);

/* ============ Case APIs ============ */

export async function getCaseById(id: number): Promise<CaseItem | null> {
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
    return await formatCaseData(parsed.data, 'school', allNeedsMap);
  } else {
    const parsed = mosquesSchema.safeParse(caseData);
    if (!parsed.success) return null;
    return await formatCaseData(parsed.data, 'mosque', allNeedsMap);
  }
}

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

      const schoolsPromise = fetchSchools ? fetchWordPressData('schools', p) : Promise.resolve(null);
      const mosquesPromise = fetchMosques ? fetchWordPressData('mosques', p) : Promise.resolve(null);

      const [schoolsRes, mosquesRes, schoolNeedsList, mosqueNeedsList] = await Promise.all([
        schoolsPromise, mosquesPromise, getSchoolNeedsList(), getMosqueNeedsList()
      ]);

      const allNeedsMap = new Map([...schoolNeedsList, ...mosqueNeedsList].map(n => [String(n.id), n]));
      const allCases: CaseItem[] = [];

      if (Array.isArray(schoolsRes?.data)) {
        const parsed = z.array(schoolsSchema).safeParse(schoolsRes.data);
        if (parsed.success) {
          const formatted = await Promise.all(parsed.data.map(d => formatCaseData(d, 'school', allNeedsMap)));
          allCases.push(...formatted);
        }
      }
      if (Array.isArray(mosquesRes?.data)) {
        const parsed = z.array(mosquesSchema).safeParse(mosquesRes.data);
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
    try {
      // بناء الرابط لنقطة النهاية المخصصة
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