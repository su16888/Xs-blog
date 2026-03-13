'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { getProfile } from '@/lib/api'

// 缓存配置
const CACHE_KEY = 'xs_profile_cache'
const CACHE_EXPIRE_KEY = 'xs_profile_expire'
const CACHE_DURATION = 60 * 60 * 1000 // 1小时缓存

interface ProfileData {
  name?: string
  title?: string
  bio?: string
  avatar?: string
  location?: string
  email?: string
  website?: string
  website_title?: string
  [key: string]: any
}

interface ProfileContextType {
  profile: ProfileData | null
  isLoading: boolean
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

// 从 localStorage 获取缓存
const getCachedProfile = (): ProfileData | null => {
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
const setCachedProfile = (profile: ProfileData) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile))
    localStorage.setItem(CACHE_EXPIRE_KEY, String(Date.now() + CACHE_DURATION))
  } catch (e) {}
}

// 清除缓存
const clearCachedProfile = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRE_KEY)
  } catch (e) {}
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const loadProfile = async (forceRefresh = false) => {
    // 如果不是强制刷新，先尝试从缓存获取
    if (!forceRefresh) {
      const cached = getCachedProfile()
      if (cached) {
        setProfile(cached)
        setIsLoading(false)
        // 后台静默更新缓存
        fetchAndUpdateProfile()
        return
      }
    }

    await fetchAndUpdateProfile()
  }

  const fetchAndUpdateProfile = async () => {
    try {
      const profileData = await getProfile()
      setProfile(profileData)
      if (profileData) {
        setCachedProfile(profileData)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadProfile()
    }
  }, [])

  const refreshProfile = async () => {
    setIsLoading(true)
    clearCachedProfile()
    await loadProfile(true)
  }

  return (
    <ProfileContext.Provider value={{ profile, isLoading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
