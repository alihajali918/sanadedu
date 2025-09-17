// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' https://js.stripe.com https://m.stripe.network blob:",
              "style-src  'self' 'unsafe-inline' https:",
              "img-src    'self' data: https:",
              "connect-src 'self' https://api.stripe.com https://r.stripe.com https://m.stripe.network",
              "frame-src  https://js.stripe.com https://hooks.stripe.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'"
            ].join("; ")
          }
        ]
      }
    ];
  }
};
