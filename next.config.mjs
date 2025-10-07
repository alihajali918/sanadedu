/** @type {import('next').NextConfig} */
const nextConfig = {
    // نترك output: 'export' معلقاً كما كان
    // output: 'export',

    images: {
        unoptimized: true, // نتركها unoptimized كما هي
                // 💡 [إضافة مهمة] السماح بالصور من النطاق الخارجي
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cms.sanadedu.org', // يجب التأكد من أن هذا هو نطاق الـ CMS الفعلي
                port: '',
                pathname: '/wp-content/uploads/**', // مسار الرفع الافتراضي
            },
        ],
    },

    // ✅ هذا الجزء هو المسؤول عن إضافة سياسة الأمان للمتصفح (نتركه كما هو)
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://m.stripe.network https://cdnjs.cloudflare.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://cdnjs.cloudflare.com;`,
                    },
                ],
            },
        ];
    },
};

export default nextConfig;