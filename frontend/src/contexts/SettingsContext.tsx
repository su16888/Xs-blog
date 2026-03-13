'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { getSettings, getPageTexts } from '@/lib/api'

// 缓存配置
const CACHE_KEY = 'xs_settings_cache'
const CACHE_EXPIRE_KEY = 'xs_settings_expire'
const PAGE_TEXTS_CACHE_KEY = 'xs_page_texts_cache'
const PAGE_TEXTS_EXPIRE_KEY = 'xs_page_texts_expire'
const CACHE_DURATION = 60 * 60 * 1000 // 1小时缓存

// 页面文本配置接口
interface PageTextItem {
  title?: string
  description?: string
  browserTitle: string
  browserSubtitle?: string
  usageTitle?: string
  usageContent?: string
}

interface PageTextsData {
  navigation: PageTextItem
  services: PageTextItem
  notes: PageTextItem
  note: PageTextItem
  galleries: PageTextItem
  messages: PageTextItem
  promo: PageTextItem
  socialFeed: PageTextItem
  docs: PageTextItem
}

interface SettingsContextType {
  settings: Record<string, any>
  pageTexts: PageTextsData | null
  isLoading: boolean
  hasCachedData: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// 从 localStorage 获取缓存
const getCachedSettings = (): Record<string, any> | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const expire = localStorage.getItem(CACHE_EXPIRE_KEY)
    if (cached && expire && Date.now() < parseInt(expire)) {
      return JSON.parse(cached)
    }
  } catch (e) {
    // localStorage 不可用
  }
  return null
}

// 保存到 localStorage 缓存
const setCachedSettings = (settings: Record<string, any>) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
    localStorage.setItem(CACHE_EXPIRE_KEY, String(Date.now() + CACHE_DURATION))
  } catch (e) {
    // localStorage 不可用
  }
}

// 清除缓存
const clearCachedSettings = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRE_KEY)
    localStorage.removeItem(PAGE_TEXTS_CACHE_KEY)
    localStorage.removeItem(PAGE_TEXTS_EXPIRE_KEY)
  } catch (e) {}
}

// 导出清除缓存函数供外部调用
export const clearFrontendCache = clearCachedSettings

// 从 localStorage 获取页面文本缓存
const getCachedPageTexts = (): PageTextsData | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(PAGE_TEXTS_CACHE_KEY)
    const expire = localStorage.getItem(PAGE_TEXTS_EXPIRE_KEY)
    if (cached && expire && Date.now() < parseInt(expire)) {
      return JSON.parse(cached)
    }
  } catch (e) {
    // localStorage 不可用
  }
  return null
}

// 保存页面文本到 localStorage 缓存
const setCachedPageTexts = (pageTexts: PageTextsData) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PAGE_TEXTS_CACHE_KEY, JSON.stringify(pageTexts))
    localStorage.setItem(PAGE_TEXTS_EXPIRE_KEY, String(Date.now() + CACHE_DURATION))
  } catch (e) {
    // localStorage 不可用
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [pageTexts, setPageTexts] = useState<PageTextsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasCachedData, setHasCachedData] = useState(false)
  const hasLoadedRef = useRef(false)

  const loadSettings = async (forceRefresh = false) => {
    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      const cachedSettings = getCachedSettings()
      const cachedPageTexts = getCachedPageTexts()
      if (cachedSettings && Object.keys(cachedSettings).length > 0) {
        setSettings(cachedSettings)
        setHasCachedData(true)
        if (cachedPageTexts) {
          setPageTexts(cachedPageTexts)
        }
        setIsLoading(false)
        // 后台静默更新缓存
        fetchAndUpdateSettings()
        return
      }
    }

    await fetchAndUpdateSettings()
  }

  const fetchAndUpdateSettings = async () => {
    try {
      // 从 API 获取完整设置
      const [settingsResponse, pageTextsResponse] = await Promise.all([
        getSettings(),
        getPageTexts()
      ])

      if (settingsResponse.success && settingsResponse.data) {
        const settingsObj: Record<string, any> = {}
        settingsResponse.data.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value
        })
        // 为主题模式字段设置默认值，确保前台判断逻辑正常工作
        if (settingsObj.promoThemeEnabled === undefined) {
          settingsObj.promoThemeEnabled = 'false'
        }
        if (settingsObj.socialFeedThemeEnabled === undefined) {
          settingsObj.socialFeedThemeEnabled = 'false'
        }
        if (settingsObj.docsThemeEnabled === undefined) {
          settingsObj.docsThemeEnabled = 'false'
        }
        setSettings(settingsObj)
        setCachedSettings(settingsObj)
      }

      if (pageTextsResponse.success && pageTextsResponse.data) {
        setPageTexts(pageTextsResponse.data)
        setCachedPageTexts(pageTextsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadSettings()
    }
  }, [])

  const refreshSettings = async () => {
    setIsLoading(true)
    clearCachedSettings() // 清除缓存后强制刷新
    await loadSettings(true)
  }

  return (
    <SettingsContext.Provider value={{ settings, pageTexts, isLoading, hasCachedData, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// 辅助函数：获取布尔值设置
export function useSettingBoolean(key: string, defaultValue: boolean = true): boolean {
  const { settings } = useSettings()
  const value = settings[key]
  if (value === undefined) return defaultValue
  return value !== 'false'
}

// 辅助函数：获取字符串设置
export function useSettingString(key: string, defaultValue: string = ''): string {
  const { settings } = useSettings()
  return settings[key] || defaultValue
}
