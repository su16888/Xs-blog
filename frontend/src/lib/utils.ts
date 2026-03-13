/**
 * @file utils.ts
 * @description Xs-Blog 前端工具函数库
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

import { type ClassValue, clsx } from 'clsx'
import clientCache from './clientCache'

/**
 * 合并 className
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (months < 12) return `${months}个月前`
  return `${years}年前`
}

/**
 * 截断文本
 */
export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * 获取 API 基础 URL
 * 通过环境变量 NEXT_PUBLIC_API_URL 配置
 */
export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

  if (apiUrl) {
    const trimmed = apiUrl.trim()

    // 相对路径（Nginx 反代模式）：返回空字符串，让资源使用相对路径
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return ''
    }

    // 完整 URL：去掉末尾的 /api
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(/\/api$/, '')
    }
  }

  // 客户端自动检测：使用当前域名 + 3001 端口
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:3001`
  }

  // SSR 降级
  return 'http://localhost:3001'
}

/**
 * 获取文件 URL
 */
export function getFileUrl(path: string): string {
  if (!path) return ''

  // 确保 path 是字符串类型
  const pathStr = typeof path === 'string' ? path : String(path)

  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr
  const baseUrl = getApiBaseUrl()
  // 确保路径以 / 开头
  const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`
  return `${baseUrl}${normalizedPath}`
}

/**
 * 安全的 fetch 包装器，处理服务器端相对路径问题，支持客户端缓存和请求去重
 * @param url - 请求地址
 * @param options - fetch 选项
 * @param useCache - 是否使用缓存（默认 true）
 * @param cacheTTL - 自定义缓存时间（毫秒），不传则使用系统配置
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  useCache: boolean = true,
  cacheTTL?: number
): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET'
  const isGetRequest = method === 'GET'

  // 只有 GET 请求才使用缓存和去重
  if (isGetRequest && useCache && typeof window !== 'undefined') {
    // 尝试从缓存获取
    const cached = clientCache.get(url)
    if (cached) {
      // console.log(`✓ 缓存命中: ${url}`)
      // 返回模拟的 Response 对象
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 使用请求去重
    return clientCache.dedupeRequest(url, async () => {
      return performFetch(url, options, isGetRequest, useCache, cacheTTL)
    })
  }

  // 非GET请求或不使用缓存，直接执行
  return performFetch(url, options, isGetRequest, useCache, cacheTTL)
}

/**
 * 执行实际的fetch请求
 */
async function performFetch(
  url: string,
  options?: RequestInit,
  isGetRequest: boolean = true,
  useCache: boolean = true,
  cacheTTL?: number
): Promise<Response> {
  // API路径固定为 /api/admin/，不再进行动态替换
  // 前端自定义路径只影响页面路由，不影响API路径
  const processedUrl = url

  // 如果已经是完整URL，直接使用
  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://')) {
    const response = await fetch(processedUrl, options)

    // 缓存成功的 GET 响应
    if (isGetRequest && useCache && response.ok && typeof window !== 'undefined') {
      try {
        const clone = response.clone()
        const data = await clone.json()
        await clientCache.set(processedUrl, data, cacheTTL)
        // console.log(`✓ 已缓存: ${processedUrl}`)
      } catch (error) {
        // 如果响应不是 JSON，忽略缓存
      }
    }

    return response
  }

  // 服务器端：构造完整URL
  if (typeof window === 'undefined') {
    const baseUrl = getApiBaseUrl()
    const fullUrl = processedUrl.startsWith('/') ? `${baseUrl}${processedUrl}` : `${baseUrl}/${processedUrl}`
    return fetch(fullUrl, options)
  }

  // 客户端：直接使用相对路径
  const response = await fetch(processedUrl, options)

  // 缓存成功的 GET 响应
  if (isGetRequest && useCache && response.ok) {
    try {
      const clone = response.clone()
      const data = await clone.json()
      await clientCache.set(processedUrl, data, cacheTTL)
      // console.log(`✓ 已缓存: ${processedUrl}`)
    } catch (error) {
      // 如果响应不是 JSON，忽略缓存
    }
  }

  return response
}

/**
 * 验证邮箱
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * 验证 URL（支持相对路径）
 * 支持格式：
 * - 完整URL: http://... 或 https://...
 * - 相对路径: /xxx, /, #, #xxx, ./xxx, ../xxx
 * - 锚点链接: #section
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  const trimmedUrl = url.trim()
  if (!trimmedUrl) return false

  // 支持相对路径和锚点
  if (trimmedUrl.startsWith('/') ||
      trimmedUrl.startsWith('#') ||
      trimmedUrl.startsWith('./') ||
      trimmedUrl.startsWith('../')) {
    return true
  }

  // 验证完整URL
  try {
    new URL(trimmedUrl)
    return true
  } catch {
    return false
  }
}

/**
 * 生成随机 ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 获取图标类名（用于社交媒体图标）
 */
export function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    github: 'github',
    twitter: 'twitter',
    linkedin: 'linkedin',
    facebook: 'facebook',
    instagram: 'instagram',
    youtube: 'youtube',
    weibo: 'weibo',
    wechat: 'message-circle',
    email: 'mail',
    website: 'globe',
  }

  return icons[platform.toLowerCase()] || 'link'
}

/**
 * 获取缩略图路径
 * 将原图路径转换为缩略图路径
 * 例如: /uploads/notes/image.jpg -> /uploads/Thumbnail/notes/image.jpg
 * @param originalPath - 原图路径
 * @returns 缩略图路径
 */
export function getThumbnailUrl(originalPath: string): string {
  if (!originalPath) return ''

  // 确保 path 是字符串类型
  const pathStr = typeof originalPath === 'string' ? originalPath : String(originalPath)

  // 如果是完整 URL，提取路径部分处理
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    try {
      const url = new URL(pathStr)
      if (url.pathname.includes('/uploads/') && !url.pathname.includes('/uploads/Thumbnail/')) {
        url.pathname = url.pathname.replace('/uploads/', '/uploads/Thumbnail/')
        return url.toString()
      }
      return pathStr
    } catch {
      return pathStr
    }
  }

  // 相对路径处理
  if (pathStr.includes('/uploads/') && !pathStr.includes('/uploads/Thumbnail/')) {
    const thumbnailPath = pathStr.replace('/uploads/', '/uploads/Thumbnail/')
    return getFileUrl(thumbnailPath)
  }

  return getFileUrl(pathStr)
}

/**
 * 获取缩略图 URL（带完整域名）
 * 用于列表页显示小图，加快加载速度
 * @param originalPath - 原图路径
 * @param fallbackToOriginal - 如果缩略图不存在是否回退到原图，默认 true
 */
export function getOptimizedImageUrl(originalPath: string, fallbackToOriginal: boolean = true): string {
  if (!originalPath) return ''

  // 不处理 GIF、SVG、ICO 等格式
  const ext = originalPath.toLowerCase().split('.').pop()
  if (['gif', 'svg', 'ico'].includes(ext || '')) {
    return getFileUrl(originalPath)
  }

  return getThumbnailUrl(originalPath)
}
