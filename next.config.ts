import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    dynamicIO: true,
    authInterrupts: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
