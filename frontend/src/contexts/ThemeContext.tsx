'use client'

import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import { isAdminPage } from '@/lib/adminConfig'
import { usePathname } from 'next/navigation'

type Theme = 'white' | 'gray' | 'black'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Cookie 操作函数
function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

// 同步主题到 promo-theme（用于 promo 页面）
function syncToPromoTheme(theme: Theme) {
  const promoTheme = theme === 'black' ? 'dark' : 'light'
  localStorage.setItem('promo-theme', promoTheme)
}

// 使用 useLayoutEffect 在客户端，useEffect 在服务端
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = isAdminPage(pathname)

  // 使用惰性初始化，在客户端立即读取 Cookie
  const [theme, setTheme] = useState<Theme>(() => {
    // 服务端渲染时返回默认值
    if (typeof window === 'undefined') {
      return 'black'
    }

    // 后台页面始终使用白色主题
    if (isAdminPage(window.location.pathname)) {
      return 'white'
    }

    // 客户端立即读取 Cookie
    try {
      const savedTheme = getCookie('theme') as Theme
      if (savedTheme && ['white', 'gray', 'black'].includes(savedTheme)) {
        return savedTheme
      }
    } catch (error) {
      // Cookie 读取失败，使用默认值
    }

    return 'black'
  })

  // 使用 useLayoutEffect 在 DOM 更新前同步设置后台主题，避免闪烁
  useIsomorphicLayoutEffect(() => {
    if (isAdmin) {
      // 立即设置后台为白色主题，在浏览器绑定前执行
      document.documentElement.setAttribute('data-theme', 'white')
      document.documentElement.classList.remove('theme-white', 'theme-gray', 'theme-black')
      document.documentElement.classList.add('theme-white')
      document.documentElement.style.backgroundColor = '#f8fafc'
      document.body.style.backgroundColor = '#f8fafc'
    }
  }, [isAdmin])

  useEffect(() => {
    // 后台页面完全跳过主题加载逻辑
    if (isAdmin) {
      return
    }

    // 再次从 Cookie 加载保存的主题（确保路由切换时也能正确加载）
    try {
      const savedTheme = getCookie('theme') as Theme
      if (savedTheme && ['white', 'gray', 'black'].includes(savedTheme)) {
        setTheme(savedTheme)
      }
    } catch (error) {
      // Cookie 不可用，静默失败
    }
  }, [isAdmin])

  useEffect(() => {
    // 后台页面完全跳过主题应用逻辑（已在 useLayoutEffect 中处理）
    if (isAdmin) {
      return
    }

    // 保存主题到 Cookie（有效期365天）
    try {
      setCookie('theme', theme, 365)
      // 同步到 promo-theme，保持 promo 页面主题一致
      syncToPromoTheme(theme)
    } catch (error) {
      // Cookie 不可用，静默失败（主题不会持久化但应用仍正常运行）
    }

    // 前台页面应用主题 - 使用平滑过渡
    // 先移除所有主题类，然后添加当前主题类
    document.documentElement.classList.remove('theme-white', 'theme-gray', 'theme-black')
    document.documentElement.classList.add(`theme-${theme}`)

    // 设置 data-theme 属性，触发CSS变量更新
    document.documentElement.setAttribute('data-theme', theme)

    // 同步更新 backgroundColor，确保与主题一致
    const backgroundColor = theme === 'white' ? '#f8fafc' : (theme === 'gray' ? '#f8fafc' : '#0F172A')
    document.documentElement.style.backgroundColor = backgroundColor
    document.body.style.backgroundColor = backgroundColor
  }, [theme, isAdmin])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
