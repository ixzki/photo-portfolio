import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [480, 768, 960, 1200, 1440, 1920, 2560, 3200, 3840, 4800, 5120],
    imageSizes: [48, 96, 128, 256, 384],
    qualities: [24, 82, 86, 88],
  },
};

export default nextConfig;
