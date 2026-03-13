'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import api from '@/lib/api'

// 缓存配置
const CACHE_KEY = 'xs_social_links_cache'
const CACHE_EXPIRE_KEY = 'xs_social_links_expire'
const CACHE_DURATION = 60 * 60 * 1000 // 1小时缓存

export interface SocialLink {
  id: number
  platform: string
  account: string
  link?: string
  icon: string
  qrcode?: string
  is_visible: boolean
  show_in_profile?: boolean
  updated_at?: string
}

interface SocialLinksContextType {
  socialLinks: SocialLink[]
  profileSocialLinks: SocialLink[] // 只返回在个人资料中显示的链接（最多4个）
  isLoading: boolean
  refreshSocialLinks: () => Promise<void>
}

const SocialLinksContext = createContext<SocialLinksContextType | undefined>(undefined)

// 从 localStorage 获取缓存
const getCachedSocialLinks = (): SocialLink[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const expire = localStorage.getItem(CACHE_EXPIRE_KEY)
    if (cached && expire && Date.now() < parseInt(expire)) {
      return JSON.parse(cached)
    }
  } catch (e) {}
  return null
}

// 保存到 localStorage 缓存
const setCachedSocialLinks = (links: SocialLink[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(links))
    localStorage.setItem(CACHE_EXPIRE_KEY, String(Date.now() + CACHE_DURATION))
  } catch (e) {}
}

// 清除缓存
const clearCachedSocialLinks = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRE_KEY)
  } catch (e) {}
}

export function SocialLinksProvider({ children }: { children: ReactNode }) {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const loadSocialLinks = async (forceRefresh = false) => {
    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      const cached = getCachedSocialLinks()
      if (cached && cached.length > 0) {
        setSocialLinks(cached)
        setIsLoading(false)
        // 后台静默更新缓存
        fetchAndUpdateSocialLinks()
        return
      }
    }

    await fetchAndUpdateSocialLinks()
  }

  const fetchAndUpdateSocialLinks = async () => {
    try {
      const response = await api.get('/social-links?visible=true')
      const data = response.data?.data
      const links = Array.isArray(data) ? data : []
      setSocialLinks(links)
      setCachedSocialLinks(links)
    } catch (error) {
      console.error('Failed to load social links:', error)
      setSocialLinks([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadSocialLinks()
    }
  }, [])

  const refreshSocialLinks = async () => {
    setIsLoading(true)
    clearCachedSocialLinks()
    await loadSocialLinks(true)
  }

  // 计算在个人资料中显示的链接（最多4个）
  const profileSocialLinks = socialLinks
    .filter(link => link.show_in_profile)
    .slice(0, 4)

  return (
    <SocialLinksContext.Provider value={{
      socialLinks,
      profileSocialLinks,
      isLoading,
      refreshSocialLinks
    }}>
      {children}
    </SocialLinksContext.Provider>
  )
}

export function useSocialLinks() {
  const context = useContext(SocialLinksContext)
  if (context === undefined) {
    throw new Error('useSocialLinks must be used within a SocialLinksProvider')
  }
  return context
}
