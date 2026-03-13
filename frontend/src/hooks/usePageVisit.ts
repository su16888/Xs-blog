/**
 * @file usePageVisit.ts
 * @description 页面访问记录 Hook - 在页面加载时自动记录访问
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { recordPageVisit } from '@/lib/api'

// 页面类型映射
const PAGE_TYPE_MAP: { [key: string]: string } = {
  '/': 'home',
  '/social-feed': 'social-feed',
  '/notes': 'notes',
  '/navigation': 'navigation',
  '/galleries': 'galleries',
  '/services': 'services',
  '/messages': 'messages',
  '/docs': 'docs'
}

/**
 * 根据路径获取页面类型
 */
function getPageType(pathname: string): string | null {
  // 精确匹配
  if (PAGE_TYPE_MAP[pathname]) {
    return PAGE_TYPE_MAP[pathname]
  }

  // 前缀匹配
  for (const [prefix, type] of Object.entries(PAGE_TYPE_MAP)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) {
      return type
    }
  }

  return null
}

/**
 * 页面访问记录 Hook
 * 在组件挂载时自动记录一次页面访问
 */
export function usePageVisit() {
  const pathname = usePathname()
  const recorded = useRef(false)

  useEffect(() => {
    // 避免重复记录
    if (recorded.current) return

    const pageType = getPageType(pathname)
    if (!pageType) return

    // 延迟记录，避免影响页面加载性能
    const timer = setTimeout(() => {
      recordPageVisit(pageType, pathname)
      recorded.current = true
    }, 1000)

    return () => clearTimeout(timer)
  }, [pathname])
}

/**
 * 手动记录页面访问
 */
export function useManualPageVisit() {
  const pathname = usePathname()

  return (customPageType?: string) => {
    const pageType = customPageType || getPageType(pathname)
    if (pageType) {
      recordPageVisit(pageType, pathname)
    }
  }
}

export default usePageVisit
