'use client'

import { useEffect, useState } from 'react'
import {
  getAdminSettings,
  updateAdminSettings,
  getImageUrl,
  uploadPromoImage,
  getAdminMessageCategories
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'

export default function PromoSettingsPage() {
  usePageTitle('官网主题设置', true)
  const [activeTab, setActiveTab] = useState<'logo-nav' | 'hero' | 'about' | 'services' | 'team' | 'partners' | 'contact-footer' | 'ui-texts'>('logo-nav')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messageCategories, setMessageCategories] = useState<Array<{ id: number; name: string }>>([])
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  // Promo页面设置状态
  const [promoSettings, setPromoSettings] = useState<{
    bilingualEnabled?: boolean
    messageCategoryId?: number
    logoDarkImage: string
    logoLightImage: string
    logoText: string
    logoTextEn: string
    logoSubText: string
    logoSubTextEn: string
    browserTitle: string
    browserTitleEn: string
    browserSubtitle: string
    browserSubtitleEn: string
    navMenuItems: Array<{ name: string; nameEn: string; link: string; sortOrder?: number }>
    // Hero 区域
    heroTag: string
    heroTagEn: string
    heroTitle: string
    heroTitleEn: string
    heroDescription: string
    heroDescriptionEn: string
    heroButtonText: string
    heroButtonTextEn: string
    heroButtonUrl: string
    heroSecondButtonText: string
    heroSecondButtonTextEn: string
    heroSecondButtonUrl: string
    // Hero 特性标签
    showHeroFeatureTags?: boolean
    showHeroMainButton?: boolean
    showHeroSecondButton?: boolean
    showContactButton?: boolean
    contactButtonUrl?: string
    heroFeatureTags: Array<{ icon: string; text: string; textEn: string; color: string }>
    // About/Features 区域
    aboutSectionLabel: string
    aboutSectionLabelEn: string
    aboutTag: string
    aboutTagEn: string
    aboutTitle: string
    aboutTitleEn: string
    aboutDescription: string
    aboutDescriptionEn: string
    aboutFeatures: Array<{ icon: string; title: string; titleEn: string; desc: string; descEn: string; url?: string }>
    featuresLearnMoreText: string
    featuresLearnMoreTextEn: string
    // Services 区域
    servicesSectionLabel: string
    servicesSectionLabelEn: string
    servicesTag: string
    servicesTagEn: string
    servicesTitle: string
    servicesTitleEn: string
    serviceCategories: Array<{ name: string; nameEn: string; services: Array<{ image: string; title: string; titleEn: string; description: string; descriptionEn: string; url?: string }> }>
    // Team 区域
    teamSectionLabel: string
    teamSectionLabelEn: string
    teamTag: string
    teamTagEn: string
    teamTitle: string
    teamTitleEn: string
    teamMembers: Array<{ avatarImage?: string; avatar: string; name: string; nameEn: string; role: string; roleEn: string }>
    // Partners 区域
    partnersSectionLabel: string
    partnersSectionLabelEn: string
    partnersTag: string
    partnersTagEn: string
    partnersDescription: string
    partnersDescriptionEn: string
    partners: Array<{ image: string; name: string; nameEn: string }>
    // Contact 区域
    contactSectionLabel: string
    contactSectionLabelEn: string
    contactTitle: string
    contactTitleEn: string
    contactDescription: string
    contactDescriptionEn: string
    contactMethods: Array<{ icon: string; value: string }>
    // Footer 区域
    footerCopyright: string
    footerCopyrightEn: string
    // UI 文本配置
    uiTexts: {
      startButton: string
      startButtonEn: string
      learnMoreButton: string
      learnMoreButtonEn: string
      contactButton: string
      contactButtonEn: string
      formName: string
      formNameEn: string
      formContact: string
      formContactEn: string
      formContent: string
      formContentEn: string
      formSubmit: string
      formSubmitEn: string
      formSending: string
      formSendingEn: string
    }
  }>({
    bilingualEnabled: false,
    logoDarkImage: '',
    logoLightImage: '',
    logoText: '',
    logoTextEn: '',
    logoSubText: '',
    logoSubTextEn: '',
    browserTitle: '',
    browserTitleEn: '',
    browserSubtitle: '',
    browserSubtitleEn: '',
    navMenuItems: [],
    // Hero 区域
    heroTag: '',
    heroTagEn: '',
    heroTitle: '',
    heroTitleEn: '',
    heroDescription: '',
    heroDescriptionEn: '',
    heroButtonText: '',
    heroButtonTextEn: '',
    heroButtonUrl: '',
    heroSecondButtonText: '',
    heroSecondButtonTextEn: '',
    heroSecondButtonUrl: '',
    heroFeatureTags: [],
    // About/Features 区域
    aboutSectionLabel: 'Section',
    aboutSectionLabelEn: 'Section',
    aboutTag: '',
    aboutTagEn: '',
    aboutTitle: '',
    aboutTitleEn: '',
    aboutDescription: '',
    aboutDescriptionEn: '',
    aboutFeatures: [],
    featuresLearnMoreText: '',
    featuresLearnMoreTextEn: '',
    // Services 区域
    servicesSectionLabel: 'Section',
    servicesSectionLabelEn: 'Section',
    servicesTag: '',
    servicesTagEn: '',
    servicesTitle: '',
    servicesTitleEn: '',
    serviceCategories: [],
    // Team 区域
    teamSectionLabel: 'Section',
    teamSectionLabelEn: 'Section',
    teamTag: '',
    teamTagEn: '',
    teamTitle: '',
    teamTitleEn: '',
    teamMembers: [],
    // Partners 区域
    partnersSectionLabel: 'Section',
    partnersSectionLabelEn: 'Section',
    partnersTag: '',
    partnersTagEn: '',
    partnersDescription: '',
    partnersDescriptionEn: '',
    partners: [],
    // Contact 区域
    contactSectionLabel: 'Section',
    contactSectionLabelEn: 'Section',
    contactTitle: '',
    contactTitleEn: '',
    contactDescription: '',
    contactDescriptionEn: '',
    contactMethods: [],
    // Footer 区域
    footerCopyright: '',
    footerCopyrightEn: '',
    // UI 文本配置
    uiTexts: {
      startButton: '立即开始',
      startButtonEn: 'Get Started',
      learnMoreButton: '了解更多',
      learnMoreButtonEn: 'Learn More',
      contactButton: '开始对话',
      contactButtonEn: 'Contact Us',
      formName: '您的姓名',
      formNameEn: 'Name',
      formContact: '联系方式',
      formContactEn: 'Contact',
      formContent: '项目描述或留言...',
      formContentEn: 'Message...',
      formSubmit: '发送留言',
      formSubmitEn: 'Send Message',
      formSending: '提交中...',
      formSendingEn: 'Sending...'
    }
  })

  const normalizePromoSettings = (input: any) => {
    if (!input || typeof input !== 'object') return {}

    const normalized: any = { ...input }

    const normalizeI18n = (key: string, keyEn: string) => {
      const val = normalized[key]
      if (val && typeof val === 'object') {
        const v = typeof val.value === 'string' ? val.value : ''
        const vEn = typeof val.valueEn === 'string' ? val.valueEn : v
        normalized[key] = v
        if (normalized[keyEn] === undefined) normalized[keyEn] = vEn
      }
    }

    normalizeI18n('logoText', 'logoTextEn')
    normalizeI18n('logoSubText', 'logoSubTextEn')
    normalizeI18n('browserTitle', 'browserTitleEn')
    normalizeI18n('browserSubtitle', 'browserSubtitleEn')
    normalizeI18n('heroTag', 'heroTagEn')
    normalizeI18n('heroTitle', 'heroTitleEn')
    normalizeI18n('heroDescription', 'heroDescriptionEn')
    normalizeI18n('heroButtonText', 'heroButtonTextEn')
    normalizeI18n('heroSecondButtonText', 'heroSecondButtonTextEn')
    normalizeI18n('aboutTag', 'aboutTagEn')
    normalizeI18n('aboutTitle', 'aboutTitleEn')
    normalizeI18n('aboutDescription', 'aboutDescriptionEn')
    normalizeI18n('featuresLearnMoreText', 'featuresLearnMoreTextEn')
    normalizeI18n('servicesTag', 'servicesTagEn')
    normalizeI18n('servicesTitle', 'servicesTitleEn')
    normalizeI18n('teamTag', 'teamTagEn')
    normalizeI18n('teamTitle', 'teamTitleEn')
    normalizeI18n('partnersTag', 'partnersTagEn')
    normalizeI18n('partnersDescription', 'partnersDescriptionEn')
    normalizeI18n('contactTitle', 'contactTitleEn')
    normalizeI18n('contactDescription', 'contactDescriptionEn')
    normalizeI18n('footerCopyright', 'footerCopyrightEn')

    if (Array.isArray(normalized.navMenuItems)) {
      normalized.navMenuItems = normalized.navMenuItems.map((raw: any, index: number) => {
        const next: any = { ...(raw || {}) }

        const rawSort = next.sortOrder ?? next.sort_order
        const parsedSort = typeof rawSort === 'number' ? rawSort : parseInt(String(rawSort ?? ''), 10)
        next.sortOrder = Number.isFinite(parsedSort) ? parsedSort : index

        if (typeof next.name !== 'string') next.name = ''
        if (typeof next.link !== 'string') next.link = ''
        if (typeof next.nameEn !== 'string') next.nameEn = typeof next.name_en === 'string' ? next.name_en : ''

        return next
      })
    }

    return normalized
  }

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsResponse, categoriesResponse] = await Promise.all([
        getAdminSettings(),
        getAdminMessageCategories()
      ])

      if (settingsResponse.success && settingsResponse.data) {
        const settingsMap: { [key: string]: string } = {}
        settingsResponse.data.forEach((item: any) => {
          settingsMap[item.key] = item.value
        })

        // 加载 promoSettings
        if (settingsMap.promoSettings) {
          try {
            const parsed = JSON.parse(settingsMap.promoSettings)
            const normalized = normalizePromoSettings(parsed)
            setPromoSettings(prev => ({
              ...prev,
              ...normalized,
              uiTexts: {
                ...prev.uiTexts,
                ...(normalized.uiTexts || {})
              }
            }))
          } catch (e) {
            console.error('Failed to parse promoSettings:', e)
          }
        }
      }

      // 加载留言分类
      if (categoriesResponse.success && categoriesResponse.data) {
        setMessageCategories(categoriesResponse.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      setToast({ show: true, type: 'error', message: '加载数据失败' })
    } finally {
      setLoading(false)
    }
  }

  // 保存设置
  const handleSave = async () => {
    try {
      setSaving(true)
      const settingsArray = [
        {
          key: 'promoSettings',
          value: JSON.stringify(promoSettings),
          type: 'string'
        }
      ]

      const response = await updateAdminSettings(settingsArray)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '保存成功！' })
      } else {
        setToast({ show: true, type: 'error', message: response.message || '保存失败' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  // 图片上传处理函数
  const handleImageUpload = async (file: File, fieldName: string) => {
    try {
      setToast({ show: true, type: 'success', message: '正在上传图片...' })
      const response = await uploadPromoImage(file)
      if (response.success) {
        const imageUrl = response.data.url

        // 处理简单字段（如 logoDarkImage, logoLightImage）
        if (fieldName.includes('logoDarkImage') || fieldName.includes('logoLightImage')) {
          setPromoSettings({ ...promoSettings, [fieldName]: imageUrl })
        }
        // 处理服务分类图片（格式：serviceImage_0_1）
        else if (fieldName.startsWith('serviceImage_')) {
          const [_, catIndex, svcIndex] = fieldName.split('_')
          const newCategories = [...promoSettings.serviceCategories]
          newCategories[parseInt(catIndex)].services[parseInt(svcIndex)].image = imageUrl
          setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
        }
        // 处理团队成员头像（格式：memberAvatar_0）
        else if (fieldName.startsWith('memberAvatar_')) {
          const index = parseInt(fieldName.split('_')[1])
          const newMembers = [...promoSettings.teamMembers]
          newMembers[index].avatarImage = imageUrl
          setPromoSettings({ ...promoSettings, teamMembers: newMembers })
        }
        // 处理合作伙伴图片（格式：partnerImage_0）
        else if (fieldName.startsWith('partnerImage_')) {
          const index = parseInt(fieldName.split('_')[1])
          const newPartners = [...promoSettings.partners]
          newPartners[index].image = imageUrl
          setPromoSettings({ ...promoSettings, partners: newPartners })
        }
        // 处理特性卡片图标（格式：featureIcon_0）
        else if (fieldName.startsWith('featureIcon_')) {
          const index = parseInt(fieldName.split('_')[1])
          const newFeatures = [...promoSettings.aboutFeatures]
          newFeatures[index].icon = imageUrl
          setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
        }
        // 处理 Hero 特性标签图标（格式：heroFeatureIcon_0）
        else if (fieldName.startsWith('heroFeatureIcon_')) {
          const index = parseInt(fieldName.split('_')[1])
          const newTags = [...promoSettings.heroFeatureTags]
          newTags[index].icon = imageUrl
          setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
        }
        // 处理联系方式图标（格式：contactIcon_0）
        else if (fieldName.startsWith('contactIcon_')) {
          const index = parseInt(fieldName.split('_')[1])
          const newMethods = [...promoSettings.contactMethods]
          newMethods[index].icon = imageUrl
          setPromoSettings({ ...promoSettings, contactMethods: newMethods })
        }

        setToast({ show: true, type: 'success', message: '图片上传成功！' })
      } else {
        setToast({ show: true, type: 'error', message: response.message || '图片上传失败' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '图片上传失败' })
    }
  }

  return (
    <>
      {/* Toast 提示 */}
      <AdminToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        <div className="w-full">
          {/* 功能选项卡 */}
          <div className={`bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 overflow-hidden ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-1 sm:gap-4 border-b border-gray-200 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('logo-nav')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'logo-nav'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                页面基本设置
              </button>
              <button
                onClick={() => setActiveTab('hero')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'hero'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Hero区域
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'about'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                关于我们
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'services'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                服务内容
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'team'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                团队成员
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'partners'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                合作伙伴
              </button>
              <button
                onClick={() => setActiveTab('contact-footer')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'contact-footer'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                联系&底部
              </button>
              <button
                onClick={() => setActiveTab('ui-texts')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'ui-texts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                UI文本
              </button>
            </div>

            {/* 内容区域 */}
            <div className="mt-6">
              {activeTab === 'logo-nav' && (
                <div className="space-y-6">
                  {/* 双语开关 - 只在第一个标签页显示，但对所有标签页生效 */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">中英文双语模式</h3>
                        <p className="text-xs text-gray-600">开启后，所有标签页的文本字段将显示中文和英文两个输入框</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promoSettings.bilingualEnabled || false}
                          onChange={(e) => setPromoSettings({ ...promoSettings, bilingualEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义 Promo 页面的 Logo、Hero 区域等基本信息。
                    </p>
                  </div>

                  {/* Logo 设置 */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Logo 设置</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {/* 标题和副标题设置 */}
                      <div className="p-4">
                        <h4 className="text-xs font-semibold text-gray-800 mb-3">LOGO文字</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">页面标题（中文）</label>
                            <input
                              type="text"
                              value={promoSettings.logoText || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, logoText: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                              placeholder="XsBlog"
                            />
                            {promoSettings.bilingualEnabled && (
                              <>
                                <label className="block text-xs font-medium text-purple-700 mb-1">页面标题（English）</label>
                                <input
                                  type="text"
                                  value={promoSettings.logoTextEn || ''}
                                  onChange={(e) => setPromoSettings({ ...promoSettings, logoTextEn: e.target.value })}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                  placeholder="XsBlog"
                                />
                              </>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">页面副标题（中文）</label>
                            <input
                              type="text"
                              value={promoSettings.logoSubText || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, logoSubText: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                              placeholder="博客系统"
                            />
                            {promoSettings.bilingualEnabled && (
                              <>
                                <label className="block text-xs font-medium text-purple-700 mb-1">页面副标题（English）</label>
                                <input
                                  type="text"
                                  value={promoSettings.logoSubTextEn || ''}
                                  onChange={(e) => setPromoSettings({ ...promoSettings, logoSubTextEn: e.target.value })}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                  placeholder="Blog System"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <h4 className="text-xs font-semibold text-gray-800 mb-3">页面基本设置</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">浏览器标签主标题（中文）</label>
                            <input
                              type="text"
                              value={promoSettings.browserTitle || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, browserTitle: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                              placeholder="例如：官网首页"
                            />
                            {promoSettings.bilingualEnabled && (
                              <>
                                <label className="block text-xs font-medium text-purple-700 mb-1">浏览器标签主标题（English）</label>
                                <input
                                  type="text"
                                  value={promoSettings.browserTitleEn || ''}
                                  onChange={(e) => setPromoSettings({ ...promoSettings, browserTitleEn: e.target.value })}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                  placeholder="For example: Official Website"
                                />
                              </>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">浏览器标签副标题（中文）</label>
                            <input
                              type="text"
                              value={promoSettings.browserSubtitle || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, browserSubtitle: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                              placeholder="例如：欢迎访问"
                            />
                            {promoSettings.bilingualEnabled && (
                              <>
                                <label className="block text-xs font-medium text-purple-700 mb-1">浏览器标签副标题（English）</label>
                                <input
                                  type="text"
                                  value={promoSettings.browserSubtitleEn || ''}
                                  onChange={(e) => setPromoSettings({ ...promoSettings, browserSubtitleEn: e.target.value })}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                  placeholder="For example: Welcome"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Logo 图片上传 */}
                      <div className="p-4">
                        <h4 className="text-xs font-semibold text-gray-800 mb-3">Logo 图片（可选，如上传图片则不显示文本）</h4>

                        {/* 黑色主题 Logo */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">黑色主题 Logo</label>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            {promoSettings.logoDarkImage && (
                              <div className="flex-shrink-0 w-32 h-16 flex items-center justify-center bg-gray-900 rounded border border-gray-300">
                                <img
                                  src={getImageUrl(promoSettings.logoDarkImage)}
                                  alt="Dark Logo"
                                  className="max-w-full max-h-full object-contain"
                                  style={{ maxHeight: '40px' }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                              {!promoSettings.logoDarkImage && (
                                <>
                                  <input
                                    type="file"
                                    id="logoDarkImageInput"
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        handleImageUpload(file, e.target.id.replace('Input', ''))
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="logoDarkImageInput"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap"
                                  >
                                    选择文件
                                  </label>
                                </>
                              )}
                              <input
                                type="text"
                                value={promoSettings.logoDarkImage || ''}
                                onChange={(e) => setPromoSettings({ ...promoSettings, logoDarkImage: e.target.value })}
                                placeholder="或直接输入图片URL"
                                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                              />
                            </div>
                            {promoSettings.logoDarkImage && (
                              <button
                                type="button"
                                onClick={() => setPromoSettings({ ...promoSettings, logoDarkImage: '' })}
                                className="flex-shrink-0 self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                              >
                                删除
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                        </div>

                        {/* 白色主题 Logo */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">白色主题 Logo</label>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            {promoSettings.logoLightImage && (
                              <div className="flex-shrink-0 w-32 h-16 flex items-center justify-center bg-white rounded border border-gray-300">
                                <img
                                  src={getImageUrl(promoSettings.logoLightImage)}
                                  alt="Light Logo"
                                  className="max-w-full max-h-full object-contain"
                                  style={{ maxHeight: '40px' }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                              {!promoSettings.logoLightImage && (
                                <>
                                  <input
                                    type="file"
                                    id="logoLightImageInput"
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        handleImageUpload(file, e.target.id.replace('Input', ''))
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="logoLightImageInput"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap"
                                  >
                                    选择文件
                                  </label>
                                </>
                              )}
                              <input
                                type="text"
                                value={promoSettings.logoLightImage || ''}
                                onChange={(e) => setPromoSettings({ ...promoSettings, logoLightImage: e.target.value })}
                                placeholder="或直接输入图片URL"
                                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                              />
                            </div>
                            {promoSettings.logoLightImage && (
                              <button
                                type="button"
                                onClick={() => setPromoSettings({ ...promoSettings, logoLightImage: '' })}
                                className="flex-shrink-0 self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                              >
                                删除
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                        </div>

                        {/* Logo 尺寸提示 */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-800">
                            <span className="font-semibold">尺寸建议：</span>Logo 图片高度限制为 40px，建议宽度：120-200px（宽度不限制，会自动适应）
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 留言分类绑定设置 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">留言分类绑定</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">说明：</span>选择一个留言分类，用户在官网页面提交的留言将自动归类到该分类下，可在"留言管理"中查看。
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">选择留言分类</label>
                      <select
                        value={promoSettings.messageCategoryId || ''}
                        onChange={(e) => setPromoSettings({ ...promoSettings, messageCategoryId: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择留言分类</option>
                        {messageCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {messageCategories.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          暂无留言分类，请先在"留言管理"中创建留言分类
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 导航菜单设置 */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">导航菜单</h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (promoSettings.navMenuItems?.length >= 10) {
                            setToast({ show: true, type: 'error', message: '最多只能添加10个导航菜单项' })
                            return
                          }
                          setPromoSettings({
                            ...promoSettings,
                            navMenuItems: [
                              ...(promoSettings.navMenuItems || []),
                              { name: '', nameEn: '', link: '', sortOrder: (promoSettings.navMenuItems || []).length }
                            ]
                          })
                        }}
                        className="flex-shrink-0 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        + 添加菜单项
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                        {promoSettings.navMenuItems?.map((item, index) => (
                          <div key={index} className="p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-xs font-semibold text-gray-700">菜单项 {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = promoSettings.navMenuItems.filter((_, i) => i !== index)
                                setPromoSettings({ ...promoSettings, navMenuItems: newItems })
                              }}
                              className="flex-shrink-0 px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                            >
                              删除
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => {
                                const newItems = [...promoSettings.navMenuItems]
                                newItems[index].name = e.target.value
                                setPromoSettings({ ...promoSettings, navMenuItems: newItems })
                              }}
                              className={`w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${promoSettings.bilingualEnabled ? '' : 'sm:col-span-2'}`}
                              placeholder="菜单名称（中文）"
                            />
                            {promoSettings.bilingualEnabled && (
                              <input
                                type="text"
                                value={item.nameEn || ''}
                                onChange={(e) => {
                                  const newItems = [...promoSettings.navMenuItems]
                                  newItems[index].nameEn = e.target.value
                                  setPromoSettings({ ...promoSettings, navMenuItems: newItems })
                                }}
                                className="w-full min-w-0 px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                placeholder="菜单名称（English）"
                              />
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={item.link || ''}
                              onChange={(e) => {
                                const newItems = [...promoSettings.navMenuItems]
                                newItems[index].link = e.target.value
                                setPromoSettings({ ...promoSettings, navMenuItems: newItems })
                              }}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="链接地址"
                            />
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={Number.isFinite(item.sortOrder as number) ? (item.sortOrder as number) : index}
                              onChange={(e) => {
                                const next = e.target.value ? parseInt(e.target.value, 10) : 0
                                const newItems = [...promoSettings.navMenuItems]
                                newItems[index].sortOrder = Number.isFinite(next) ? next : 0
                                setPromoSettings({ ...promoSettings, navMenuItems: newItems })
                              }}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="排序（小→前）"
                            />
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Hero区域 */}
              {activeTab === 'hero' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义 Hero 区域的标签、标题、描述、按钮和特性标签。
                    </p>
                  </div>

                  {/* 显示/隐藏开关 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">显示/隐藏设置</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                        <span className="text-sm text-gray-700">显示 Hero 特性标签</span>
                        <input
                          type="checkbox"
                          checked={promoSettings.showHeroFeatureTags !== false}
                          onChange={(e) => setPromoSettings({ ...promoSettings, showHeroFeatureTags: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                        <span className="text-sm text-gray-700">显示主按钮</span>
                        <input
                          type="checkbox"
                          checked={promoSettings.showHeroMainButton !== false}
                          onChange={(e) => setPromoSettings({ ...promoSettings, showHeroMainButton: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                        <span className="text-sm text-gray-700">显示次按钮</span>
                        <input
                          type="checkbox"
                          checked={promoSettings.showHeroSecondButton !== false}
                          onChange={(e) => setPromoSettings({ ...promoSettings, showHeroSecondButton: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                        <span className="text-sm text-gray-700">显示右上角开始对话按钮</span>
                        <input
                          type="checkbox"
                          checked={promoSettings.showContactButton !== false}
                          onChange={(e) => setPromoSettings({ ...promoSettings, showContactButton: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Hero 区域设置</h3>
                    <div className="space-y-3">
                      {/* Hero 标签 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hero 标签（中文，如：OFFICIAL 2026）</label>
                        <input
                          type="text"
                          value={promoSettings.heroTag || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroTag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="OFFICIAL 2026"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Hero 标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.heroTagEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, heroTagEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="OFFICIAL 2026"
                            />
                          </>
                        )}
                      </div>
                      {/* Hero 标题 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hero 标题（中文，支持 \n 换行）</label>
                        <textarea
                          value={promoSettings.heroTitle || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          rows={3}
                          placeholder="Xs-Blog&#10;独立的官网主题"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Hero 标题（English，支持 \n 换行）</label>
                            <textarea
                              value={promoSettings.heroTitleEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, heroTitleEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              rows={3}
                              placeholder="Xs-Blog&#10;Independent Website Theme"
                            />
                          </>
                        )}
                      </div>
                      {/* Hero 描述 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hero 描述（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.heroDescription || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="AI未来感赛博朋克风格企业级展示主题，适用于AI、科技等互联网相关领域。"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Hero 描述（English）</label>
                            <input
                              type="text"
                              value={promoSettings.heroDescriptionEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, heroDescriptionEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Futuristic cyberpunk-style enterprise theme for AI and technology fields."
                            />
                          </>
                        )}
                      </div>
                      {/* 主按钮 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">主按钮文本（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.heroButtonText || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroButtonText: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="立即开始"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">主按钮文本（English）</label>
                            <input
                              type="text"
                              value={promoSettings.heroButtonTextEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, heroButtonTextEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50 mb-2"
                              placeholder="Get Started"
                            />
                          </>
                        )}
                        <label className="block text-xs font-medium text-gray-700 mb-1">主按钮链接（支持相对路径和绝对路径）</label>
                        <input
                          type="text"
                          value={promoSettings.heroButtonUrl || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroButtonUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="/services 或 https://example.com"
                        />
                      </div>
                      {/* 次按钮 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">次按钮文本（中文，如：了解更多）</label>
                        <input
                          type="text"
                          value={promoSettings.heroSecondButtonText || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroSecondButtonText: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="了解更多"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">次按钮文本（English）</label>
                            <input
                              type="text"
                              value={promoSettings.heroSecondButtonTextEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, heroSecondButtonTextEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50 mb-2"
                              placeholder="Learn More"
                            />
                          </>
                        )}
                        <label className="block text-xs font-medium text-gray-700 mb-1">次按钮链接（支持相对路径和绝对路径）</label>
                        <input
                          type="text"
                          value={promoSettings.heroSecondButtonUrl || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, heroSecondButtonUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="/about 或 https://example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero 特性标签 */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Hero 特性标签</h3>
                        <p className="text-xs text-gray-500 mt-1">显示在 Hero 区域标题下方的特性标签（最多5个）</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (promoSettings.heroFeatureTags?.length >= 5) {
                            setToast({ show: true, type: 'error', message: '最多只能添加5个特性标签' })
                            return
                          }
                          setPromoSettings({
                            ...promoSettings,
                            heroFeatureTags: [...(promoSettings.heroFeatureTags || []), { icon: '', text: '', textEn: '', color: 'amber' }]
                          })
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        + 添加标签
                      </button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">图标说明：</span>支持 SVG 代码（如 &lt;svg&gt;...&lt;/svg&gt;）。颜色可选：amber（琥珀）、emerald（翠绿）、sky（天蓝）、rose（玫瑰）、violet（紫色）
                      </p>
                    </div>
                    {promoSettings.heroFeatureTags?.length ? (
                      <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                        {promoSettings.heroFeatureTags.map((tag, index) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-800">标签 {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = promoSettings.heroFeatureTags.filter((_, i) => i !== index)
                                setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                          <div className="space-y-3">
                            {/* 图标 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">图标（上传图片或填写URL）</label>
                              <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
                                {tag.icon && !tag.icon.startsWith('<') && (
                                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={getImageUrl(tag.icon)}
                                      alt="Icon"
                                      className="w-full h-full object-contain"
                                      style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(11%) saturate(1393%) hue-rotate(215deg) brightness(92%) contrast(85%)' }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                  {!tag.icon && (
                                    <>
                                      <input
                                        type="file"
                                        id={`heroFeatureIcon_${index}`}
                                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            handleImageUpload(file, e.target.id)
                                          }
                                        }}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`heroFeatureIcon_${index}`}
                                        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                      >
                                        上传图片
                                      </label>
                                    </>
                                  )}
                                  <input
                                    type="text"
                                    value={tag.icon?.startsWith('<') ? '' : (tag.icon || '')}
                                    onChange={(e) => {
                                      const newTags = [...promoSettings.heroFeatureTags]
                                      newTags[index].icon = e.target.value
                                      setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                                    }}
                                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="或输入图片URL"
                                    disabled={!!(tag.icon && tag.icon.startsWith('<'))}
                                  />
                                  {tag.icon && !tag.icon.startsWith('<') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newTags = [...promoSettings.heroFeatureTags]
                                        newTags[index].icon = ''
                                        setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                                      }}
                                      className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 whitespace-nowrap"
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                            </div>
                            {/* 文本 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">文本（中文）</label>
                                <input
                                  type="text"
                                  value={tag.text || ''}
                                  onChange={(e) => {
                                    const newTags = [...promoSettings.heroFeatureTags]
                                    newTags[index].text = e.target.value
                                    setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder="可控部署"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">矩形框颜色</label>
                                <select
                                  value={tag.color || 'amber'}
                                  onChange={(e) => {
                                    const newTags = [...promoSettings.heroFeatureTags]
                                    newTags[index].color = e.target.value
                                    setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="amber">琥珀色 (amber)</option>
                                  <option value="emerald">翠绿色 (emerald)</option>
                                  <option value="sky">天蓝色 (sky)</option>
                                  <option value="rose">玫瑰色 (rose)</option>
                                  <option value="violet">紫色 (violet)</option>
                                </select>
                              </div>
                            </div>
                            {promoSettings.bilingualEnabled && (
                              <div>
                                <label className="block text-xs font-medium text-purple-700 mb-1">文本（English）</label>
                                <input
                                  type="text"
                                  value={tag.textEn || ''}
                                  onChange={(e) => {
                                    const newTags = [...promoSettings.heroFeatureTags]
                                    newTags[index].textEn = e.target.value
                                    setPromoSettings({ ...promoSettings, heroFeatureTags: newTags })
                                  }}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                  placeholder="Controlled deploy"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">暂无特性标签，点击上方按钮添加</p>
                    )}
                  </div>
                </div>
              )}

              {/* 关于我们 */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义关于我们区域的内容。
                    </p>
                  </div>

                  {/* 关于我们 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">关于我们</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section 标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.aboutSectionLabel || 'Section'}
                          onChange={(e) => setPromoSettings({ ...promoSettings, aboutSectionLabel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Section 标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.aboutSectionLabelEn || 'Section'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, aboutSectionLabelEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Section"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标签（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.aboutTag || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, aboutTag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="关于我们"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.aboutTagEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, aboutTagEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="WHO WE ARE"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.aboutTitle || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, aboutTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Xs-Blog博客系统"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.aboutTitleEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, aboutTitleEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Xs-Blog System"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">描述（中文）</label>
                        <textarea
                          value={promoSettings.aboutDescription || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, aboutDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          rows={2}
                          placeholder="一个轻量级的博客系统，适用于个人和小团队使用。"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">描述（English）</label>
                            <textarea
                              value={promoSettings.aboutDescriptionEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, aboutDescriptionEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              rows={2}
                              placeholder="A lightweight blog system suitable for individuals and small teams."
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 特性卡片（Bento Cards） */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">特性卡片</h3>
                        <p className="text-xs text-gray-500 mt-1">下方四个矩形卡片，展示核心特性</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (promoSettings.aboutFeatures?.length >= 4) {
                            setToast({ show: true, type: 'error', message: '最多只能添加4个特性卡片' })
                            return
                          }
                          setPromoSettings({
                            ...promoSettings,
                            aboutFeatures: [...(promoSettings.aboutFeatures || []), { icon: '', title: '', titleEn: '', desc: '', descEn: '' }]
                          })
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        + 添加卡片
                      </button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">图标说明：</span>支持上传图片或填写图片URL（支持相对路径）。图标颜色会自动适配主题色。
                      </p>
                    </div>
                    {promoSettings.aboutFeatures?.length ? (
                      <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                      {promoSettings.aboutFeatures.map((feature, index) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-800">卡片 {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const newFeatures = promoSettings.aboutFeatures.filter((_, i) => i !== index)
                                setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                          <div className="space-y-3">
                            {/* 图标 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">图标（上传图片或填写图片URL）</label>
                              <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
                                {feature.icon && (
                                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={getImageUrl(feature.icon)}
                                      alt="Icon"
                                      className="w-full h-full object-contain"
                                      style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(11%) saturate(1393%) hue-rotate(215deg) brightness(92%) contrast(85%)' }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                  {!feature.icon && (
                                    <>
                                      <input
                                        type="file"
                                        id={`featureIcon_${index}`}
                                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            handleImageUpload(file, e.target.id)
                                          }
                                        }}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`featureIcon_${index}`}
                                        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                      >
                                        上传图片
                                      </label>
                                    </>
                                  )}
                                  <input
                                    type="text"
                                    value={feature.icon || ''}
                                    onChange={(e) => {
                                      const newFeatures = [...promoSettings.aboutFeatures]
                                      newFeatures[index].icon = e.target.value
                                      setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                    }}
                                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="或输入图片URL（支持相对路径）"
                                  />
                                  {feature.icon && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFeatures = [...promoSettings.aboutFeatures]
                                        newFeatures[index].icon = ''
                                        setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                      }}
                                      className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 whitespace-nowrap"
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico（图片颜色会自动适配主题色）</p>
                            </div>
                            {/* 标题 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">标题（中文）</label>
                              <input
                                type="text"
                                value={feature.title || ''}
                                onChange={(e) => {
                                  const newFeatures = [...promoSettings.aboutFeatures]
                                  newFeatures[index].title = e.target.value
                                  setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="轻量高效"
                              />
                              {promoSettings.bilingualEnabled && (
                                <>
                                  <label className="block text-xs font-medium text-purple-700 mb-1 mt-2">标题（English）</label>
                                  <input
                                    type="text"
                                    value={feature.titleEn || ''}
                                    onChange={(e) => {
                                      const newFeatures = [...promoSettings.aboutFeatures]
                                      newFeatures[index].titleEn = e.target.value
                                      setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                    }}
                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                    placeholder="Lightweight"
                                  />
                                </>
                              )}
                            </div>
                            {/* 描述 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">描述（中文）</label>
                              <input
                                type="text"
                                value={feature.desc || ''}
                                onChange={(e) => {
                                  const newFeatures = [...promoSettings.aboutFeatures]
                                  newFeatures[index].desc = e.target.value
                                  setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="快速部署，极简架构"
                              />
                              {promoSettings.bilingualEnabled && (
                                <>
                                  <label className="block text-xs font-medium text-purple-700 mb-1 mt-2">描述（English）</label>
                                  <input
                                    type="text"
                                    value={feature.descEn || ''}
                                    onChange={(e) => {
                                      const newFeatures = [...promoSettings.aboutFeatures]
                                      newFeatures[index].descEn = e.target.value
                                      setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                    }}
                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                    placeholder="Fast deploy, minimal architecture"
                                  />
                                </>
                              )}
                            </div>
                            {/* 跳转URL */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">跳转URL（可选，支持相对路径和绝对路径）</label>
                              <input
                                type="text"
                                value={feature.url || ''}
                                onChange={(e) => {
                                  const newFeatures = [...promoSettings.aboutFeatures]
                                  newFeatures[index].url = e.target.value
                                  setPromoSettings({ ...promoSettings, aboutFeatures: newFeatures })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="留空则不显示'了解详情'按钮，或输入 /docs 或 https://example.com"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">暂无特性卡片，点击上方按钮添加</p>
                    )}
                  </div>
                </div>
              )}

              {/* 服务内容 */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义服务内容区域。最多6个分类，每个分类最多6个服务项。服务图片为4:3比例，超出自动剪切。
                    </p>
                  </div>

                  {/* 服务区域标题 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">服务区域设置</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section 标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.servicesSectionLabel || 'Section'}
                          onChange={(e) => setPromoSettings({ ...promoSettings, servicesSectionLabel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Section 标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.servicesSectionLabelEn || 'Section'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, servicesSectionLabelEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Section"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标签（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.servicesTag || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, servicesTag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="服务内容"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.servicesTagEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, servicesTagEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="SERVICES"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.servicesTitle || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, servicesTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Xs-Blog功能特性"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.servicesTitleEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, servicesTitleEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Xs-Blog Features"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 服务分类列表 */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">服务分类（最多6个）</h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (promoSettings.serviceCategories?.length >= 6) {
                            setToast({ show: true, type: 'error', message: '最多只能添加6个服务分类' })
                            return
                          }
                          setPromoSettings({
                            ...promoSettings,
                            serviceCategories: [...(promoSettings.serviceCategories || []), { name: '', nameEn: '', services: [] }]
                          })
                        }}
                        className="self-start sm:self-auto px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        + 添加分类
                      </button>
                    </div>

                    <div className="space-y-4 max-h-72 sm:max-h-[600px] overflow-y-auto">
                      {promoSettings.serviceCategories?.map((category, catIndex) => (
                        <div key={catIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                            <h4 className="text-sm font-semibold text-gray-800">分类 {catIndex + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const newCategories = promoSettings.serviceCategories.filter((_, i) => i !== catIndex)
                                setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                              }}
                              className="self-start sm:self-auto px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              删除分类
                            </button>
                          </div>

                          {/* 分类名称 */}
                          <div className="mb-3 space-y-2">
                            <input
                              type="text"
                              value={category.name || ''}
                              onChange={(e) => {
                                const newCategories = [...promoSettings.serviceCategories]
                                newCategories[catIndex].name = e.target.value
                                setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="分类名称（中文，如：全部主题）"
                            />
                            {promoSettings.bilingualEnabled && (
                              <input
                                type="text"
                                value={category.nameEn || ''}
                                onChange={(e) => {
                                  const newCategories = [...promoSettings.serviceCategories]
                                  newCategories[catIndex].nameEn = e.target.value
                                  setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                }}
                                className="w-full px-3 py-2 border border-purple-300 rounded text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                placeholder="分类名称（English，如：All Themes）"
                              />
                            )}
                          </div>

                          {/* 该分类下的服务项 */}
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <label className="text-xs font-medium text-gray-700">服务项（最多6个）</label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (category.services?.length >= 6) {
                                    setToast({ show: true, type: 'error', message: '每个分类最多6个服务项' })
                                    return
                                  }
                                  const newCategories = [...promoSettings.serviceCategories]
                                  newCategories[catIndex].services = [...(newCategories[catIndex].services || []), { image: '', title: '', titleEn: '', description: '', descriptionEn: '' }]
                                  setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                }}
                                className="self-start sm:self-auto px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                              >
                                + 添加服务
                              </button>
                            </div>

                            <div className="space-y-3">
                              {category.services?.map((service, svcIndex) => (
                                <div key={svcIndex} className="p-3 rounded-lg border border-gray-200">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold text-gray-700">服务 {svcIndex + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newCategories = [...promoSettings.serviceCategories]
                                        newCategories[catIndex].services = newCategories[catIndex].services.filter((_, i) => i !== svcIndex)
                                        setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                      }}
                                      className="self-start sm:self-auto px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                    >
                                      删除
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {/* 图片上传 (4:3比例) */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">服务图片（4:3比例，超出自动剪切）</label>
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                        {service.image && (
                                          <div className="flex-shrink-0 w-24 h-18 bg-gray-100 rounded border border-gray-300 overflow-hidden">
                                            <img
                                              src={getImageUrl(service.image)}
                                              alt="Service"
                                              className="w-full h-full object-cover"
                                              style={{ aspectRatio: '4/3' }}
                                            />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                          {!service.image && (
                                            <>
                                              <input
                                                type="file"
                                                id={`serviceImage_${catIndex}_${svcIndex}`}
                                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0]
                                                  if (file) {
                                                    handleImageUpload(file, e.target.id)
                                                  }
                                                }}
                                                className="hidden"
                                              />
                                              <label
                                                htmlFor={`serviceImage_${catIndex}_${svcIndex}`}
                                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                              >
                                                选择图片
                                              </label>
                                            </>
                                          )}
                                          <input
                                            type="text"
                                            value={service.image || ''}
                                            onChange={(e) => {
                                              const newCategories = [...promoSettings.serviceCategories]
                                              newCategories[catIndex].services[svcIndex].image = e.target.value
                                              setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                            }}
                                            className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                                            placeholder="或输入图片URL"
                                          />
                                        </div>
                                        {service.image && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newCategories = [...promoSettings.serviceCategories]
                                              newCategories[catIndex].services[svcIndex].image = ''
                                              setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                            }}
                                            className="self-start sm:self-auto px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 whitespace-nowrap"
                                          >
                                            删除
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                                    </div>

                                    {/* 服务标题 */}
                                    <input
                                      type="text"
                                      value={service.title || ''}
                                      onChange={(e) => {
                                        const newCategories = [...promoSettings.serviceCategories]
                                        newCategories[catIndex].services[svcIndex].title = e.target.value
                                        setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                                      placeholder="服务标题（中文）"
                                    />
                                    {promoSettings.bilingualEnabled && (
                                      <input
                                        type="text"
                                        value={service.titleEn || ''}
                                        onChange={(e) => {
                                          const newCategories = [...promoSettings.serviceCategories]
                                          newCategories[catIndex].services[svcIndex].titleEn = e.target.value
                                          setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                        }}
                                        className="w-full px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                        placeholder="服务标题（English）"
                                      />
                                    )}

                                    {/* 服务描述 */}
                                    <textarea
                                      value={service.description || ''}
                                      onChange={(e) => {
                                        const newCategories = [...promoSettings.serviceCategories]
                                        newCategories[catIndex].services[svcIndex].description = e.target.value
                                        setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                                      rows={2}
                                      placeholder="服务描述（中文）"
                                    />
                                    {promoSettings.bilingualEnabled && (
                                      <textarea
                                        value={service.descriptionEn || ''}
                                        onChange={(e) => {
                                          const newCategories = [...promoSettings.serviceCategories]
                                          newCategories[catIndex].services[svcIndex].descriptionEn = e.target.value
                                          setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                        }}
                                        className="w-full px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                        rows={2}
                                        placeholder="服务描述（English）"
                                      />
                                    )}

                                    {/* 跳转URL */}
                                    <input
                                      type="text"
                                      value={service.url || ''}
                                      onChange={(e) => {
                                        const newCategories = [...promoSettings.serviceCategories]
                                        newCategories[catIndex].services[svcIndex].url = e.target.value
                                        setPromoSettings({ ...promoSettings, serviceCategories: newCategories })
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                                      placeholder="跳转URL（可选，支持相对路径和绝对路径）"
                                    />
                                  </div>
                                </div>
                              ))}
                              {(!category.services || category.services.length === 0) && (
                                <p className="text-xs text-gray-400 text-center py-2">暂无服务项，点击上方按钮添加</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!promoSettings.serviceCategories || promoSettings.serviceCategories.length === 0) && (
                        <p className="text-sm text-gray-400 text-center py-4">暂无服务分类，点击上方按钮添加</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 团队成员 */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义团队成员信息。
                    </p>
                  </div>

                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">团队区域设置</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section 标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.teamSectionLabel || 'Section'}
                          onChange={(e) => setPromoSettings({ ...promoSettings, teamSectionLabel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Section 标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.teamSectionLabelEn || 'Section'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, teamSectionLabelEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Section"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标签（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.teamTag || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, teamTag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="团队成员"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.teamTagEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, teamTagEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="TEAM MEMBERS"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.teamTitle || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, teamTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="核心成员展示"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.teamTitleEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, teamTitleEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Core Team"
                            />
                          </>
                        )}
                      </div>
                      {/* 团队成员列表 - 可视化动态增删 */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="block text-xs font-medium text-gray-700">团队成员列表</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (promoSettings.teamMembers?.length >= 20) {
                                setToast({ show: true, type: 'error', message: '最多只能添加20个团队成员' })
                                return
                              }
                              setPromoSettings({
                                ...promoSettings,
                                teamMembers: [...(promoSettings.teamMembers || []), { avatar: '', name: '', nameEn: '', role: '', roleEn: '' }]
                              })
                            }}
                            className="self-start sm:self-auto px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            + 添加成员
                          </button>
                        </div>
                        {!!promoSettings.teamMembers?.length && (
                          <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                            {promoSettings.teamMembers.map((member, index) => (
                              <div key={index} className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <h4 className="text-xs font-semibold text-gray-800">成员 {index + 1}</h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newMembers = promoSettings.teamMembers.filter((_, i) => i !== index)
                                      setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                    }}
                                    className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                                  >
                                    删除
                                  </button>
                                </div>
                              <div className="space-y-2">
                                {/* 头像图片上传（圆形剪切） */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">头像图片（可选，自动剪切为圆形）</label>
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                    {member.avatarImage && (
                                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-full border border-gray-300 overflow-hidden">
                                        <img
                                          src={getImageUrl(member.avatarImage)}
                                          alt="Avatar"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                      {!member.avatarImage && (
                                        <>
                                          <input
                                            type="file"
                                            id={`memberAvatar_${index}`}
                                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleImageUpload(file, e.target.id)
                                              }
                                            }}
                                            className="hidden"
                                          />
                                          <label
                                            htmlFor={`memberAvatar_${index}`}
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                          >
                                            选择图片
                                          </label>
                                        </>
                                      )}
                                      <input
                                        type="text"
                                        value={member.avatarImage || ''}
                                        onChange={(e) => {
                                          const newMembers = [...promoSettings.teamMembers]
                                          newMembers[index].avatarImage = e.target.value
                                          setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                        }}
                                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="或输入图片URL"
                                      />
                                    </div>
                                    {member.avatarImage && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newMembers = [...promoSettings.teamMembers]
                                          newMembers[index].avatarImage = ''
                                          setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                        }}
                                        className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 whitespace-nowrap"
                                      >
                                        删除
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico（图片会自动剪切为圆形）</p>
                                </div>

                                {/* 头像缩写（如果没有上传图片则显示） */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">头像缩写（如未上传图片则显示，如：AC）</label>
                                  <input
                                    type="text"
                                    value={member.avatar || ''}
                                    onChange={(e) => {
                                      const newMembers = [...promoSettings.teamMembers]
                                      newMembers[index].avatar = e.target.value
                                      setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="头像缩写（如：AC）"
                                    maxLength={3}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={member.name || ''}
                                    onChange={(e) => {
                                      const newMembers = [...promoSettings.teamMembers]
                                      newMembers[index].name = e.target.value
                                      setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="姓名（中文）"
                                  />
                                  <input
                                    type="text"
                                    value={member.role || ''}
                                    onChange={(e) => {
                                      const newMembers = [...promoSettings.teamMembers]
                                      newMembers[index].role = e.target.value
                                      setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="职位（中文）"
                                  />
                                </div>
                                {promoSettings.bilingualEnabled && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={member.nameEn || ''}
                                      onChange={(e) => {
                                        const newMembers = [...promoSettings.teamMembers]
                                        newMembers[index].nameEn = e.target.value
                                        setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                      }}
                                      className="px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                      placeholder="姓名（English）"
                                    />
                                    <input
                                      type="text"
                                      value={member.roleEn || ''}
                                      onChange={(e) => {
                                        const newMembers = [...promoSettings.teamMembers]
                                        newMembers[index].roleEn = e.target.value
                                        setPromoSettings({ ...promoSettings, teamMembers: newMembers })
                                      }}
                                      className="px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                      placeholder="职位（English）"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 合作伙伴 */}
              {activeTab === 'partners' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义合作伙伴区域，最多可添加50个合作伙伴图片。
                    </p>
                  </div>

                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">合作伙伴区域设置</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section 标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.partnersSectionLabel || 'Section'}
                          onChange={(e) => setPromoSettings({ ...promoSettings, partnersSectionLabel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Section 标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.partnersSectionLabelEn || 'Section'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, partnersSectionLabelEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Section"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标签（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.partnersTag || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, partnersTag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="技术支持"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.partnersTagEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, partnersTagEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="PARTNERS"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">描述（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.partnersDescription || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, partnersDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="感谢以下所有平台对开发本程序的大力支持！"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">描述（English）</label>
                            <input
                              type="text"
                              value={promoSettings.partnersDescriptionEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, partnersDescriptionEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Thanks to all platforms for their strong support!"
                            />
                          </>
                        )}
                      </div>

                      {/* 合作伙伴列表 */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="block text-xs font-medium text-gray-700">合作伙伴列表（最多50个）</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (promoSettings.partners?.length >= 50) {
                                setToast({ show: true, type: 'error', message: '最多只能添加50个合作伙伴' })
                                return
                              }
                              setPromoSettings({
                                ...promoSettings,
                                partners: [...(promoSettings.partners || []), { image: '', name: '', nameEn: '' }]
                              })
                            }}
                            className="self-start sm:self-auto px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            + 添加合作伙伴
                          </button>
                        </div>
                        {!!promoSettings.partners?.length && (
                          <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 max-h-72 sm:max-h-96 overflow-y-auto">
                            {promoSettings.partners.map((partner, index) => (
                              <div key={index} className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <h4 className="text-xs font-semibold text-gray-800">合作伙伴 {index + 1}</h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPartners = promoSettings.partners.filter((_, i) => i !== index)
                                      setPromoSettings({ ...promoSettings, partners: newPartners })
                                    }}
                                    className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                                  >
                                    删除
                                  </button>
                                </div>
                              <div className="space-y-2">
                                {/* 合作伙伴图片上传 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">合作伙伴图片（支持 svg、jpeg、ico、jpg、gif、png）</label>
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                    {partner.image && (
                                      <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden">
                                        <img
                                          src={getImageUrl(partner.image)}
                                          alt={partner.name || 'Partner'}
                                          className="max-w-full max-h-full object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                      {!partner.image && (
                                        <>
                                          <input
                                            type="file"
                                            id={`partnerImage_${index}`}
                                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleImageUpload(file, e.target.id)
                                              }
                                            }}
                                            className="hidden"
                                          />
                                          <label
                                            htmlFor={`partnerImage_${index}`}
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                          >
                                            选择图片
                                          </label>
                                        </>
                                      )}
                                      <input
                                        type="text"
                                        value={partner.image || ''}
                                        onChange={(e) => {
                                          const newPartners = [...promoSettings.partners]
                                          newPartners[index].image = e.target.value
                                          setPromoSettings({ ...promoSettings, partners: newPartners })
                                        }}
                                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="或输入图片URL"
                                      />
                                    </div>
                                    {partner.image && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newPartners = [...promoSettings.partners]
                                          newPartners[index].image = ''
                                          setPromoSettings({ ...promoSettings, partners: newPartners })
                                        }}
                                        className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 whitespace-nowrap"
                                      >
                                        删除
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={partner.name || ''}
                                    onChange={(e) => {
                                      const newPartners = [...promoSettings.partners]
                                      newPartners[index].name = e.target.value
                                      setPromoSettings({ ...promoSettings, partners: newPartners })
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="名称（中文）"
                                  />
                                  {promoSettings.bilingualEnabled && (
                                    <input
                                      type="text"
                                      value={partner.nameEn || ''}
                                      onChange={(e) => {
                                        const newPartners = [...promoSettings.partners]
                                        newPartners[index].nameEn = e.target.value
                                        setPromoSettings({ ...promoSettings, partners: newPartners })
                                      }}
                                      className="px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                      placeholder="名称（English）"
                                    />
                                  )}
                                </div>
                              </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 联系方式&底部 */}
              {activeTab === 'contact-footer' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义联系方式和底部信息。
                    </p>
                  </div>

                  {/* 联系方式 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">联系方式</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section 标签（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.contactSectionLabel || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, contactSectionLabel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">Section 标签（English）</label>
                            <input
                              type="text"
                              value={promoSettings.contactSectionLabelEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, contactSectionLabelEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Section"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">标题（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.contactTitle || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, contactTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="通过以下方式与我们沟通"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">标题（English）</label>
                            <input
                              type="text"
                              value={promoSettings.contactTitleEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, contactTitleEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Get in Touch"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">描述（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.contactDescription || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, contactDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="也可以通过右侧留言区域向我们表达你的想法！"
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">描述（English）</label>
                            <input
                              type="text"
                              value={promoSettings.contactDescriptionEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, contactDescriptionEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="You can also express your thoughts through the message area!"
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="block text-xs font-medium text-gray-700">联系方式（最多5个）</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (promoSettings.contactMethods?.length >= 5) {
                                setToast({ show: true, type: 'error', message: '最多只能添加5个联系方式' })
                                return
                              }
                              setPromoSettings({
                                ...promoSettings,
                                contactMethods: [...(promoSettings.contactMethods || []), { icon: '', value: '' }]
                              })
                            }}
                            className="self-start sm:self-auto px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            + 添加
                          </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-blue-800">
                            <span className="font-semibold">图标说明：</span>支持上传图片或填写图片URL，留空则显示默认邮件图标
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                          {promoSettings.contactMethods?.map((method, index) => (
                            <div key={index} className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <h4 className="text-xs font-semibold text-gray-800">联系方式 {index + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newMethods = promoSettings.contactMethods.filter((_, i) => i !== index)
                                    setPromoSettings({ ...promoSettings, contactMethods: newMethods })
                                  }}
                                  className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                                >
                                  删除
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">图标（上传图片或填写URL，可选）</label>
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
                                    {method.icon && !method.icon.startsWith('<') && (
                                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden">
                                        <img
                                          src={getImageUrl(method.icon)}
                                          alt="Icon"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                                      {!method.icon && (
                                        <>
                                          <input
                                            type="file"
                                            id={`contactIcon_${index}`}
                                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleImageUpload(file, e.target.id)
                                              }
                                            }}
                                            className="hidden"
                                          />
                                          <label
                                            htmlFor={`contactIcon_${index}`}
                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 cursor-pointer whitespace-nowrap"
                                          >
                                            上传图片
                                          </label>
                                        </>
                                      )}
                                      <input
                                        type="text"
                                        value={method.icon?.startsWith('<') ? '' : (method.icon || '')}
                                        onChange={(e) => {
                                          const newMethods = [...promoSettings.contactMethods]
                                          newMethods[index].icon = e.target.value
                                          setPromoSettings({ ...promoSettings, contactMethods: newMethods })
                                        }}
                                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="或输入图片URL"
                                        disabled={!!(method.icon && method.icon.startsWith('<'))}
                                      />
                                      {method.icon && !method.icon.startsWith('<') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newMethods = [...promoSettings.contactMethods]
                                            newMethods[index].icon = ''
                                            setPromoSettings({ ...promoSettings, contactMethods: newMethods })
                                          }}
                                          className="self-start sm:self-auto px-3 py-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 whitespace-nowrap"
                                        >
                                          删除
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">支持格式：jpg、jpeg、png、gif、webp、svg、ico</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">联系方式</label>
                                  <input
                                    type="text"
                                    value={method.value || ''}
                                    onChange={(e) => {
                                      const newMethods = [...promoSettings.contactMethods]
                                      newMethods[index].value = e.target.value
                                      setPromoSettings({ ...promoSettings, contactMethods: newMethods })
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="xxx@email.com"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!promoSettings.contactMethods || promoSettings.contactMethods.length === 0) && (
                            <p className="text-xs text-gray-500 text-center p-4">暂无联系方式，点击上方按钮添加</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部信息 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">底部信息</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">版权信息（中文）</label>
                        <input
                          type="text"
                          value={promoSettings.footerCopyright || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, footerCopyright: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="© 2025 Xs-Blog. All rights reserved."
                        />
                        {promoSettings.bilingualEnabled && (
                          <>
                            <label className="block text-xs font-medium text-purple-700 mb-1">版权信息（English）</label>
                            <input
                              type="text"
                              value={promoSettings.footerCopyrightEn || ''}
                              onChange={(e) => setPromoSettings({ ...promoSettings, footerCopyrightEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="© 2025 Xs-Blog. All rights reserved."
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UI文本配置 */}
              {activeTab === 'ui-texts' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">说明：</span>在这里可以自定义页面上的各种 UI 文本，包括按钮文本、表单提示、状态消息等。
                    </p>
                  </div>

                  {/* 按钮文本 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">按钮文本</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">"了解更多" 按钮（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.learnMoreButton || '了解更多'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, learnMoreButton: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="了解更多"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">"了解更多" 按钮（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.learnMoreButtonEn || 'Learn More'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, learnMoreButtonEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Learn More"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">"开始对话" 按钮（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.contactButton || '开始对话'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, contactButton: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="开始对话"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">"开始对话" 按钮（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.contactButtonEn || 'Contact Us'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, contactButtonEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Contact Us"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">"开始对话" 按钮跳转URL（支持相对路径和绝对路径）</label>
                        <input
                          type="text"
                          value={promoSettings.contactButtonUrl || ''}
                          onChange={(e) => setPromoSettings({ ...promoSettings, contactButtonUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="留空则滚动到联系表单，或输入 /contact 或 https://example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 表单文本 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">表单文本</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">姓名输入框占位符（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.formName || '您的姓名'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formName: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="您的姓名"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">姓名输入框占位符（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.formNameEn || 'Name'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formNameEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Name"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">联系方式输入框占位符（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.formContact || '联系方式'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formContact: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="联系方式"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">联系方式输入框占位符（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.formContactEn || 'Contact'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formContactEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Contact"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">留言内容输入框占位符（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.formContent || '项目描述或留言...'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formContent: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="项目描述或留言..."
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">留言内容输入框占位符（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.formContentEn || 'Message...'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formContentEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Message..."
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">提交按钮文本（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.formSubmit || '发送留言'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formSubmit: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="发送留言"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">提交按钮文本（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.formSubmitEn || 'Send Message'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formSubmitEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Send Message"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">提交中文本（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.uiTexts?.formSending || '提交中...'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formSending: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="提交中..."
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">提交中文本（English）</label>
                            <input
                              type="text"
                              value={promoSettings.uiTexts?.formSendingEn || 'Sending...'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, uiTexts: { ...promoSettings.uiTexts, formSendingEn: e.target.value } })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Sending..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Features 区域文本 */}
                  <div className="rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Features 区域文本</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">"了解详情" 文本（中文）</label>
                          <input
                            type="text"
                            value={promoSettings.featuresLearnMoreText || '了解详情'}
                            onChange={(e) => setPromoSettings({ ...promoSettings, featuresLearnMoreText: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="了解详情"
                          />
                        </div>
                        {promoSettings.bilingualEnabled && (
                          <div>
                            <label className="block text-xs font-medium text-purple-700 mb-1">"了解详情" 文本（English）</label>
                            <input
                              type="text"
                              value={promoSettings.featuresLearnMoreTextEn || 'Learn more'}
                              onChange={(e) => setPromoSettings({ ...promoSettings, featuresLearnMoreTextEn: e.target.value })}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                              placeholder="Learn more"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 保存按钮 */}
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
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
        </div>
      </div>
    </>
  )
}
