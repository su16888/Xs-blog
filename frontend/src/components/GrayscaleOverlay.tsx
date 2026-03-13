/**
 * @file GrayscaleOverlay.tsx
 * @description 全局灰度蒙版组件 - 当后台设置主题颜色为灰色时，前台所有页面应用灰度效果
 */

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/contexts/SettingsContext'
import { isAdminPage } from '@/lib/adminConfig'

// 设置 cookie
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

export default function GrayscaleOverlay() {
  const pathname = usePathname()
  const { settings, isLoading } = useSettings()
  const [mounted, setMounted] = useState(false)

  const isAdmin = isAdminPage(pathname)
  const themeColor = settings.themeColor

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || isLoading) return

    // 将 themeColor 写入 cookie
    if (themeColor) {
      setCookie('themeColor', themeColor)
    }

    // 当主题颜色为灰色时，自动将用户主题设置为黑色
    if (themeColor === 'gray') {
      setCookie('theme', 'black')
      document.documentElement.setAttribute('data-theme', 'black')
    }

    // 后台页面不应用灰度效果
    if (isAdmin) {
      document.documentElement.style.filter = ''
      document.body.style.filter = ''
      return
    }

    // 当主题颜色为灰色时，应用全局灰度效果到 html 和 body
    if (themeColor === 'gray') {
      document.documentElement.style.filter = 'grayscale(100%)'
      document.body.style.filter = 'grayscale(100%)'
    } else {
      document.documentElement.style.filter = ''
      document.body.style.filter = ''
    }

    return () => {
      document.documentElement.style.filter = ''
      document.body.style.filter = ''
    }
  }, [themeColor, isAdmin, mounted, isLoading])

  // 后台页面或非灰色主题不渲染蒙版
  if (!mounted || isAdmin || themeColor !== 'gray') {
    return null
  }

  // 渲染一个最高层级的灰度蒙版，确保覆盖所有内容包括加载动画
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        pointerEvents: 'none',
        backdropFilter: 'grayscale(100%)',
        WebkitBackdropFilter: 'grayscale(100%)',
      }}
    />
  )
}
