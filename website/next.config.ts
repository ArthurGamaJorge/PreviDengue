import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
  images: {
    domains: ['picsum.photos', 'avatars.githubusercontent.com'],
  },
};

export default nextConfig;