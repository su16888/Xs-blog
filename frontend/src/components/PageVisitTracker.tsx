/**
 * @file PageVisitTracker.tsx
 * @description 全局页面访问记录组件 - 在 layout 中使用，自动追踪页面访问
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { recordPageVisit } from '@/lib/api'
import { isAdminPage } from '@/lib/adminConfig'

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
  // 排除后台页面（使用动态判断）
  if (isAdminPage(pathname)) {
    return null
  }

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
 * 全局页面访问追踪组件
 */
export default function PageVisitTracker() {
  const pathname = usePathname()
  const lastRecordedPath = useRef<string>('')

  useEffect(() => {
    // 避免重复记录同一页面
    if (lastRecordedPath.current === pathname) return

    const pageType = getPageType(pathname)
    if (!pageType) return

    // 使用 requestIdleCallback 在浏览器空闲时记录，不影响页面性能
    const doRecord = () => {
      recordPageVisit(pageType, pathname)
      lastRecordedPath.current = pathname
    }

    let idleId: number | null = null
    let timerId: NodeJS.Timeout | null = null

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(doRecord, { timeout: 3000 })
    } else {
      // 降级方案：延迟 1 秒后记录
      timerId = setTimeout(doRecord, 1000)
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId)
      }
      if (timerId !== null) {
        clearTimeout(timerId)
      }
    }
  }, [pathname])

  // 不渲染任何内容
  return null
}
