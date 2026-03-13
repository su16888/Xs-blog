'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import { getImageUrl } from '@/lib/api'

interface NavLink {
  name: string
  url: string
  icon?: string
}

interface DocsNavProps {
  fullWidth?: boolean  // 是否去掉宽度限制，默认 false
}

// 解析导航链接的辅助函数
const parseNavLinks = (blogNavLinks: string | NavLink[] | undefined): NavLink[] => {
  if (!blogNavLinks) return []
  try {
    if (Array.isArray(blogNavLinks)) {
      return blogNavLinks.filter((link: NavLink) => link.name && link.url)
    }
    const links = JSON.parse(blogNavLinks)
    return links.filter((link: NavLink) => link.name && link.url)
  } catch {
    return []
  }
}

/**
 * Docs 页面专用导航栏 - 轻量版，只依赖 settings
 * 跟随系统顶部导航栏内容
 */
export default function DocsNav({ fullWidth = false }: DocsNavProps) {
  const { settings: contextSettings } = useSettings()

  // 使用 mounted 状态避免水合不匹配
  const [mounted, setMounted] = useState(false)
  const [cachedSettings, setCachedSettings] = useState<Record<string, any>>({})
  const [navLinks, setNavLinks] = useState<NavLink[]>([])

  // 客户端挂载后读取缓存
  useEffect(() => {
    setMounted(true)
    try {
      const cached = localStorage.getItem('xs_settings_cache')
      const expire = localStorage.getItem('xs_settings_expire')
      if (cached && expire && Date.now() < parseInt(expire)) {
        const settings = JSON.parse(cached)
        setCachedSettings(settings)
        setNavLinks(parseNavLinks(settings.blogNavLinks))
      }
    } catch (e) {}
  }, [])

  // 合并设置：优先使用 Context 的设置，否则使用缓存
  const rawSettings = Object.keys(contextSettings).length > 0 ? contextSettings : cachedSettings

  const logo = rawSettings.blogLogo || ''
  const logoText = rawSettings.blogLogoText || ''

  // 当设置更新时，同步更新导航链接
  useEffect(() => {
    const links = parseNavLinks(rawSettings.blogNavLinks)
    if (links.length > 0) {
      setNavLinks(links)
    }
  }, [rawSettings.blogNavLinks])

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank')
    } else {
      window.location.href = url
    }
  }

  return (
    <nav className="bg-bg-primary shadow-sm border-b border-border-primary fixed top-0 left-0 right-0 z-[9999]">
      <div className={`mx-auto px-4 ${fullWidth ? 'max-w-[1400px] lg:px-8' : 'max-w-6xl'}`}>
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            {logo && (
              <div className="flex-shrink-0">
                <img
                  src={getImageUrl(logo)}
                  alt="Logo"
                  className="h-10 w-auto max-w-xs object-contain"
                  style={{ height: '40px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
            {logoText ? (
              <div className="text-xl font-bold text-text-primary">
                {logoText}
              </div>
            ) : !logo && (
              <div className="text-xl font-bold text-text-primary">
                {rawSettings.siteTitle || ''}
              </div>
            )}
          </a>

          {/* 桌面端导航链接 */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link, index) => (
              <a
                key={`nav-${link.name}-${index}`}
                href={link.url}
                onClick={(e) => {
                  e.preventDefault()
                  handleLinkClick(link.url)
                }}
                className="flex items-center gap-1.5 text-text-secondary hover:text-primary-600 transition-colors duration-200 font-medium text-sm"
              >
                {link.icon && (
                  <img
                    src={getImageUrl(link.icon)}
                    alt=""
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
