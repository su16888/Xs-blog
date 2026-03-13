'use client'

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { cn, getThumbnailUrl } from '@/lib/utils'

interface BlurImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  /** 原图地址 */
  src: string
  /** 是否启用模糊占位效果 */
  enableBlur?: boolean
  /** 图片加载失败时显示的图片 */
  fallback?: string
  /** 根边距，用于提前触发加载 */
  rootMargin?: string
  /** 图片容器类名 */
  wrapperClassName?: string
  /** 加载成功回调 */
  onLoad?: () => void
  /** 加载失败回调 */
  onError?: () => void
}

/**
 * 模糊占位图组件 (LQIP)
 *
 * 原理：
 * 1. 先加载缩略图（小图，约 20-50KB）
 * 2. 缩略图显示时带模糊效果
 * 3. 原图加载完成后平滑过渡，移除模糊
 *
 * 使用示例：
 * ```tsx
 * <BlurImage
 *   src="/uploads/notes/image.jpg"
 *   alt="图片描述"
 *   className="w-full h-auto object-cover"
 *   enableBlur
 * />
 * ```
 */
export default function BlurImage({
  src,
  alt,
  enableBlur = true,
  fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3C/svg%3E',
  rootMargin = '200px',
  className,
  wrapperClassName,
  onLoad,
  onError,
  ...props
}: BlurImageProps) {
  // 状态：'idle' | 'thumbnail' | 'loaded' | 'error'
  const [status, setStatus] = useState<'idle' | 'thumbnail' | 'loaded' | 'error'>('idle')
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 获取缩略图 URL
  const thumbnailSrc = enableBlur ? getThumbnailUrl(src) : src

  useEffect(() => {
    // 如果浏览器不支持 Intersection Observer，直接加载
    if (!('IntersectionObserver' in window)) {
      startLoading()
      return
    }

    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startLoading()
            // 停止观察
            if (containerRef.current && observerRef.current) {
              observerRef.current.unobserve(containerRef.current)
            }
          }
        })
      },
      {
        rootMargin,
        threshold: 0.01
      }
    )

    // 开始观察
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current)
    }

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [src, rootMargin])

  /**
   * 开始加载图片
   */
  const startLoading = () => {
    if (enableBlur && thumbnailSrc !== src) {
      // 先加载缩略图
      loadThumbnail()
    } else {
      // 直接加载原图
      loadOriginal()
    }
  }

  /**
   * 加载缩略图
   */
  const loadThumbnail = () => {
    const img = new Image()

    img.onload = () => {
      setCurrentSrc(thumbnailSrc)
      setStatus('thumbnail')
      // 缩略图加载完成后，开始加载原图
      loadOriginal()
    }

    img.onerror = () => {
      // 缩略图加载失败，直接加载原图
      loadOriginal()
    }

    img.src = thumbnailSrc
  }

  /**
   * 加载原图
   */
  const loadOriginal = () => {
    const img = new Image()

    img.onload = () => {
      setCurrentSrc(src)
      setStatus('loaded')
      onLoad?.()
    }

    img.onerror = () => {
      setCurrentSrc(fallback)
      setStatus('error')
      onError?.()
    }

    img.src = src
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', wrapperClassName)}
    >
      {/* 图片 */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt || ''}
          className={cn(
            'transition-all duration-500 ease-out',
            // 缩略图状态：显示模糊效果
            status === 'thumbnail' && 'blur-sm scale-105',
            // 加载完成：清晰显示
            status === 'loaded' && 'blur-0 scale-100',
            className
          )}
          {...props}
        />
      )}

      {/* 加载中的骨架屏 */}
      {status === 'idle' && (
        <div className="absolute inset-0 bg-bg-tertiary animate-pulse" />
      )}
    </div>
  )
}
