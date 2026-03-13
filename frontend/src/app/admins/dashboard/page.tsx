'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAdminPendingReminders,
  checkVersionUpdate,
  getCurrentVersion,
  getVisitTrends,
  getModuleStats,
  getIPRanking,
  getDashboardOverview,
  getAdminSites
} from '@/lib/api'
import { safeFetch } from '@/lib/utils'
import {
  MapPin,
  Globe,
  FileText,
  StickyNote,
  CheckSquare,
  MessageSquare,
  Image,
  ShoppingBag,
  Navigation,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  BookOpen,
  ExternalLink,
  Link2
} from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/contexts/AuthContext'
import TodoReminder from '@/components/TodoReminder'
import VersionChecker from '@/components/VersionChecker'

// 时间周期配置
const PERIOD_OPTIONS = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' }
]

// TOP 排行数量配置
const TOP_OPTIONS = [
  { value: 5, label: 'TOP 5' },
  { value: 10, label: 'TOP 10' },
  { value: 15, label: 'TOP 15' },
  { value: 20, label: 'TOP 20' }
]

interface TrendData {
  date: string
  hour?: number
  visit_count: number
  unique_ips: number
}

interface ModuleStats {
  [key: string]: {
    count: number
    visits: number
    unread?: number
    label: string
  }
}

interface IPRankingData {
  ip: string
  visits: number
  lastVisit: string
}

interface DailyIPData {
  date: string
  uniqueIPs: number
  totalVisits: number
}

interface DashboardSite {
  id: number
  name: string
  link: string
  icon?: string
  description?: string
}

export default function DashboardPage() {
  usePageTitle('仪表盘', true)
  const _router = useRouter()
  const { user: _user, isAuthenticated: _isAuthenticated } = useAuth()

  // 基础状态
  const [loading, setLoading] = useState(true)
  const [ipAddress, setIpAddress] = useState<string>('获取中...')
  const [location, setLocation] = useState<string>('获取中...')
  const [showReminder, setShowReminder] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionCheckLoading, setVersionCheckLoading] = useState(false)
  const [versionInfo, setVersionInfo] = useState<any>(null)
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0')

  // 统计数据状态
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [moduleStats, setModuleStats] = useState<ModuleStats | null>(null)
  const [ipRanking, setIPRanking] = useState<IPRankingData[]>([])
  const [dailyIPData, setDailyIPData] = useState<DailyIPData[]>([])
  const [overview, setOverview] = useState<{ today: { visits: number; uniqueIPs: number }; total: { visits: number; uniqueIPs: number } } | null>(null)
  const [dashboardSites, setDashboardSites] = useState<DashboardSite[]>([])

  // 筛选条件状态
  const [trendPeriod, setTrendPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [ipTopLimit, setIPTopLimit] = useState<number>(5)
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null)

  // 初始化页面数据 - 分阶段加载优化
  useEffect(() => {
    // 第一阶段：立即加载关键数据（版本、概览）
    loadCriticalData()
    // 第二阶段：延迟加载非关键数据
    const timer = setTimeout(() => {
      loadSecondaryData()
    }, 100)
    // IP 和提醒在空闲时加载
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        getIpAndLocation()
        checkReminders()
      }, { timeout: 2000 })
    } else {
      setTimeout(() => {
        getIpAndLocation()
        checkReminders()
      }, 500)
    }
    return () => clearTimeout(timer)
  }, [])

  // 当筛选条件变化时重新加载趋势数据
  useEffect(() => {
    if (trendPeriod) loadTrendData()
  }, [trendPeriod])

  // 当排行数量变化时重新加载IP排行数据
  useEffect(() => {
    if (ipTopLimit) loadIPRankingData()
  }, [ipTopLimit])

  // 第一阶段：关键数据加载
  const loadCriticalData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCurrentVersion(),
        loadOverview()
      ])
    } catch (error) {
      console.error('加载关键数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 第二阶段：非关键数据加载
  const loadSecondaryData = async () => {
    try {
      await Promise.all([
        loadTrendData(),
        loadModuleStats(),
        loadIPRankingData(),
        loadDashboardSites()
      ])
    } catch (error) {
      console.error('加载次要数据失败:', error)
    }
  }

  const loadCurrentVersion = async () => {
    try {
      const response = await getCurrentVersion()
      if (response.success && response.data) {
        setCurrentVersion(response.data.version)
      }
    } catch (error) {
      // 静默处理
    }
  }

  const loadTrendData = async () => {
    try {
      const response = await getVisitTrends({ period: trendPeriod })
      if (response.success && response.data) {
        setTrendData(response.data.trends || [])
      }
    } catch (error) {
      console.error('加载趋势数据失败:', error)
    }
  }

  const loadModuleStats = async () => {
    try {
      const response = await getModuleStats()
      if (response.success && response.data) {
        setModuleStats(response.data)
      }
    } catch (error) {
      console.error('加载模块统计失败:', error)
    }
  }

  const loadIPRankingData = async () => {
    try {
      const response = await getIPRanking({ limit: ipTopLimit, days: 7 })
      if (response.success && response.data) {
        setIPRanking(response.data.ranking || [])
        setDailyIPData(response.data.daily || [])
      }
    } catch (error) {
      console.error('加载IP排行失败:', error)
    }
  }

  const loadOverview = async () => {
    try {
      const response = await getDashboardOverview()
      if (response.success && response.data) {
        setOverview(response.data)
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  }

  const loadDashboardSites = async () => {
    try {
      const response = await getAdminSites()
      if (response.success && response.data) {
        // 过滤出"后台展示"的导航（display_type 为 'backend'）
        // 兼容旧数据：如果没有 display_type，则检查 is_frontend_visible
        const sites = response.data.filter((site: any) =>
          site.display_type === 'backend' ||
          (!site.display_type && site.is_frontend_visible === false)
        )
        setDashboardSites(sites)
      }
    } catch (error) {
      console.error('加载后台导航失败:', error)
    }
  }

  // 获取IP地址和地理位置
  const getIpAndLocation = async () => {
    const cacheKey = 'xs_ip_location_cache'
    const cacheExpireKey = 'xs_ip_location_expire'

    try {
      const cachedData = localStorage.getItem(cacheKey)
      const cacheExpire = localStorage.getItem(cacheExpireKey)

      if (cachedData && cacheExpire && Date.now() < parseInt(cacheExpire)) {
        const { ip, location: loc } = JSON.parse(cachedData)
        setIpAddress(ip)
        setLocation(loc)
        return
      }
    } catch (e) {}

    const fetchIP = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await safeFetch('/api/client-ip', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            let displayIP = data.data.ip
            if (displayIP === '::1') {
              displayIP = '127.0.0.1'
            }
            setIpAddress(displayIP)

            const loc = (data.data.isPrivate || displayIP === '127.0.0.1' || displayIP === 'localhost')
              ? '本地环境'
              : data.data.location || '暂无法获取'
            setLocation(loc)

            try {
              localStorage.setItem(cacheKey, JSON.stringify({ ip: displayIP, location: loc }))
              localStorage.setItem(cacheExpireKey, String(Date.now() + 30 * 60 * 1000))
            } catch (e) {}
          }
        } else {
          setIpAddress('127.0.0.1')
          setLocation('本地环境')
        }
      } catch (error) {
        setIpAddress('127.0.0.1')
        setLocation('本地环境')
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => fetchIP(), { timeout: 2000 })
    } else {
      setTimeout(fetchIP, 100)
    }
  }

  const handleCheckVersion = async () => {
    setVersionCheckLoading(true)
    setShowVersionModal(true)
    try {
      const response = await checkVersionUpdate()
      if (response.success && response.data) {
        setVersionInfo(response.data)
      } else {
        setVersionInfo({
          currentVersion: currentVersion || '未知',
          latestVersion: null,
          hasUpdate: false,
          message: response.data?.message || '版本检测失败',
          updateUrl: null,
          releaseNotes: null
        })
      }
    } catch (error) {
      setVersionInfo({
        currentVersion: currentVersion || '未知',
        latestVersion: null,
        hasUpdate: false,
        message: '版本检测失败，请检查网络连接或稍后重试',
        updateUrl: null,
        releaseNotes: null
      })
    } finally {
      setVersionCheckLoading(false)
    }
  }

  const checkReminders = async () => {
    try {
      const response = await getAdminPendingReminders()
      if (response.success && response.data && response.data.length > 0) {
        setShowReminder(true)
      }
    } catch (error) {}
  }

  // 计算折线图最大值
  const maxTrendValue = useMemo(() => {
    if (!trendData.length) return 100
    const maxVisits = Math.max(...trendData.map(d => d.visit_count))
    const maxIPs = Math.max(...trendData.map(d => d.unique_ips))
    return Math.max(maxVisits, maxIPs, 10)
  }, [trendData])

  // 格式化日期显示
  const formatDate = (dateStr: string, hour?: number) => {
    if (trendPeriod === 'day' && hour !== undefined) {
      // 按天查看时，显示小时
      return `${hour}:00`
    }
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 格式化横轴标签（按天查看时为3小时间隔）
  const formatTrendLabel = (d: TrendData, index: number) => {
    if (trendPeriod === 'day' && d.hour !== undefined) {
      return `${d.hour}:00`
    }
    return formatDate(d.date)
  }

  // 模块图标映射
  const getModuleIcon = (key: string) => {
    const icons: { [key: string]: any } = {
      socialFeed: Users,
      notes: FileText,
      stickyNotes: StickyNote,
      navigation: Navigation,
      galleries: Image,
      services: ShoppingBag,
      todos: CheckSquare,
      messages: MessageSquare,
      docs: BookOpen
    }
    return icons[key] || Activity
  }

  // 模块颜色映射
  const getModuleColor = (key: string) => {
    const colors: { [key: string]: string } = {
      socialFeed: 'bg-emerald-500',
      notes: 'bg-green-500',
      stickyNotes: 'bg-yellow-500',
      navigation: 'bg-indigo-500',
      galleries: 'bg-pink-500',
      services: 'bg-purple-500',
      todos: 'bg-orange-500',
      messages: 'bg-cyan-500',
      docs: 'bg-blue-500'
    }
    return colors[key] || 'bg-gray-500'
  }

  return (
    <div className="min-h-full">
        {/* 主内容区 */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* 顶部欢迎横幅 */}
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-6 md:p-8 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              {/* 左侧：欢迎语 */}
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">Xs-Blog仪表盘</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckVersion}
                      className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/30"
                    >
                      检测更新
                    </button>
                    <span className="text-blue-50/80 text-sm">（当前版本：V {currentVersion}）</span>
                  </div>
                </div>
              </div>

              {/* 右侧：欢迎和定位信息卡片 */}
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30 shadow-lg min-w-0 md:min-w-[280px]">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl border-2 border-white/30 bg-white/10"></div>
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
                      <img
                        src="/admin.png"
                        alt="网站图标"
                        className="w-[85%] h-[85%] opacity-30 object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Hi , Admin !</h3>
                    <div className="space-y-1 md:space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 opacity-70 flex-shrink-0" />
                        <span className="text-xs md:text-sm font-medium opacity-90 truncate">IP: {ipAddress || '加载中...'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 md:w-4 md:h-4 opacity-70 flex-shrink-0" />
                        <span className="text-xs md:text-sm font-medium opacity-90 truncate">位置: {location || '加载中...'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 区块一：访问趋势折线图 */}
          <div className="mb-6 bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">访问趋势</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* 时间周期选择 */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {PERIOD_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTrendPeriod(option.value as 'day' | 'week' | 'month')}
                      className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                        trendPeriod === option.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 折线图 */}
            <div className="relative h-48 md:h-64">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : trendData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  暂无数据
                </div>
              ) : (
                <>
                  <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                    {/* 网格线 */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <line
                        key={i}
                        x1="50"
                        y1={40 + i * 35}
                        x2="780"
                        y2={40 + i * 35}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Y轴刻度 */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <text
                        key={i}
                        x="45"
                        y={44 + i * 35}
                        textAnchor="end"
                        className="text-[10px] fill-gray-400"
                      >
                        {Math.round(maxTrendValue * (4 - i) / 4)}
                      </text>
                    ))}

                    {/* 访问次数折线 */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={trendData.map((d, i) => {
                        const x = 50 + (i * 730) / Math.max(trendData.length - 1, 1)
                        const y = 180 - (d.visit_count / maxTrendValue) * 140
                        return `${x},${y}`
                      }).join(' ')}
                    />

                    {/* 独立IP折线 */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      points={trendData.map((d, i) => {
                        const x = 50 + (i * 730) / Math.max(trendData.length - 1, 1)
                        const y = 180 - (d.unique_ips / maxTrendValue) * 140
                        return `${x},${y}`
                      }).join(' ')}
                    />

                    {/* 数据点和交互区域 */}
                    {trendData.map((d, i) => {
                      const x = 50 + (i * 730) / Math.max(trendData.length - 1, 1)
                      const y1 = 180 - (d.visit_count / maxTrendValue) * 140
                      const y2 = 180 - (d.unique_ips / maxTrendValue) * 140
                      return (
                        <g key={i}>
                          {/* 交互区域 */}
                          <rect
                            x={x - 20}
                            y={20}
                            width={40}
                            height={170}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ index: i, x, y: Math.min(y1, y2) })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {/* 数据点 */}
                          <circle cx={x} cy={y1} r={hoveredPoint?.index === i ? 6 : 4} fill="#3b82f6" className="transition-all" />
                          <circle cx={x} cy={y2} r={hoveredPoint?.index === i ? 6 : 4} fill="#10b981" className="transition-all" />
                          {/* X轴标签 */}
                          <text
                            x={x}
                            y="195"
                            textAnchor="middle"
                            className="text-[9px] fill-gray-500"
                          >
                            {formatTrendLabel(d, i)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* 悬停提示框 */}
                  {hoveredPoint !== null && trendData[hoveredPoint.index] && (
                    <div
                      className="absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
                      style={{
                        left: `${(hoveredPoint.x / 800) * 100}%`,
                        top: `${(hoveredPoint.y / 200) * 100 - 15}%`,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <div className="font-medium mb-1">
                        {formatTrendLabel(trendData[hoveredPoint.index], hoveredPoint.index)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>访问: {trendData[hoveredPoint.index].visit_count} 次</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span>独立IP: {trendData[hoveredPoint.index].unique_ips} 个</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 图例 */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span className="text-xs text-gray-600">访问次数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-emerald-500" style={{ borderStyle: 'dashed' }}></div>
                <span className="text-xs text-gray-600">独立IP</span>
              </div>
            </div>
          </div>

          {/* 区块二：各模块数据统计卡片 */}
          <div className="mb-6 bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Activity className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">内容统计</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {moduleStats && Object.entries(moduleStats).map(([key, stat]) => {
                const Icon = getModuleIcon(key)
                const colorClass = getModuleColor(key)
                return (
                  <div
                    key={key}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 md:p-4 border border-gray-200 hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <span className="text-xs md:text-sm font-medium text-gray-700 truncate">{stat.label}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl md:text-2xl font-bold text-gray-900">{stat.count}</span>
                        <span className="text-xs text-gray-500">条</span>
                      </div>
                      {key === 'messages' && typeof stat.unread === 'number' && stat.unread > 0 && (
                        <div className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                          {stat.unread} 条未读
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 区块三：IP访问排行 */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">IP访问排行</h3>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {TOP_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setIPTopLimit(option.value)}
                    className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                      ipTopLimit === option.value
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 横向柱状图 */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
              ) : ipRanking.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无数据</div>
              ) : (
                <div className="space-y-3">
                  {ipRanking.map((item, index) => {
                    const maxVisits = Math.max(...ipRanking.map(r => r.visits), 1)
                    const barWidth = (item.visits / maxVisits) * 100
                    return (
                      <div key={index} className="flex items-center gap-3">
                        {/* 排名 */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        {/* IP地址 */}
                        <div className="w-28 md:w-36 text-xs md:text-sm font-medium text-gray-700 truncate flex-shrink-0">
                          {item.ip}
                        </div>
                        {/* 柱状图 */}
                        <div className="flex-1 h-7 bg-gray-200 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                            style={{ width: `${Math.max(barWidth, 5)}%` }}
                          />
                          {/* 次数显示在柱状图上方，绝对定位 */}
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                            {item.visits} 次
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 区块四：常用导航 */}
          {dashboardSites.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Link2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">常用导航</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {dashboardSites.map((site) => (
                  <a
                    key={site.id}
                    href={site.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-2 group-hover:border-indigo-300 transition-colors overflow-hidden">
                      {site.icon ? (
                        <img
                          src={site.icon}
                          alt={site.name}
                          className="w-6 h-6 md:w-8 md:h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent) {
                              parent.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>'
                            }
                          }}
                        />
                      ) : (
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      )}
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors text-center truncate w-full">
                      {site.name}
                    </span>
                    {site.description && (
                      <span className="text-[10px] text-gray-400 truncate w-full text-center mt-0.5 hidden md:block">
                        {site.description}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 待办事项提醒弹窗 */}
          {showReminder && <TodoReminder onClose={() => setShowReminder(false)} />}

          {/* 自动版本检测组件 */}
          <VersionChecker />

          {/* 手动版本检测弹窗 */}
          {showVersionModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl animate-slideUp overflow-hidden">
                {/* 头部 - 根据版本状态显示不同颜色 */}
                <div className={`px-6 py-4 ${
                  versionCheckLoading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                    : versionInfo?.hasUpdate
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}>
                  <div className="flex items-center gap-3">
                    {versionCheckLoading ? (
                      <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : versionInfo?.hasUpdate ? (
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {versionCheckLoading ? '版本检测中' : versionInfo?.hasUpdate ? '发现新版本' : '版本检测'}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {versionCheckLoading ? '请稍候...' : versionInfo?.hasUpdate ? '建议尽快更新' : '当前已是最新版本'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 内容区 */}
                <div className="p-6">
                  {versionCheckLoading ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <p className="text-gray-600 dark:text-gray-300">正在检测版本...</p>
                    </div>
                  ) : versionInfo ? (
                    <div className="text-center py-2">
                      <p className={`text-lg font-semibold leading-relaxed ${
                        versionInfo.hasUpdate
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {versionInfo.message}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => {
                        setShowVersionModal(false)
                        setVersionInfo(null)
                      }}
                      className={`px-6 py-2 text-white rounded-lg transition-all shadow-md hover:shadow-lg ${
                        versionInfo?.hasUpdate
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      }`}
                    >
                      我知道了
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
  )
}
