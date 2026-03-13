/**
 * @file BlogNav.tsx
 * @description Xs-Blog 前台导航组件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Search } from 'lucide-react'
import { getImageUrl } from '@/lib/api'
import { useProfile } from '@/contexts/ProfileContext'
import { useSocialLinks, SocialLink } from '@/contexts/SocialLinksContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getFileUrl } from '@/lib/utils'

interface NavLink {
  name: string
  url: string
  icon?: string
}

interface BlogNavProps {
  onSearch?: (query: string) => void
  isBlogMode?: boolean
  showWapSidebar?: boolean
  initialSettings?: Record<string, any>
  hideOnMobile?: boolean
}

// 解析导航链接的辅助函数
const parseNavLinks = (blogNavLinks: string | NavLink[] | undefined): NavLink[] => {
  if (!blogNavLinks) return []
  try {
    // 如果已经是数组，直接使用
    if (Array.isArray(blogNavLinks)) {
      return blogNavLinks.filter((link: NavLink) => link.name && link.url)
    }
    // 如果是字符串，解析 JSON
    const links = JSON.parse(blogNavLinks)
    return links.filter((link: NavLink) => link.name && link.url)
  } catch {
    return []
  }
}

export default function BlogNav({ onSearch, isBlogMode = true, showWapSidebar = true, initialSettings = {}, hideOnMobile = false }: BlogNavProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { settings: contextSettings } = useSettings()
  const { profile } = useProfile()
  const { profileSocialLinks: socialLinks } = useSocialLinks()

  // 合并设置：优先使用 Context 的设置，否则使用传入的初始设置
  const rawSettings = Object.keys(contextSettings).length > 0 ? contextSettings : initialSettings

  // 直接在初始化时解析导航链接，不使用 useEffect
  const [navLinks, setNavLinks] = useState<NavLink[]>(() => parseNavLinks(rawSettings.blogNavLinks))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false) // 改为 false，不需要等待
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copyToast, setCopyToast] = useState<{show: boolean, platform: string, content: string}>({show: false, platform: '', content: ''})
  const [isLogoTransitioning, setIsLogoTransitioning] = useState(false)
  const [sessionThemeType, setSessionThemeType] = useState<string | null>(null)

  // 检查链接是否为当前页面
  const isActiveLink = (url: string): boolean => {
    if (!pathname) return false
    // 处理相对路径和绝对路径
    const linkPath = url.startsWith('http') ? new URL(url).pathname : url
    // 精确匹配或前缀匹配（对于子路径）
    if (linkPath === '/') {
      return pathname === '/'
    }
    return pathname === linkPath || pathname.startsWith(linkPath + '/')
  }

  const logo = rawSettings.blogLogo || ''
  const logoText = rawSettings.blogLogoText || ''
  const enableAvatarThemeSwitch = rawSettings.enableAvatarThemeSwitch === 'true'
  const enableBlogPage = rawSettings.enableBlogPage === 'true'
  const backendThemeType = rawSettings.themeType || 'default'
  const isDocsThemeEnabled = rawSettings.docsThemeEnabled === 'true'
  const isBlogThemeContext = Boolean(
    pathname?.startsWith('/blog') ||
    backendThemeType === 'blog' ||
    (enableAvatarThemeSwitch && sessionThemeType === 'blog')
  )
  const showProfileCard = Boolean(profile && (isBlogMode || (isDocsThemeEnabled && showWapSidebar)))
  const blogHomeHref = enableBlogPage ? '/blog' : '/'

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSessionThemeType(sessionStorage.getItem('userThemeType'))
  }, [])

  // 路由切换时重置搜索状态
  useEffect(() => {
    setShowMobileSearch(false)
    setSearchQuery('')
  }, [pathname])

  // 当设置更新时，同步更新导航链接
  useEffect(() => {
    const links = parseNavLinks(rawSettings.blogNavLinks)
    if (links.length > 0) {
      setNavLinks(links)
    }
  }, [rawSettings.blogNavLinks])

  // 预加载图片 - 在博客模式下，组件挂载时立即预加载所有图片
  useEffect(() => {
    if (!isBlogMode || !showWapSidebar) return

    const imagesToPreload: string[] = []
    let preloadCount = 0

    // 预加载logo
    if (logo) {
      const logoUrl = getImageUrl(logo)
      imagesToPreload.push(logoUrl)
    }

    // 预加载个人资料头像
    if (profile?.avatar) {
      const avatarUrl = getImageUrl(profile.avatar)
      imagesToPreload.push(avatarUrl)
    }

    // 预加载社交链接图标和二维码
    socialLinks.forEach(link => {
      if (link.icon) {
        const iconUrl = getFileUrl(link.icon)
        imagesToPreload.push(iconUrl)
      }
      // 如果有二维码，也预加载
      if (link.qrcode) {
        const qrcodeUrl = getFileUrl(link.qrcode)
        imagesToPreload.push(qrcodeUrl)
      }
    })

    // 预加载导航链接图标
    navLinks.forEach(link => {
      if (link.icon) {
        const iconUrl = getImageUrl(link.icon)
        imagesToPreload.push(iconUrl)
      }
    })

    // 执行预加载（添加错误处理和加载完成统计）
    if (imagesToPreload.length > 0) {
      // console.log(`📦 WAP侧边栏预加载: 开始预加载 ${imagesToPreload.length} 个资源`)

      imagesToPreload.forEach((src, index) => {
        const img = new Image()
        img.onload = () => {
          preloadCount++
          // console.log(`✓ 预加载成功 [${preloadCount}/${imagesToPreload.length}]: ${src.substring(0, 50)}...`)
        }
        img.onerror = () => {
          preloadCount++
          // console.warn(`✗ 预加载失败 [${preloadCount}/${imagesToPreload.length}]: ${src.substring(0, 50)}...`)
        }
        img.src = src
      })

      // 预加载超时检测
      setTimeout(() => {
        if (preloadCount < imagesToPreload.length) {
          // console.warn(`⏰ 预加载超时: 已完成 ${preloadCount}/${imagesToPreload.length}`)
        }
      }, 10000) // 10秒超时
    }
  }, [isBlogMode, showWapSidebar, logo, profile, socialLinks, navLinks])

  // 额外的积极预加载：在组件挂载后100ms就开始预加载基础资源
  useEffect(() => {
    if (!isBlogMode || !showWapSidebar) return

    const timer = setTimeout(() => {
      // 即使数据还未完全加载，也预加载已有的资源
      const earlyPreload: string[] = []

      if (logo) earlyPreload.push(getImageUrl(logo))
      if (profile?.avatar) earlyPreload.push(getImageUrl(profile.avatar))

      earlyPreload.forEach(src => {
        const img = new Image()
        img.src = src
      })

      if (earlyPreload.length > 0) {
        // console.log(`🚀 积极预加载: 提前加载 ${earlyPreload.length} 个基础资源`)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, []) // 只在组件挂载时执行一次

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank')
    } else {
      router.push(url)
    }
    setMobileMenuOpen(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    if (onSearch) {
      onSearch('')
    }
  }

  const handleSocialLinkCopy = async (link: SocialLink) => {
    try {
      await navigator.clipboard.writeText(link.account)
      setCopyToast({
        show: true,
        platform: link.platform,
        content: link.account
      })
      setTimeout(() => {
        setCopyToast({show: false, platform: '', content: ''})
      }, 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedQRCode, setSelectedQRCode] = useState<{ image: string; platform: string } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<{ account: string; platform: string } | null>(null)
  const [accountCopySuccess, setAccountCopySuccess] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedLink, setSelectedLink] = useState<{ url: string; platform: string } | null>(null)

  const handleSocialLinkClick = (e: React.MouseEvent, link: SocialLink) => {
    // 如果有二维码，显示二维码弹窗，不跳转
    if (link.qrcode && link.qrcode.trim() !== '') {
      e.preventDefault()
      setSelectedQRCode({
        image: link.qrcode,
        platform: link.platform
      })
      setShowQRModal(true)
    } else if (!link.link || link.link.trim() === '' || link.link === '#') {
      // 如果没有链接，显示账号弹窗
      e.preventDefault()
      setSelectedAccount({
        account: link.account,
        platform: link.platform
      })
      setShowAccountModal(true)
    } else {
      // 有链接时，显示跳转确认弹窗
      e.preventDefault()
      setSelectedLink({
        url: link.link,
        platform: link.platform
      })
      setShowLinkModal(true)
    }
  }

  const closeQRModal = () => {
    setShowQRModal(false)
    setSelectedQRCode(null)
  }

  const closeAccountModal = () => {
    setShowAccountModal(false)
    setAccountCopySuccess(false)
    setSelectedAccount(null)
  }

  const closeLinkModal = () => {
    setShowLinkModal(false)
    setSelectedLink(null)
  }

  const handleConfirmLink = () => {
    if (selectedLink) {
      window.open(selectedLink.url, '_blank', 'noopener,noreferrer')
    }
    closeLinkModal()
  }

  const handleCopyAccountFromModal = async () => {
    if (!selectedAccount) return
    try {
      await navigator.clipboard.writeText(selectedAccount.account)
      setAccountCopySuccess(true)
      setTimeout(() => setAccountCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // 处理标题点击 - 返回默认模式
  const handleLogoClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') return

    if (pathname?.startsWith('/blog')) {
      e.preventDefault()
      router.push(blogHomeHref)
      return
    }

    const sessionThemeType = sessionStorage.getItem('userThemeType')

    // 如果开关开启且当前是博客主题，清除sessionStorage返回默认
    if (enableAvatarThemeSwitch && sessionThemeType === 'blog') {
      e.preventDefault()

      setIsLogoTransitioning(true)

      // 等待标题渐隐和模糊动画
      await new Promise(resolve => setTimeout(resolve, 800))

      sessionStorage.removeItem('userThemeType')
      sessionStorage.removeItem('userShowSiteNav')
      sessionStorage.removeItem('userShowNotes')
      window.location.href = '/'
    }
    // 否则正常跳转首页（由href处理）
  }

  return (
    <nav className={`bg-bg-primary shadow-sm border-b border-border-primary fixed top-0 left-0 right-0 z-[9999] ${hideOnMobile ? 'hidden lg:block' : ''}`}>
      {isLogoTransitioning && (
        <div
          className="fixed inset-0 z-[10000] pointer-events-none"
          style={{
            backdropFilter: 'blur(0px)',
            animation: 'blur-fade 0.8s ease-out forwards'
          }}
        />
      )}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="relative">
            <a href={isBlogThemeContext ? blogHomeHref : '/'} onClick={handleLogoClick} className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${isLogoTransitioning ? 'logo-fading' : ''}`}>
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
          </div>

          {/* 桌面端导航链接 */}
          <div className="hidden md:flex items-center space-x-8">
                {/* 首页链接 - 始终显示在最上方 */}
                <a
                  key="nav-home"
                  href={isBlogThemeContext ? blogHomeHref : '/'}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isBlogThemeContext) {
                      if (enableBlogPage) {
                        router.push('/blog')
                      } else {
                        if (backendThemeType === 'default' && enableAvatarThemeSwitch) {
                          sessionStorage.setItem('userThemeType', 'blog')
                        }
                        window.history.replaceState(null, '', '/')
                        window.location.replace('/')
                      }
                    } else {
                      router.push('/')
                    }
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-1.5 transition-colors duration-200 font-medium text-sm ${
                    isActiveLink(isBlogThemeContext ? blogHomeHref : '/') ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
                  }`}
                >
                  首页
                </a>
            {navLinks.map((link, index) => (
              <a
                key={`desktop-nav-${link.name}-${index}`}
                href={link.url}
                onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleLinkClick(link.url)
                    }}
                className={`flex items-center gap-1.5 transition-colors duration-200 font-medium text-sm ${
                  isActiveLink(link.url) ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
                }`}
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

          {/* 移动端右侧按钮组 */}
          {(showWapSidebar || isBlogMode) && (
            <div className="md:hidden flex items-center gap-2">
              {/* 搜索按钮 */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="text-text-secondary hover:text-primary-600 transition-colors duration-200"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* 菜单按钮 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-text-secondary hover:text-primary-600 transition-colors duration-200"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* 移动端搜索框展开 */}
        {(showWapSidebar || isBlogMode) && showMobileSearch && (
          <div className="md:hidden px-4 py-3 border-t border-border-primary bg-bg-secondary/50 backdrop-blur-sm">
            <form onSubmit={handleSearch}>
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-0 bottom-0 my-auto w-4 h-4 text-primary-500 pointer-events-none" />
                <input
                  type="text"
                  id="mobile-nav-search"
                  name="search"
                  placeholder="搜索内容..."
                  value={searchQuery}
                  onChange={(e) => {
                    const newQuery = e.target.value
                    setSearchQuery(newQuery)
                    // 实时触发搜索
                    if (onSearch) {
                      onSearch(newQuery)
                    }
                  }}
                  className="w-full h-10 pl-9 pr-9 bg-bg-primary border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all shadow-sm"
                  autoComplete="off"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-0 bottom-0 my-auto w-5 h-5 flex items-center justify-center rounded-full bg-text-tertiary/20 text-text-tertiary hover:bg-text-tertiary/30 hover:text-text-primary transition-all"
                    aria-label="清空搜索"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* 移动端左侧滑动菜单 */}
        {(showWapSidebar || isBlogMode) && mobileMenuOpen && (
          <>
            {/* 遮罩层 */}
            <div
              className="fixed inset-0 bg-black/50 z-[10000] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* 左侧滑动面板 */}
            <div className="fixed top-0 left-0 h-full w-64 bg-bg-primary shadow-xl z-[10001] md:hidden flex flex-col border-r border-border-primary">
              {/* 顶部：LOGO/标题和关闭按钮 - 固定不滚动 */}
              <div className="flex-shrink-0 relative flex items-center justify-center h-16 px-4 border-b border-border-primary">
                {/* LOGO/标题 - 居中 */}
                <div className="flex items-center gap-2">
                  {logo && (
                    <img
                      src={getImageUrl(logo)}
                      alt="Logo"
                      className="h-8 w-auto object-contain"
                    />
                  )}
                  {logoText && (
                    <div className="text-lg font-bold text-text-primary">
                      {logoText}
                    </div>
                  )}
                  {!logo && !logoText && (
                    <div className="text-lg font-bold text-text-primary">
                      {rawSettings.siteTitle || ''}
                    </div>
                  )}
                </div>
                {/* 关闭按钮 - 绝对定位在右侧 */}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-4 text-text-secondary hover:text-primary-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* 个人资料卡片 - 仅博客模式显示 */}
              {showProfileCard && profile && (
                <div className="flex-shrink-0 px-4 py-4 border-b border-border-primary">
                  {/* 头像 */}
                  <div className="flex justify-center mb-3">
                    {profile?.avatar ? (
                      <img
                        src={getImageUrl(profile.avatar)}
                        alt={profile.name || '头像'}
                        className="w-16 h-16 rounded-full object-cover border-2 border-border-primary"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold border-2 border-border-primary">
                        {profile?.name?.[0] || 'X'}
                      </div>
                    )}
                  </div>

                  {/* 个人信息 */}
                  <div className="text-center mb-3">
                    <h3 className="text-base font-semibold text-text-primary">
                      {profile?.name || ''}
                    </h3>
                    {profile?.title && (
                      <p className="text-xs text-text-secondary mt-1">
                        {profile.title}
                      </p>
                    )}
                    {profile?.bio && (
                      <p className="text-xs text-text-tertiary mt-2 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  {/* 联系信息 - 居中 */}
                  <div className="flex flex-col items-center space-y-1.5 mb-3">
                    {profile?.location && (
                      <div key="location" className="flex items-center text-xs text-text-tertiary">
                        <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate max-w-[180px]">{profile.location}</span>
                      </div>
                    )}
                    {profile?.email && (
                      <div key="email" className="flex items-center text-xs text-text-tertiary">
                        <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate max-w-[180px]">{profile.email}</span>
                      </div>
                    )}
                    {profile?.website && (
                      <a key="website" href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-primary-600 hover:text-primary-700 transition-colors">
                        <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className="truncate max-w-[180px]">{profile.website_title || '个人网站'}</span>
                      </a>
                    )}
                  </div>

                  {/* 社交链接 - 最多显示4个，均匀分布 */}
                  {socialLinks.length > 0 && (
                    <div className={`flex items-center px-6 ${
                      socialLinks.length === 1 ? 'justify-center' : 'justify-between'
                    }`}>
                      {socialLinks.map((link, idx) => (
                        <a
                          key={`social-${link.id || link.platform}-${idx}`}
                          href={link.link || '#'}
                          target={link.link ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          onClick={(e) => handleSocialLinkClick(e, link)}
                          className="group relative flex items-center justify-center transition-all hover:scale-110 hover:opacity-80 active:scale-105 cursor-pointer"
                          title={`${link.platform}: ${link.account}`}
                        >
                          {link.icon && link.icon.trim() !== '' ? (
                            <div className="relative flex items-center justify-center w-7 h-7">
                              <img
                                src={getFileUrl(link.icon)}
                                alt={link.platform}
                                className="relative z-10 w-full h-full object-contain transition-all icon-themed group-hover:opacity-90 group-active:opacity-80"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="rounded-full bg-primary-500/15 flex items-center justify-center text-primary-600 font-bold group-hover:bg-primary-500/25 group-hover:text-primary-500 group-active:text-primary-700 transition-colors w-7 h-7 text-xs">
                              {link.platform[0].toUpperCase()}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 导航链接 - 可滚动区域，隐藏滚动条 */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 mobile-sidebar-scrollbar text-[0.9rem]">
                {/* 首页链接 - 始终显示在最上方 */}
                <a
                  key="nav-home"
                  href={isBlogThemeContext ? blogHomeHref : '/'}
                  onClick={(e) => {
                    e.preventDefault()
                    if (isBlogThemeContext) {
                      if (enableBlogPage) {
                        router.push('/blog')
                      } else {
                        if (backendThemeType === 'default' && enableAvatarThemeSwitch) {
                          sessionStorage.setItem('userThemeType', 'blog')
                        }
                        window.history.replaceState(null, '', '/')
                        window.location.replace('/')
                      }
                    } else {
                      router.push('/')
                    }
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 font-medium ${
                    isActiveLink(isBlogThemeContext ? blogHomeHref : '/') ? 'text-primary-600 bg-primary-50' : 'text-text-secondary hover:text-primary-600 hover:bg-bg-secondary'
                  }`}
                >
                  首页
                </a>
                {navLinks.map((link, index) => (
                  <a
                    key={`nav-${link.name}-${index}`}
                    href={link.url}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleLinkClick(link.url)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 font-medium ${
                      isActiveLink(link.url) ? 'text-primary-600 bg-primary-50' : 'text-text-secondary hover:text-primary-600 hover:bg-bg-secondary'
                    }`}
                  >
                    {link.icon && (
                      <img
                        src={getImageUrl(link.icon)}
                        alt=""
                        className="w-4.5 h-4.5 object-contain flex-shrink-0"
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
          </>
        )}
      </div>

      {/* 复制成功提示 */}
      {copyToast.show && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10003] px-4 py-2 bg-primary-500 text-white rounded-lg shadow-lg animate-fade-in">
          已复制{copyToast.platform}，内容为{copyToast.content}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedQRCode && (
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeQRModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeQRModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                {selectedQRCode.platform}
              </h3>
              <div className="bg-white p-4 rounded-xl inline-block">
                <img
                  src={getFileUrl(selectedQRCode.image)}
                  alt={`${selectedQRCode.platform} QR Code`}
                  className="w-64 h-64 object-contain"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                截图或长按保存上方二维码
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && selectedAccount && (
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeAccountModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeAccountModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                {selectedAccount.platform}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl mb-4">
                <p className="text-lg font-mono text-gray-900 dark:text-white break-all">
                  {selectedAccount.account}
                </p>
              </div>
              <button
                onClick={handleCopyAccountFromModal}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  accountCopySuccess
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                }`}
              >
                {accountCopySuccess ? '✓ 已复制' : '复制账号'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Confirm Modal */}
      {showLinkModal && selectedLink && (
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeLinkModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLinkModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                {selectedLink.platform}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                是否跳转到以下链接？
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl mb-4">
                <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                  {selectedLink.url}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeLinkModal}
                  className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmLink}
                  className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors bg-primary-500 hover:bg-primary-600 text-white"
                >
                  确认跳转
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-sidebar-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .mobile-sidebar-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .logo-fading {
          animation: logo-fade-out 0.8s ease-out forwards;
        }

        @keyframes logo-fade-out {
          0% {
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            filter: blur(10px);
          }
        }

        @keyframes blur-fade {
          0% {
            backdrop-filter: blur(0px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            backdrop-filter: blur(30px);
            opacity: 1;
          }
        }
      `}</style>
    </nav>
  )
}
