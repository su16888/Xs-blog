'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  getAdminSettings,
  updateAdminSettings,
  changePassword,
  changeUsername,
  uploadAdminBackgroundImage,
  deleteAdminBackgroundImage,
  uploadAdminCustomFont,
  deleteAdminCustomFont,
  getS3Config,
  saveS3Config,
  testS3Connection,
  getAdminPageTexts,
  updateAdminPageTexts,
  getDocsOrder,
  saveDocsOrder
} from '@/lib/api'
import { getAdminRoute } from '@/lib/adminConfig'
import { safeFetch } from '@/lib/utils'
import {
  Setting,
  SettingsState,
  NavLink,
  UsernameForm,
  PasswordForm,
  ToastState,
  S3Config,
  PageTexts,
  HomeContentSections,
  defaultSettings,
  defaultPageTexts,
  defaultHomeContentSections,
  defaultS3Config
} from '../types'

export function useSettings() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, refreshUser } = useAuth()

  // 添加 ref 防止重复加载
  const hasLoadedRef = useRef(false)

  // 基础状态
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [navLinks, setNavLinks] = useState<NavLink[]>([])
  const [uploadingNavIcon, setUploadingNavIcon] = useState<number | null>(null)

  // 账户表单状态
  const [usernameForm, setUsernameForm] = useState<UsernameForm>({
    currentPassword: '',
    newUsername: ''
  })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingUsername, setChangingUsername] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // 上传状态
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [deletingBackground, setDeletingBackground] = useState(false)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [deletingFont, setDeletingFont] = useState(false)

  // Toast状态
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    message: ''
  })

  // 文本设置状态
  const [pageTexts, setPageTexts] = useState<PageTexts>(defaultPageTexts)
  const [homeContentSections, setHomeContentSections] = useState<HomeContentSections>(defaultHomeContentSections)
  const [savingTextSettings, setSavingTextSettings] = useState(false)

  // S3配置状态
  const [s3Config, setS3Config] = useState<S3Config>(defaultS3Config)
  const [loadingS3Config, setLoadingS3Config] = useState(false)
  const [savingS3Config, setSavingS3Config] = useState(false)
  const [testingS3, setTestingS3] = useState(false)

  // 文档排序状态
  const [docsConfig, setDocsConfig] = useState<{ name: string; showInList: boolean; customSlug?: string }[]>([])
  const [loadingDocsOrder, setLoadingDocsOrder] = useState(false)
  const [savingDocsOrder, setSavingDocsOrder] = useState(false)

  // 显示Toast
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message })
  }, [])

  // 隐藏Toast
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }))
  }, [])

  // 加载设置
  const loadSettings = useCallback(async () => {
    // 防止重复加载
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true

    try {
      // 并行加载系统设置和页面文本配置
      const [settingsResponse, pageTextsResponse] = await Promise.all([
        getAdminSettings(),
        getAdminPageTexts()
      ])

      if (settingsResponse.success && settingsResponse.data) {
        const settingsObj: any = {}
        settingsResponse.data.forEach((setting: Setting) => {
          settingsObj[setting.key] = setting.value
        })

        // 同步主题设置
        const savedTheme = settingsObj.themeColor || 'white'
        setTheme(savedTheme as any)

        setSettings({
          siteTitle: settingsObj.siteTitle || '',
          siteSubtitle: settingsObj.siteSubtitle || '',
          siteDescription: settingsObj.siteDescription || '',
          siteKeywords: settingsObj.siteKeywords || '',
          themeColor: savedTheme,
          themeType: settingsObj.themeType || 'default',
          footerCopyright: settingsObj.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
          backgroundImage: settingsObj.backgroundImage || '',
          backgroundOpacity: settingsObj.backgroundOpacity || '0.5',
          showSiteNav: settingsObj.showSiteNav || 'true',
          showNotes: settingsObj.showNotes || 'true',
          showSocialLinks: settingsObj.showSocialLinks || 'true',
          defaultDisplaySection: settingsObj.defaultDisplaySection || 'notes',
          customFont: settingsObj.customFont || '',
          customFontName: settingsObj.customFontName || '',
          todoReminderCheckInterval: settingsObj.todoReminderCheckInterval || '5',
          showNoteTags: settingsObj.showNoteTags || 'true',
          showNoteCategories: settingsObj.showNoteCategories || 'true',
          messageIpLimitDays: settingsObj.messageIpLimitDays || '1',
          noteLayoutColumns: settingsObj.noteLayoutColumns || '1',
          avatarShape: settingsObj.avatarShape || 'circle',
          showNoteCover: settingsObj.showNoteCover || 'true',
          defaultNoteCover: settingsObj.defaultNoteCover || '',
          showNavigationRecommended: settingsObj.showNavigationRecommended || 'true',
          blogLogo: settingsObj.blogLogo || '',
          blogLogoText: settingsObj.blogLogoText || '',
          blogNavLinks: settingsObj.blogNavLinks || '[]',
          showTopNavbar: settingsObj.showTopNavbar || 'true',
          showWapSidebar: settingsObj.showWapSidebar || 'true',
          enableAvatarThemeSwitch: settingsObj.enableAvatarThemeSwitch || 'false',
          promoThemeEnabled: settingsObj.promoThemeEnabled || 'false',
          socialFeedThemeEnabled: settingsObj.socialFeedThemeEnabled || 'false',
          docsThemeEnabled: settingsObj.docsThemeEnabled || 'false',
          enableUserPage: settingsObj.enableUserPage || 'true',
          enableBlogPage: settingsObj.enableBlogPage || 'true',
          enablePromoPage: settingsObj.enablePromoPage || 'true',
          enableDocsPage: settingsObj.enableDocsPage || 'true',
          allowSEO: settingsObj.allowSEO || 'false',
          enableSocialFeedPage: settingsObj.enableSocialFeedPage || 'true',
          blogAnnouncements: settingsObj.blogAnnouncements || '[]',
          blogAnnouncementEnabled: settingsObj.blogAnnouncementEnabled || 'false',
          hideBlogProfileCard: settingsObj.hideBlogProfileCard || 'false',
          customScript: settingsObj.customScript || '',
          enableMessageEmailNotification: settingsObj.enableMessageEmailNotification || 'false'
        })

        // 从新的 page_texts 表加载页面文本配置
        if (pageTextsResponse.success && pageTextsResponse.data) {
          const apiPageTexts = pageTextsResponse.data
          // 深度合并：始终以 defaultPageTexts 为基础，确保所有字段都存在
          const merged = { ...defaultPageTexts }
          for (const key of Object.keys(defaultPageTexts) as Array<keyof PageTexts>) {
            if (apiPageTexts[key]) {
              merged[key] = { ...defaultPageTexts[key], ...apiPageTexts[key] }
            }
          }
          setPageTexts(merged)
        }

        if (settingsObj.homeContentSections) {
          try {
            const parsedHomeContent = JSON.parse(settingsObj.homeContentSections)
            // 始终以 defaultHomeContentSections 为基础合并，确保新增字段不丢失
            setHomeContentSections({ ...defaultHomeContentSections, ...parsedHomeContent })
          } catch (error) {
            console.error('Failed to parse homeContentSections:', error)
          }
        }

        try {
          const links = JSON.parse(settingsObj.blogNavLinks || '[]')
          if (!Array.isArray(links) || links.length === 0) {
            const defaultLinks = [
              { name: '首页', url: '/' },
              { name: '全部笔记', url: '/notes' },
              { name: '导航列表', url: '/navigation' }
            ]
            setNavLinks(defaultLinks)
          } else {
            setNavLinks(links)
          }
        } catch {
          const defaultLinks = [
            { name: '首页', url: '/' },
            { name: '全部笔记', url: '/notes' },
            { name: '导航列表', url: '/navigation' }
          ]
          setNavLinks(defaultLinks)
        }
      }
    } catch (error) {
      console.error('加载系统设置失败:', error)
    } finally {
      setLoading(false)
    }
  }, [setTheme])

  // 认证检查 - 只在组件首次挂载时加载一次
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadSettings()
    }
  }, [loadSettings])

  // 处理设置变更
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked ? 'true' : 'false' : target.value

    setSettings(prev => {
      const updated = { ...prev, [target.name]: value }

      // 当关闭顶部导航栏时，自动关闭WAP侧边栏
      if (target.name === 'showTopNavbar' && value === 'false') {
        updated.showWapSidebar = 'false'
      }

      // 三个主题模式互斥：官网、朋友圈、文档
      if (target.name === 'promoThemeEnabled' && value === 'true') {
        updated.socialFeedThemeEnabled = 'false'
        updated.docsThemeEnabled = 'false'
      }
      if (target.name === 'socialFeedThemeEnabled' && value === 'true') {
        updated.promoThemeEnabled = 'false'
        updated.docsThemeEnabled = 'false'
      }
      if (target.name === 'docsThemeEnabled' && value === 'true') {
        updated.promoThemeEnabled = 'false'
        updated.socialFeedThemeEnabled = 'false'
      }

      return updated
    })
  }, [])

  // 处理用户名表单变更
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }, [])

  // 处理密码表单变更
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }, [])

  // 添加导航链接
  const handleAddNavLink = useCallback(() => {
    if (navLinks.length >= 8) {
      showToast('error', '最多只能添加8个导航链接')
      return
    }
    setNavLinks(prev => [...prev, { name: '', url: '' }])
  }, [navLinks.length, showToast])

  // 修改导航链接
  const handleNavLinkChange = useCallback((index: number, field: 'name' | 'url', value: string) => {
    setNavLinks(prev => {
      const newLinks = [...prev]
      newLinks[index][field] = value
      setSettings(s => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
      return newLinks
    })
  }, [])

  // 删除导航链接
  const handleRemoveNavLink = useCallback((index: number) => {
    setNavLinks(prev => {
      const newLinks = prev.filter((_, i) => i !== index)
      setSettings(s => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
      return newLinks
    })
  }, [])

  // 移动导航链接
  const handleMoveNavLink = useCallback((index: number, direction: 'up' | 'down') => {
    setNavLinks(prev => {
      const newLinks = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= newLinks.length) return prev

      ;[newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]]
      setSettings(s => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
      return newLinks
    })
  }, [])

  // 上传导航图标
  const handleNavIconUpload = useCallback(async (index: number, file: File) => {
    setUploadingNavIcon(index)
    const formData = new FormData()
    formData.append('icon', file)
    try {
      const response = await safeFetch('/api/admin/blog-theme/nav-icon/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const data = await response.json()
      if (data.success) {
        setNavLinks(prev => {
          const newLinks = [...prev]
          newLinks[index].icon = data.data.url
          setSettings(s => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
          return newLinks
        })
        showToast('success', '图标上传成功')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '图标上传失败'
      showToast('error', message)
    } finally {
      setUploadingNavIcon(null)
    }
  }, [showToast])

  // 删除导航图标
  const handleRemoveNavIcon = useCallback((index: number) => {
    setNavLinks(prev => {
      const newLinks = [...prev]
      delete newLinks[index].icon
      setSettings(s => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
      return newLinks
    })
  }, [])

  // 提交用户名修改
  const handleUsernameSubmit = useCallback(async () => {
    if (usernameForm.newUsername.length < 3) {
      showToast('error', '新用户名长度至少为3位')
      return
    }

    setChangingUsername(true)

    try {
      const response = await changeUsername(usernameForm.currentPassword, usernameForm.newUsername)
      if (response.success) {
        showToast('success', '用户名修改成功')
        setUsernameForm({ currentPassword: '', newUsername: '' })
        await refreshUser()
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '用户名修改失败')
    } finally {
      setChangingUsername(false)
    }
  }, [usernameForm, showToast, refreshUser])

  // 提交密码修改
  const handlePasswordSubmit = useCallback(async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', '新密码和确认密码不一致')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('error', '新密码长度至少为6位')
      return
    }

    setChangingPassword(true)

    try {
      const response = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      if (response.success) {
        showToast('success', '密码修改成功')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '密码修改失败')
    } finally {
      setChangingPassword(false)
    }
  }, [passwordForm, showToast])

  // 上传背景图片
  const handleBackgroundUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBackground(true)

    try {
      const response = await uploadAdminBackgroundImage(file)
      if (response.success) {
        showToast('success', '背景图片上传成功')
        setSettings(prev => ({ ...prev, backgroundImage: response.data.url }))
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '背景图片上传失败')
    } finally {
      setUploadingBackground(false)
    }
  }, [showToast])

  // 删除背景图片
  const handleBackgroundDelete = useCallback(async () => {
    setDeletingBackground(true)

    try {
      const response = await deleteAdminBackgroundImage()
      if (response.success) {
        showToast('success', '背景图片删除成功')
        setSettings(prev => ({ ...prev, backgroundImage: '' }))
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '背景图片删除失败')
    } finally {
      setDeletingBackground(false)
    }
  }, [showToast])

  // 上传字体
  const handleFontUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(fileExtension)) {
      showToast('error', '不支持的文件类型，请上传 ttf、otf、woff、woff2 格式的字体文件')
      e.target.value = ''
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      showToast('error', `字体文件大小不能超过 10MB，当前文件大小为 ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      e.target.value = ''
      return
    }

    setUploadingFont(true)

    try {
      const response = await uploadAdminCustomFont(file)
      if (response.success) {
        showToast('success', '字体上传成功，即将刷新页面应用新字体...')
        setSettings(prev => ({
          ...prev,
          customFont: response.data.url,
          customFontName: response.data.originalName
        }))
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error: any) {
      let errorMessage = '字体上传失败'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      showToast('error', errorMessage)
      e.target.value = ''
    } finally {
      setUploadingFont(false)
    }
  }, [showToast])

  // 删除字体
  const handleFontDelete = useCallback(async () => {
    if (!confirm('确定要删除自定义字体吗？删除后将恢复默认字体。')) {
      return
    }

    setDeletingFont(true)

    try {
      const response = await deleteAdminCustomFont()
      if (response.success) {
        showToast('success', '字体删除成功，即将刷新页面恢复默认字体...')
        setSettings(prev => ({ ...prev, customFont: '', customFontName: '' }))
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error: any) {
      let errorMessage = '字体删除失败'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      showToast('error', errorMessage)
    } finally {
      setDeletingFont(false)
    }
  }, [showToast])

  // 保存设置
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      setTheme(settings.themeColor as any)

      const numberSettings = ['todoReminderCheckInterval', 'messageIpLimitDays', 'backgroundOpacity']

      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        type: numberSettings.includes(key) ? 'number' : 'string'
      }))

      const response = await updateAdminSettings(settingsArray)
      if (response.success) {
        // 清除前端设置缓存，确保前台页面获取最新设置
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('xs_settings_cache')
            localStorage.removeItem('xs_settings_expire')
          } catch (e) {}
        }
        showToast('success', '网站设置保存成功')
      } else {
        showToast('error', response.message || '保存失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }, [settings, setTheme, showToast])

  // 保存文本设置
  const handleSaveTextSettings = useCallback(async () => {
    // 验证：开启封面图时必须设置默认封面图
    if (settings.showNoteCover === 'true' && !settings.defaultNoteCover?.trim()) {
      showToast('error', '封面图开启的情况下必须上传默认封面图！')
      return
    }

    setSavingTextSettings(true)
    try {
      // 并行保存页面文本配置和其他设置
      const settingsArray = [
        { key: 'homeContentSections', value: JSON.stringify(homeContentSections), type: 'string' },
        { key: 'showNoteTags', value: settings.showNoteTags, type: 'string' },
        { key: 'showNoteCategories', value: settings.showNoteCategories, type: 'string' },
        { key: 'showNoteCover', value: settings.showNoteCover, type: 'string' },
        { key: 'defaultNoteCover', value: settings.defaultNoteCover, type: 'string' },
        { key: 'noteLayoutColumns', value: settings.noteLayoutColumns, type: 'string' }
      ]

      // 并行保存页面文本配置到 page_texts 表和其他设置
      const [pageTextsResponse, settingsResponse] = await Promise.all([
        updateAdminPageTexts(pageTexts),
        updateAdminSettings(settingsArray)
      ])

      if (pageTextsResponse.success && settingsResponse.success) {
        showToast('success', '文本设置保存成功！')
      } else {
        showToast('error', pageTextsResponse.message || settingsResponse.message || '保存失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '保存失败')
    } finally {
      setSavingTextSettings(false)
    }
  }, [pageTexts, homeContentSections, settings, showToast])

  // 加载S3配置
  const loadS3Config = useCallback(async () => {
    setLoadingS3Config(true)
    try {
      const response = await getS3Config()
      if (response.success && response.data) {
        setS3Config({
          storageType: response.data.storageType || 'local',
          endpoint: response.data.endpoint || '',
          region: response.data.region || 'us-east-1',
          bucket: response.data.bucket || '',
          accessKeyId: response.data.accessKeyId || '',
          secretAccessKey: response.data.secretAccessKey || '',
          customDomain: response.data.customDomain || '',
          pathStyle: response.data.pathStyle || false
        })
      }
    } catch (error) {
      console.error('加载S3配置失败:', error)
    } finally {
      setLoadingS3Config(false)
    }
  }, [])

  // 保存S3配置
  const handleSaveS3Config = useCallback(async () => {
    setSavingS3Config(true)
    try {
      const response = await saveS3Config(s3Config)
      if (response.success) {
        showToast('success', 'S3配置保存成功')
      } else {
        showToast('error', response.message || '保存失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '保存失败')
    } finally {
      setSavingS3Config(false)
    }
  }, [s3Config, showToast])

  // 测试S3连接
  const handleTestS3Connection = useCallback(async () => {
    if (!s3Config.endpoint || !s3Config.bucket || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
      showToast('error', '请填写完整的S3配置信息')
      return
    }

    setTestingS3(true)
    try {
      const response = await testS3Connection({
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        bucket: s3Config.bucket,
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        pathStyle: s3Config.pathStyle
      })
      if (response.success) {
        showToast('success', 'S3连接测试成功！')
      } else {
        showToast('error', response.message || '连接测试失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '连接测试失败')
    } finally {
      setTestingS3(false)
    }
  }, [s3Config, showToast])

  // 加载文档排序配置
  const loadDocsOrder = useCallback(async () => {
    setLoadingDocsOrder(true)
    try {
      const response = await getDocsOrder()
      if (response.success && response.data) {
        // 使用新格式的 docsConfig
        setDocsConfig(response.data.docsConfig || [])
      }
    } catch (error) {
      console.error('加载文档排序配置失败:', error)
    } finally {
      setLoadingDocsOrder(false)
    }
  }, [])

  // 保存文档排序配置
  const handleSaveDocsOrder = useCallback(async () => {
    setSavingDocsOrder(true)
    try {
      const response = await saveDocsOrder(docsConfig)
      if (response.success) {
        showToast('success', '文档排序保存成功')
      } else {
        showToast('error', response.message || '保存失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '保存失败')
    } finally {
      setSavingDocsOrder(false)
    }
  }, [docsConfig, showToast])

  // 移动文档顺序
  const handleMoveDoc = useCallback((index: number, direction: 'up' | 'down') => {
    setDocsConfig(prev => {
      const newConfig = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= newConfig.length) return prev

      ;[newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]]
      return newConfig
    })
  }, [])

  // 切换文档显示状态
  const handleToggleDocVisibility = useCallback((index: number) => {
    setDocsConfig(prev => {
      const newConfig = [...prev]
      newConfig[index] = { ...newConfig[index], showInList: !newConfig[index].showInList }
      return newConfig
    })
  }, [])

  return {
    // 状态
    loading,
    saving,
    settings,
    setSettings,
    navLinks,
    setNavLinks,
    uploadingNavIcon,
    usernameForm,
    passwordForm,
    changingUsername,
    changingPassword,
    uploadingBackground,
    deletingBackground,
    uploadingFont,
    deletingFont,
    toast,
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
    docsConfig,
    setDocsConfig,
    loadingDocsOrder,
    savingDocsOrder,
    user,

    // 方法
    showToast,
    hideToast,
    handleChange,
    handleUsernameChange,
    handlePasswordChange,
    handleAddNavLink,
    handleNavLinkChange,
    handleRemoveNavLink,
    handleMoveNavLink,
    handleNavIconUpload,
    handleRemoveNavIcon,
    handleUsernameSubmit,
    handlePasswordSubmit,
    handleBackgroundUpload,
    handleBackgroundDelete,
    handleFontUpload,
    handleFontDelete,
    handleSubmit,
    handleSaveTextSettings,
    loadS3Config,
    handleSaveS3Config,
    handleTestS3Connection,
    loadDocsOrder,
    handleSaveDocsOrder,
    handleMoveDoc,
    handleToggleDocVisibility
  }
}
