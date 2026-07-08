/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'your-domain.com', 'img.youtube.com', 'i.ytimg.com'],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Ensure font-awesome works
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@fortawesome/fontawesome-svg-core': '@fortawesome/fontawesome-svg-core',
    };
    return config;
  },
};

export default nextConfig;