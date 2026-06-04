import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static-vinpearl.vinpearl.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vinwonders.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
