'use client'

import { useEffect } from 'react'
import { useSettings } from '@/contexts/SettingsContext'

interface SEOMetaProps {
  forceNoIndex?: boolean // 强制不索引（用于后台页面）
  customTitle?: string // 自定义标题（可选）
}

export default function SEOMeta({ forceNoIndex = false, customTitle }: SEOMetaProps) {
  const { settings } = useSettings()
  const allowSEO = settings.allowSEO === 'true'

  // 设置页面标题
  useEffect(() => {
    if (customTitle) document.title = customTitle
  }, [customTitle])

  useEffect(() => {
    // 如果强制不索引或者设置不允许 SEO，添加 noindex meta 标签
    if (forceNoIndex || !allowSEO) {
      // 检查是否已存在 robots meta 标签
      let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement

      if (!robotsMeta) {
        robotsMeta = document.createElement('meta')
        robotsMeta.name = 'robots'
        document.head.appendChild(robotsMeta)
      }

      robotsMeta.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex'

      // 添加 googlebot 特定标签
      let googlebotMeta = document.querySelector('meta[name="googlebot"]') as HTMLMetaElement
      if (!googlebotMeta) {
        googlebotMeta = document.createElement('meta')
        googlebotMeta.name = 'googlebot'
        document.head.appendChild(googlebotMeta)
      }
      googlebotMeta.content = 'noindex, nofollow'

      // 添加 X-Robots-Tag header（通过 meta 标签模拟）
      let xRobotsMeta = document.querySelector('meta[http-equiv="X-Robots-Tag"]') as HTMLMetaElement
      if (!xRobotsMeta) {
        xRobotsMeta = document.createElement('meta')
        xRobotsMeta.httpEquiv = 'X-Robots-Tag'
        document.head.appendChild(xRobotsMeta)
      }
      xRobotsMeta.content = 'noindex, nofollow'
    } else {
      // 如果允许 SEO，移除 noindex 标签
      const robotsMeta = document.querySelector('meta[name="robots"]')
      const googlebotMeta = document.querySelector('meta[name="googlebot"]')
      const xRobotsMeta = document.querySelector('meta[http-equiv="X-Robots-Tag"]')

      if (robotsMeta) robotsMeta.remove()
      if (googlebotMeta) googlebotMeta.remove()
      if (xRobotsMeta) xRobotsMeta.remove()
    }
  }, [forceNoIndex, allowSEO])

  return null
}
