/**
 * @file runtimeConfig.ts
 * @description 运行时配置加载模块
 *
 * 通过环境变量 NEXT_PUBLIC_API_URL 配置 API 地址
 * 支持的部署模式：
 * 1. Nginx 反向代理模式：NEXT_PUBLIC_API_URL=/api
 * 2. 前后端分离模式：NEXT_PUBLIC_API_URL=http://api.example.com:3001/api
 * 3. 同服务器部署模式：NEXT_PUBLIC_API_URL=http://localhost:3001/api
 */

/**
 * 获取 API URL
 */
function getApiUrl(): string {
  // 环境变量配置（构建时注入，SSR 和客户端均可读取）
  if (process.env.NEXT_PUBLIC_API_URL) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL.trim()
    if (apiUrl !== '') {
      return apiUrl
    }
  }

  // 客户端自动检测：使用当前域名 + 3001 端口
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:3001/api`
  }

  // SSR 降级
  return 'http://localhost:3001/api'
}

/**
 * 获取运行时配置
 */
export function getRuntimeConfig(): { apiUrl: string } {
  return {
    apiUrl: getApiUrl()
  }
}

/**
 * 清除配置缓存（保留接口兼容性）
 */
export function clearConfigCache() {
  // no-op
}
