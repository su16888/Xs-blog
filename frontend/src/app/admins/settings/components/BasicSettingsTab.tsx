'use client'

import { SettingsState } from '../types'
import { getImageUrl } from '@/lib/api'

interface BasicSettingsTabProps {
  settings: SettingsState
  saving: boolean
  uploadingBackground: boolean
  deletingBackground: boolean
  uploadingFont: boolean
  deletingFont: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  handleBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBackgroundDelete: () => void
  handleFontUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleFontDelete: () => void
}

export default function BasicSettingsTab({
  settings,
  saving,
  uploadingBackground,
  deletingBackground,
  uploadingFont,
  deletingFont,
  handleChange,
  handleSubmit,
  handleBackgroundUpload,
  handleBackgroundDelete,
  handleFontUpload,
  handleFontDelete
}: BasicSettingsTabProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>基本信息</span>
              </h2>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="siteTitle" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    网站标题
                  </label>
                  <input
                    id="siteTitle"
                    name="siteTitle"
                    type="text"
                    value={settings.siteTitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="XsBlog"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    仅限默认、博客模式下生效
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="siteSubtitle" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    网站副标题
                  </label>
                  <input
                    id="siteSubtitle"
                    name="siteSubtitle"
                    type="text"
                    value={settings.siteSubtitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="欢迎来到Xsblog"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    仅限默认、博客模式下生效
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="siteDescription" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    网站描述
                  </label>
                  <textarea
                    id="siteDescription"
                    name="siteDescription"
                    rows={3}
                    value={settings.siteDescription}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white resize-none placeholder-gray-400"
                    placeholder="简单介绍一下你的网站..."
                  />
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="siteKeywords" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    网站关键词
                  </label>
                  <input
                    id="siteKeywords"
                    name="siteKeywords"
                    type="text"
                    value={settings.siteKeywords}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="用逗号分隔，例如：个人主页, 博客, 作品集"
                  />
                </div>

                {/* 公告栏设置 - 仅当功能设置中开启博客公告栏时显示 */}
                {settings.blogAnnouncementEnabled === 'true' && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    公告栏
                  </label>
                  <div className="space-y-4">
                    {(() => {
                      let announcements: { title: string; content: string; format?: string }[] = []
                      try {
                        const parsed = JSON.parse(settings.blogAnnouncements || '[]')
                        if (Array.isArray(parsed)) {
                          announcements = parsed.map(item => {
                            // 兼容旧格式：如果是字符串，转换为 { title: '', content: text }
                            if (typeof item === 'string') {
                              return { title: '', content: item, format: 'text' }
                            }
                            // 兼容旧格式：如果只有 text 字段，转换为 title/content 格式
                            if (item.text && !item.title && !item.content) {
                              return { title: item.text.substring(0, 50), content: item.text, format: 'text' }
                            }
                            // 新格式
                            return {
                              title: item.title || '',
                              content: item.content || '',
                              format: item.format || 'text'
                            }
                          })
                        }
                      } catch {
                        announcements = []
                      }

                      const updateAnnouncements = (newAnnouncements: { title: string; content: string; format?: string }[]) => {
                        const event = {
                          target: {
                            name: 'blogAnnouncements',
                            value: JSON.stringify(newAnnouncements.filter(a => a.title || a.content)),
                            type: 'text'
                          }
                        } as React.ChangeEvent<HTMLInputElement>
                        handleChange(event)
                      }

                      return (
                        <>
                          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={announcements[0]?.title || ''}
                                onChange={(e) => {
                                  const newAnnouncements = [...announcements]
                                  if (!newAnnouncements[0]) {
                                    newAnnouncements[0] = { title: '', content: '', format: 'text' }
                                  }
                                  newAnnouncements[0].title = e.target.value
                                  updateAnnouncements(newAnnouncements)
                                }}
                                className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400 font-semibold"
                                placeholder="公告标题"
                              />
                              {(announcements[0]?.title || announcements[0]?.content) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAnnouncements = announcements.filter((_, i) => i !== 0)
                                    updateAnnouncements(newAnnouncements)
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors self-end sm:self-auto"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {(announcements[0]?.title || announcements[0]?.content) && (
                              <>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-medium text-gray-700">内容格式：</label>
                                  <select
                                    value={announcements[0]?.format || 'text'}
                                    onChange={(e) => {
                                      const newAnnouncements = [...announcements]
                                      if (!newAnnouncements[0]) {
                                        newAnnouncements[0] = { title: '', content: '', format: 'text' }
                                      }
                                      newAnnouncements[0].format = e.target.value
                                      updateAnnouncements(newAnnouncements)
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                  >
                                    <option value="text">纯文本（自动换行）</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="html">HTML</option>
                                  </select>
                                </div>
                                <div>
                                  <textarea
                                    value={announcements[0]?.content || ''}
                                    onChange={(e) => {
                                      const newAnnouncements = [...announcements]
                                      if (!newAnnouncements[0]) {
                                        newAnnouncements[0] = { title: '', content: '', format: 'text' }
                                      }
                                      newAnnouncements[0].content = e.target.value
                                      updateAnnouncements(newAnnouncements)
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400 resize-y min-h-[120px] font-mono"
                                    placeholder={
                                      announcements[0]?.format === 'markdown' 
                                        ? '支持 Markdown 语法：\n# 标题\n**粗体** *斜体*\n[链接](url)\n- 列表项'
                                        : announcements[0]?.format === 'html'
                                        ? '支持 HTML 标签：\n<p>段落</p>\n<strong>粗体</strong>\n<a href="#">链接</a>'
                                        : '纯文本内容，换行会自动保留'
                                    }
                                    rows={5}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 font-medium mb-2">💡 格式说明：</p>
                    <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                      <li><strong>纯文本</strong>：换行会自动保留，适合简单公告</li>
                      <li><strong>Markdown</strong>：支持标题、粗体、链接、列表等语法</li>
                      <li><strong>HTML</strong>：支持完整的 HTML 标签，灵活度最高</li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    公告将在博客模式的轮播图下方展示，前台只显示标题，点击"查看详情"查看完整内容
                  </p>
                </div>
                )}
              </div>
            </div>

            {/* 外观设置 */}
            <div>
              <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <span>外观设置</span>
              </h2>
              <div className="space-y-4">
                {/* 主题颜色 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    主题颜色
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="themeColor"
                        value="gray"
                        checked={settings.themeColor === 'gray'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 text-center ${
                        settings.themeColor === 'gray'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-sm mx-auto mb-1.5"></div>
                        <span className={`text-xs font-semibold ${
                          settings.themeColor === 'gray' ? 'text-blue-600' : 'text-gray-700'
                        }`}>灰色</span>
                      </div>
                    </label>
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="themeColor"
                        value="black"
                        checked={settings.themeColor === 'black'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 text-center ${
                        settings.themeColor === 'black'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-sm mx-auto mb-1.5"></div>
                        <span className={`text-xs font-semibold ${
                          settings.themeColor === 'black' ? 'text-blue-600' : 'text-gray-700'
                        }`}>前台自定义</span>
                      </div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    选择前台的主题颜色方案：灰色主题会应用全局灰度效果，前台自定义由访客通过悬浮球切换
                  </p>
                </div>

                {/* 主题类型 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    </svg>
                    主题类型
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="themeType"
                        value="default"
                        checked={settings.themeType === 'default'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 ${
                        settings.themeType === 'default'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                            settings.themeType === 'default'
                              ? 'border-blue-500 bg-white'
                              : 'border-gray-300 bg-white'
                          }`}>
                            <div className="w-5 h-2.5 bg-gradient-to-r from-gray-500 to-gray-700 rounded"></div>
                          </div>
                          <div>
                            <span className={`block text-xs font-semibold ${
                              settings.themeType === 'default' ? 'text-blue-700' : 'text-gray-800'
                            }`}>默认主题</span>
                            <span className="text-xs text-gray-600">简洁个人主页</span>
                          </div>
                        </div>
                      </div>
                    </label>
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="themeType"
                        value="blog"
                        checked={settings.themeType === 'blog'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 ${
                        settings.themeType === 'blog'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                            settings.themeType === 'blog'
                              ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600'
                              : 'border-gray-300 bg-gradient-to-br from-blue-400 to-indigo-500'
                          }`}>
                            <div className="w-5 h-2.5 bg-white/90 rounded"></div>
                          </div>
                          <div>
                            <span className={`block text-xs font-semibold ${
                              settings.themeType === 'blog' ? 'text-blue-700' : 'text-gray-800'
                            }`}>博客主题</span>
                            <span className="text-xs text-gray-600">更完善的个人程序</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    选择前台的主题布局类型，博客主题会将滑块左移并添加搜索框
                  </p>
                </div>

                {/* 点击头像跳转博客主题开关 - 仅当主题类型为默认时显示 */}
                {settings.themeType === 'default' && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-3">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          点击开启默认主题跳转博客主题
                        </label>
                        <p className="text-xs text-gray-500">
                          点击默认模式下头像跳转
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                        <input
                          type="checkbox"
                          name="enableAvatarThemeSwitch"
                          value="true"
                          checked={settings.enableAvatarThemeSwitch === 'true'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                          settings.enableAvatarThemeSwitch === 'true'
                            ? 'bg-blue-500 shadow-inner'
                            : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-1 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-all duration-300 ${
                            settings.enableAvatarThemeSwitch === 'true' ? 'translate-x-5' : 'translate-x-0'
                          }`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* 底部版权文字 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="footerCopyright" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    底部版权文字
                  </label>
                  <textarea
                    id="footerCopyright"
                    name="footerCopyright"
                    rows={3}
                    value={settings.footerCopyright}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white resize-none placeholder-gray-400 font-mono"
                    placeholder="例如：© 2025 个人主页. All rights reserved. 支持HTML标签"
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    支持HTML标签，例如：&lt;strong&gt;加粗&lt;/strong&gt;、&lt;a href="#"&gt;链接&lt;/a&gt;等
                  </p>
                </div>

                {/* 背景图片上传 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    背景图片
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    {settings.backgroundImage && (
                      <div className="flex-shrink-0 w-24 h-16 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                        <img
                          src={getImageUrl(settings.backgroundImage)}
                          alt="Background"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                      {!settings.backgroundImage && (
                        <>
                          <input
                            type="file"
                            id="backgroundInput"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                            onChange={handleBackgroundUpload}
                            disabled={uploadingBackground}
                            className="hidden"
                          />
                          <label
                            htmlFor="backgroundInput"
                            className={`w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap text-center flex-shrink-0 ${
                              uploadingBackground ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploadingBackground ? '上传中...' : '选择文件'}
                          </label>
                        </>
                      )}
                      <input
                        type="text"
                        name="backgroundImage"
                        value={settings.backgroundImage}
                        onChange={handleChange}
                        placeholder="图片URL地址"
                        className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                    </div>
                    {settings.backgroundImage && (
                      <button
                        type="button"
                        onClick={handleBackgroundDelete}
                        disabled={deletingBackground}
                        className="w-full sm:w-auto flex-shrink-0 px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs whitespace-nowrap"
                      >
                        {deletingBackground ? '删除中...' : '删除'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    上传背景图片后，可调整透明度
                  </p>
                </div>

                {/* 背景透明度 */}
                {settings.backgroundImage && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <label htmlFor="backgroundOpacity" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      背景透明度
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="backgroundOpacity"
                        name="backgroundOpacity"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.backgroundOpacity}
                        onChange={handleChange}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                      />
                      <span className="text-sm font-semibold text-gray-700">(0-1)</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      调整背景图片的透明度（0完全透明，1完全不透明，建议0.1）
                    </p>
                  </div>
                )}

                {/* 自定义字体 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    自定义字体
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    {settings.customFont && (
                      <div className="flex-shrink-0 w-32 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-700 truncate" title={settings.customFontName || settings.customFont}>
                          {settings.customFontName || settings.customFont}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                      {!settings.customFont && (
                        <>
                          <input
                            type="file"
                            id="fontInput"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={handleFontUpload}
                            disabled={uploadingFont}
                            className="hidden"
                          />
                          <label
                            htmlFor="fontInput"
                            className={`w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap text-center flex-shrink-0 ${
                              uploadingFont ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploadingFont ? '上传中...' : '选择文件'}
                          </label>
                        </>
                      )}
                      <input
                        type="text"
                        name="customFont"
                        value={settings.customFont}
                        onChange={handleChange}
                        placeholder="字体文件URL地址"
                        className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                    </div>
                    {settings.customFont && (
                      <button
                        type="button"
                        onClick={handleFontDelete}
                        disabled={deletingFont}
                        className="w-full sm:w-auto flex-shrink-0 px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs whitespace-nowrap"
                      >
                        {deletingFont ? '删除中...' : '删除'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    支持 ttf、otf、woff、woff2 格式，最大 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex flex-col sm:flex-row sm:justify-end pt-4 border-t border-gray-200 mt-4">
            <button
              type="submit"
              disabled={saving}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 disabled:hover:shadow-none text-sm ${
                saving ? 'cursor-wait' : ''
              }`}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
