'use client'

import { useState, useEffect } from 'react'
import { SettingsState, PageTexts, HomeContentSections, S3Config, TextSettingsTab as TextSettingsTabType } from '../types'

interface TextSettingsTabProps {
  settings: SettingsState
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>
  pageTexts: PageTexts
  setPageTexts: React.Dispatch<React.SetStateAction<PageTexts>>
  homeContentSections: HomeContentSections
  setHomeContentSections: React.Dispatch<React.SetStateAction<HomeContentSections>>
  savingTextSettings: boolean
  s3Config: S3Config
  setS3Config: React.Dispatch<React.SetStateAction<S3Config>>
  loadingS3Config: boolean
  savingS3Config: boolean
  testingS3: boolean
  handleSaveTextSettings: () => void
  loadS3Config: () => void
  handleSaveS3Config: () => void
  handleTestS3Connection: () => void
  showToast: (type: 'success' | 'error', message: string) => void
  // 文档排序相关
  docsConfig: { name: string; showInList: boolean; customSlug?: string }[]
  setDocsConfig: React.Dispatch<React.SetStateAction<{ name: string; showInList: boolean; customSlug?: string }[]>>
  loadingDocsOrder: boolean
  savingDocsOrder: boolean
  loadDocsOrder: () => void
  handleSaveDocsOrder: () => void
  handleMoveDoc: (index: number, direction: 'up' | 'down') => void
  handleToggleDocVisibility: (index: number) => void
}

export default function TextSettingsTab({
  settings,
  setSettings,
  pageTexts,
  setPageTexts,
  homeContentSections,
  setHomeContentSections,
  savingTextSettings,
  s3Config,
  setS3Config,
  loadingS3Config,
  savingS3Config,
  testingS3,
  handleSaveTextSettings,
  loadS3Config,
  handleSaveS3Config,
  handleTestS3Connection,
  showToast,
  docsConfig,
  setDocsConfig,
  loadingDocsOrder,
  savingDocsOrder,
  loadDocsOrder,
  handleSaveDocsOrder,
  handleMoveDoc,
  handleToggleDocVisibility
}: TextSettingsTabProps) {
  const [textSettingsTab, setTextSettingsTab] = useState<TextSettingsTabType>('page-texts')

  // 跟踪是否已经加载过
  const s3ConfigLoaded = { current: false }
  const docsOrderLoaded = { current: false }

  // 当切换到S3存储标签页时加载配置
  useEffect(() => {
    if (textSettingsTab === 's3-storage' && !s3ConfigLoaded.current) {
      s3ConfigLoaded.current = true
      loadS3Config()
    }
  }, [textSettingsTab, loadS3Config])

  // 当切换到文档排序标签页时加载配置
  useEffect(() => {
    if (textSettingsTab === 'docs-order' && !docsOrderLoaded.current) {
      docsOrderLoaded.current = true
      loadDocsOrder()
    }
  }, [textSettingsTab, loadDocsOrder])

  const pageNames: Record<string, string> = {
    navigation: '导航列表页面',
    services: '服务业务页面',
    notes: '笔记列表页面',
    galleries: '图库列表页面',
    messages: '留言列表页面'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Tab切换 */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setTextSettingsTab('page-texts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              textSettingsTab === 'page-texts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            页面文本设置
          </button>
          <button
            onClick={() => setTextSettingsTab('home-content')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              textSettingsTab === 'home-content'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            首页内容切换
          </button>
          <button
            onClick={() => setTextSettingsTab('s3-storage')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              textSettingsTab === 's3-storage'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            S3存储配置
          </button>
          <button
            onClick={() => setTextSettingsTab('docs-order')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              textSettingsTab === 'docs-order'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            文档排序
          </button>
        </div>

        {/* 页面文本设置 */}
        {textSettingsTab === 'page-texts' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">说明：</span>在这里可以自定义各页面的标题、描述和浏览器标签标题。
              </p>
            </div>

            {(['navigation', 'services', 'notes', 'galleries', 'messages'] as const).map((pageKey) => (
              <div key={pageKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {pageNames[pageKey]}
                  <a
                    href={`/${pageKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
                  >
                    预览
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      页面标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageTexts[pageKey].title || ''}
                      onChange={(e) => setPageTexts({
                        ...pageTexts,
                        [pageKey]: { ...pageTexts[pageKey], title: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：导航列表"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      页面描述 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageTexts[pageKey].description || ''}
                      onChange={(e) => setPageTexts({
                        ...pageTexts,
                        [pageKey]: { ...pageTexts[pageKey], description: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：探索精选的网站导航"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      浏览器标签标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageTexts[pageKey].browserTitle}
                      onChange={(e) => setPageTexts({
                        ...pageTexts,
                        [pageKey]: { ...pageTexts[pageKey], browserTitle: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：导航列表"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      浏览器标签副标题
                    </label>
                    <input
                      type="text"
                      value={pageTexts[pageKey].browserSubtitle || ''}
                      onChange={(e) => setPageTexts({
                        ...pageTexts,
                        [pageKey]: { ...pageTexts[pageKey], browserSubtitle: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：个人主页"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      副标题将显示在浏览器标签中，格式为：主标题 - 副标题
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* /social-feed 朋友圈页面设置 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                朋友圈页面 (/social-feed)
                <a
                  href="/social-feed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
                >
                  预览
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    浏览器标签主标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageTexts.socialFeed?.browserTitle || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      socialFeed: { ...pageTexts.socialFeed, browserTitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：朋友圈"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    浏览器标签副标题
                  </label>
                  <input
                    type="text"
                    value={pageTexts.socialFeed?.browserSubtitle || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      socialFeed: { ...pageTexts.socialFeed, browserSubtitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：分享生活点滴"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    副标题将显示在浏览器标签中，格式为：主标题 - 副标题
                  </p>
                </div>
              </div>
            </div>

            {/* /docs 文档中心页面设置 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                文档中心页面 (/docs)
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
                >
                  预览
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    页面标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageTexts.docs?.title || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, title: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：文档中心"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    页面描述 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageTexts.docs?.description || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, description: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：浏览所有可用的 Markdown 文档"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    浏览器标签标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageTexts.docs?.browserTitle || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, browserTitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：文档中心"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    浏览器标签副标题
                  </label>
                  <input
                    type="text"
                    value={pageTexts.docs?.browserSubtitle || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, browserSubtitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：技术文档"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    副标题将显示在浏览器标签中，格式为：主标题 - 副标题
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    使用说明标题
                  </label>
                  <input
                    type="text"
                    value={pageTexts.docs?.usageTitle || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, usageTitle: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：使用说明"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    使用说明内容
                  </label>
                  <textarea
                    value={pageTexts.docs?.usageContent || ''}
                    onChange={(e) => setPageTexts({
                      ...pageTexts,
                      docs: { ...pageTexts.docs, usageContent: e.target.value }
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="每行一条说明内容，例如：&#10;将 Markdown 文件放入 public/markdown 目录&#10;通过 /docs/文件名 访问文档"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    每行一条说明内容，将显示为列表形式
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 首页内容切换 */}
        {textSettingsTab === 'home-content' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <span className="font-semibold">说明：</span>选择首页下方展示的内容区域
              </p>
              <p className="text-xs text-blue-700">
                • 默认主题：可以不显示内容区，或显示1-2个内容区域
              </p>
              <p className="text-xs text-blue-700">
                • 博客主题：至少需要选择1个内容区域
              </p>
            </div>

            <div className="space-y-4">
              {/* 默认主题下的开关 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeContentSections.showInDefaultTheme}
                    onChange={(e) => setHomeContentSections({
                      ...homeContentSections,
                      showInDefaultTheme: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-700">
                    在默认主题下显示内容区
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-6">
                  关闭后，默认主题下不显示下方内容区域
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容区域 1
                </label>
                <select
                  value={homeContentSections.section1}
                  onChange={(e) => {
                    const newValue = e.target.value as any
                    if (settings.themeType === 'blog' && newValue === '' && homeContentSections.section2 === '') {
                      showToast('error', '博客主题下至少需要选择一个内容区域')
                      return
                    }
                    if (newValue !== '' && newValue === homeContentSections.section2) {
                      showToast('error', '两个区域不能选择相同的内容')
                      return
                    }
                    setHomeContentSections({
                      ...homeContentSections,
                      section1: newValue
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不显示</option>
                  <option value="notes">笔记列表</option>
                  <option value="navigation">导航列表</option>
                  <option value="services">服务业务</option>
                  <option value="galleries">图库列表</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容区域 2
                </label>
                <select
                  value={homeContentSections.section2}
                  onChange={(e) => {
                    const newValue = e.target.value as any
                    if (settings.themeType === 'blog' && newValue === '' && homeContentSections.section1 === '') {
                      showToast('error', '博客主题下至少需要选择一个内容区域')
                      return
                    }
                    if (newValue !== '' && newValue === homeContentSections.section1) {
                      showToast('error', '两个区域不能选择相同的内容')
                      return
                    }
                    setHomeContentSections({
                      ...homeContentSections,
                      section2: newValue
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不显示</option>
                  <option value="notes">笔记列表</option>
                  <option value="navigation">导航列表</option>
                  <option value="services">服务业务</option>
                  <option value="galleries">图库列表</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* S3存储配置 */}
        {textSettingsTab === 's3-storage' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">说明：</span>配置S3兼容的对象存储服务（如AWS S3、阿里云OSS、腾讯云COS、MinIO等）。切换到S3存储后，新上传的文件将存储到S3，子文件夹结构保持不变。
              </p>
            </div>

            {loadingS3Config ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="ml-2 text-gray-600">加载配置中...</span>
              </div>
            ) : (
              <>
                {/* 存储类型选择 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    存储类型
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        value="local"
                        checked={s3Config.storageType === 'local'}
                        onChange={(e) => setS3Config({ ...s3Config, storageType: e.target.value })}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 text-center ${
                        s3Config.storageType === 'local'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          s3Config.storageType === 'local' ? 'text-blue-600' : 'text-gray-700'
                        }`}>本地存储</span>
                        <p className="text-xs text-gray-500 mt-1">文件存储在服务器本地</p>
                      </div>
                    </label>
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        value="s3"
                        checked={s3Config.storageType === 's3'}
                        onChange={(e) => setS3Config({ ...s3Config, storageType: e.target.value })}
                        className="sr-only"
                      />
                      <div className={`rounded-lg border-2 transition-all duration-300 p-3 text-center ${
                        s3Config.storageType === 's3'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          s3Config.storageType === 's3' ? 'text-blue-600' : 'text-gray-700'
                        }`}>S3存储</span>
                        <p className="text-xs text-gray-500 mt-1">文件存储到S3兼容服务</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* S3配置表单 */}
                {s3Config.storageType === 's3' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        端点地址 (Endpoint) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={s3Config.endpoint}
                        onChange={(e) => setS3Config({ ...s3Config, endpoint: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：https://s3.amazonaws.com 或 https://oss-cn-hangzhou.aliyuncs.com"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        区域 (Region)
                      </label>
                      <input
                        type="text"
                        value={s3Config.region}
                        onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：us-east-1、cn-hangzhou"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        存储桶名称 (Bucket) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={s3Config.bucket}
                        onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：my-bucket"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Access Key ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={s3Config.accessKeyId}
                        onChange={(e) => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="输入Access Key ID"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Secret Access Key <span className="text-red-500">*</span>
                      </label>
                      <form autoComplete="off">
                        <input
                          type="password"
                          autoComplete="off"
                          value={s3Config.secretAccessKey}
                          onChange={(e) => setS3Config({ ...s3Config, secretAccessKey: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="输入Secret Access Key（已保存则显示******）"
                        />
                      </form>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        自定义域名 (CDN)
                      </label>
                      <input
                        type="text"
                        value={s3Config.customDomain}
                        onChange={(e) => setS3Config({ ...s3Config, customDomain: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：https://cdn.example.com（可选，用于访问文件）"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        配置后，文件URL将使用此域名。格式：https://cdn.example.com/uploads/xxx
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">
                            路径风格 (Path Style)
                          </label>
                          <p className="text-xs text-gray-500">
                            MinIO等自建服务通常需要开启此选项
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s3Config.pathStyle}
                            onChange={(e) => setS3Config({ ...s3Config, pathStyle: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                            s3Config.pathStyle ? 'bg-blue-500 shadow-inner' : 'bg-gray-300'
                          }`}>
                            <div className={`absolute top-1 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-all duration-300 ${
                              s3Config.pathStyle ? 'translate-x-5' : 'translate-x-0'
                            }`}></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 测试连接按钮 */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleTestS3Connection}
                        disabled={testingS3}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-green-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                          testingS3 ? 'cursor-wait' : ''
                        }`}
                      >
                        {testingS3 ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            测试中...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            测试连接
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* S3配置保存按钮 */}
                <div className="flex flex-col sm:flex-row sm:justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleSaveS3Config}
                    disabled={savingS3Config}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                      savingS3Config ? 'cursor-wait' : ''
                    }`}
                  >
                    {savingS3Config ? (
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
                        保存S3配置
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 文档排序 */}
        {textSettingsTab === 'docs-order' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">说明：</span>拖动或使用上下箭头调整文档在 /docs 页面的显示顺序。点击眼睛图标可以控制文档是否在列表中显示（隐藏的文档仍可通过链接访问）。文档文件存放在 frontend/public/markdown 目录下。修改自定义路径名中如果包含符号，仅支持“-”、“_”。
              </p>
            </div>

            {loadingDocsOrder ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="ml-2 text-gray-600">加载文档列表中...</span>
              </div>
            ) : docsConfig.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-sm">暂无文档文件</p>
                <p className="text-gray-400 text-xs mt-1">请将 .md 文件放入 frontend/public/markdown 目录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docsConfig.map((doc, index) => (
                  <div
                    key={doc.name}
                    className={`flex flex-col gap-3 sm:flex-row sm:items-center p-3 bg-white rounded-lg border transition-colors ${
                      doc.showInList ? 'border-gray-200 hover:border-blue-300' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${doc.showInList ? 'text-gray-900' : 'text-gray-500'}`}>
                        {doc.name.replace(/\.md$/, '')}
                      </p>
                      <div className="flex flex-col gap-2 mt-1 sm:flex-row sm:items-center">
                        <span className="text-xs text-gray-400 flex-shrink-0">/</span>
                        <input
                          type="text"
                          value={doc.customSlug || ''}
                          onChange={(e) => {
                            const newConfig = [...docsConfig]
                            newConfig[index].customSlug = e.target.value
                            setDocsConfig(newConfig)
                          }}
                          className="w-full sm:flex-1 sm:min-w-0 text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={doc.name.replace(/\.md$/, '')}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      {/* 显示/隐藏按钮 */}
                      <button
                        type="button"
                        onClick={() => handleToggleDocVisibility(index)}
                        className={`p-1.5 rounded transition-colors ${
                          doc.showInList
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={doc.showInList ? '点击隐藏（不在列表显示）' : '点击显示（在列表显示）'}
                      >
                        {doc.showInList ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDoc(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDoc(index, 'down')}
                        disabled={index === docsConfig.length - 1}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 文档排序保存按钮 */}
            {docsConfig.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveDocsOrder}
                  disabled={savingDocsOrder}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    savingDocsOrder ? 'cursor-wait' : ''
                  }`}
                >
                  {savingDocsOrder ? (
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
                      保存排序
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 保存按钮 - 仅在页面文本设置和首页内容切换标签页显示 */}
        {(textSettingsTab === 'page-texts' || textSettingsTab === 'home-content') && (
          <div className="flex flex-col sm:flex-row sm:justify-end pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleSaveTextSettings}
              disabled={savingTextSettings}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                savingTextSettings ? 'cursor-wait' : ''
              }`}
            >
              {savingTextSettings ? (
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
        )}
      </div>
    </div>
  )
}
