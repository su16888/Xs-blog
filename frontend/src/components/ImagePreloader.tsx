'use client'

import { useEffect, useState, useRef } from 'react'
import { getImageUrl } from '@/lib/api'
import { useProfile } from '@/contexts/ProfileContext'
import { useSocialLinks } from '@/contexts/SocialLinksContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getFileUrl } from '@/lib/utils'

interface ImagePreloaderProps {
  onPreloadComplete?: () => void
}

export default function ImagePreloader({ onPreloadComplete }: ImagePreloaderProps) {
  const [preloaded, setPreloaded] = useState(false)
  const hasPreloadedRef = useRef(false)
  const { settings: settingsObj, isLoading: settingsLoading } = useSettings()
  const { profile } = useProfile()
  const { profileSocialLinks: socialLinks } = useSocialLinks()

  useEffect(() => {
    if (!settingsLoading && !preloaded && !hasPreloadedRef.current) {
      hasPreloadedRef.current = true
      preloadCriticalImages()
    }
  }, [settingsLoading, preloaded])

  const preloadCriticalImages = async () => {
    try {
      // 检查是否需要加载个人资料和社交链接
      const showSocialLinks = settingsObj.showSocialLinks !== 'false'
      const blogProfileEnabled = settingsObj.blogProfileEnabled !== 'false'
      const themeType = settingsObj.themeType || 'default'
      const isBlogTheme = themeType === 'blog'

      // 预加载图片
      const imagesToPreload: string[] = []

      // 仅在博客主题时预加载博客Logo
      if (isBlogTheme && settingsObj.blogLogo) {
        imagesToPreload.push(getImageUrl(settingsObj.blogLogo))
      }

      // 仅在需要显示时预加载个人头像
      if (profile?.avatar && (showSocialLinks || (isBlogTheme && blogProfileEnabled))) {
        imagesToPreload.push(getImageUrl(profile.avatar))
      }

      // 仅在需要显示时预加载社交链接图标
      if (showSocialLinks || (isBlogTheme && blogProfileEnabled)) {
        socialLinks.forEach((link) => {
          if (link.icon && link.icon.trim() !== '') {
            // 不添加 ?v= 参数，与实际显示时的 URL 保持一致，避免重复加载
            imagesToPreload.push(getFileUrl(link.icon))
          }
          if (link.qrcode && link.qrcode.trim() !== '') {
            imagesToPreload.push(getFileUrl(link.qrcode))
          }
        })
      }

      // 仅在博客主题时预加载导航链接图标
      if (isBlogTheme) {
        try {
          const navLinks = JSON.parse(settingsObj.blogNavLinks || '[]')
          navLinks.forEach((link: any) => {
            if (link.icon) {
              imagesToPreload.push(getImageUrl(link.icon))
            }
          })
        } catch {
          // 忽略解析错误
        }
      }

      // 预加载背景图片（如果有）
      if (settingsObj.backgroundImage) {
        imagesToPreload.push(getFileUrl(settingsObj.backgroundImage))
      }

      // 去重并预加载
      const uniqueImages = [...new Set(imagesToPreload.filter(Boolean))]

      // 并行预加载所有图片
      const preloadPromises = uniqueImages.map((src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            resolve()
          }
          img.onerror = () => {
            resolve() // 即使失败也继续
          }
          img.src = src
        })
      )

      await Promise.allSettled(preloadPromises)

      setPreloaded(true)
      onPreloadComplete?.()

    } catch (error) {
      setPreloaded(true)
      onPreloadComplete?.()
    }
  }

  // 这个组件不渲染任何内容
  return null
}