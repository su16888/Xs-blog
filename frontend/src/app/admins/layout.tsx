'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import SEOMeta from '@/components/SEOMeta'
import AdminLayout from '@/components/AdminLayout'
import { PageTitleProvider } from '@/contexts/PageTitleContext'
import { getAdminPath, getAdminRoute } from '@/lib/adminConfig'

export default function AdminsLayout({
  children,
  skipPathCheck = false,
}: {
  children: React.ReactNode
  skipPathCheck?: boolean
}) {
  const pathname = usePathname()
  const isAllowed = skipPathCheck ? true : getAdminPath() === 'admins'

  // 检查是否允许访问 /admins/ 路径（仅当不跳过检查时）
  useEffect(() => {
    // 强制后台管理页面使用白色主题
    document.documentElement.setAttribute('data-theme', 'white')
    document.documentElement.classList.remove('dark')

    // 组件卸载时恢复用户主题
    return () => {
      // 从 cookie 中恢复主题，默认为 'black'
      const themeCookie = document.cookie.split(';').find(c => c.trim().startsWith('theme='))
      if (themeCookie) {
        const theme = themeCookie.split('=')[1]
        document.documentElement.setAttribute('data-theme', theme)
      } else {
        document.documentElement.setAttribute('data-theme', 'black')
      }
    }
  }, [skipPathCheck])

  // 如果不允许访问，返回404
  if (isAllowed === false) {
    notFound()
  }

  // 登录页面使用独立布局，不显示后台侧边栏
  const isLoginPage = pathname === getAdminRoute('login')

  if (isLoginPage) {
    return children
  }

  return (
    <PageTitleProvider>
      <SEOMeta forceNoIndex={true} />
      <AdminLayout>
        {children}
      </AdminLayout>
    </PageTitleProvider>
  )
}
