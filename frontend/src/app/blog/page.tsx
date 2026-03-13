/**
 * @file blog/page.tsx
 * @description 博客模式（博客主题）- 固定路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/contexts/SettingsContext'
import HomeContent from '@/components/HomeContent'

export default function BlogPage() {
  const router = useRouter()
  const { settings: rawSettings, isLoading } = useSettings()

  // 检查是否启用了 /blog 页面访问
  useEffect(() => {
    if (!isLoading && rawSettings.enableBlogPage !== 'true') {
      router.replace('/404')
    }
  }, [isLoading, rawSettings.enableBlogPage, router])

  // 如果未启用，显示加载状态（等待跳转）
  if (!isLoading && rawSettings.enableBlogPage !== 'true') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">跳转中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <HomeContent forceThemeType="blog" rawSettings={rawSettings} isLoading={isLoading} />
    </>
  )
}
