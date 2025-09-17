// next.config.mjs
const nextConfig = {
  // ...
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network; style-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://cdnjs.cloudflare.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;