/**
 * @file next.config.js
 * @description Next.js配置文件 - 包含代码保护配置
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

/** @type {import('next').NextConfig} */

// 从环境变量中提取后端端口和主机
const getBackendConfig = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  try {
    const url = new URL(apiUrl)
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80')
    }
  } catch (e) {
    console.warn('无法解析 NEXT_PUBLIC_API_URL，使用默认配置')
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: '3001'
    }
  }
}

const backendConfig = getBackendConfig()

const nextConfig = {
  // 输出配置 - 注释掉 standalone 模式，使用标准输出
  // output: 'standalone',  // 已禁用：standalone 模式会导致部署问题
  // 生产环境优化配置
  compiler: {
    // 移除开发环境代码
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    // React优化
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-testid$']
    } : false,
  },
  // 压缩配置
  compress: true,
  // 生成source map（生产环境可关闭）
  productionBrowserSourceMaps: false,
  // Webpack配置 - 优化内存使用
  webpack: (config, { isServer, dev }) => {
    // 仅在生产环境的客户端代码中启用优化
    if (!isServer && !dev) {
      // 优化Terser配置，减少内存占用
      config.optimization.minimizer = config.optimization.minimizer || []

      const TerserPlugin = require('terser-webpack-plugin')

      // 移除默认的TerserPlugin
      config.optimization.minimizer = config.optimization.minimizer.filter(
        plugin => !(plugin instanceof TerserPlugin)
      )

      // 添加优化的TerserPlugin配置（降低内存占用）
      config.optimization.minimizer.push(
        new TerserPlugin({
          parallel: true,               // 启用并行处理
          terserOptions: {
            compress: {
              drop_console: true,       // 移除console
              drop_debugger: true,      // 移除debugger
              pure_funcs: ['console.log'], // 移除console.log调用
              passes: 1,                // 从 2 降低到 1，减少处理时间
            },
            mangle: {
              properties: false,        // 禁用属性名混淆，避免破坏API数据结构
            },
            format: {
              comments: false,          // 移除所有注释
            },
          },
          extractComments: false,       // 不提取注释到单独文件
        })
      )

      // 优化代码分割，减少单个chunk大小
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // 将大型库单独打包
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1]
              return `npm.${packageName?.replace('@', '')}`
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      }
    }

    return config
  },
  // 图片优化
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: backendConfig.protocol,
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        pathname: '/uploads/**',
      },
    ],
  },
  // API重写（仅在开发环境使用）
  async rewrites() {
    // 生产环境不使用重写，直接通过后端 API 动态获取配置
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    // 开发环境才使用重写
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  // 安全头配置
  async headers() {
    return [
      {
        source: '/:path((?!favicon.ico|.*\\.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
