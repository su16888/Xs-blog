'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { getApiUrl } from '@/lib/api'
import {
  ArrowLeft,
  FileText,
  Home,
  Copy,
  Check,
  ExternalLink,
  List,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  ChevronUp,
  Search,
  Clock,
  BookOpen
} from 'lucide-react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface DocFile {
  name: string
  displayName: string
}

export default function MarkdownPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [docFiles, setDocFiles] = useState<DocFile[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [readingProgress, setReadingProgress] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  // 从 slug 中获取文件名
  const slugArray = params.slug as string[]
  const filename = slugArray ? slugArray.join('/') : ''

  // 确保文件名以 .md 结尾
  const mdFilename = filename.endsWith('.md') ? filename : `${filename}.md`

  // 获取文档列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(getApiUrl('/markdown'))
        const data = await response.json()
        if (data.success) {
          setDocFiles(data.data.map((name: string) => ({
            name,
            displayName: name.replace(/\.md$/, '')
          })))
        }
      } catch (err) {
        console.error('获取文档列表失败:', err)
      }
    }
    fetchFiles()
  }, [])

  // 获取文档内容
  useEffect(() => {
    if (!filename) {
      setError('无效的文件路径')
      setLoading(false)
      return
    }

    const fetchMarkdown = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(getApiUrl(`/markdown/${mdFilename}`))
        const data = await response.json()

        if (data.success) {
          setContent(data.data.content)
          // 解析目录
          extractToc(data.data.content)
        } else {
          setError(data.message || '文件不存在')
        }
      } catch (err) {
        console.error('加载 Markdown 文件失败:', err)
        setError('加载文件失败')
      } finally {
        setLoading(false)
      }
    }

    fetchMarkdown()
  }, [filename, mdFilename])

  // 提取目录
  const extractToc = (md: string) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const items: TocItem[] = []
    let match

    while ((match = headingRegex.exec(md)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      // 生成 ID（与 rehype-slug 一致）
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      items.push({ id, text, level })
    }

    setToc(items)
  }

  // 监听滚动，高亮当前标题和计算阅读进度
  useEffect(() => {
    let ticking = false
    let lastProgress = 0
    let lastActiveId = ''

    const handleScroll = () => {
      if (ticking) return

      ticking = true
      requestAnimationFrame(() => {
        // 显示/隐藏回到顶部按钮
        const shouldShowScrollTop = window.scrollY > 300
        setShowScrollTop(prev => prev !== shouldShowScrollTop ? shouldShowScrollTop : prev)

        // 计算阅读进度（只在变化超过1%时更新）
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight - windowHeight
        const scrollTop = window.scrollY
        const progress = documentHeight > 0 ? Math.min(Math.round((scrollTop / documentHeight) * 100), 100) : 0

        if (Math.abs(progress - lastProgress) >= 1) {
          lastProgress = progress
          setReadingProgress(progress)
        }

        // 更新当前高亮标题
        if (toc.length > 0) {
          let newActiveId = toc[0]?.id || ''

          for (let i = toc.length - 1; i >= 0; i--) {
            const heading = document.getElementById(toc[i].id)
            if (heading) {
              const rect = heading.getBoundingClientRect()
              if (rect.top <= 100) {
                newActiveId = toc[i].id
                break
              }
            }
          }

          if (newActiveId !== lastActiveId) {
            lastActiveId = newActiveId
            setActiveId(newActiveId)
          }
        }

        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [toc])

  // 滚动到指定标题
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -80
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
      setActiveId(id)
      // 关闭移动端目录
      setTocOpen(false)
    }
  }, [])

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 提取文章标题
  const extractTitle = (md: string) => {
    const match = md.match(/^#\s+(.+)$/m)
    return match ? match[1] : mdFilename.replace('.md', '')
  }

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 复制代码
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('复制代码失败:', err)
    }
  }

  // 计算阅读时间（假设每分钟阅读 300 字）
  const getReadingTime = (text: string) => {
    const words = text.replace(/[#*`\[\]()]/g, '').length
    const minutes = Math.ceil(words / 300)
    return minutes < 1 ? '不到 1 分钟' : `${minutes} 分钟`
  }

  // 当前文档名
  const currentDocName = filename.endsWith('.md') ? filename : `${filename}.md`

  // 获取上一篇和下一篇文档
  const currentIndex = docFiles.findIndex(doc => doc.name === currentDocName)
  const prevDoc = currentIndex > 0 ? docFiles[currentIndex - 1] : null
  const nextDoc = currentIndex < docFiles.length - 1 ? docFiles[currentIndex + 1] : null

  // 过滤文档列表
  const filteredDocFiles = docFiles.filter(doc =>
    doc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 设置页面标题
  useEffect(() => {
    if (content) {
      document.title = `${extractTitle(content)} - 文档`
    }
  }, [content])

  // 导航到其他文档
  const navigateToDoc = (docName: string) => {
    const displayName = docName.replace(/\.md$/, '')
    router.push(`/docs/${displayName}`)
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <header className="sticky top-0 z-50 bg-bg-primary/98 backdrop-blur-md border-b border-border-primary">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
            <div className="h-5 w-32 bg-bg-secondary animate-pulse rounded" />
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-bg-secondary animate-pulse rounded" />
            <div className="h-4 w-full bg-bg-secondary animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-bg-secondary animate-pulse rounded" />
            <div className="h-4 w-4/5 bg-bg-secondary animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <header className="sticky top-0 z-50 bg-bg-primary/98 backdrop-blur-md border-b border-border-primary">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => router.push('/docs')}
              className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-text-primary font-medium">返回文档列表</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">文档未找到</h1>
            <p className="text-text-secondary mb-6">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/docs')}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                返回文档列表
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const title = extractTitle(content)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60]">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <button
                  onClick={() => router.push('/docs')}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Docs
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-800 dark:text-gray-100 font-medium truncate max-w-[200px] md:max-w-[300px]">
                  {title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Reading time */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{getReadingTime(content)}</span>
              </div>

              {/* Mobile TOC button */}
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                title="Table of Contents"
              >
                <List className="w-5 h-5" />
              </button>

              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>

              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                title="Go to homepage"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile sidebar overlay */}
      {(sidebarOpen || tocOpen) && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => { setSidebarOpen(false); setTocOpen(false); }}
        />
      )}

      {/* Main content */}
      <div className="max-w-8xl mx-auto flex relative">
        {/* Left sidebar (docs list) */}
        <aside className={`
          fixed top-16 left-0 z-40
          w-72 h-[calc(100vh-4rem)]
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          overflow-y-auto
          transition-transform duration-300 ease-in-out
          hidden lg:block
        `}>
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
              Documentation
            </h3>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <nav className="space-y-1">
              {filteredDocFiles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                  No matching documents
                </p>
              ) : (
                filteredDocFiles.map((doc) => (
                  <button
                    key={doc.name}
                    onClick={() => navigateToDoc(doc.name)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                      ${currentDocName === doc.name
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.displayName}</span>
                  </button>
                ))
              )}
            </nav>
          </div>
        </aside>

        {/* Mobile left sidebar */}
        <aside className={`
          fixed top-0 left-0 z-50
          w-72 h-full
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          overflow-y-auto
          transition-transform duration-300 ease-in-out
          lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Documentation
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <nav className="space-y-1">
              {filteredDocFiles.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => navigateToDoc(doc.name)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${currentDocName === doc.name
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{doc.displayName}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Article content */}
        <main className="flex-1 min-w-0 py-8 lg:py-12 lg:pl-72 lg:pr-72">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg dark:prose-invert
              prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:scroll-mt-24
              prose-h1:text-4xl prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700
              prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700 prose-h2:pb-3
              prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-4
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-800 dark:prose-strong:text-gray-100 prose-strong:font-semibold
              prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-1 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
              prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-xl prose-pre:shadow-lg
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/30 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
              prose-ul:my-5 prose-ol:my-5
              prose-li:text-gray-600 dark:prose-li:text-gray-300
              prose-table:border-collapse prose-table:w-full prose-table:shadow-sm
              prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:px-4 prose-td:py-2.5
              prose-img:rounded-xl prose-img:shadow-lg
              prose-hr:border-gray-200 dark:prose-hr:border-gray-700 prose-hr:my-12
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex]}
                components={{
                  a: ({ href, children, ...props }) => {
                    const isExternal = href?.startsWith('http')
                    if (isExternal) {
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5" {...props}>
                          {children}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )
                    }
                    return <a href={href} {...props}>{children}</a>
                  },
                  pre: ({ children }) => {
                    const childElement = children as React.ReactElement<{ children?: string; className?: string }>
                    const codeString = childElement?.props?.children as string || ''
                    const language = (childElement?.props?.className || '').replace('language-', '')

                    return (
                      <div className="relative group my-6">
                        {language && (
                          <div className="absolute top-3 left-4 px-2 py-0.5 text-xs text-gray-300 bg-black/30 rounded-md font-mono">
                            {language}
                          </div>
                        )}
                        <button
                          onClick={() => handleCopyCode(codeString)}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                          title="Copy code"
                        >
                          {copiedCode === codeString ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <pre className="!mt-0 !p-0 !pt-10 !pb-4 overflow-auto">
                          <code className="!block !p-4 !px-5 !text-sm">{children}</code>
                        </pre>
                      </div>
                    )
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </article>

            {/* Prev/Next navigation */}
            {(prevDoc || nextDoc) && (
              <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                {prevDoc ? (
                  <button
                    onClick={() => navigateToDoc(prevDoc.name)}
                    className="group flex flex-col items-start p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </span>
                    <span className="text-gray-800 dark:text-gray-100 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate w-full">
                      {prevDoc.displayName}
                    </span>
                  </button>
                ) : <div />}
                {nextDoc ? (
                  <button
                    onClick={() => navigateToDoc(nextDoc.name)}
                    className="group flex flex-col items-end p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-right"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </span>
                    <span className="text-gray-800 dark:text-gray-100 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate w-full">
                      {nextDoc.displayName}
                    </span>
                  </button>
                ) : <div />}
              </div>
            )}

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
              </div>
            </footer>
          </div>
        </main>

        {/* Right sidebar (TOC) */}
        <aside className={`
          fixed top-16 right-0 z-20
          w-72 h-[calc(100vh-4rem)]
          bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm
          overflow-y-auto
          hidden lg:block
        `}>
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
              On this page
            </h3>

            {toc.length > 0 ? (
              <nav className="space-y-1">
                {toc.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={`
                        w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors
                        ${isActive
                          ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/50'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                      style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                      title={item.text}
                    >
                      {item.text}
                    </button>
                  );
                })}
              </nav>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                No table of contents
              </p>
            )}
          </div>
        </aside>

        {/* Mobile right sidebar (TOC) */}
        <aside className={`
          fixed top-0 right-0 z-50
          w-72 h-full
          bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800
          overflow-y-auto
          transition-transform duration-300 ease-in-out
          lg:hidden
          ${tocOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                On this page
              </h3>
              <button
                onClick={() => setTocOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {toc.length > 0 ? (
              <nav className="space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`
                      w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors
                      ${activeId === item.id
                        ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/50'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                    style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                No table of contents
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-30 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
          title="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
