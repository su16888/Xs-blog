'use client'

import { useState, useEffect } from 'react'
import { getMessageCategories, submitMessage, getCaptcha, getSettings, getPageText } from '@/lib/api'
import SiteFooter from '@/components/SiteFooter'
import SEOMeta from '@/components/SEOMeta'
import PageBackground from '@/components/PageBackground'

interface MessageCategory {
  id: number
  name: string
  sort_order: number
}

interface CaptchaData {
  id: string
  image: string
}

export default function MessagePage() {
  const [categories, setCategories] = useState<MessageCategory[]>([])
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showCaptchaModal, setShowCaptchaModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 默认设置
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    showTopNavbar: 'true',
    showWapSidebar: 'true'
  }
  const [settings, setSettings] = useState<any>(defaultSettings)
  // 页面文本配置 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageText, setPageText] = useState({
    title: '',
    description: '',
    browserTitle: '',
    browserSubtitle: ''
  })
  const [pageTextLoaded, setPageTextLoaded] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    category_id: '',
    content: '',
    captcha: ''
  })

  // 加载分类和验证码
  useEffect(() => {
    loadData()
    loadPageSettings()
  }, [])

  // 设置页面标题（仅使用 browserTitle，不受网站标题、副标题影响?
  useEffect(() => {
    if (!pageText.browserTitle) return
    let title = pageText.browserTitle
    if (pageText.browserSubtitle) {
      title = `${title} - ${pageText.browserSubtitle}`
    }
    document.title = title
  }, [pageText.browserTitle, pageText.browserSubtitle])

  const loadPageSettings = async () => {
    try {
      // 并行加载设置和页面文本配?
      const [settingsResponse, pageTextResponse] = await Promise.all([
        getSettings(),
        getPageText('messages')
      ])

      if (settingsResponse.success && settingsResponse.data) {
        const settingsObj: any = {}
        settingsResponse.data.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value
        })
        setSettings({
          themeType: settingsObj.themeType || 'default',
          footerCopyright: settingsObj.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
          showTopNavbar: settingsObj.showTopNavbar || 'true',
          showWapSidebar: settingsObj.showWapSidebar || 'true'
        })
      }

      // 从新?page_texts 表加载页面文本配?
      if (pageTextResponse.success && pageTextResponse.data) {
        setPageText({
          title: pageTextResponse.data.title || '联系我们',
          description: pageTextResponse.data.description || '有任何问题都可以通过这里进行提交你的想法',
          browserTitle: pageTextResponse.data.browserTitle || '留言板',
          browserSubtitle: pageTextResponse.data.browserSubtitle || ''
        })
        setPageTextLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      setPageTextLoaded(true) // 即使失败也标记为已加载，使用默认?
    }
  }

  const loadData = async () => {
    try {
      const categoriesRes = await getMessageCategories()
      if (categoriesRes.success) {
        setCategories(categoriesRes.data)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 加载验证?
  const loadCaptcha = async () => {
    try {
      const response = await getCaptcha()
      if (response.success && response.data) {
        // 将SVG字符串转换为data URL
        const svgData = response.data.image || response.data.svg
        const dataUrl = svgData.startsWith('data:')
          ? svgData
          : `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`

        setCaptcha({
          id: response.data.id,
          image: dataUrl
        })
      }
    } catch (error) {
      console.error('加载验证码失败', error)
    }
  }

  // 处理表单提交 - 先验证基础字段，然后显示验证码模态框
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    // 验证基础表单字段
    if (!formData.name.trim()) {
      setMessage('请输入您的称呼')
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (!formData.contact.trim()) {
      setMessage('请输入联系方式')
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (!formData.content.trim()) {
      setMessage('请输入留言内容')
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // 基础验证通过，加载验证码并显示模态框
    await loadCaptcha()
    setShowCaptchaModal(true)
  }

  // 提交留言（验证码验证后）
  const handleConfirmSubmit = async () => {
    if (!formData.captcha.trim()) {
      setMessage('请输入验证码')
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      setIsSubmitting(true)
      const submitData = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        captcha: {
          id: captcha?.id,
          text: formData.captcha
        }
      }

      const result = await submitMessage(submitData)

      if (result.success) {
        setMessage('留言提交成功，我们会尽快处理！')
        setMessageType('success')
        // 重置表单
        setFormData({
          name: '',
          contact: '',
          category_id: '',
          content: '',
          captcha: ''
        })
        setShowCaptchaModal(false)
      } else {
        setMessage(result.message || '提交失败，请重试')
        setMessageType('error')
        loadCaptcha() // 重新加载验证?
      }
    } catch (error: any) {
      console.error('提交留言失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '提交失败，请重试'
      setMessage(errorMessage)
      setMessageType('error')
      loadCaptcha() // 重新加载验证?
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const refreshCaptcha = async () => {
    try {
      const captchaRes = await getCaptcha()
      if (captchaRes.success) {
        setCaptcha(captchaRes.data)
        setFormData(prev => ({ ...prev, captcha: '' }))
      }
    } catch (error) {
      console.error('刷新验证码失败', error)
    }
  }

  const showWapSidebar = settings?.showWapSidebar !== 'false'

  return (
    <main className="min-h-screen bg-bg-primary relative flex flex-col hide-scrollbar">
      <SEOMeta />
      {/* 背景图片 */}
      <PageBackground />

      {/* 内容区域 */}
      <div className="relative z-0 flex-1 flex flex-col">
        {/* 给导航栏留出空间 */}
        <div className="h-16"></div>

        <div className="container mx-auto px-4 max-w-6xl py-8">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">{pageText.title}</h1>
            <p className="text-text-secondary">{pageText.description}</p>
          </div>

        <div className="bg-bg-secondary rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
          {message && (
            <div
              className="mb-6 p-4 rounded-lg border"
              style={
                messageType === 'success'
                  ? { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }
                  : { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', borderColor: 'var(--error-border)' }
              }
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户称呼 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
                用户称呼 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-0 focus:border-border-primary bg-bg-primary text-text-primary"
                placeholder="请输入您的称呼"
              />
            </div>

            {/* 联系方式 */}
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-text-primary mb-2">
                联系方式 *
              </label>
              <input
                type="text"
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-0 focus:border-border-primary bg-bg-primary text-text-primary"
                placeholder="请输入您的联系方式（邮箱、微信、电话等）"
              />
            </div>

            {/* 留言分类 */}
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-text-primary mb-2">
                留言分类
              </label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-0 focus:border-border-primary bg-bg-primary text-text-primary"
              >
                <option value="">请选择分类</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 留言内容 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-text-primary mb-2">
                留言内容 *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={6}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-0 focus:border-border-primary bg-bg-primary text-text-primary resize-none"
                placeholder="请输入您的留言内容..."
              />
            </div>

            {/* 提交按钮 */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-0"
              >
                {loading ? '提交?..' : '提交留言'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 页脚版权 */}
      <SiteFooter className="mt-auto" />
    </div>

      {/* 验证码模态框 */}
      {showCaptchaModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setShowCaptchaModal(false)
            setFormData({ ...formData, captcha: '' })
          }}
        >
          <div
            className="bg-bg-secondary rounded-xl max-w-md w-full p-6 shadow-2xl border border-border-primary relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowCaptchaModal(false)
                setFormData({ ...formData, captcha: '' })
              }}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary"
            >
              ×
            </button>

            <h3 className="text-xl font-bold text-text-primary mb-6 text-center">
              请输入验证码
            </h3>

            {/* 验证码图?*/}
            <div className="flex justify-center mb-6">
              {captcha && (
                <div
                  onClick={loadCaptcha}
                  className="cursor-pointer border-2 border-border-primary rounded-lg overflow-hidden bg-bg-primary hover:border-primary-500 transition-colors"
                  title="点击刷新验证码"
                >
                  <img
                    src={captcha.image}
                    alt="验证码"
                    className="h-[50px] w-[150px] object-contain"
                  />
                </div>
              )}
            </div>

            <p className="text-text-secondary text-sm text-center mb-4">
              点击图片可刷新验证码
            </p>

            {/* 验证码输入框 */}
            <input
              type="text"
              value={formData.captcha}
              onChange={(e) => setFormData({ ...formData, captcha: e.target.value })}
              placeholder="请输入验证码"
              className="w-full px-4 py-3 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-6 text-center text-lg tracking-wider"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmSubmit()
                }
              }}
            />

            {/* 按钮?*/}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCaptchaModal(false)
                  setFormData({ ...formData, captcha: '' })
                }}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-primary rounded-lg hover:bg-border-primary transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? '提交?..' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

