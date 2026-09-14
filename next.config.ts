import type { NextConfig } from "next";

const nextConfig: NextConfig = {
allowedDevOrigins: ['192.168.1.4'],
experimental: {
  serverActions: {
    bodySizeLimit: '4mb',
  },
},
};

export default nextConfig;