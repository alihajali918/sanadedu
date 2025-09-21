/** @type {import('next').NextConfig} */
const nextConfig = {
  // تم تفعيل هذا الإعداد لإنشاء مجلد 'out'
  //output: 'export',

  // هذا الإعداد يُنصح به عند استخدام 'output: export' لتجنب أخطاء تحسين الصور
  // مع بعض أنواع الاستضافات الثابتة. يمكنك تركه هكذا.
  images: {
    unoptimized: true,
  },

  // ✅ هذا الجزء هو المسؤول عن إضافة سياسة الأمان للمتصفح
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