import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MODARA_STAGING_BROWSER_TEST === '1' ? '.next-staging' : '.next',
};

export default nextConfig;
