/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Explicitly disable lightningcss usage
    swcPlugins: [],
    optimizeCss: false,
  },
};

export default nextConfig;