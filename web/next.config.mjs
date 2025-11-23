/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Explicitly disable lightningcss usage
    swcPlugins: [],
    optimizeCss: false,
  },
  compiler: {
    // Use fallback CSS engine
    css: {
      engine: 'postcss',
    },
  },
};

export default nextConfig;