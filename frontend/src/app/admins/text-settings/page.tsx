'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'
import { Save } from 'lucide-react'
import axios from 'axios'
import { getApiUrl } from '@/lib/api'

interface PageTextConfig {
  title: string
  description: string
  browserTitle: string
}

interface PageTexts {
  navigation: PageTextConfig
  services: PageTextConfig
  notes: PageTextConfig
  galleries: PageTextConfig
  messages: PageTextConfig
  promo: PageTextConfig
}

interface HomeContentConfig {
  section1: 'notes' | 'navigation' | 'services' | 'galleries'
  section2: 'notes' | 'navigation' | 'services' | 'galleries'
  enabledInBlogMode: boolean
}

export default function TextSettingsPage() {
  usePageTitle('文本设置')
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'page-texts' | 'home-content'>('page-texts')

  // 页面文本设置
  const [pageTexts, setPageTexts] = useState<PageTexts>({
    navigation: { title: '导航列表', description: '探索精选的网站导航', browserTitle: '导航列表' },
    services: { title: '服务业务', description: '为您提供专业的服务解决方案', browserTitle: '服务业务' },
    notes: { title: '笔记列表', description: '探索所有已发布的笔记内容', browserTitle: '全部笔记' },
    galleries: { title: '图库列表', description: '探索精彩的图片合集', browserTitle: '图库列表' },
    messages: { title: '联系我们', description: '有任何问题都可以通过这里进行提交你的想法！', browserTitle: '留言板' },
    promo: { title: '', description: '', browserTitle: '' }
  })

  // 首页内容切换配置
  const [homeContent, setHomeContent] = useState<HomeContentConfig>({
    section1: 'notes',
    section2: 'navigation',
    enabledInBlogMode: true
  })

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(getApiUrl('/admin/settings'), {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        const settings = response.data.data

        // 加载页面文本设置
        const pageTextsData = settings.find((s: any) => s.key === 'pageTexts')
        if (pageTextsData?.value) {
          try {
            const parsed = JSON.parse(pageTextsData.value)
            setPageTexts({ ...pageTexts, ...parsed })
          } catch (e) {
            console.error('Failed to parse pageTexts:', e)
          }
        }

        // 加载首页内容切换配置
        const homeContentData = settings.find((s: any) => s.key === 'homeContentSections')
        if (homeContentData?.value) {
          try {
            const parsed = JSON.parse(homeContentData.value)
            setHomeContent({ ...homeContent, ...parsed })
          } catch (e) {
            console.error('Failed to parse homeContentSections:', e)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageTextChange = (page: keyof PageTexts, field: keyof PageTextConfig, value: string) => {
    setPageTexts({
      ...pageTexts,
      [page]: {
        ...pageTexts[page],
        [field]: value
      }
    })
  }

  const handleSavePageTexts = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        getApiUrl('/admin/settings/batch'),
        {
          settings: [
            {
              key: 'pageTexts',
              value: JSON.stringify(pageTexts)
            }
          ]
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: '页面文本设置保存成功！正在刷新数据...' })
        // 保存成功后重新加载设置数据
        setTimeout(() => {
          loadSettings()
        }, 1000)
      }
    } catch (error: any) {
      console.error('保存失败:', error)
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHomeContent = async () => {
    // 验证选择不能相同
    if (homeContent.section1 === homeContent.section2) {
      setToast({ show: true, type: 'error', message: '两个内容区域不能选择相同的页面' })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        getApiUrl('/admin/settings/batch'),
        {
          settings: [
            {
              key: 'homeContentSections',
              value: JSON.stringify(homeContent)
            }
          ]
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: '首页内容配置保存成功！正在刷新数据...' })
        // 保存成功后重新加载设置数据
        setTimeout(() => {
          loadSettings()
        }, 1000)
      }
    } catch (error: any) {
      console.error('保存失败:', error)
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const contentOptions = [
    { value: 'notes', label: '笔记列表' },
    { value: 'navigation', label: '导航列表' },
    { value: 'services', label: '服务业务' },
    { value: 'galleries', label: '图库列表' }
  ]

  const pageConfigs = [
    { key: 'navigation', label: '导航列表页面', route: '/navigation' },
    { key: 'services', label: '服务业务页面', route: '/services' },
    { key: 'notes', label: '笔记列表页面', route: '/notes' },
    { key: 'galleries', label: '图库列表页面', route: '/galleries' },
    { key: 'messages', label: '留言列表页面', route: '/messages' },
    { key: 'promo', label: '官网主题页面', route: '/promo' }
  ]

  return (
    <>
      {/* 弹窗提示 */}
      <AdminToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 功能选项卡 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('page-texts')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'page-texts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                页面文本设置
              </button>
              <button
                onClick={() => setActiveTab('home-content')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'home-content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                首页内容切换
              </button>
            </div>

            {/* 页面文本设置Tab */}
            {activeTab === 'page-texts' && (
              <div className="mt-6 space-y-6">
                <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-900 mb-2">📝 功能说明</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• 页面标题：显示在页面顶部的大标题（text-3xl样式）</li>
                    <li>• 页面描述：显示在标题下方的描述文字（text-text-secondary样式）</li>
                    <li>• 浏览器标题：显示在浏览器标签页上的标题</li>
                  </ul>
                </div>

                {pageConfigs.map(({ key, label, route }) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                      <a
                        href={route}
                        target="_blank"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        预览页面 →
                      </a>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          页面标题 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pageTexts[key as keyof PageTexts].title}
                          onChange={(e) => handlePageTextChange(key as keyof PageTexts, 'title', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入页面标题"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          页面描述 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={pageTexts[key as keyof PageTexts].description}
                          onChange={(e) => handlePageTextChange(key as keyof PageTexts, 'description', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="请输入页面描述"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          浏览器标题 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pageTexts[key as keyof PageTexts].browserTitle}
                          onChange={(e) => handlePageTextChange(key as keyof PageTexts, 'browserTitle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入浏览器标签页标题"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePageTexts}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存设置'}
                  </button>
                </div>
              </div>
            )}

            {/* 首页内容切换Tab */}
            {activeTab === 'home-content' && (
              <div className="mt-6 space-y-6">
                <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-900 mb-2">🏠 功能说明</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• 首页下方原有两个内容区域（文字碎片/常用导航）</li>
                    <li>• 现在可以从4个页面中任选2个展示</li>
                    <li>• 默认选择：笔记列表 + 导航列表</li>
                    <li>• 博客模式下，内容切换功能默认开启</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      内容区域 1 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={homeContent.section1}
                      onChange={(e) => setHomeContent({ ...homeContent, section1: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {contentOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      内容区域 2 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={homeContent.section2}
                      onChange={(e) => setHomeContent({ ...homeContent, section2: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {contentOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={homeContent.enabledInBlogMode}
                        onChange={(e) => setHomeContent({ ...homeContent, enabledInBlogMode: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">博客模式下启用内容切换</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      勾选后，博客模式下首页将显示选择的内容区域
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveHomeContent}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
