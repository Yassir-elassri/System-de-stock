/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable development tools for faster builds
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable source maps for faster builds
  productionBrowserSourceMaps: false,
  // Optimize for speed
  compress: true,
  poweredByHeader: false,
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Optimize webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable source maps in development for faster builds
      config.devtool = false;
      // Disable bundle analyzer
      config.plugins = config.plugins.filter(plugin => 
        plugin.constructor.name !== 'BundleAnalyzerPlugin'
      );
      
      // Optimize for development speed
      config.watchOptions = {
        poll: false,
        ignored: ['**/node_modules', '**/.next', '**/backups'],
      };
    }
    
    // Optimize for production builds
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    return config;
  },
}

export default nextConfig
