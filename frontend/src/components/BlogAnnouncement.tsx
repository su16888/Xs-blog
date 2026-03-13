'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X, ChevronRight } from 'lucide-react'
import { formatContent } from '@/lib/contentFormatter'

interface AnnouncementItem {
  title: string
  content: string
  url?: string
  format?: 'markdown' | 'html' | 'text'
}

interface BlogAnnouncementProps {
  announcements: AnnouncementItem[]
}

export default function BlogAnnouncement({ announcements }: BlogAnnouncementProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null)

  // 过滤空公告
  const validAnnouncements = announcements.filter(a => a && a.title && a.title.trim())

  // 只有一条公告时不需要滚动
  const shouldAutoSwitch = validAnnouncements.length > 1

  // 切换到下一条公告
  const switchToNext = () => {
    if (validAnnouncements.length <= 1) return

    setIsAnimating(true)

    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % validAnnouncements.length)
      setIsAnimating(false)
    }, 300)
  }

  // 自动切换公告
  useEffect(() => {
    if (!shouldAutoSwitch) return

    const timer = setInterval(() => {
      switchToNext()
    }, 5000) // 每5秒切换一次

    return () => clearInterval(timer)
  }, [validAnnouncements.length, shouldAutoSwitch])

  if (validAnnouncements.length === 0) return null

  const currentAnnouncement = validAnnouncements[currentIndex]

  const handleViewDetails = () => {
    setSelectedAnnouncement(currentAnnouncement)
    setShowModal(true)
  }

  const handleIndicatorClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (index === currentIndex) return

    setIsAnimating(true)

    setTimeout(() => {
      setCurrentIndex(index)
      setIsAnimating(false)
    }, 300)
  }

  return (
    <>
      {/* 公告栏 */}
      <div
        className="w-full bg-bg-secondary/80 dark:bg-bg-secondary/60 border border-gray-200/30 dark:border-gray-700/30 rounded-xl shadow-sm backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer group"
        onClick={handleViewDetails}
      >
        <div className="flex items-center px-4 py-3 gap-3">
          {/* 公告图标 - 扁平化风格 */}
          <div className="flex-shrink-0">
            <Megaphone className="w-5 h-5 text-amber-500 dark:text-amber-400" strokeWidth={2} fill="currentColor" fillOpacity="0.1" />
          </div>

          {/* 公告标题 */}
          <div className="flex-1 overflow-hidden min-w-0">
            <div
              className={`transition-all duration-300 ease-in-out ${
                isAnimating ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary truncate block transition-colors duration-200">
                {currentAnnouncement.title}
              </span>
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {/* 链接标识 */}
            {currentAnnouncement.url && (
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            )}
            
            {/* 查看详情 - 文字链接样式 */}
            <div className="flex items-center gap-0.5 text-xs text-text-tertiary group-hover:text-primary-500 transition-colors duration-200">
              <span className="opacity-70 group-hover:opacity-100">详情</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 公告详情弹窗 */}
      {showModal && selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-bg-secondary rounded-2xl shadow-2xl border border-border-primary animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <Megaphone className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-text-primary">公告详情</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <h4 className="text-xl font-bold text-text-primary mb-4">
                {selectedAnnouncement.title}
              </h4>
              <div
                className="text-text-secondary leading-relaxed announcement-content"
                dangerouslySetInnerHTML={{ 
                  __html: formatContent(
                    selectedAnnouncement.content, 
                    selectedAnnouncement.format || 'text'
                  ) 
                }}
              />
            </div>

            {/* 弹窗底部 */}
            {selectedAnnouncement.url && (
              <div className="px-6 py-4 border-t border-border-primary flex justify-end">
                <a
                  href={selectedAnnouncement.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowModal(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  访问链接
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 滚动条样式 */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        .announcement-content p {
          margin-bottom: 1em;
        }
        .announcement-content p:last-child {
          margin-bottom: 0;
        }
        .announcement-content ul,
        .announcement-content ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .announcement-content li {
          margin-bottom: 0.5em;
        }
        .announcement-content a {
          color: rgb(59 130 246);
          text-decoration: underline;
        }
        .announcement-content a:hover {
          color: rgb(37 99 235);
        }
        .announcement-content h1,
        .announcement-content h2,
        .announcement-content h3,
        .announcement-content h4,
        .announcement-content h5,
        .announcement-content h6 {
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .announcement-content h1 { font-size: 1.5em; }
        .announcement-content h2 { font-size: 1.3em; }
        .announcement-content h3 { font-size: 1.1em; }
        .announcement-content code {
          background: rgba(156, 163, 175, 0.2);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .announcement-content blockquote {
          border-left: 4px solid rgb(59 130 246);
          padding-left: 1em;
          margin: 1em 0;
          color: rgba(107, 114, 128, 1);
        }
        .announcement-content hr {
          border: none;
          border-top: 1px solid rgba(156, 163, 175, 0.3);
          margin: 1.5em 0;
        }
        .announcement-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
        .announcement-content strong {
          font-weight: 600;
        }
        .announcement-content em {
          font-style: italic;
        }
        .announcement-content del {
          text-decoration: line-through;
        }
      `}</style>
    </>
  )
}
