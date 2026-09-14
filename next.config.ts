import type { NextConfig } from "next";
import { getImageRemotePatterns } from "./src/lib/image-hosts.mjs";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: getImageRemotePatterns(process.env.IMAGE_REMOTE_HOSTS),
    deviceSizes: [480, 768, 960, 1200, 1440, 1920, 2560, 3200, 3840, 4800, 5120],
    imageSizes: [48, 96, 128, 256, 384],
    qualities: [24, 82, 86, 88],
  },
};

export default nextConfig;
