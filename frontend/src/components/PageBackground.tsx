/**
 * @file PageBackground.tsx
 * @description 页面背景图片组件 - 用于在各页面显示后台设置的背景图片
 */

'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { getApiBaseUrl } from '@/lib/utils'

interface PageBackgroundProps {
  className?: string
}

export default function PageBackground({ className = '' }: PageBackgroundProps) {
  const { settings } = useSettings()

  const backgroundImage = settings.backgroundImage || ''
  const backgroundOpacity = settings.backgroundOpacity || '0.5'

  // 如果没有背景图片，不渲染任何内容
  if (!backgroundImage) {
    return null
  }

  // 处理背景图片 URL
  const apiBaseUrl = getApiBaseUrl()
  const fullBackgroundUrl = backgroundImage.startsWith('http')
    ? backgroundImage
    : `${apiBaseUrl}${backgroundImage}`

  return (
    <div
      className={`absolute inset-0 z-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `url(${fullBackgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: parseFloat(backgroundOpacity)
      }}
    />
  )
}
