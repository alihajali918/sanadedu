/** @type {import('next').NextConfig} */
const nextConfig = {
  // تم تفعيل هذا الإعداد لإنشاء مجلد 'out'
  //output: 'export',

  // هذا الإعداد يُنصح به عند استخدام 'output: export' لتجنب أخطاء تحسين الصور
  // مع بعض أنواع الاستضافات الثابتة. يمكنك تركه هكذا.
  images: {
    unoptimized: true,
  },

  // يمكنك إضافة أي إعدادات أخرى هنا إذا كانت لديك
};

export default nextConfig;