'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getAdminRoute } from '@/lib/adminConfig'
import { logout, getImageUrl, getPendingMessagesCount, clearVisitData, clearFrontendRedisCache } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { usePageTitleContext } from '@/contexts/PageTitleContext'
import {
  LayoutDashboard,
  User,
  FileText,
  StickyNote,
  Globe,
  Settings,
  CheckSquare,
  Palette,
  MessageSquare,
  Menu,
  Image,
  X,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Rss,
  Megaphone,
  Trash2
} from 'lucide-react'

// GitHub 仓库地址
const GITHUB_URL = 'https://github.com/su16888/Xs-blog'

interface AdminLayoutProps {
  children: ReactNode
}

interface MenuItem {
  name: string
  path: string
  icon: ReactNode
  badge?: number
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { settings, refreshSettings } = useSettings()
  const { title } = usePageTitleContext()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0)
  const [showCleanModal, setShowCleanModal] = useState(false)
  const [cleaningCache, setCleaningCache] = useState(false)
  const [cleaningVisits, setCleaningVisits] = useState(false)
  const [cleaningFrontendCache, setCleaningFrontendCache] = useState(false)

  // 获取待处理留言数量
  const checkPendingMessages = async () => {
    try {
      const response = await getPendingMessagesCount()
      if (response.success) {
        setPendingMessagesCount(response.data?.pagination?.total || 0)
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  // 清理后台缓存
  const handleClearCache = async () => {
    setCleaningCache(true)
    try {
      // 清除 localStorage 中的设置缓存
      if (typeof window !== 'undefined') {
        localStorage.removeItem('xs_settings_cache')
        localStorage.removeItem('xs_settings_expire')
      }
      // 刷新设置
      await refreshSettings()
      alert('缓存清理成功！')
    } catch (error) {
      alert('缓存清理失败，请重试')
    } finally {
      setCleaningCache(false)
      setShowCleanModal(false)
    }
  }

  // 清理访问数据
  const handleClearVisits = async () => {
    if (!confirm('确定要清理所有访问数据吗？此操作不可恢复！')) {
      return
    }
    setCleaningVisits(true)
    try {
      const response = await clearVisitData()
      if (response.success) {
        alert('访问数据清理成功！')
        // 刷新页面以更新仪表盘数据
        window.location.reload()
      } else {
        alert(response.message || '清理失败，请重试')
      }
    } catch (error) {
      alert('清理失败，请重试')
    } finally {
      setCleaningVisits(false)
      setShowCleanModal(false)
    }
  }

  // 清理前台缓存（Redis 缓存 + localStorage 缓存）
  const handleClearFrontendCache = async () => {
    setCleaningFrontendCache(true)
    try {
      // 1. 清理服务端 Redis 缓存
      try {
        await clearFrontendRedisCache()
      } catch (redisError) {
        console.warn('Redis 缓存清理失败（可能未配置 Redis）:', redisError)
      }

      // 2. 清理本地 localStorage 缓存
      if (typeof window !== 'undefined') {
        // 清理 Settings 缓存
        localStorage.removeItem('xs_settings_cache')
        localStorage.removeItem('xs_settings_expire')
        localStorage.removeItem('xs_page_texts_cache')
        localStorage.removeItem('xs_page_texts_expire')
        // 清理 Profile 缓存
        localStorage.removeItem('xs_profile_cache')
        localStorage.removeItem('xs_profile_expire')
        // 清理 SocialLinks 缓存
        localStorage.removeItem('xs_social_links_cache')
        localStorage.removeItem('xs_social_links_expire')
        // 清理 IP 位置缓存
        localStorage.removeItem('xs_ip_location_cache')
        localStorage.removeItem('xs_ip_location_expire')
      }
      alert('前台缓存清理成功！所有用户刷新页面后将获取最新数据。')
    } catch (error) {
      alert('清理失败，请重试')
    } finally {
      setCleaningFrontendCache(false)
      setShowCleanModal(false)
    }
  }

  // 统一认证检查 - 未登录跳转到登录页
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push(getAdminRoute('login'))
    }
  }, [authLoading, isAuthenticated, router])

  // 初始化时获取待处理留言数量
  useEffect(() => {
    if (isAuthenticated) {
      checkPendingMessages()
      // 每5分钟检查一次
      const timer = setInterval(checkPendingMessages, 5 * 60 * 1000)
      return () => clearInterval(timer)
    }
  }, [isAuthenticated])

  // 认证加载中，显示骨架屏
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 lg:p-4">
        <div className="max-w-[1400px] mx-auto h-screen lg:h-[calc(100vh-2rem)] bg-white lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden flex">
          {/* 侧边栏骨架 */}
          <aside className="hidden lg:flex flex-col bg-white border-r border-gray-100 w-56 flex-shrink-0">
            <div className="h-16 flex items-center px-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
              <div className="ml-3 w-20 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
            <nav className="flex-1 py-4 px-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 mb-1">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </nav>
          </aside>
          {/* 主内容区骨架 */}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 flex-shrink-0">
              <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
            </header>
            <main className="flex-1 overflow-auto p-6 bg-white scrollbar-hide">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  // 未认证，不渲染内容（等待跳转）
  if (!isAuthenticated) {
    return null
  }

  // 从 SettingsContext 获取 themeType
  const themeType = settings['themeType'] || 'default'

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      // 静默处理错误
    } finally {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } catch (storageError) {
        // localStorage 不可用，忽略清除操作
      }
      router.push('/')
    }
  }

  const menuItems: MenuItem[] = [
    { name: '仪表盘', path: getAdminRoute('dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: '个人资料', path: getAdminRoute('profile'), icon: <User className="w-5 h-5" /> },
    { name: '社交动态', path: getAdminRoute('social-feed'), icon: <Rss className="w-5 h-5" /> },
    { name: '笔记管理', path: getAdminRoute('notes'), icon: <FileText className="w-5 h-5" /> },
    { name: '便签管理', path: getAdminRoute('sticky-notes'), icon: <StickyNote className="w-5 h-5" /> },
    { name: '网站导航', path: getAdminRoute('sites'), icon: <Globe className="w-5 h-5" /> },
    { name: '图库管理', path: getAdminRoute('galleries'), icon: <Image className="w-5 h-5" /> },
    { name: '服务管理', path: getAdminRoute('services'), icon: <ShoppingBag className="w-5 h-5" /> },
    { name: '待办事项', path: getAdminRoute('todos'), icon: <CheckSquare className="w-5 h-5" /> },
    { name: '博客主题', path: getAdminRoute('blog-theme'), icon: <Palette className="w-5 h-5" /> },
    { name: '留言管理', path: getAdminRoute('other'), icon: <MessageSquare className="w-5 h-5" />, badge: pendingMessagesCount > 0 ? pendingMessagesCount : undefined },
    { name: '官网设置', path: getAdminRoute('promo-settings'), icon: <Megaphone className="w-5 h-5" /> },
    { name: '系统设置', path: getAdminRoute('settings'), icon: <Settings className="w-5 h-5" /> },
  ]

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:p-4">
      {/* 整体容器 - PC端圆角，移动端无圆角 */}
      <div className="max-w-[1400px] mx-auto h-screen lg:h-[calc(100vh-2rem)] bg-white lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden flex">
        {/* 侧边栏 - 桌面版，固定不滚动 */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 flex-shrink-0 ${
            sidebarOpen ? 'w-56' : 'w-16'
          }`}
        >
          {/* Logo区域 */}
          <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-100">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Xs-Admin</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* 导航菜单 - 可滚动，隐藏滚动条 */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  prefetch={true}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${!sidebarOpen && 'justify-center'}`}
                  title={!sidebarOpen ? item.name : ''}
                >
                  {item.icon}
                  {sidebarOpen && <span className="text-sm">{item.name}</span>}
                  {sidebarOpen && item.badge && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          {/* 底部操作按钮 */}
          <div className="flex-shrink-0 border-t border-gray-100 p-4">
            {sidebarOpen ? (
              <div className="flex gap-2">
                <Link
                  href="/"
                  prefetch={true}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>前台</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/"
                  prefetch={true}
                  className="block w-full p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  title="返回前台"
                >
                  <Home className="w-5 h-5 text-gray-700 mx-auto" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-5 h-5 text-red-600 mx-auto" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* 移动端侧边栏 */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 z-50 lg:hidden flex flex-col">
              {/* Logo区域 */}
              <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Xs-Admin</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 导航菜单 */}
              <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
                <div className="space-y-1">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={true}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* 底部操作按钮 */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <Link
                    href="/"
                    prefetch={true}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    <span>前台</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出</span>
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 顶部导航栏 - 固定不滚动 */}
          <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              {title && (
                <h1 className="text-lg lg:text-xl font-bold text-gray-900">{title}</h1>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 程序清理按钮 */}
              <button
                onClick={() => setShowCleanModal(true)}
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                title="程序清理"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">程序清理</span>
              </button>
              {/* GitHub 链接 */}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                title="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </header>

          {/* 页面内容 - 可滚动区域，隐藏滚动条 */}
          <main className="flex-1 overflow-auto bg-white scrollbar-hide">
            {children}
          </main>
        </div>
      </div>

      {/* 程序清理弹窗 */}
      {showCleanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">程序清理</h3>
                    <p className="text-white/80 text-sm">选择要清理的内容</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCleanModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 选项列表 */}
            <div className="p-4 space-y-3">
              {/* 清理缓存 */}
              <button
                onClick={handleClearCache}
                disabled={cleaningCache}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">
                    {cleaningCache ? '清理中...' : '清理后台缓存'}
                  </h4>
                  <p className="text-sm text-gray-500">清除后台设置缓存，刷新配置</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* 清理前台缓存 */}
              <button
                onClick={handleClearFrontendCache}
                disabled={cleaningFrontendCache}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 group-hover:text-green-600">
                    {cleaningFrontendCache ? '清理中...' : '清理前台缓存'}
                  </h4>
                  <p className="text-sm text-gray-500">清理前台设置、资料等缓存数据</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-400" />
              </button>

              {/* 清理访问数据 */}
              <button
                onClick={handleClearVisits}
                disabled={cleaningVisits}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 group-hover:text-red-600">
                    {cleaningVisits ? '清理中...' : '清理访问数据'}
                  </h4>
                  <p className="text-sm text-gray-500">清空仪表盘访问统计数据</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
              </button>
            </div>

            {/* 底部提示 */}
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-400 text-center">
                清理前后台缓存刷新生效，清理访问数据将重新统计。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
