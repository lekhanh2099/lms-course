import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 experimental: {
  dynamicIO: true,
  authInterrupts: true,
  optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  middlewarePrefetch: "strict",
 },
 eslint: {
  ignoreDuringBuilds: true,
 },
};

export default nextConfig;
