'use client'

import { createContext, useContext } from 'react'

interface PromoContextType {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  lang: 'zh' | 'en'
  setLang: (lang: 'zh' | 'en') => void
  data: any
  isLoading: boolean
  isZh: boolean
  T: any
  scrollToSection: (link: string) => void
}

export const PromoContext = createContext<PromoContextType | null>(null)

export const usePromo = () => {
  const context = useContext(PromoContext)
  if (!context) {
    throw new Error('usePromo must be used within a PromoProvider')
  }
  return context
}
