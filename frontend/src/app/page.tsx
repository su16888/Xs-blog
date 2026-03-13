/**
 * @file page.tsx
 * @description Xs-Blog 前台首页
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

'use client'

import dynamic from 'next/dynamic'
import { useSettings } from '@/contexts/SettingsContext'
import HomeContent from '@/components/HomeContent'
import SEOMeta from '@/components/SEOMeta'
import './promo/promo.css'

// 加载动画组件
const LoadingSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #fff)' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-primary, #e5e7eb)', borderTopColor: 'var(--primary-500, #3b82f6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

// 动态导入非首屏组件，减少首屏 JS 体积
const PromoPage = dynamic(() => import('./promo/page'), {
  loading: () => <LoadingSpinner />
})
const SocialFeedPage = dynamic(() => import('./social-feed/page'), {
  loading: () => <LoadingSpinner />
})
const DocsIndexPage = dynamic(() => import('./docs/page'), {
  loading: () => <LoadingSpinner />
})

export default function Home() {
  const { settings: rawSettings, isLoading, hasCachedData } = useSettings()

  // 如果有缓存数据，直接渲染，不显示加载状态（实现丝滑切换）
  // 只有在完全没有数据时才显示加载动画
  if (isLoading && !hasCachedData) {
    return <LoadingSpinner />
  }

  // 当开启文档主题模式时，直接在根路径渲染文档中心内容，不再跳转
  if (rawSettings.docsThemeEnabled === 'true') {
    return (
      <>
        <SEOMeta />
        <DocsIndexPage />
      </>
    )
  }

  // 当开启朋友圈主题模式时，直接在根路径渲染朋友圈内容，不再跳转
  if (rawSettings.socialFeedThemeEnabled === 'true') {
    return (
      <>
        <SEOMeta />
        <SocialFeedPage />
      </>
    )
  }

  // 当开启官网主题模式时，直接在根路径渲染 promo 内容，不再跳转
  if (rawSettings.promoThemeEnabled === 'true') {
    return (
      <>
        <SEOMeta />
        <PromoPage />
      </>
    )
  }

  // 首页不强制主题类型，使用后台设置或用户选择
  return (
    <>
      <SEOMeta />
      <HomeContent rawSettings={rawSettings} isLoading={isLoading} />
    </>
  )
}
