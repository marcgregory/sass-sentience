import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@sentience/types",
    "@sentience/utils",
    "@sentience/ui",
    "@sentience/hooks",
    "@sentience/mock",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
    ],
  },
};

export default nextConfig;
