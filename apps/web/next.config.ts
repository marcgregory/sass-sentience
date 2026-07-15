import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output when building for Docker (Linux CI).
  // Symlink creation fails on Windows without admin rights, so it's
  // opt-in via NEXT_STANDALONE env var (set in Dockerfile build args).
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" } : {}),
  transpilePackages: [
    "@sentience/types",
    "@sentience/utils",
    "@sentience/ui",
    "@sentience/hooks",
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
