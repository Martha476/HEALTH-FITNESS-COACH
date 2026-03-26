import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { i18n } from './next-i18next.config.mjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    PYTHON_API_URL: process.env.PYTHON_API_URL || "http://localhost:8000",
  },
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.29.224'],
  turbopack: {
    root: __dirname,
  },
  // i18n, // Removed for App Router compatibility
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

export default nextConfig;
