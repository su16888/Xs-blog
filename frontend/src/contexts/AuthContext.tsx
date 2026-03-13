'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { getCurrentUser } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  avatar?: string
  role?: string
  created_at?: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  setUser: (user: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const loadUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      const userData = await getCurrentUser()
      setUser(userData)
    } catch {
      // 静默处理 401 错误（用户未登录是正常情况）
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadUser()
    }
  }, [])

  const refreshUser = async () => {
    setIsLoading(true)
    await loadUser()
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
    setUser(null)
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      refreshUser,
      setUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
