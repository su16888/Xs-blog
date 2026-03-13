/**
 * @file FloatingButtons.tsx
 * @description 悬浮按钮容器组件 - 统一管理主题切换和回到顶部按钮，手机端支持拖动
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.2.0
 * @created 2025-11-21
 * @updated 2025-11-24
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { isAdminPage } from '@/lib/adminConfig'
import { Moon, Sun, ChevronUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function FloatingButtons() {
  const pathname = usePathname()

  const isExcludedPage = pathname.startsWith('/enterprise') || pathname.startsWith('/promo') || pathname.startsWith('/social-feed')
  const isAdmin = isAdminPage(pathname)
  const isAdminRef = useRef(false)
  const isExcludedPageRef = useRef(false)
  isAdminRef.current = isAdmin
  isExcludedPageRef.current = isExcludedPage
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isIdle, setIsIdle] = useState(true) // 静止状态 - 默认半透明隐藏

  // 拖动相关状态
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const hasMoved = useRef(false)
  const idleTimer = useRef<NodeJS.Timeout | null>(null)
  const justWokeUp = useRef(false) // 刚刚唤醒标记

  // 重置静止计时器（仅手机端生效）
  const resetIdleTimer = useCallback((fromWakeUp = false) => {
    if (!isMobile) return // PC端不参与idle状态

    if (fromWakeUp) {
      justWokeUp.current = true
      // 500ms后才允许点击（等动画完成）
      setTimeout(() => {
        justWokeUp.current = false
      }, 500)
    }
    setIsIdle(false)
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
    }
    idleTimer.current = setTimeout(() => {
      setIsIdle(true)
    }, 1000) // 1秒后进入静止状态
  }, [isMobile])

  useEffect(() => {
    // 检测是否为手机端
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // PC端不参与idle状态，直接设为false（完全显示）
      if (!mobile) {
        setIsIdle(false)
      }
    }

    // 延迟初始化，不阻塞首屏渲染
    const initFloatingButtons = () => {
      setMounted(true)
      checkMobile()
      window.addEventListener('resize', checkMobile)

      // 从localStorage恢复位置
      const savedPosition = localStorage.getItem('floatingButtonsPosition')
      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition))
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 使用 requestIdleCallback 延迟初始化，优先保证首屏渲染
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initFloatingButtons, { timeout: 2000 })
    } else {
      setTimeout(initFloatingButtons, 500)
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
      if (idleTimer.current) {
        clearTimeout(idleTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    const checkScroll = () => {
      if (isAdminRef.current || isExcludedPageRef.current) return
      setShowScrollTop(window.scrollY > 300)
    }

    // 监听 docs 页面的自定义滚动事件
    const handleDocsScroll = (e: Event) => {
      if (isAdminRef.current || isExcludedPageRef.current) return
      const customEvent = e as CustomEvent<{ scrollTop: number; canScrollTop: boolean }>
      setShowScrollTop(customEvent.detail.canScrollTop)
    }

    window.addEventListener('scroll', checkScroll)
    window.addEventListener('docsPageScroll', handleDocsScroll)

    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('docsPageScroll', handleDocsScroll)
    }
  }, [])

  // 保存位置到localStorage
  const savePosition = useCallback((pos: { x: number; y: number }) => {
    localStorage.setItem('floatingButtonsPosition', JSON.stringify(pos))
  }, [])

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return
    const touch = e.touches[0]
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    setIsDragging(true)
    hasMoved.current = false
    resetIdleTimer()
  }, [isMobile, position, resetIdleTimer])

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return
    e.preventDefault()
    const touch = e.touches[0]
    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y

    // 边界限制
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      const clampedX = Math.max(-maxX, Math.min(0, newX))
      const clampedY = Math.max(-maxY, Math.min(0, newY))

      setPosition({ x: clampedX, y: clampedY })
      hasMoved.current = true
    }
  }, [isDragging, isMobile, dragStart])

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (isDragging && hasMoved.current) {
      savePosition(position)
    }
    setIsDragging(false)
    resetIdleTimer()
  }, [isDragging, position, savePosition, resetIdleTimer])

  // 点击容器唤醒（仅手机端）
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isMobile) return // PC端不需要唤醒逻辑
    if (isIdle) {
      e.stopPropagation()
      resetIdleTimer(true) // 标记为唤醒
    }
  }

  const toggleTheme = () => {
    if (hasMoved.current) return // 拖动后不触发点击
    if (isMobile && (isIdle || justWokeUp.current)) return // 手机端必须完全出来才能点击
    const newTheme = theme === 'black' ? 'white' : 'black'
    setTheme(newTheme)
  }

  const scrollToTop = () => {
    if (hasMoved.current) return // 拖动后不触发点击
    if (isMobile && (isIdle || justWokeUp.current)) return // 手机端必须完全出来才能点击

    // 尝试 docs 页面的滚动容器
    const docsContent = document.querySelector('[data-docs-content]')
    if (docsContent) {
      docsContent.scrollTo({ top: 0, behavior: 'smooth' })
      // 同时滚动左侧文档列表和右侧目录到顶部
      const docsSidebars = document.querySelectorAll('[data-docs-sidebar]')
      docsSidebars.forEach(sidebar => {
        sidebar.scrollTo({ top: 0, behavior: 'smooth' })
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // 鼠标进入时恢复（仅手机端）
  const handleMouseEnter = () => {
    if (!isMobile) return // PC端不需要唤醒逻辑
    if (isIdle) {
      resetIdleTimer(true) // 标记为唤醒
    }
  }

  // 后台页面不显示悬浮球
  if (isAdmin || isExcludedPage || !mounted) {
    return null
  }

  const buttonClass = `
    w-12 h-12 rounded-full shadow-lg border-2 transition-all duration-300
    flex items-center justify-center relative overflow-hidden
    hover:scale-110 active:scale-95
    ${
      theme === 'black'
        ? 'bg-bg-secondary text-text-primary border-border-primary hover:bg-bg-tertiary'
        : 'bg-bg-tertiary text-text-primary border-border-primary hover:bg-bg-secondary'
    }
  `

  // 计算位移：手机端拖动位置 + idle时向右隐藏（PC端不参与）
  const getTransform = () => {
    let x = isMobile ? position.x : 0
    let y = isMobile ? position.y : 0

    // idle状态时向右移动40px（半隐藏效果）- 仅手机端
    if (isMobile && isIdle && !isDragging) {
      x += 40
    }

    return `translate(${x}px, ${y}px)`
  }

  // 计算透明度：PC端永远为1（完全显示）
  const getOpacity = () => {
    if (!isMobile) return 1 // PC端永远完全显示
    if (isDragging) return 0.8
    if (isIdle) return 0.3
    return 1
  }

  return (
    <div
      ref={containerRef}
      className="fixed right-4 md:right-8 z-[9998] flex flex-col gap-3 transition-all duration-500 ease-out cursor-pointer"
      style={{
        bottom: '102px',
        transform: getTransform(),
        touchAction: 'none',
        opacity: getOpacity()
      }}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
    >
      {/* 回到顶部按钮 */}
      <button
        onClick={scrollToTop}
        className={`${buttonClass} ${showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="回到顶部"
      >
        <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
      </button>

      {/* 主题切换按钮 */}
      <button
        onClick={toggleTheme}
        className={buttonClass}
        aria-label="切换主题"
      >
        {theme === 'black' ? (
          <Sun className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        ) : (
          <Moon className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        )}
      </button>
    </div>
  )
}
