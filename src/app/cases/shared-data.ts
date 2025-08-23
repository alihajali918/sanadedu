// src/app/cases/shared-data.ts

export interface Need {
    id: number; // تم تعديل النوع إلى number ليتوافق مع IDs ووردبريس
    item: string;
    quantity: number;
    unitPrice: number;
    funded: number;
    description: string;
    image: string;
    category: string;
    icon: string;
}

export interface OrderProgress {
    currentOrder: number;
    totalOrders: number;
    shippedPercentage: number;
}

export interface CaseItem {
    id: number;
    title: string;
    governorate: string;
    city: string;
    type: string;
    needLevel: string;
    isUrgent: boolean;
    description: string;
    images: string[];
    needs: Need[];
    orderProgress?: OrderProgress; // تم إضافة علامة ? لجعله اختياريًا
    progress: number;
    fundNeeded: number;
    fundRaised: number;
}

export const allDummyCases: CaseItem[] = [
    {
        id: 1,
        title: "مدرسة الأمل الابتدائية",
        governorate: "حلب",
        city: "حلب",
        type: "مدرسة",
        needLevel: "عالي",
        isUrgent: true,
        description: "مدرسة بحاجة ماسة لترميم الفصول وتوفير قرطاسية للطلاب...",
        images: [
            "/images/case-detail-1-1.jpg",
            "/images/case-detail-1-2.jpg",
            "/images/case-detail-1-3.jpg",
        ],
        needs: [
            // أثاث مدرسي
            { id: 101, item: "مقاعد دراسية", quantity: 50, unitPrice: 1, funded: 30, description: "مقاعد جديدة.", image: "/images/items/learnChair.jpg", category: "أثاث مدرسي", icon: "fas fa-chair" },
            { id: 102, item: "سبورة بيضاء", quantity: 5, unitPrice: 100, funded: 2, description: "سبورات حديثة للفصول.", image: "/images/items/tap.jpg", category: "أثاث مدرسي", icon: "fas fa-chalkboard" },
            { id: 103, item: "خزائن", quantity: 10, unitPrice: 150, funded: 1, description: "تخزين للمستلزمات.", image: "/images/items/library.jpg", category: "أثاث مدرسي", icon: "fas fa-cabinet-filing" },
            { id: 104, item: "أجهزة حاسوب", quantity: 15, unitPrice: 300, funded: 5, description: "أجهزة لغرفة الحاسوب.", image: "/images/items/laptop.jpg", category: "أثاث مدرسي", icon: "fas fa-computer" },
            { id: 105, item: "طاولات مدرسين", quantity: 5, unitPrice: 75, funded: 3, description: "طاولات لغرف المدرسين.", image: "/images/items/teachertable.jpg", category: "أثاث مدرسي", icon: "fas fa-table" },
            { id: 106, item: "سلال مهملات", quantity: 20, unitPrice: 10, funded: 15, description: "سلال قمامة للفصول.", image: "/images/items/trashcan.jpg", category: "أثاث مدرسي", icon: "fas fa-trash-can" },

            // تجهيز غرف صفية
            { id: 107, item: "أبواب صفوف", quantity: 8, unitPrice: 120, funded: 0, description: "أبواب جديدة للفصول.", image: "/images/items/woodChair.jpg", category: "تجهيز غرف صفية", icon: "fas fa-door-open" },
            { id: 108, item: "دهان غرفة صفية", quantity: 4, unitPrice: 200, funded: 1, description: "دهان لتجديد 4 فصول.", image: "/images/items/paint.jpg", category: "تجهيز غرف صفية", icon: "fas fa-paint-roller" },
            { id: 109, item: "نافذة ألمنيوم مع الشبك", quantity: 12, unitPrice: 90, funded: 0, description: "نوافذ جديدة للفصول.", image: "/images/items/window.jpg", category: "تجهيز غرف صفية", icon: "fas fa-window" },

            // أعمال كهربائية
            { id: 110, item: "مراوح سقفية", quantity: 10, unitPrice: 80, funded: 0, description: "مراوح للفصول والمكاتب.", image: "/images/items/fan.jpg", category: "أعمال كهربائية", icon: "fas fa-fan" },
            { id: 111, item: "منظومة طاقة شمسية", quantity: 1, unitPrice: 5000, funded: 0, description: "لتوفير الكهرباء للمدرسة.", image: "/images/items/solar.jpg", category: "أعمال كهربائية", icon: "fas fa-solar-panel" },

            // أعمال صحية وصرف صحي
            { id: 112, item: "تجهيز خلية عربية", quantity: 2, unitPrice: 300, funded: 0, description: "تجهيز دورات مياه جديدة.", image: "/images/items/toilet.jpg", category: "أعمال صحية وصرف صحي", icon: "fas fa-toilet" },
            { id: 113, item: "خزان مياه", quantity: 1, unitPrice: 700, funded: 0, description: "خزان مياه كبير للمدرسة.", image: "/images/items/watertank.jpg", category: "أعمال صحية وصرف صحي", icon: "fas fa-water-ladder" },

            // قسم ترفيهي
            { id: 114, item: "مجموعة ألعاب", quantity: 1, unitPrice: 150, funded: 0, description: "ألعاب حبال الشد.", image: "/images/items/games.jpg", category: "قسم الترفيهي", icon: "fas fa-gamepad" },
            { id: 115, item: "مجموعة كرات قدم + 2 مرمى", quantity: 1, unitPrice: 250, funded: 0, description: "مجموعة لملعب كرة القدم.", image: "/images/items/football.jpg", category: "قسم الترفيهي", icon: "fas fa-futbol" },

            // أخرى
            { id: 116, item: "دفاتر وقرطاسية", quantity: 200, unitPrice: 1, funded: 150, description: "دفاتر وأقلام...", image: "/images/items/tools.jpg", category: "أخرى", icon: "fas fa-book" },
        ],
        orderProgress: { currentOrder: 2, totalOrders: 50, shippedPercentage: 78 },
        progress: 75,
        fundNeeded: 15000,
        fundRaised: 11250,
    },
    {
        id: 2,
        title: "معهد النور القرآني",
        governorate: "دمشق",
        city: "دمشق",
        type: "مركز ديني",
        needLevel: "متوسط",
        isUrgent: false,
        description: "مركز ديني يعاني من نقص في الكتب والمصاحف...",
        images: [
            "/images/case-detail-2-1.jpg",
            "/images/case-detail-2-2.jpg",
        ],
        needs: [
            { id: 201, item: "مصحف شريف", quantity: 200, unitPrice: 15, funded: 100, description: "مصاحف طباعة فاخرة.", image: "/images/products/quran.jpg", category: "أخرى", icon: "fas fa-quran" },
            { id: 202, item: "جهاز تدفئة", quantity: 3, unitPrice: 300, funded: 1, description: "دفايات كهربائية للفصول.", image: "/images/products/heater.jpg", category: "أثاث مدرسي", icon: "fas fa-fan" },
        ],
        orderProgress: { currentOrder: 1, totalOrders: 10, shippedPercentage: 50 },
        progress: 50,
        fundNeeded: 8000,
        fundRaised: 4000,
    },
    // ... باقي الحالات تبقى كما هي ...
    { id: 3, title: "مدرسة النجاح الإعدادية", governorate: "حمص", city: "تدمر", type: "مدرسة", needLevel: "عالي", isUrgent: true, description: "بحاجة إلى مقاعد دراسية جديدة وألواح بيضاء حديثة.", images: ["/images/cases/case1.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 90, fundNeeded: 10000, fundRaised: 9000 },
    { id: 4, title: "جمعية السلام الخيرية", governorate: "اللاذقية", city: "اللاذقية", type: "جمعية خيرية", needLevel: "منخفض", isUrgent: false, description: "تقدم دورات تقوية لطلاب البكالوريا.", images: ["/images/cases/case2.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 30, fundNeeded: 12000, fundRaised: 3600 },
    { id: 5, title: "روضة المستقبل المشرق", governorate: "حماة", city: "مصياف", type: "روضة أطفال", needLevel: "متوسط", isUrgent: true, description: "تحتاج إلى ألعاب تعليمية ومفروشات آمنة للأطفال الصغار.", images: ["/images/cases/case3.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 65, fundNeeded: 7000, fundRaised: 4550 },
    { id: 6, title: "مدرسة الشهداء الثانوية", governorate: "دير الزور", city: "الميادين", type: "مدرسة", needLevel: "عالي", isUrgent: false, description: "تفتقر للمختبرات العلمية وأدوات التجارب الأساسية.", images: ["/images/cases/case4.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 20, fundNeeded: 20000, fundRaised: 4000 },
    { id: 7, title: "مسجد الفاروق الكبير", governorate: "حلب", city: "حلب الجديدة", type: "مركز ديني", needLevel: "منخفض", isUrgent: false, description: "بحاجة لترميمات داخلية وتجديد نظام الصوت.", images: ["/images/cases/case1.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 100, fundNeeded: 5000, fundRaised: 5000 },
    { id: 8, title: "معهد الأمل لتعليم القرآن", governorate: "دمشق", city: "دوما", type: "مركز ديني", needLevel: "متوسط", isUrgent: false, description: "يحتاج لمزيد من المصاحف وتوسيع مكتبته.", images: ["/images/cases/case2.jpg"], needs: [], orderProgress: { currentOrder: 0, totalOrders: 0, shippedPercentage: 0 }, progress: 80, fundNeeded: 3000, fundRaised: 2400 },
];