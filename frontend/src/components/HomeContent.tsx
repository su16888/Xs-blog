/**
 * @file HomeContent.tsx
 * @description 首页内容组件（可复用于不同主题模式）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 */

'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Avatar from '@/components/Avatar'
import SocialLinks from '@/components/SocialLinks'
import SiteNav from '@/components/SiteNav'
import Notes from '@/components/Notes'
import Services from '@/components/Services'
import Galleries from '@/components/Galleries'
import DynamicTabbedSection from '@/components/DynamicTabbedSection'
import BlogCarousel from '@/components/BlogCarousel'
import BlogProfile from '@/components/BlogProfile'
import BlogAnnouncement from '@/components/BlogAnnouncement'
import { getFileUrl } from '@/lib/utils'

// 处理上传文件的完整 URL
function getFullUrl(url: string) {
  return getFileUrl(url)
}

interface HomeContentProps {
  forceThemeType?: 'default' | 'blog' // 强制使用的主题类型
  rawSettings: any
  isLoading: boolean
}

export default function HomeContent({ forceThemeType, rawSettings, isLoading }: HomeContentProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActiveTab, setSearchActiveTab] = useState<'notes' | 'navigation' | 'services' | 'galleries'>('notes')
  const [currentActiveTab, setCurrentActiveTab] = useState<string>('notes')
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [homeContentSections, setHomeContentSections] = useState<any>(null)
  const [pageTexts, setPageTexts] = useState<any>(null)

  // 处理设置值：如果有强制主题类型，使用强制类型；否则使用后台设置
  const sessionThemeType = typeof window !== 'undefined' ? sessionStorage.getItem('userThemeType') : null
  const sessionShowSiteNav = typeof window !== 'undefined' ? sessionStorage.getItem('userShowSiteNav') : null
  const sessionShowNotes = typeof window !== 'undefined' ? sessionStorage.getItem('userShowNotes') : null

  // 确定最终的主题类型：
  // 1. 如果有 forceThemeType，使用它（来自 /user 或 /blog 页面）
  // 2. 如果后台设置是 'default' 且用户通过头像切换到了 'blog'，只有在启用了头像切换功能时才使用 sessionStorage
  // 3. 如果后台设置是 'blog'，直接使用 'blog'，忽略 sessionStorage
  // 4. 否则使用后台设置
  const enableAvatarThemeSwitch = rawSettings.enableAvatarThemeSwitch === 'true'
  const backendThemeType = rawSettings.themeType || 'default'

  let finalThemeType = backendThemeType
  if (forceThemeType) {
    finalThemeType = forceThemeType
  } else if (backendThemeType === 'default' && enableAvatarThemeSwitch && sessionThemeType === 'blog') {
    // 只有在默认模式下且启用了头像切换功能时，才允许用户通过 sessionStorage 切换到博客模式
    finalThemeType = 'blog'
  }

  const settings = {
    showSiteNav: sessionShowSiteNav === 'true' || (sessionShowSiteNav === null && rawSettings.showSiteNav !== 'false'),
    showNotes: sessionShowNotes === 'true' || (sessionShowNotes === null && rawSettings.showNotes !== 'false'),
    showSocialLinks: rawSettings.showSocialLinks !== 'false',
    themeColor: rawSettings.themeColor || 'white',
    themeType: finalThemeType,
    footerCopyright: rawSettings.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    backgroundImage: getFullUrl(rawSettings.backgroundImage || ''),
    backgroundOpacity: rawSettings.backgroundOpacity || '0.5',
    defaultDisplaySection: rawSettings.defaultDisplaySection || 'notes',
    showTopNavbar: rawSettings.showTopNavbar || 'true',
    showWapSidebar: rawSettings.showWapSidebar || 'true',
    blogProfileEnabled: rawSettings.blogProfileEnabled || 'true',
    blogCarouselEnabled: rawSettings.blogCarouselEnabled || 'true',
    hideBlogProfileCard: rawSettings.hideBlogProfileCard || 'false'
  }

  useEffect(() => {
    if (isLoading) return
    const siteTitle = rawSettings.siteTitle || ''
    const siteSubtitle = rawSettings.siteSubtitle || ''
    const fullTitle = siteTitle ? (siteSubtitle ? `${siteTitle} - ${siteSubtitle}` : siteTitle) : siteSubtitle
    if (!fullTitle) return
    document.title = fullTitle
  }, [isLoading, rawSettings.siteTitle, rawSettings.siteSubtitle])

  // 解析配置
  useEffect(() => {
    // 解析 homeContentSections 配置
    if (rawSettings.homeContentSections) {
      try {
        const sections = JSON.parse(rawSettings.homeContentSections)
        const parsedSections = {
          section1: sections.section1 || '',
          section2: sections.section2 || '',
          showInDefaultTheme: sections.showInDefaultTheme !== false
        }
        setHomeContentSections(parsedSections)
        const initialTab = parsedSections.section1 || parsedSections.section2 || 'notes'
        setCurrentActiveTab(initialTab)
        setSearchActiveTab(initialTab as any)
      } catch (error) {
        console.error('Failed to parse homeContentSections:', error)
        setHomeContentSections({
          section1: 'notes',
          section2: 'navigation',
          showInDefaultTheme: true
        })
        setCurrentActiveTab('notes')
        setSearchActiveTab('notes')
      }
    } else {
      setHomeContentSections({
        section1: 'notes',
        section2: 'navigation',
        showInDefaultTheme: true
      })
      setCurrentActiveTab('notes')
      setSearchActiveTab('notes')
    }

    // 解析 pageTexts 配置
    if (rawSettings.pageTexts) {
      try {
        const texts = JSON.parse(rawSettings.pageTexts)
        setPageTexts(texts)
      } catch (error) {
        console.error('Failed to parse pageTexts:', error)
        setPageTexts(null)
      }
    }
  }, [rawSettings])

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const { showSocialLinks, themeType, footerCopyright, backgroundImage, backgroundOpacity, blogProfileEnabled, blogCarouselEnabled, hideBlogProfileCard } = settings

  const isBlogTheme = themeType === 'blog'
  const showTopNavbar = settings.showTopNavbar !== 'false'
  const showWapSidebar = settings.showWapSidebar !== 'false'
  const showBlogProfile = blogProfileEnabled !== 'false' && hideBlogProfileCard !== 'true'
  const showBlogCarousel = blogCarouselEnabled !== 'false'
  const shouldShowUserBackgroundDecor = !isBlogTheme && (pathname === '/user' || pathname === '/')
  const [userBackgroundDecorStyle, setUserBackgroundDecorStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    if (!shouldShowUserBackgroundDecor) {
      setUserBackgroundDecorStyle(null)
      return
    }

    const hexToRgb = (input: string): { r: number; g: number; b: number } | null => {
      const value = input.trim()
      if (!value) return null

      if (value.startsWith('#')) {
        const hex = value.slice(1)
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16)
          const g = parseInt(hex[1] + hex[1], 16)
          const b = parseInt(hex[2] + hex[2], 16)
          if ([r, g, b].some(Number.isNaN)) return null
          return { r, g, b }
        }
        if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16)
          const g = parseInt(hex.slice(2, 4), 16)
          const b = parseInt(hex.slice(4, 6), 16)
          if ([r, g, b].some(Number.isNaN)) return null
          return { r, g, b }
        }
        return null
      }

      const rgbMatch = value.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i)
      if (rgbMatch) {
        const r = Math.round(Number(rgbMatch[1]))
        const g = Math.round(Number(rgbMatch[2]))
        const b = Math.round(Number(rgbMatch[3]))
        if ([r, g, b].some(Number.isNaN)) return null
        return { r, g, b }
      }

      return null
    }

    const compute = () => {
      const root = document.documentElement
      const styles = getComputedStyle(root)
      const currentTheme = root.getAttribute('data-theme') || ''

      const primary500 = styles.getPropertyValue('--primary-500')
      const primary300 = styles.getPropertyValue('--primary-300')
      const accentFrom = styles.getPropertyValue('--accent-gradient-from')
      const accentTo = styles.getPropertyValue('--accent-gradient-to')
      const borderSecondary = styles.getPropertyValue('--border-secondary')
      const bgSecondary = styles.getPropertyValue('--bg-secondary')

      const c500 = hexToRgb(primary500) ?? { r: 16, g: 185, b: 129 }
      const c300 = hexToRgb(primary300) ?? { r: 110, g: 231, b: 183 }
      const cAccentFrom = hexToRgb(accentFrom) ?? { r: 167, g: 139, b: 250 }
      const cAccentTo = hexToRgb(accentTo) ?? { r: 244, g: 114, b: 182 }
      const cBorder = hexToRgb(borderSecondary) ?? { r: 212, g: 212, b: 212 }
      const cBg = hexToRgb(bgSecondary) ?? { r: 23, g: 23, b: 23 }

      const mix = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) => {
        const clamp = (n: number) => Math.max(0, Math.min(1, n))
        const k = clamp(t)
        return {
          r: Math.round(a.r * (1 - k) + b.r * k),
          g: Math.round(a.g * (1 - k) + b.g * k),
          b: Math.round(a.b * (1 - k) + b.b * k),
        }
      }

      if (currentTheme === 'black') {
        const starBase = mix({ r: 255, g: 255, b: 255 }, cBg, 0.14)
        const starBright = `rgba(${starBase.r}, ${starBase.g}, ${starBase.b}, 0.62)`
        const starMid = `rgba(${starBase.r}, ${starBase.g}, ${starBase.b}, 0.34)`
        const starDim = `rgba(${starBase.r}, ${starBase.g}, ${starBase.b}, 0.18)`

        const nebulaC1 = mix(cAccentFrom, cBg, 0.22)
        const nebulaC2 = mix(cAccentTo, cBg, 0.2)
        const nebulaC3 = mix(c500, cBg, 0.35)

        const nebula1 = `rgba(${nebulaC1.r}, ${nebulaC1.g}, ${nebulaC1.b}, 0.22)`
        const nebula2 = `rgba(${nebulaC2.r}, ${nebulaC2.g}, ${nebulaC2.b}, 0.18)`
        const nebula3 = `rgba(${nebulaC3.r}, ${nebulaC3.g}, ${nebulaC3.b}, 0.14)`

        setUserBackgroundDecorStyle({
          ['--xs-star-bright' as any]: starBright,
          ['--xs-star-mid' as any]: starMid,
          ['--xs-star-dim' as any]: starDim,
          backgroundImage: `
            radial-gradient(920px circle at 12% 16%, ${nebula1}, transparent 62%),
            radial-gradient(760px circle at 90% 22%, ${nebula2}, transparent 60%),
            radial-gradient(700px circle at 76% 94%, ${nebula3}, transparent 58%),
            radial-gradient(900px circle at 52% 54%, rgba(0,0,0,0.22), transparent 62%)
          `,
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat',
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
          backgroundPosition: '0% 0%, 0% 0%, 0% 0%, 0% 0%'
        })
        return
      }

      const glowAlpha =
        currentTheme === 'gray'
            ? { a1: 0.10, a2: 0.08, a3: 0.06, dot: 0.14 }
            : { a1: 0.16, a2: 0.12, a3: 0.10, dot: 0.18 }

      const glowC1 = c500
      const glowC2 = c300
      const glowC3 = c500
      const dotC = cBorder

      const glow1 = `rgba(${glowC1.r}, ${glowC1.g}, ${glowC1.b}, ${glowAlpha.a1})`
      const glow2 = `rgba(${glowC2.r}, ${glowC2.g}, ${glowC2.b}, ${glowAlpha.a2})`
      const glow3 = `rgba(${glowC3.r}, ${glowC3.g}, ${glowC3.b}, ${glowAlpha.a3})`
      const dot = `rgba(${dotC.r}, ${dotC.g}, ${dotC.b}, ${glowAlpha.dot})`

      setUserBackgroundDecorStyle({
        backgroundImage: `
          radial-gradient(900px circle at 12% 14%, ${glow1}, transparent 62%),
          radial-gradient(700px circle at 92% 22%, ${glow2}, transparent 58%),
          radial-gradient(650px circle at 78% 96%, ${glow3}, transparent 58%),
          radial-gradient(${dot} 1px, transparent 1px)
        `,
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat',
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 22px 22px',
        backgroundPosition: '0% 0%, 0% 0%, 0% 0%, 0 0'
      })
    }

    compute()

    const observer = new MutationObserver(() => compute())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] })
    return () => observer.disconnect()
  }, [shouldShowUserBackgroundDecor])

  // 监听全局搜索事件（来自 GlobalNav）
  useEffect(() => {
    const handleGlobalSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail)
      setSearchActiveTab(currentActiveTab as any)
    }
    window.addEventListener('globalSearch', handleGlobalSearch as EventListener)
    return () => {
      window.removeEventListener('globalSearch', handleGlobalSearch as EventListener)
    }
  }, [currentActiveTab])

  const handleTabChange = (tabKey: string) => {
    setCurrentActiveTab(tabKey)
    setSearchActiveTab(tabKey as any)
  }

  const handleTabbedSearch = (query: string, activeTab?: string) => {
    setSearchQuery(query)
    if (activeTab) {
      setSearchActiveTab(activeTab as any)
    }
  }

  // 提取 Notes 组件需要的设置
  const notesSettings = {
    showNoteTags: rawSettings.showNoteTags !== 'false', // 默认为 true
    showNoteCategories: rawSettings.showNoteCategories !== 'false', // 默认为 true
    noteLayoutColumns: rawSettings.noteLayoutColumns || '1',
    showNoteCover: rawSettings.showNoteCover || 'true',
    defaultNoteCover: rawSettings.defaultNoteCover || ''
  };

  // 获取组件的辅助函数
  const getComponentByKey = (key: string, search: string) => {
    switch (key) {
      case 'notes':
        return <Notes key={`notes-${search}`} searchQuery={search} limit={6} showViewAll={true} initialSettings={notesSettings} />
      case 'navigation':
        return <SiteNav key={`navigation-${search}`} searchQuery={search} limit={8} hideCategoryHeaders={true} showViewAll={true} />
      case 'services':
        return <Services key={`services-${search}`} searchQuery={search} limit={8} showViewAll={true} />
      case 'galleries':
        return <Galleries key={`galleries-${search}`} searchQuery={search} limit={8} showViewAll={true} />
      default:
        return <Notes key={`notes-${search}`} searchQuery={search} limit={6} showViewAll={true} />
    }
  }

  // 获取标签名称的辅助函数
  const getLabelByKey = (key: string): string => {
    const defaultLabels: { [key: string]: string } = {
      notes: '最新笔记',
      navigation: '最新导航',
      services: '最新服务',
      galleries: '最新图库'
    }

    if (pageTexts && pageTexts[key]?.title) {
      return pageTexts[key].title
    }

    return defaultLabels[key] || key
  }

  // 判断是否显示内容切换
  const shouldShowContentSections = homeContentSections && (
    isBlogTheme
      ? (homeContentSections.section1 || homeContentSections.section2)
      : (homeContentSections.showInDefaultTheme && (homeContentSections.section1 || homeContentSections.section2))
  )

  return (
    <main className="min-h-screen bg-bg-primary relative flex flex-col overflow-x-hidden hide-scrollbar">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-3 border-border-primary border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* 背景图片 */}
          {backgroundImage && (
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: parseFloat(backgroundOpacity)
              }}
            ></div>
          )}

          {shouldShowUserBackgroundDecor && userBackgroundDecorStyle && (
            <div
              className="absolute inset-0 z-0 pointer-events-none xs-user-bg-decor"
              style={userBackgroundDecorStyle}
            ></div>
          )}

          {/* ==================== 博客模式 ==================== */}
          {isBlogTheme && (
            <div className="relative z-0">
              {(isBlogTheme || showTopNavbar) && <div className="h-16"></div>}

              <div className="container mx-auto px-4 max-w-6xl pt-3 pb-4 md:py-8">
                <section className="animate-slide-up mb-8" style={{ animationDelay: '0.1s' }}>
                  <div className="hidden lg:flex gap-6 items-stretch">
                    {showBlogCarousel && (
                      <div className="flex-1">
                        <BlogCarousel />
                      </div>
                    )}
                    {showBlogProfile && (
                      <div className={`w-72 flex-shrink-0 h-96 ${!showBlogCarousel ? 'mx-auto' : ''}`}>
                        {isLargeScreen && <BlogProfile />}
                      </div>
                    )}
                  </div>
                  {showBlogCarousel && (
                    <div className="lg:hidden">
                      <BlogCarousel />
                    </div>
                  )}
                </section>

                {/* 公告栏 - 轮播图下方，搜索框上方 */}
                {rawSettings.blogAnnouncementEnabled === 'true' && (() => {
                  let announcements: { title: string; content: string; url?: string; format?: 'markdown' | 'html' | 'text' }[] = []
                  try {
                    const parsed = JSON.parse(rawSettings.blogAnnouncements || '[]')
                    if (Array.isArray(parsed)) {
                      announcements = parsed.map(item => {
                        // 兼容旧格式：如果是字符串，转换为 { title: '', content: text }
                        if (typeof item === 'string') {
                          return { title: '', content: item, url: '', format: 'text' as const }
                        }
                        // 兼容旧格式：如果只有 text 字段，转换为 title/content 格式
                        if (item.text && !item.title && !item.content) {
                          return { title: item.text.substring(0, 50), content: item.text, url: item.url || '', format: 'text' as const }
                        }
                        // 新格式
                        return {
                          title: item.title || '',
                          content: item.content || '',
                          url: item.url || '',
                          format: (item.format || 'text') as 'markdown' | 'html' | 'text'
                        }
                      })
                    }
                  } catch {
                    announcements = []
                  }
                  const validAnnouncements = announcements.filter(a => a && (a.title || a.content))
                  if (validAnnouncements.length === 0) return null
                  return (
                    <section className="animate-slide-up mb-6" style={{ animationDelay: '0.15s' }}>
                      <BlogAnnouncement announcements={validAnnouncements} />
                    </section>
                  )
                })()}

                {shouldShowContentSections && homeContentSections && (
                  <section className="animate-slide-up mt-6" style={{ animationDelay: '0.2s' }}>
                    <DynamicTabbedSection
                      tabs={[
                        homeContentSections.section1 && {
                          key: homeContentSections.section1,
                          label: getLabelByKey(homeContentSections.section1),
                          content: getComponentByKey(homeContentSections.section1, searchQuery)
                        },
                        homeContentSections.section2 && {
                          key: homeContentSections.section2,
                          label: getLabelByKey(homeContentSections.section2),
                          content: getComponentByKey(homeContentSections.section2, searchQuery)
                        }
                      ].filter(Boolean)}
                      defaultTab={homeContentSections.section1 || homeContentSections.section2}
                      onSearch={handleTabbedSearch}
                      onTabChange={handleTabChange}
                      searchPlaceholder="搜索内容..."
                      externalSearchQuery={searchQuery}
                      themeTypeOverride={themeType}
                    />
                  </section>
                )}
              </div>

              <footer className="mt-auto border-t border-border-primary py-6 text-center text-sm text-text-tertiary">
                <p dangerouslySetInnerHTML={{ __html: footerCopyright }} />
              </footer>
            </div>
          )}

          {/* ==================== 默认模式 ==================== */}
          {!isBlogTheme && (
            <div className="relative z-0 flex flex-col min-h-screen">
              {showTopNavbar && <div className="h-16"></div>}

              <div className={`container mx-auto px-4 max-w-6xl ${shouldShowContentSections ? 'py-8' : 'flex-1 flex items-center justify-center'}`}>
                <div className="flex flex-col items-center justify-center">
                  <section className="text-center animate-fade-in mb-5 md:mb-6">
                    <Avatar />
                  </section>

                  {showSocialLinks && (
                    <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                      <SocialLinks className="gap-3 md:gap-4" />
                    </section>
                  )}
                </div>

                {shouldShowContentSections && homeContentSections && (
                  <section className={`animate-slide-up md:mt-12 ${isBlogTheme ? 'mt-8' : 'mt-0'}`} style={{ animationDelay: '0.2s' }}>
                    <DynamicTabbedSection
                      tabs={[
                        homeContentSections.section1 && {
                          key: homeContentSections.section1,
                          label: getLabelByKey(homeContentSections.section1),
                          content: getComponentByKey(homeContentSections.section1, searchQuery)
                        },
                        homeContentSections.section2 && {
                          key: homeContentSections.section2,
                          label: getLabelByKey(homeContentSections.section2),
                          content: getComponentByKey(homeContentSections.section2, searchQuery)
                        }
                      ].filter(Boolean)}
                      defaultTab={homeContentSections.section1 || homeContentSections.section2}
                      onSearch={handleTabbedSearch}
                      onTabChange={handleTabChange}
                      searchPlaceholder="搜索内容..."
                      externalSearchQuery={searchQuery}
                      themeTypeOverride={themeType}
                    />
                  </section>
                )}
              </div>

              <footer className="mt-auto border-t border-border-primary py-6 text-center text-sm text-text-tertiary">
                <p dangerouslySetInnerHTML={{ __html: footerCopyright }} />
              </footer>
            </div>
          )}
        </>
      )}
    </main>
  )
}
