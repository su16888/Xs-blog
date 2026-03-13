/**
 * @file ScrollToTop.tsx
 * @description 回到顶部悬浮球组件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-21
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ScrollToTop() {
  const { theme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 只在客户端挂载后才渲染，避免 hydration 错误
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkScroll = () => {
      // 当页面滚动超过300px时显示回到顶部按钮
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', checkScroll)
    return () => window.removeEventListener('scroll', checkScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // 避免 hydration 错误
  if (!mounted) {
    return null
  }

  return (
    <div
      className={`fixed bottom-36 right-8 z-[9998] transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <button
        onClick={scrollToTop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          w-14 h-14 rounded-full shadow-lg border-2 border-border-primary transition-all duration-300
          flex items-center justify-center relative overflow-hidden
          hover:scale-110 active:scale-95
          bg-bg-secondary text-text-primary hover:bg-bg-tertiary
        `}
        aria-label="回到顶部"
      >
        {/* 背景渐变 */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          theme === 'black' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="w-full h-full bg-gradient-to-br from-bg-tertiary to-bg-secondary"></div>
        </div>

        <div className={`absolute inset-0 transition-opacity duration-300 ${
          theme === 'black' ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary"></div>
        </div>

        {/* 图标 */}
        <div className="relative z-10 transition-transform duration-300">
          <ChevronUp className="w-6 h-6" />
        </div>

        {/* 悬停效果 */}
        {isHovered && (
          <div className="absolute inset-0 rounded-full border-2 border-primary-500 animate-pulse"></div>
        )}
      </button>

      {/* 提示文字 */}
      {isHovered && (
        <div className={`
          absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
          transition-all duration-200 shadow-lg
          bg-bg-secondary text-text-primary border border-border-primary
        `}>
          回到顶部
        </div>
      )}
    </div>
  )
}