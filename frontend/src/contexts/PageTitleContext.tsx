'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface PageTitleContextType {
  title: string
  setTitle: (title: string) => void
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')

  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitleContext() {
  const context = useContext(PageTitleContext)
  if (context === undefined) {
    throw new Error('usePageTitleContext must be used within a PageTitleProvider')
  }
  return context
}

// 可选版本，不在 Provider 外使用时返回 null
export function useOptionalPageTitleContext() {
  return useContext(PageTitleContext)
}
