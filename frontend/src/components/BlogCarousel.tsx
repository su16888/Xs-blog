'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getImageUrl } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'

interface CarouselImage {
  url: string
  alt: string
  link?: string
}

export default function BlogCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { settings: rawSettings, isLoading: settingsLoading } = useSettings()

  useEffect(() => {
    if (!settingsLoading) {
      // 解析轮播图
      try {
        const carouselImages = JSON.parse(rawSettings.blogCarouselImages || '[]')
        setImages(carouselImages.filter((img: CarouselImage) => img.url))
      } catch {
        setImages([])
      }
      setLoading(false)
    }
  }, [rawSettings.blogCarouselImages, settingsLoading])

  useEffect(() => {
    if (images.length > 1) {
      let interval: NodeJS.Timeout | null = null

      // 页面加载完成后 1.5 秒开始第一次切换，之后每隔 1.5 秒切换
      const timer = setTimeout(() => {
        // 第一次切换
        setCurrentIndex(1)
        // 之后每隔 1.5 秒继续切换
        interval = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
        }, 1500)
      }, 1500)

      return () => {
        clearTimeout(timer)
        if (interval) clearInterval(interval)
      }
    }
  }, [images.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  if (loading) {
    return (
      <div className="w-full aspect-video md:h-96 md:aspect-auto bg-bg-tertiary animate-pulse rounded-lg"></div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-sm bg-bg-secondary flex items-center justify-center aspect-video md:h-96 md:aspect-auto">
        <p className="text-text-tertiary text-sm">暂无轮播图，请在后台上传</p>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-sm aspect-video md:h-96 md:aspect-auto">
      {/* 轮播图容器 */}
      <div className="relative w-full h-full">
        {images.map((image, index) => {
          const content = (
            <Image
              src={getImageUrl(image.url)}
              alt={image.alt || '轮播图'}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority={index === 0}
              unoptimized
            />
          )

          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {image.link ? (
                <a
                  href={image.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          )
        })}
      </div>

      {/* 导航按钮 */}
      {images.length > 1 && (
        <>
          {/* 左右箭头 */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-primary-500/50 hover:bg-primary-600 text-white p-2 rounded-full transition-colors duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-primary-500/50 hover:bg-primary-600 text-white p-2 rounded-full transition-colors duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* 指示器 - 横向细线样式 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-white shadow-md'
                    : 'w-4 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}