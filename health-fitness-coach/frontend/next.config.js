import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    PYTHON_API_URL:      process.env.PYTHON_API_URL      || "http://localhost:8000",
  },

  reactStrictMode: true,

  // FIX: Added both .223 and .224 so Next.js allows cross-origin
  // requests from any device on the local network.
  // Previously only .224 was listed which caused the blocked request warning.
  allowedDevOrigins: [
    "192.168.29.223",
    "192.168.29.224",
  ],

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;