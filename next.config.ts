import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  transpilePackages: ["motion", "framer-motion"],
  allowedDevOrigins: ["192.168.29.203", "localhost:3000"],
};

export default nextConfig;
