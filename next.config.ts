import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shine-shop.com.ua",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "shineshopb2b.com",
        pathname: "/**",
      },
    ],
    // Optimized device sizes for common viewports
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours (was 1 hour)
  },
  // Enable compression (Brotli on Vercel, gzip fallback)
  compress: true,
  // Long cache for static assets (fonts, JS, CSS, images)
  headers: async () => [
    {
      source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    // Font files — long cache
    {
      source: "/:all*(woff|woff2|ttf|otf|eot)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    // Security & performance headers for all pages
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "origin-when-cross-origin",
        },
      ],
    },
  ],
  // Experimental optimizations
  experimental: {
    // Tree-shake barrel imports for smaller bundles
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
