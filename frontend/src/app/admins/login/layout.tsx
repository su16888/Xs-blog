'use client'

import SEOMeta from '@/components/SEOMeta'
import { PageTitleProvider } from '@/contexts/PageTitleContext'

/**
 * 登录页面独立布局
 * 不包含后台侧边栏，只显示纯净的登录界面
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTitleProvider>
      <SEOMeta forceNoIndex={true} />
      {children}
    </PageTitleProvider>
  )
}
