/** @type {import('next').NextConfig} */
const nextConfig = {
  // تم تفعيل هذا الإعداد لإنشاء مجلد 'out'
  //output: 'export',

  // هذا الإعداد يُنصح به عند استخدام 'output: export' لتجنب أخطاء تحسين الصور
  // مع بعض أنواع الاستضافات الثابتة. يمكنك تركه هكذا.
  images: {
    unoptimized: true,
  },

  // ✅ تم إضافة هذا الجزء لحل مشكلة CORS مع Stripe
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network; style-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;