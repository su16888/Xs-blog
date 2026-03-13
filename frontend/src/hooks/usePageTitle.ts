import { useEffect, useState } from 'react'
import { useOptionalPageTitleContext } from '@/contexts/PageTitleContext'

// 缓存网站标题，避免重复请求
let cachedSiteTitle: string | null = null

/**
 * 自定义 Hook 用于设置页面标题
 * @param pageTitle 页面标题（如："仪表盘"、"待办事项管理"）
 * @param isAdmin 是否是后台页面，默认为 false
 */
export function usePageTitle(pageTitle: string, isAdmin: boolean = false) {
  const [siteTitle, setSiteTitle] = useState<string>(cachedSiteTitle || '')

  // 尝试获取 PageTitleContext（仅在后台页面可用）
  const pageTitleContext = useOptionalPageTitleContext()

  // 设置 Context 标题（用于后台侧边栏显示）
  useEffect(() => {
    if (isAdmin && pageTitleContext) {
      pageTitleContext.setTitle(pageTitle)
    }
  }, [pageTitle, isAdmin, pageTitleContext])

  useEffect(() => {
    // 如果已有缓存，直接使用
    if (cachedSiteTitle) {
      setSiteTitle(cachedSiteTitle)
    } else {
      // 获取网站标题
      const fetchSiteTitle = async () => {
        try {
          const response = await fetch('/api/settings')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              const settings: any = {}
              data.data.forEach((setting: any) => {
                settings[setting.key] = setting.value
              })
              const title = settings.siteTitle || ''
              cachedSiteTitle = title
              setSiteTitle(title)
            }
          }
        } catch (error) {
          console.error('Failed to fetch site title:', error)
        }
      }
      fetchSiteTitle()
    }
  }, [])

  useEffect(() => {
    // 保存原始标题
    const originalTitle = document.title

    // 根据不同页面类型设置标题格式
    if (isAdmin) {
      // 后台页面
      if (pageTitle === '仪表盘') {
        document.title = `${siteTitle} - 后台管理系统`
      } else {
        document.title = `${pageTitle} - ${siteTitle}后台管理系统`
      }
    } else {
      // 前台页面
      document.title = `${pageTitle} - ${siteTitle}`
    }

    // 组件卸载时恢复原标题（可选）
    return () => {
      document.title = originalTitle
    }
  }, [pageTitle, siteTitle, isAdmin])
}
