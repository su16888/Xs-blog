'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { FileText, Search, X, FolderOpen, BookOpen, ArrowRight } from 'lucide-react'
import PageBackground from '@/components/PageBackground'

// 文件信息接口
interface DocFile {
  name: string
  updatedAt: string | null
}

// 默认文档页面配置 - browserTitle 初始为空，避免覆盖 layout 中设置的标题
const defaultDocsTexts = {
  title: '文档中心',
  description: '浏览所有可用的 Markdown 文档，点击查看详情',
  browserTitle: '',
  browserSubtitle: '',
  usageTitle: '使用说明',
  usageContent: '将 Markdown 文件放入 frontend/public/markdown 目录\n通过 /docs/文件名 访问文档\n支持标准 Markdown 语法、GFM 扩展和 HTML 标签'
}

export default function DocsIndexPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { settings: rawSettings, pageTexts, isLoading: settingsLoading } = useSettings()
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [perPage] = useState(20)
  // 监听全局搜索事件（来自手机端导航栏）
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent).detail || '');
    };

    window.addEventListener('globalSearch', handleGlobalSearch);
    return () => window.removeEventListener('globalSearch', handleGlobalSearch);
  }, []);


  // 从 pageTexts 获取文档页面配置
  const docsTexts = useMemo(() => {
    if (pageTexts?.docs) {
      return {
        title: pageTexts.docs.title || defaultDocsTexts.title,
        description: pageTexts.docs.description || defaultDocsTexts.description,
        browserTitle: pageTexts.docs.browserTitle || defaultDocsTexts.browserTitle,
        browserSubtitle: pageTexts.docs.browserSubtitle || defaultDocsTexts.browserSubtitle,
        usageTitle: pageTexts.docs.usageTitle || defaultDocsTexts.usageTitle,
        usageContent: pageTexts.docs.usageContent || defaultDocsTexts.usageContent
      }
    }
    return defaultDocsTexts
  }, [pageTexts])

  // 检查是否启用了 /docs 页面访问
  // enableDocsPage 默认为 'true'，只有明确设置为 'false' 且 docsThemeEnabled 也为 'false' 时才禁用
  useEffect(() => {
    if (!settingsLoading && rawSettings.enableDocsPage === 'false' && rawSettings.docsThemeEnabled !== 'true') {
      router.replace('/404')
    }
  }, [settingsLoading, rawSettings.enableDocsPage, rawSettings.docsThemeEnabled, router])

  // 设置浏览器标签标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    if (!docsTexts.browserTitle) return
    let title = docsTexts.browserTitle
    if (docsTexts.browserSubtitle) {
      title = `${title} - ${docsTexts.browserSubtitle}`
    }
    document.title = title
  }, [docsTexts.browserTitle, docsTexts.browserSubtitle])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(perPage))
        if (debouncedSearch.trim()) {
          params.set('search', debouncedSearch.trim())
        }
        const response = await fetch(getApiUrl(`/markdown?${params.toString()}`))
        const data = await response.json()

        if (data.success) {
          setFiles(data.data || [])
          setTotalPages(Number(data.pagination?.total_pages || 1))
        } else {
          setError('获取文件列表失败')
          setFiles([])
          setTotalPages(1)
        }
      } catch (err) {
        console.error('加载文件列表失败:', err)
        setError('加载文件列表失败')
        setFiles([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [page, debouncedSearch, perPage])

  // 如果明确禁用，显示加载状态（等待跳转）
  if (!settingsLoading && rawSettings.enableDocsPage === 'false' && rawSettings.docsThemeEnabled !== 'true') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-tertiary">跳转中...</p>
        </div>
      </div>
    )
  }

  // 过滤文件
  const filteredFiles = debouncedSearch.trim()
    ? files.filter(file =>
        file.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : files

  // 显示搜索结果的提示
  const showSearchResults = searchQuery.trim() && filteredFiles.length > 0
  const showNoResults = searchQuery.trim() && filteredFiles.length === 0

  // 获取文件名（不带扩展名）
  const getDisplayName = (filename: string) => {
    return filename.replace(/\.md$/, '')
  }

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0, 0, 0.2, 1] as const
      }
    }
  }

  const isDocsThemeEnabled = rawSettings.docsThemeEnabled === 'true'
  const showTopNavbar = rawSettings.showTopNavbar !== 'false'
  const showWapSidebar = rawSettings.showWapSidebar !== 'false'
  const isDocsHome = isDocsThemeEnabled && pathname === '/'
  const shouldReserveNavSpace = isDocsThemeEnabled ? showTopNavbar : true
  const useNavSearchOnMobile = isDocsThemeEnabled ? (showTopNavbar && showWapSidebar) : true

  return (
    <main className="min-h-screen bg-bg-primary flex flex-col relative">
      {/* 背景图片 */}
      <PageBackground />

      {/* 导航栏占位 */}
      {shouldReserveNavSpace && <div className="h-16"></div>}

      {/* 主内容 */}
      <div className="flex-1 container mx-auto px-4 max-w-6xl py-8 md:py-12">
        {/* 页面头部 */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
            {docsTexts.title}
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            {docsTexts.description}
          </p>
        </div>

        {/* 搜索栏 - 手机端隐藏（使用顶部导航栏的搜索） */}
        <div className={`mb-10 max-w-2xl mx-auto animate-fade-in ${useNavSearchOnMobile ? 'hidden md:block' : ''}`}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 搜索结果显示 */}
        {showSearchResults && (
          <div className="mb-6 p-4 rounded-xl border animate-fade-in" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm" style={{ color: 'var(--info-text)' }}>
                搜索结果: 找到 {filteredFiles.length} 个相关文档
                <span className="font-medium ml-1">"{searchQuery}"</span>
              </span>
            </div>
          </div>
        )}

        {/* 无搜索结果提示 */}
        {showNoResults && !loading && (
          <div className="mb-6 p-4 bg-bg-tertiary rounded-xl border border-border-primary text-center animate-fade-in">
            <span className="text-sm text-text-tertiary">
              没有找到包含 "{searchQuery}" 的文档
            </span>
          </div>
        )}

        {loading ? (
          // 加载骨架屏
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-bg-secondary animate-pulse rounded-xl border border-border-primary" />
            ))}
          </div>
        ) : error ? (
          // 错误状态
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bg-secondary mb-6">
              <FileText className="w-10 h-10 text-text-tertiary" />
            </div>
            <p className="text-text-secondary text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              重试
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          // 空状态
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bg-secondary mb-6">
              <FolderOpen className="w-10 h-10 text-text-tertiary" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {searchQuery ? '未找到匹配的文档' : '暂无文档'}
            </h2>
            <p className="text-text-tertiary max-w-md mx-auto">
              {searchQuery ? '尝试使用其他关键词搜索' : '将 .md 文件放入 public/markdown 目录即可显示'}
            </p>
          </div>
        ) : (
          // 文档列表
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file, index) => (
              <button
                key={file.name}
                onClick={() => router.push(`/docs/${getDisplayName(file.name)}`)}
                className="group flex items-center gap-4 p-5 bg-bg-secondary rounded-xl border border-border-primary hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5 transition-all text-left animate-fade-in"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-500 transition-colors truncate">
                    {getDisplayName(file.name)}
                  </h3>
                  <p className="text-sm text-text-tertiary mt-0.5 truncate">
                    {file.updatedAt ? `最后更新：${formatDate(file.updatedAt)}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-8 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border border-border-primary"
            >
              上一页
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                const isActive = pageNum === page;
                const btnClass = 'w-10 h-10 rounded-lg transition-all text-sm border ' + (isActive ? 'bg-primary-500 text-white border-primary-500' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-primary');

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={btnClass}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border border-border-primary"
            >
              下一页
            </button>
          </div>
        )}

        {/* 使用说明 */}
        {!loading && !error && files.length > 0 && docsTexts.usageTitle && docsTexts.usageContent && (
          <div className="mt-16 p-6 bg-bg-secondary rounded-xl border border-border-primary animate-fade-in">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              {docsTexts.usageTitle}
            </h2>
            <ul className="space-y-3 text-text-secondary text-sm">
              {docsTexts.usageContent.split('\n').filter(Boolean).map((line: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="border-t border-border-primary py-6">
        <div className="container mx-auto px-4 max-w-6xl text-center text-sm text-text-tertiary">
          <p dangerouslySetInnerHTML={{ __html: rawSettings.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.` }} />
        </div>
      </footer>
    </main>
  )
}
