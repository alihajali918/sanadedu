// lib/api.ts

import { unstable_cache } from 'next/cache';
import { z } from 'zod';
// تأكد من استيراد CaseItem و Need من ملف الأنواع الخاص بك (إذا كانت مستخدمة هنا)
import { CaseItem, Need } from './types'; 

// دالة أساسية لجلب البيانات من WordPress REST API
export async function fetchWordPressData(endpoint: string, params: URLSearchParams | undefined = undefined): Promise<any> {
  const WP_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL;

  if (!WP_BASE_URL) {
    console.error("متغير البيئة NEXT_PUBLIC_WORDPRESS_BASE_URL غير معرف.");
    return null;
  }

  const url = new URL(`${WP_BASE_URL}/wp-json/wp/v2/${endpoint}`);
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

// تعريف هيكل البيانات الجديد للحالات باستخدام Zod
const caseSchema = z.object({
  id: z.number(),
  title: z.object({ rendered: z.string() }).optional(),
  excerpt: z.object({ rendered: z.string() }).optional(),
  content: z.object({ rendered: z.string() }).optional(),
  _embedded: z.object({
    'wp:featuredmedia': z.array(z.object({ source_url: z.string() })).optional(),
    'wp:term': z.array(z.array(embeddedTermSchema)).optional(),
  }).optional(),
  acf: z.object({
    organization_name: z.string().optional(),
    education_level: z.string().optional(),
    need_level: z.string().optional(),
    total_needed: z.string().or(z.number()).optional(),
    total_donated: z.string().or(z.number()).optional(),
    gallery_images: z.union([
        acfImageObjectSchema,
        z.boolean(),
        z.null()
    ]).optional(),
    selected_project_needs: z.union([
      z.array(z.object({
        ID: z.number(),
        post_title: z.string(),
        acf: z.object({
          unit_price: z.string().or(z.number()).optional(),
        }).optional(),
        _embedded: z.object({
          'wp:featuredmedia': z.array(z.object({ source_url: z.string() })).optional(),
        }).optional(),
      })),
      z.boolean(),
      z.null(),
      z.string(),
    ]).optional(),
    project_needs_quantities_text: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

// دالة مساعدة لتنسيق البيانات بعد التحقق منها للحالات
const formatCaseData = (caseItem: z.infer<typeof caseSchema>): CaseItem => {
  const acf = caseItem.acf || {};

  const terms = caseItem._embedded?.['wp:term']?.flat() || [];
  const caseTypeTerms = terms.filter(term => term.taxonomy === 'case_type');
  const locationTerms = terms.filter(term => term.taxonomy === 'locations');

  const type = caseTypeTerms.length > 0 ? caseTypeTerms[0].name : acf.education_level || 'غير محدد';
  const governorate = locationTerms.length > 0 ? locationTerms[0].name : 'غير محدد';
  const city = locationTerms.length > 1 ? locationTerms[1].name : 'غير محدد';

  const title = acf.organization_name || caseItem.title?.rendered || 'بدون عنوان';
  const description = acf.description || caseItem.excerpt?.rendered?.replace(/<[^>]*>?/gm, '') || 'لا يوجد وصف.';
  
  const totalNeeded = Number(acf.total_needed) || 0;
  const totalDonated = Number(acf.total_donated) || 0;
  const progress = totalNeeded > 0 ? Math.round((totalDonated / totalNeeded) * 100) : 0;
  const isUrgent = acf.need_level === 'عالي';

  let caseImages: string[] = [];

  const featuredMediaUrl = caseItem._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (featuredMediaUrl) {
    caseImages.push(featuredMediaUrl);
  }

  const galleryImage = acf.gallery_images;
  if (typeof galleryImage === 'object' && galleryImage !== null && galleryImage.url) {
    caseImages.push(galleryImage.url);
  }

  if (caseImages.length === 0) {
    caseImages.push('/images/default.jpg');
  }

  return {
    id: caseItem.id,
    title: title,
    governorate: governorate,
    city: city,
    type: type,
    needLevel: acf.need_level || 'غير محدد',
    isUrgent: isUrgent,
    description: description,
    progress: progress,
    fundNeeded: totalNeeded,
    fundRaised: totalDonated,
    needs: [],
    images: caseImages,
  };
};

// دالة لجلب كل الحالات وتنسيقها لتناسب هيكل التطبيق
export const getCases = unstable_cache(
  async () => {
    const cases = await fetchWordPressData('cases', new URLSearchParams('_embed'));
    if (!cases) {
      return [];
    }
    const parsedCases = z.array(caseSchema).safeParse(cases as unknown[]);
    if (!parsedCases.success) {
      console.error("فشل في التحقق من بيانات الحالات:", parsedCases.error);
      console.error("بيانات الحالات التي فشلت في التحقق:", JSON.stringify(cases, null, 2));
      return [];
    }
    const formattedCases = parsedCases.data.map(formatCaseData);
    return formattedCases;
  },
  ['cases-list'],
  { revalidate: 3600 }
);

// تعريف هيكل البيانات الجديد للاحتياجات الفردية (مكتبة الاحتياجات)
const needItemDetailSchema = z.object({
  id: z.number(),
  title: z.object({ rendered: z.string() }).optional(),
  content: z.object({ rendered: z.string() }).optional(),
  _embedded: z.object({
    'wp:featuredmedia': z.array(z.object({ source_url: z.string() })).optional(),
    'wp:term': z.array(z.array(embeddedTermSchema)).optional(),
  }).optional(),
  acf: z.object({
    // ⭐ تم التعديل: السماح لـ unit_price بأن يكون string أو number أو null أو ""
    unit_price: z.union([z.string(), z.number(), z.null(), z.literal('')]).optional(),
    // ⭐ تم التعديل: السماح لـ quantity_available بأن يكون string أو number أو null أو ""
    quantity_available: z.union([z.string(), z.number(), z.null(), z.literal('')]).optional(),
    // ⭐ تم التعديل: السماح لـ funded بأن يكون string أو number أو null أو ""
    funded: z.union([z.string(), z.number(), z.null(), z.literal('')]).optional(),
    // ⭐ تم الإضافة: حقل "صورة الاحتياج" الذي قد يكون URL أو false/null
    image: z.union([z.string(), z.boolean(), z.null()]).optional(), 
    // ⭐ تم التعديل: السماح لـ icon بأن يكون string أو null أو ""
    icon: z.union([z.string(), z.null(), z.literal('')]).optional(),
    // ⭐ تم التعديل: السماح لـ category بأن يكون string أو null
    category: z.string().nullable().optional(),
  }).optional(),
});

// دالة مساعدة لتنسيق البيانات بعد التحقق منها للاحتياجات الفردية
const formatNeedItemDetailData = (needItem: z.infer<typeof needItemDetailSchema>): Need => {
  const acf = needItem.acf || {};
  const terms = needItem._embedded?.['wp:term']?.flat() || [];
  const needsCategoryTerms = terms.filter(term => term.taxonomy === 'needs_categories');

  const category = needsCategoryTerms.length > 0 ? needsCategoryTerms[0].name : String(acf.category || 'غير محدد'); 
  const description = needItem.content?.rendered?.replace(/<[^>]*>?/gm, '') || '';
  const icon = String(acf.icon || 'fas fa-box-open'); 

  let imageUrl = '/images/default-need.jpg';
  if (typeof acf.image === 'string' && acf.image) {
    imageUrl = acf.image;
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
    quantity: Number(acf.quantity_available) || 0,
    funded: Number(acf.funded) || 0,
  };
};

// دالة لجلب جميع الاحتياجات وتنسيقها لتناسب هيكل التطبيق
export const getNeedsList = unstable_cache(
  async () => {
    const needs = await fetchWordPressData('needs', new URLSearchParams('_embed'));
    if (!needs) {
      return [];
    }
    const parsedNeeds = z.array(needItemDetailSchema).safeParse(needs as unknown[]);
    if (!parsedNeeds.success) {
      console.error("فشل في التحقق من بيانات الاحتياجات:", parsedNeeds.error);
      console.error("بيانات الاحتياجات التي فشلت في التحقق:", JSON.stringify(needs, null, 2));
      return [];
    }
    const formattedNeeds = parsedNeeds.data.map(formatNeedItemDetailData);
    return formattedNeeds;
  },
  ['needs-list'],
  { revalidate: 3600 }
);

// دالة لجلب تفاصيل حالة واحدة بواسطة ID
export async function getCaseById(id: number): Promise<CaseItem | null> {
  const caseData = await fetchWordPressData(`cases/${id}`, new URLSearchParams('_embed'));
  const parsedCase = caseSchema.safeParse(caseData as unknown);

  if (!parsedCase.success) {
    console.error("فشل في التحقق من بيانات الحالة:", parsedCase.error);
    return null;
  }

  const acf = parsedCase.data.acf || {};
  const caseItem = parsedCase.data;

  const terms = caseItem._embedded?.['wp:term']?.flat() || [];
  const caseTypeTerms = terms.filter(term => term.taxonomy === 'case_type');
  const locationTerms = terms.filter(term => term.taxonomy === 'locations');

  const type = caseTypeTerms.length > 0 ? caseTypeTerms[0].name : acf.education_level || 'غير محدد';
  const governorate = locationTerms.length > 0 ? locationTerms[0].name : 'غير محدد';
  const city = locationTerms.length > 1 ? locationTerms[1].name : 'غير محدد';
  
  const title = acf.organization_name || caseItem.title?.rendered || 'بدون عنوان'; 

  // تحليل حقل الكميات النصي (project_needs_quantities_text)
  const quantitiesMap = new Map<string, number>();
  if (acf.project_needs_quantities_text) {
    const pairs = acf.project_needs_quantities_text.split(',');
    pairs.forEach(pair => {
      const [needId, quantity] = pair.split('=').map(s => s.trim());
      if (needId && quantity) {
        quantitiesMap.set(String(needId), Number(quantity));
      }
    });
  }

  const allNeeds = await getNeedsList();
  const allNeedsMap = new Map(allNeeds.map(n => [String(n.id), n]));

  // ⭐ التعديل هنا: التأكد من أن acf.selected_project_needs هو مصفوفة، وإلا يتم استخدام مصفوفة فارغة
  const needs = (Array.isArray(acf.selected_project_needs) ? acf.selected_project_needs : []).map((selectedNeed: any) => {
    const fullNeedData = allNeedsMap.get(String(selectedNeed.ID));
    
    const retrievedQuantity = quantitiesMap.get(String(selectedNeed.ID)) || 0;

    return {
      id: selectedNeed.ID,
      item: selectedNeed.post_title,
      unitPrice: fullNeedData?.unitPrice || 0,
      quantity: retrievedQuantity,
      funded: 0,
      description: fullNeedData?.description || '', 
      image: selectedNeed._embedded?.['wp:featuredmedia']?.[0]?.source_url || fullNeedData?.image || '/images/default-need.jpg',
      category: fullNeedData?.category || 'غير محدد', 
      icon: fullNeedData?.icon || 'fas fa-box-open', 
    };
  });

  let caseImages: string[] = [];
  const featuredMediaUrl = caseItem._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (featuredMediaUrl) {
    caseImages.push(featuredMediaUrl);
  }
  const galleryImage = acf.gallery_images;
  if (typeof galleryImage === 'object' && galleryImage !== null && galleryImage.url) {
    caseImages.push(galleryImage.url);
  }
  if (caseImages.length === 0) {
    caseImages.push('/images/default.jpg');
  }

  const fundNeeded = Number(acf.total_needed) || 0;
  const fundRaised = Number(acf.total_donated) || 0;
  const progress = fundNeeded > 0 ? Math.round((fundRaised / fundNeeded) * 100) : 0;
  const isUrgent = acf.need_level === 'عالي';

  return {
    id: caseItem.id,
    title: title,
    description: acf.description || caseItem.content?.rendered,
    governorate: governorate,
    city: city,
    type: type,
    needLevel: acf.need_level || 'غير محدد',
    isUrgent: isUrgent,
    needs: needs,
    fundNeeded: fundNeeded,
    fundRaised: fundRaised,
    progress: progress,
    images: caseImages,
  };
}