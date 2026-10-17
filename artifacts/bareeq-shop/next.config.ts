import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // These verified production aliases must share the canonical host before
    // sign-in, since session cookies and checkout origin checks are host-bound.
    return [
      "bareeq-wkla-reem-396b.vercel.app",
      "bareeq-wkla-git-main-reem-396b.vercel.app",
    ].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host.replaceAll(".", "\\.") }],
      destination: "https://bareeq-wkla.vercel.app/:path*",
      permanent: true,
    }));
  },
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
