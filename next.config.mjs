// next.config.mjs
const nextConfig = {
  // ... (إعداداتك الحالية)
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