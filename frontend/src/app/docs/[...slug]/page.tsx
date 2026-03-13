'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import type { Root, Element as HastElement } from 'hast'
import '../docs.css'
import { getApiUrl, getImageUrl } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  List,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  Search,
  BookOpen,
  ArrowLeft,
  Download
} from 'lucide-react'
import PageBackground from '@/components/PageBackground'
import CopyButton from '@/components/CopyButton'
import MermaidRenderer from '@/components/MermaidRenderer'
import React from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

// 自定义 rehype 插件：为标题生成唯一 ID（处理重复标题）
function rehypeUniqueSlug() {
  return (tree: Root) => {
    const idCountMap: Record<string, number> = {}

    visit(tree, 'element', (node: HastElement) => {
      if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(node.tagName)) {
        // 提取标题文本
        const text = getTextContent(node)

        // 生成基础 ID
        let baseId = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()

        // 处理重复 ID
        let id = baseId
        if (idCountMap[baseId] !== undefined) {
          idCountMap[baseId]++
          id = `${baseId}-${idCountMap[baseId]}`
        } else {
          idCountMap[baseId] = 0
        }

        // 设置 ID
        node.properties = node.properties || {}
        node.properties.id = id
      }
    })
  }
}

// 辅助函数：提取节点的文本内容
function getTextContent(node: HastElement): string {
  let text = ''
  for (const child of node.children) {
    if (child.type === 'text') {
      text += child.value
    } else if (child.type === 'element') {
      if (child.tagName === 'br') {
        text += '\n'
      } else {
        text += getTextContent(child)
      }
    }
  }
  return text
}

interface DocFile {
  name: string
  displayName: string
  updatedAt?: string
}

export default function MarkdownPage({ initialData }: { initialData?: any } = {}) {
  const params = useParams()
  const router = useRouter()
  const { settings: rawSettings, pageTexts } = useSettings()
  const [content, setContent] = useState<string>(initialData?.content || '')
  const [fileSize, setFileSize] = useState<number>(initialData?.fileSize || 0)
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initialData?.updatedAt)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedContent, setCopiedContent] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // 复制文档内容
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedContent(true)
      setTimeout(() => setCopiedContent(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
  const [toc, setToc] = useState<TocItem[]>([])
  const [docFiles, setDocFiles] = useState<DocFile[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [currentHeadingPath, setCurrentHeadingPath] = useState<string[]>([])
  const [contentSearchQuery, setContentSearchQuery] = useState('')
  const [contentSearchOpen, setContentSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{ index: number; text: string; element: Element | null }[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [docListExpanded, setDocListExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const contentSearchInputRef = useRef<HTMLInputElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressBarRef2 = useRef<HTMLDivElement>(null)

  // KaTeX 动态加载状态
  const [rehypeKatex, setRehypeKatex] = useState<any>(null)
  const [katexLoaded, setKatexLoaded] = useState(false)

  // 检测内容是否包含数学公式
  const hasMath = useMemo(() => {
    if (!content) return false
    return /\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(content)
  }, [content])

  // 动态加载 KaTeX（仅在需要时）
  useEffect(() => {
    if (hasMath && !katexLoaded) {
      import('rehype-katex').then((katexModule) => {
        // 动态加载 KaTeX CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
        document.head.appendChild(link)

        setRehypeKatex(() => katexModule.default)
        setKatexLoaded(true)
      }).catch(err => {
        console.error('Failed to load KaTeX:', err)
      })
    }
  }, [hasMath, katexLoaded])

  // 从 slug 中获取文件名（支持数组和字符串）
  const slugParam = params.slug
  const filename = Array.isArray(slugParam)
    ? decodeURIComponent(slugParam.join('/'))
    : (slugParam ? decodeURIComponent(slugParam as string) : '')

  // 确保文件名以 .md 结尾
  const mdFilename = filename.endsWith('.md') ? filename : `${filename}.md`

  // 获取文档列表 - 使用缓存避免重复加载
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // 先尝试从 sessionStorage 获取缓存
        const cached = sessionStorage.getItem('docFiles')
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          // 缓存有效期 5 分钟
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setDocFiles(data)
            return
          }
        }

        const response = await fetch(getApiUrl('/markdown'))
        const data = await response.json()
        if (data.success) {
          const files = data.data.map((item: { name: string; updatedAt?: string }) => ({
            name: item.name,
            displayName: item.name.replace(/\.md$/, ''),
            updatedAt: item.updatedAt
          }))
          setDocFiles(files)
          // 缓存到 sessionStorage
          sessionStorage.setItem('docFiles', JSON.stringify({
            data: files,
            timestamp: Date.now()
          }))
        }
      } catch (err) {
        console.error('获取文档列表失败:', err)
      }
    }
    fetchFiles()
  }, [])

  // 获取文档内容
  useEffect(() => {
    // 如果有 initialData，解析目录后跳过查询
    if (initialData) {
      extractToc(initialData.content)
      return
    }

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
          setFileSize(data.data.fileSize || 0)
          setUpdatedAt(data.data.updatedAt)
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
  }, [filename, mdFilename, initialData])

  // 提取目录 - 只提取标题(h1-h5)
  const extractToc = (md: string) => {
    // 标准化换行符
    const normalizedMd = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const items: TocItem[] = []
    const lines = normalizedMd.split('\n')
    let codeBlockDelimiter: string | null = null // 记录当前代码块的分隔符
    // 用于跟踪每个 ID 出现的次数，确保唯一性
    const idCountMap: Record<string, number> = {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // 检测代码块开始/结束（支持 ```、````、~~~~~ 等任意长度）
      const codeBlockMatch = trimmedLine.match(/^(`{3,}|~{3,})/)
      if (codeBlockMatch) {
        const delimiter = codeBlockMatch[1]
        if (codeBlockDelimiter === null) {
          // 进入代码块
          codeBlockDelimiter = delimiter
        } else if (trimmedLine.startsWith(codeBlockDelimiter) && trimmedLine === delimiter) {
          // 退出代码块（分隔符必须匹配且是单独一行）
          codeBlockDelimiter = null
        }
        continue
      }

      // 在代码块内，跳过
      if (codeBlockDelimiter !== null) continue

      // 匹配标题 (h1-h5)
      const headingMatch = line.match(/^(#{1,5})\s+(.+)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2].trim()
        let baseId = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()

        // 处理重复 ID：如果已存在相同 ID，添加后缀
        let id = baseId
        if (idCountMap[baseId] !== undefined) {
          idCountMap[baseId]++
          id = `${baseId}-${idCountMap[baseId]}`
        } else {
          idCountMap[baseId] = 0
        }

        items.push({ id, text, level })
      }
    }

    setToc(items)
  }

  // 用于暂停滚动高亮更新的标志
  const isClickScrollingRef = useRef(false)

  // 监听滚动，高亮当前标题和计算阅读进度
  // 只跟踪标题（level 1-5），不自动跟踪列表项（level >= 6）
  useEffect(() => {
    let ticking = false
    let lastActiveId = ''

    // 只获取标题项（非列表项）
    const headingItems = toc.filter(item => item.level < 6)

    const handleScroll = () => {
      if (ticking) return

      ticking = true
      requestAnimationFrame(() => {
        const container = contentRef.current
        if (!container) {
          ticking = false
          return
        }

        // 计算阅读进度 - 直接更新 DOM，避免 React 重渲染
        const scrollHeight = container.scrollHeight - container.clientHeight
        const scrollTop = container.scrollTop
        const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0

        // 直接更新进度条宽度
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${progress}%`
        }
        if (progressBarRef2.current) {
          progressBarRef2.current.style.width = `${progress}%`
        }

        // 显示/隐藏返回顶部按钮
        setShowBackToTop(scrollTop > 300)

        // 派发自定义事件给 FloatingButtons
        window.dispatchEvent(new CustomEvent('docsPageScroll', {
          detail: { scrollTop, canScrollTop: scrollTop > 300 }
        }))

        // 如果是点击触发的滚动，不更新高亮
        if (isClickScrollingRef.current) {
          ticking = false
          return
        }

        // 更新当前高亮标题和标题路径
        if (headingItems.length > 0) {
          let newActiveId = headingItems[0]?.id || ''
          let activeIndex = 0

          // 检查是否已滚动到底部（允许 5px 误差）
          const isAtBottom = scrollTop + 5 >= scrollHeight

          if (isAtBottom) {
            // 如果滚动到底部，高亮最后一个标题
            newActiveId = headingItems[headingItems.length - 1]?.id || ''
            activeIndex = headingItems.length - 1
          } else {
            // 否则按正常逻辑查找当前可见的标题
            for (let i = headingItems.length - 1; i >= 0; i--) {
              const heading = document.getElementById(headingItems[i].id)
              if (heading) {
                const rect = heading.getBoundingClientRect()
                if (rect.top <= 100) {
                  newActiveId = headingItems[i].id
                  activeIndex = i
                  break
                }
              }
            }
          }

          // 构建标题路径
          const path: string[] = []
          const currentItem = headingItems[activeIndex]
          if (currentItem) {
            // 向前查找各级父标题
            const levelStack: { level: number; text: string }[] = []
            for (let i = activeIndex; i >= 0; i--) {
              const item = headingItems[i]
              // 如果栈为空或当前项级别更小，加入栈
              if (levelStack.length === 0 || item.level < levelStack[levelStack.length - 1].level) {
                levelStack.push({ level: item.level, text: item.text })
              }
            }
            // 反转得到从大到小的路径
            levelStack.reverse().forEach(item => path.push(item.text))
          }
          // 只在路径变化时更新状态
          setCurrentHeadingPath(prev => {
            if (prev.length !== path.length || prev.some((p, i) => p !== path[i])) {
              return path
            }
            return prev
          })

          if (newActiveId !== lastActiveId) {
            // 先移除所有高亮
            document.querySelectorAll('.toc-active').forEach(item => {
              item.classList.remove('toc-active')
              item.classList.add('toc-inactive')
            })
            // 添加新的高亮
            const newItems = document.querySelectorAll(`[data-toc-id="${newActiveId}"]`)
            newItems.forEach(item => {
              item.classList.remove('toc-inactive')
              item.classList.add('toc-active')
            })
            const firstActive = newItems[0] as HTMLElement | undefined
            firstActive?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
            lastActiveId = newActiveId
          }
        }

        ticking = false
      })
    }

    const container = contentRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [toc])

  // 滚动到指定标题
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    const container = contentRef.current

    if (element && container) {
      // 暂停滚动高亮更新
      isClickScrollingRef.current = true

      // 先计算目标滚动位置
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      // PC端顶部工具栏已移除，减小偏移量
      const yOffset = -20
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) + yOffset

      // 执行滚动
      container.scrollTo({ top: scrollTop, behavior: 'smooth' })

      // 滚动完成后再更新高亮状态
      setTimeout(() => {
        // 更新高亮
        document.querySelectorAll('.toc-active').forEach(item => {
          item.classList.remove('toc-active')
          item.classList.add('toc-inactive')
        })
        document.querySelectorAll(`[data-toc-id="${id}"]`).forEach(item => {
          item.classList.remove('toc-inactive')
          item.classList.add('toc-active')
        })
        const active = document.querySelector(`[data-toc-id="${id}"]`) as HTMLElement | null
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })

        // 恢复滚动高亮更新
        isClickScrollingRef.current = false
      }, 400)

      // 关闭移动端目录
      setTocOpen(false)
    }
  }, [])

  // 当移动端抽屉打开时，同步当前高亮状态
  useEffect(() => {
    if (tocOpen && toc.length > 0) {
      // 延迟执行，等待 DOM 渲染完成
      setTimeout(() => {
        const container = contentRef.current
        if (!container) return

        const scrollHeight = container.scrollHeight - container.clientHeight
        const scrollTop = container.scrollTop
        const isAtBottom = scrollTop + 5 >= scrollHeight

        let activeId = toc[0]?.id || ''

        if (isAtBottom) {
          activeId = toc[toc.length - 1]?.id || ''
        } else {
          for (let i = toc.length - 1; i >= 0; i--) {
            const heading = document.getElementById(toc[i].id)
            if (heading) {
              const rect = heading.getBoundingClientRect()
              if (rect.top <= 100) {
                activeId = toc[i].id
                break
              }
            }
          }
        }

        // 更新高亮
        document.querySelectorAll('.toc-active').forEach(item => {
          item.classList.remove('toc-active')
          item.classList.add('toc-inactive')
        })
        document.querySelectorAll(`[data-toc-id="${activeId}"]`).forEach(item => {
          item.classList.remove('toc-inactive')
          item.classList.add('toc-active')
        })
        const active = document.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }, 50)
    }
  }, [tocOpen, toc])

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

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 当前文档名
  const currentDocName = filename.endsWith('.md') ? filename : `${filename}.md`

  // 格式化更新时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // 缓存 ReactMarkdown 的 components，避免重复渲染
  const markdownComponents = useMemo(() => ({
    // 自定义链接组件
    a: ({ href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http')
      const isInternalMd = href?.endsWith('.md') || (href?.startsWith('/docs/') && !href?.startsWith('http'))

      if (isInternalMd && href) {
        const docPath = href.replace(/\.md$/, '').replace(/^\/docs\//, '')
        return (
          <button
            onClick={() => router.push(`/docs/${docPath}`)}
            className="text-primary-500 hover:underline inline-flex items-center gap-1"
          >
            {children}
          </button>
        )
      }

      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1"
          {...props}
        >
          {children}
          {isExternal && <ExternalLink className="w-3 h-3" />}
        </a>
      )
    },
    // 自定义代码块 - 同步笔记页面样式
    pre: ({ node, children, ...props }: any) => {
      const getCodeTextFromNode = (node: any): string => {
        if (!node || !Array.isArray(node.children)) return ''
        const codeNode = node.children.find((c: any) => c && c.type === 'element' && c.tagName === 'code')
        if (!codeNode) return ''
        const flat = getTextContent(codeNode as HastElement)
        if (flat.includes('\n')) return flat
        if (Array.isArray(codeNode.children) && codeNode.children.length > 1) {
          const parts = codeNode.children
            .map((c: any) => (c?.type === 'text' ? c.value : c?.type === 'element' ? getTextContent(c as HastElement) : ''))
            .filter(Boolean)
          if (parts.length > 1) return parts.join('\n')
        }
        return flat
      }

      // 提取代码文本用于复制
      const getCodeText = (children: React.ReactNode): string => {
        if (typeof children === 'string') return children
        if (Array.isArray(children)) {
          const parts = children.map(getCodeText).filter(Boolean)
          if (parts.length <= 1) return parts[0] || ''
          return parts.join('\n')
        }
        if (React.isValidElement(children)) {
          const childProps = children.props as { children?: React.ReactNode }
          return getCodeText(childProps.children || '')
        }
        return ''
      }
      const codeText = getCodeTextFromNode(node) || getCodeText(children)

      // 提取语言类型
      const getLanguage = (children: React.ReactNode): string => {
        const extractFromClassName = (className?: string) => {
          const match = /language-([A-Za-z0-9_-]+)/.exec(className || '')
          return match ? match[1].trim().toLowerCase() : ''
        }

        if (!children) return ''
        if (typeof children === 'string') return ''
        if (Array.isArray(children)) {
          for (const c of children) {
            const lang = getLanguage(c)
            if (lang) return lang
          }
          return ''
        }
        if (React.isValidElement(children)) {
          const childProps = children.props as { className?: string; children?: React.ReactNode }
          const fromClassName = extractFromClassName(childProps?.className)
          if (fromClassName) return fromClassName
          return getLanguage(childProps.children)
        }
        return ''
      }
      const language = getLanguage(children)

      // 如果是 Mermaid 图表，使用 MermaidRenderer
      if (language === 'mermaid') {
        return <MermaidRenderer chart={codeText} />
      }

      return (
        <div className="relative my-4 group code-block-wrapper">
          {language && (
            <span className="code-language-label">{language}</span>
          )}
          <CopyButton text={codeText} />
          <pre className="code-block" {...props}>
            {children}
          </pre>
        </div>
      )
    },
    // 自定义行内代码和代码块内代码
    code: ({ node, className, children, ...props }: any) => {
      // 检查是否是行内代码：没有 className 或者不在 pre 标签内
      const isInline = !className || !className.includes('language-')
      if (isInline) {
        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        )
      }
      return (
        <code className={`block-code ${className || ''}`} {...props}>
          {children}
        </code>
      )
    },
    // 自定义图片
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        className="max-w-full h-auto"
        {...props}
      />
    ),
    // 自定义段落 - 处理换行
    p: ({ node, children, ...props }: any) => {
      const hasTextNodes = React.Children.toArray(children).some(child =>
        typeof child === 'string' && child.includes('\n')
      )
      if (hasTextNodes) {
        return (
          <p {...props}>
            {React.Children.map(children, (child, index) => {
              if (typeof child === 'string') {
                const lines = child.split('\n')
                return (
                  <React.Fragment key={index}>
                    {lines.map((line, lineIndex) => (
                      <React.Fragment key={lineIndex}>
                        {line}
                        {lineIndex < lines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                )
              }
              return child
            })}
          </p>
        )
      }
      return <p {...props}>{children}</p>
    },
    // 自定义引用块
    blockquote: ({ node, children, ...props }: any) => (
      <blockquote className="note-blockquote" {...props}>
        {children}
      </blockquote>
    ),
  }), [router])

  // 获取上一篇和下一篇文档
  const currentIndex = docFiles.findIndex(doc => doc.name === currentDocName)
  // 只有找到当前文档时才显示上一篇/下一篇
  const prevDoc = currentIndex > 0 ? docFiles[currentIndex - 1] : null
  const nextDoc = (currentIndex >= 0 && currentIndex < docFiles.length - 1) ? docFiles[currentIndex + 1] : null

  // 过滤文档列表
  const filteredDocFiles = docFiles.filter(doc =>
    doc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 设置页面标题：[文档标题] - [网站主标题]
  useEffect(() => {
    if (content) {
      const docTitle = extractTitle(content)
      if (rawSettings.siteTitle) {
        document.title = `${docTitle} - ${rawSettings.siteTitle}`
      } else {
        document.title = docTitle
      }
    }
  }, [content, rawSettings.siteTitle])

  // 导航到其他文档
  const navigateToDoc = (docName: string) => {
    const displayName = docName.replace(/\.md$/, '')
    router.push(`/docs/${displayName}`)
    setSidebarOpen(false)
  }

  // 搜索当前文档内容
  const searchInContent = useCallback((query: string) => {
    if (!query.trim() || !contentRef.current) {
      setSearchResults([])
      setCurrentSearchIndex(0)
      // 清除所有高亮
      const highlights = contentRef.current?.querySelectorAll('.search-highlight')
      highlights?.forEach(el => {
        const parent = el.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el)
          parent.normalize()
        }
      })
      return
    }

    const container = contentRef.current.querySelector('.note-content')
    if (!container) return

    // 先清除之前的高亮
    const oldHighlights = container.querySelectorAll('.search-highlight')
    oldHighlights.forEach(el => {
      const parent = el.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      }
    })

    // 搜索文本节点
    const results: { index: number; text: string; element: Element | null }[] = []
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    const nodesToHighlight: { node: Text; matches: { start: number; end: number }[] }[] = []
    const lowerQuery = query.toLowerCase()

    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const text = node.textContent || ''
      const lowerText = text.toLowerCase()
      let startIndex = 0
      const matches: { start: number; end: number }[] = []

      while ((startIndex = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
        matches.push({ start: startIndex, end: startIndex + query.length })
        startIndex += query.length
      }

      if (matches.length > 0) {
        nodesToHighlight.push({ node, matches })
      }
    }

    // 高亮匹配的文本
    let globalIndex = 0
    nodesToHighlight.forEach(({ node, matches }) => {
      const text = node.textContent || ''
      const parent = node.parentNode
      if (!parent) return

      const fragment = document.createDocumentFragment()
      let lastEnd = 0

      matches.forEach(({ start, end }) => {
        // 添加匹配前的文本
        if (start > lastEnd) {
          fragment.appendChild(document.createTextNode(text.slice(lastEnd, start)))
        }
        // 添加高亮的匹配文本
        const span = document.createElement('span')
        span.className = 'search-highlight'
        span.setAttribute('data-search-index', String(globalIndex))
        span.textContent = text.slice(start, end)
        fragment.appendChild(span)

        results.push({
          index: globalIndex,
          text: text.slice(Math.max(0, start - 20), Math.min(text.length, end + 20)),
          element: span
        })
        globalIndex++
        lastEnd = end
      })

      // 添加剩余文本
      if (lastEnd < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastEnd)))
      }

      parent.replaceChild(fragment, node)
    })

    setSearchResults(results)
    setCurrentSearchIndex(0)

    // 滚动到第一个结果
    if (results.length > 0) {
      scrollToSearchResult(0)
    }
  }, [])

  // 滚动到搜索结果
  const scrollToSearchResult = useCallback((index: number) => {
    const container = contentRef.current
    if (!container) return

    // 移除之前的当前高亮
    container.querySelectorAll('.search-highlight-current').forEach(el => {
      el.classList.remove('search-highlight-current')
    })

    const highlight = container.querySelector(`[data-search-index="${index}"]`)
    if (highlight) {
      highlight.classList.add('search-highlight-current')
      const containerRect = container.getBoundingClientRect()
      const elementRect = highlight.getBoundingClientRect()
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 20
      container.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }, [])

  // 跳转到下一个/上一个搜索结果
  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % searchResults.length
    setCurrentSearchIndex(nextIndex)
    scrollToSearchResult(nextIndex)
  }, [currentSearchIndex, searchResults.length, scrollToSearchResult])

  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length
    setCurrentSearchIndex(prevIndex)
    scrollToSearchResult(prevIndex)
  }, [currentSearchIndex, searchResults.length, scrollToSearchResult])

  // 处理搜索输入
  const handleContentSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setContentSearchQuery(query)
    searchInContent(query)
  }, [searchInContent])

  // 关闭搜索
  const closeContentSearch = useCallback(() => {
    setContentSearchOpen(false)
    setContentSearchQuery('')
    setSearchResults([])
    setCurrentSearchIndex(0)
    // 清除高亮
    const container = contentRef.current?.querySelector('.note-content')
    if (container) {
      const highlights = container.querySelectorAll('.search-highlight')
      highlights.forEach(el => {
        const parent = el.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el)
          parent.normalize()
        }
      })
    }
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-primary pt-14 lg:pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-bg-secondary animate-pulse rounded-lg" />
            <div className="h-4 w-full bg-bg-secondary animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-bg-secondary animate-pulse rounded" />
            <div className="h-4 w-4/5 bg-bg-secondary animate-pulse rounded" />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    notFound()
  }

  const title = extractTitle(content)
  const logo = rawSettings.blogLogo || ''
  const logoText = rawSettings.blogLogoText || ''

  return (
    <main className="h-screen bg-bg-primary overflow-hidden relative">
      {/* 背景图片 */}
      <PageBackground />
      {/* 阅读进度条 */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-bg-secondary/50">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 will-change-[width]"
          style={{ width: 0, transition: 'none' }}
        />
      </div>

      {/* 桌面端导航栏占位 */}
      <div className="hidden lg:block h-16"></div>

      {/* PC端顶部导航栏 - 固定在顶部 */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-bg-primary/98 backdrop-blur-md border-b border-border-primary shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回按钮 + 标题路径 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.push('/docs')}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回列表</span>
              </button>
              <span className="text-text-tertiary">|</span>
              <div className="flex items-center gap-1.5 text-sm truncate">
                {(currentHeadingPath.length > 0 ? currentHeadingPath : [title]).map((item, index, arr) => (
                  <span key={index} className="flex items-center gap-1.5">
                    <span className={index === arr.length - 1 ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
                      {item}
                    </span>
                    {index < arr.length - 1 && <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />}
                  </span>
                ))}
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
              >
                {copiedContent ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedContent ? '已复制' : '复制markdown'}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '已复制' : '复制链接'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 手机端固定顶部导航栏 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between h-14 px-4 bg-bg-primary border-b border-border-primary">
          {/* 左侧：返回列表按钮 */}
          <button
            onClick={() => router.push('/docs')}
            className="p-2 -ml-2 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* 中间：当前文件名 */}
          <span className="text-sm font-medium text-text-primary truncate max-w-[50%]">
            {filename.replace(/\.md$/, '')}
          </span>

          {/* 右侧：展开导航按钮 */}
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="p-2 -mr-2 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
            title="导航"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 手机端顶部占位 */}
      <div className="lg:hidden h-14"></div>

      {/* 移动端侧边栏遮罩 */}
      {(sidebarOpen || tocOpen) && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
            onClick={() => { setSidebarOpen(false); setTocOpen(false); }}
          />
        )}

      {/* 限宽容器 - 固定高度 */}
      <div className="max-w-[1400px] mx-auto h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] flex">
        {/* 左侧文档列表 - 桌面端，固定不滚动 */}
        <aside className="w-64 h-full bg-bg-primary border-r border-border-primary overflow-y-auto scrollbar-hide hidden lg:block flex-shrink-0" data-docs-sidebar>
          <div className="p-4">
            {/* 文档列表标题 */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <List className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-text-primary">文档列表</span>
            </div>

            <nav className="space-y-1">
              {filteredDocFiles.length === 0 ? (
                <p className="text-sm text-text-tertiary py-2 text-center">未找到匹配的文档</p>
              ) : (
                filteredDocFiles.map((doc) => (
                  <button
                    key={doc.name}
                    onClick={() => navigateToDoc(doc.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                      currentDocName === doc.name
                        ? 'bg-primary-500/10 text-primary-500 font-medium'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.displayName}</span>
                  </button>
                ))
              )}
            </nav>
          </div>
        </aside>

        {/* 移动端左侧文档列表 */}
          {sidebarOpen && (
            <aside
              className="fixed top-14 left-0 z-40 w-72 h-[calc(100vh-3.5rem)] bg-bg-primary border-r border-border-primary overflow-y-auto scrollbar-hide lg:hidden animate-slide-in-left"
            >
              <div className="p-4">
                {/* Logo */}
                <a href="/" className="flex items-center justify-center gap-3 mb-4 pb-4 border-b border-border-primary">
                  {logo && (
                    <img
                      src={getImageUrl(logo)}
                      alt="Logo"
                      className="h-8 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  {logoText ? (
                    <span className="text-lg font-bold text-text-primary">{logoText}</span>
                  ) : !logo && rawSettings.siteTitle && (
                    <span className="text-lg font-bold text-text-primary">{rawSettings.siteTitle}</span>
                  )}
                </a>

                {/* 返回列表按钮 */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => { router.push('/docs'); setSidebarOpen(false); }}
                    className="flex items-center gap-2 text-text-primary hover:text-primary-500 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-primary-500" />
                    <span className="text-base font-semibold">返回文档列表</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded hover:bg-bg-secondary text-text-tertiary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 搜索框 */}
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="搜索文档..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>

                <nav className="space-y-1">
                  {filteredDocFiles.map((doc) => (
                    <button
                      key={doc.name}
                      onClick={() => navigateToDoc(doc.name)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                        currentDocName === doc.name
                          ? 'bg-primary-500/10 text-primary-500 font-medium'
                          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                      }`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{doc.displayName}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

        {/* 文章内容 - 可滚动区域 */}
        <div
          className="flex-1 min-w-0 h-full overflow-y-auto scrollbar-hide"
          ref={contentRef}
          data-docs-content
          style={{
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="px-4 lg:px-8 py-4 lg:py-6">
          {/* Markdown 内容 */}
          <article className="note-content max-w-none prose-headings:scroll-mt-20">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={hasMath && rehypeKatex ? [rehypeRaw, rehypeUniqueSlug, rehypeKatex] : [rehypeRaw, rehypeUniqueSlug]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </article>

          {/* 底部信息 */}
          <footer className="mt-16 pt-8 border-t border-border-primary">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-tertiary">
              <p dangerouslySetInnerHTML={{ __html: rawSettings.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.` }} />
            </div>
          </footer>
          </div>
        </div>

        {/* 右侧目录大纲 - 桌面端，固定不滚动 */}
        <aside className="w-64 h-full bg-bg-primary border-l border-border-primary overflow-y-auto scrollbar-hide hidden lg:block flex-shrink-0" data-docs-sidebar>
          <div className="p-4">
            {toc.length > 0 ? (
              <nav className="space-y-0.5">
                {toc.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    data-toc-id={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`toc-item w-full text-left text-[13px] py-1.5 px-3 rounded-lg truncate block ${index === 0 ? 'toc-active' : 'toc-inactive'}`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">暂无目录</p>
            )}
          </div>
        </aside>

        {/* 移动端右侧导航抽屉 */}
          {tocOpen && (
            <aside
              className="fixed top-14 right-0 z-40 w-72 h-[calc(100vh-3.5rem)] bg-bg-primary border-l border-border-primary lg:hidden flex flex-col pt-3 animate-slide-in-right"
            >
              {/* 搜索当前文档 */}
              <div className="mx-4 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="搜索当前文档..."
                    value={contentSearchQuery}
                    onChange={handleContentSearch}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-xs text-text-tertiary">
                      {currentSearchIndex + 1}/{searchResults.length} 个结果
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={goToPrevSearchResult}
                        className="p-1 rounded hover:bg-bg-secondary text-text-secondary"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToNextSearchResult}
                        className="p-1 rounded hover:bg-bg-secondary text-text-secondary"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 文档列表展开栏 */}
              <div className="mx-4 mb-3 border border-border-primary rounded-lg overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setDocListExpanded(!docListExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-text-primary">文档列表</span>
                  </div>
                  <div className={`transition-transform duration-200 ${docListExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-text-tertiary" />
                  </div>
                </button>
                  {docListExpanded && (
                    <div className="overflow-hidden animate-fade-in">
                      <div className="max-h-48 overflow-y-auto border-t border-border-primary" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {/* 搜索框 */}
                        <div className="p-2 border-b border-border-primary">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                            <input
                              type="text"
                              placeholder="搜索文档..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-primary border border-border-primary rounded text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                            />
                          </div>
                        </div>
                        <nav className="p-2 space-y-0.5">
                          {filteredDocFiles.length === 0 ? (
                            <p className="text-xs text-text-tertiary py-2 text-center">未找到匹配的文档</p>
                          ) : (
                            filteredDocFiles.map((doc) => (
                              <button
                                key={doc.name}
                                onClick={() => { navigateToDoc(doc.name); setTocOpen(false); }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
                                  currentDocName === doc.name
                                    ? 'bg-primary-500/10 text-primary-500 font-medium'
                                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate min-w-0 flex-1">{doc.displayName}</span>
                              </button>
                            ))
                          )}
                        </nav>
                      </div>
                    </div>
                  )}
              </div>

              {/* 当前文档目录 - 填充剩余空间 */}
              <div className="mx-4 mb-4 flex-1 min-h-0 border border-border-primary rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2.5 bg-bg-secondary border-b border-border-primary flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-text-primary">目录树</span>
                  </div>
                </div>

                {/* 目录列表 - 可滚动，隐藏滚动条 */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {toc.length > 0 ? (
                    <nav className="p-2 space-y-0.5">
                      {toc.map((item, index) => (
                        <button
                          key={`mobile-${item.id}-${index}`}
                          data-toc-id={item.id}
                          onClick={() => scrollToHeading(item.id)}
                          className={`toc-item w-full text-left text-[13px] py-1.5 px-3 rounded-lg truncate block ${index === 0 ? 'toc-active' : 'toc-inactive'}`}
                          style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                          title={item.text}
                        >
                          {item.text}
                        </button>
                      ))}
                    </nav>
                  ) : (
                    <p className="text-sm text-text-tertiary text-center py-4">暂无目录</p>
                  )}
                </div>
              </div>
            </aside>
          )}
      </div>

    </main>
  )
}
