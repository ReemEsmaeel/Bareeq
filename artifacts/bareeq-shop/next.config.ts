import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
  ],
  // The routed Vercel deployment serves original files, but /_next/image
  // returns 404. Avoid generating optimizer URLs for homepage/collection photos.
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
