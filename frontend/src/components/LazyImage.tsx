'use client'

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  /** 图片源地址 */
  src: string
  /** 图片加载前显示的占位图 */
  placeholder?: string
  /** 图片加载失败时显示的图片 */
  fallback?: string
  /** 根边距，用于提前触发加载 */
  rootMargin?: string
  /** 图片容器类名 */
  wrapperClassName?: string
  /** 是否显示加载动画 */
  showLoader?: boolean
  /** 加载成功回调 */
  onLoad?: () => void
  /** 加载失败回调 */
  onError?: () => void
}

/**
 * 图片懒加载组件
 *
 * 功能：
 * 1. 使用 Intersection Observer API 实现懒加载
 * 2. 支持占位图和加载失败图
 * 3. 支持加载动画
 * 4. 图片淡入效果
 * 5. 自动优化性能
 *
 * 使用示例：
 * ```tsx
 * <LazyImage
 *   src="/uploads/image.jpg"
 *   alt="图片描述"
 *   className="w-full h-auto"
 *   placeholder="/placeholder.svg"
 *   fallback="/error.svg"
 *   showLoader
 * />
 * ```
 */
export default function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
  fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="20"%3E加载失败%3C/text%3E%3C/svg%3E',
  rootMargin = '200px',
  className,
  wrapperClassName,
  showLoader = false,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder)
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // 如果浏览器不支持 Intersection Observer，直接加载图片
    if (!('IntersectionObserver' in window)) {
      loadImage(src)
      return
    }

    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage(src)
            // 停止观察
            if (imgRef.current && observerRef.current) {
              observerRef.current.unobserve(imgRef.current)
            }
          }
        })
      },
      {
        rootMargin,
        threshold: 0.01 // 只要出现1%就开始加载
      }
    )

    // 开始观察
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [src, rootMargin])

  /**
   * 加载图片
   */
  const loadImage = (imageSrc: string) => {
    const img = new Image()

    img.onload = () => {
      setImageSrc(imageSrc)
      setImageStatus('loaded')
      onLoad?.()
    }

    img.onerror = () => {
      setImageSrc(fallback)
      setImageStatus('error')
      onError?.()
    }

    img.src = imageSrc
  }

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* 图片 */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt || ''}
        className={cn(
          'transition-opacity duration-300',
          imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />

      {/* 加载动画 */}
      {showLoader && imageStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>
      )}

      {/* 骨架屏（可选） */}
      {!showLoader && imageStatus === 'loading' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
      )}
    </div>
  )
}
