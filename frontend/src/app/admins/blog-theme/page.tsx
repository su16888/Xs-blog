/**
 * @file page.tsx
 * @description Xs-Blog 后台博客主题设置页面
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminSettings,
  updateAdminSettings,
  uploadAdminBackgroundImage,
  uploadAdminImage,
  deleteAdminBackgroundImage,
  getImageUrl,
  uploadBlogThemeLogo,
  uploadBlogThemeCarousel,
  uploadBlogThemeNavIcon,
  deleteBlogThemeImage
} from '@/lib/api'
import { getFileUrl } from '@/lib/utils'
import { getAdminRoute } from '@/lib/adminConfig'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'

interface BlogThemeSettings {
  blogLogo: string
  blogLogoText: string
  blogNavLinks: string
  blogCarouselImages: string
  blogProfileEnabled?: string
  blogCarouselEnabled?: string
}

export default function BlogThemePage() {
  usePageTitle('博客主题设置', true)
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<BlogThemeSettings>({
    blogLogo: '',
    blogLogoText: '',
    blogNavLinks: '[]',
    blogCarouselImages: '[]'
  })
  const [navLinks, setNavLinks] = useState<Array<{name: string, url: string, icon?: string}>>([])
  const [carouselImages, setCarouselImages] = useState<Array<{url: string, alt: string, link?: string}>>([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [uploadingCarousel, setUploadingCarousel] = useState(false)
  const [uploadingNavIcon, setUploadingNavIcon] = useState<number | null>(null)
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    // 解析导航链接
    try {
      const links = JSON.parse(settings.blogNavLinks || '[]')
      setNavLinks(links)
    } catch {
      setNavLinks([])
    }

    // 解析轮播图
    try {
      const images = JSON.parse(settings.blogCarouselImages || '[]')
      setCarouselImages(images)
    } catch {
      setCarouselImages([])
    }
  }, [settings.blogNavLinks, settings.blogCarouselImages])

  const loadSettings = async () => {
    try {
      const response = await getAdminSettings()
      if (response.success && response.data) {
        const settingsObj: any = {}
        response.data.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value
        })

        setSettings({
          blogLogo: settingsObj.blogLogo || '',
          blogLogoText: settingsObj.blogLogoText || '',
          blogNavLinks: settingsObj.blogNavLinks || '[]',
          blogCarouselImages: settingsObj.blogCarouselImages || '[]',
          blogProfileEnabled: settingsObj.blogProfileEnabled || 'true',
          blogCarouselEnabled: settingsObj.blogCarouselEnabled || 'true'
        })
      }
    } catch (error) {
      console.error('加载博客主题设置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    })
  }

  const handleNavLinkChange = (index: number, field: 'name' | 'url' | 'icon', value: string) => {
    const newLinks = [...navLinks]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setNavLinks(newLinks)
    setSettings({
      ...settings,
      blogNavLinks: JSON.stringify(newLinks)
    })
  }

  const addNavLink = () => {
    if (navLinks.length >= 5) {
      setToast({ show: true, type: 'error', message: '最多只能添加5个导航链接' })
      return
    }
    const newLinks = [...navLinks, { name: '', url: '', icon: '' }]
    setNavLinks(newLinks)
    setSettings({
      ...settings,
      blogNavLinks: JSON.stringify(newLinks)
    })
  }

  const removeNavLink = (index: number) => {
    const newLinks = navLinks.filter((_, i) => i !== index)
    setNavLinks(newLinks)
    setSettings({
      ...settings,
      blogNavLinks: JSON.stringify(newLinks)
    })
  }

  // 处理导航链接图标上传
  const handleNavIconUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const validTypes = ['image/png', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setToast({ show: true, type: 'error', message: '只支持 PNG、SVG、WEBP 格式的图片' })
      return
    }

    setUploadingNavIcon(index)
    try {
      const response = await uploadBlogThemeNavIcon(file)

      if (response.success && response.data) {
        const newLinks = [...navLinks]
        // response.data 是一个对象 {url, filename}，我们需要使用 url 字段
        newLinks[index] = { ...newLinks[index], icon: response.data.url }
        setNavLinks(newLinks)
        setSettings({
          ...settings,
          blogNavLinks: JSON.stringify(newLinks)
        })
        setToast({ show: true, type: 'success', message: '图标上传成功' })
        // 清除文件输入
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '图标上传失败' })
    } finally {
      setUploadingNavIcon(null)
    }
  }

  // 删除导航链接图标
  const handleNavIconDelete = async (index: number) => {
    const iconToDelete = navLinks[index].icon
    const newLinks = [...navLinks]
    newLinks[index] = { ...newLinks[index], icon: '' }

    // 删除物理文件
    if (iconToDelete && iconToDelete.startsWith('/uploads/')) {
      try {
        await deleteBlogThemeImage(iconToDelete)
      } catch (error) {
        console.error('删除导航图标文件失败:', error)
      }
    }

    setNavLinks(newLinks)
    setSettings({
      ...settings,
      blogNavLinks: JSON.stringify(newLinks)
    })
  }

  // 处理logo上传
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)

    try {
      const response = await uploadBlogThemeLogo(file)
      if (response.success) {
        setToast({ show: true, type: 'success', message: 'Logo上传成功' })
        setSettings({
          ...settings,
          blogLogo: response.data.url
        })
        // 清除文件输入
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || 'Logo上传失败' })
    } finally {
      setUploadingLogo(false)
    }
  }

  // 处理logo删除
  const handleLogoDelete = async () => {
    setDeletingLogo(true)

    try {
      const response = await deleteBlogThemeImage(settings.blogLogo)
      if (response.success) {
        setToast({ show: true, type: 'success', message: 'Logo删除成功' })
        setSettings({
          ...settings,
          blogLogo: ''
        })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || 'Logo删除失败' })
    } finally {
      setDeletingLogo(false)
    }
  }

  // 处理轮播图上传
  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCarousel(true)

    try {
      const response = await uploadBlogThemeCarousel(file)
      if (response.success) {
        const newImages = [...carouselImages, { url: response.data.url, alt: '轮播图' }]
        setCarouselImages(newImages)
        setSettings({
          ...settings,
          blogCarouselImages: JSON.stringify(newImages)
        })
        setToast({ show: true, type: 'success', message: '轮播图上传成功' })
        // 清除文件输入
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '轮播图上传失败' })
    } finally {
      setUploadingCarousel(false)
    }
  }

  // 处理轮播图删除
  const handleCarouselDelete = async (index: number) => {
    const imageToDelete = carouselImages[index]
    const newImages = carouselImages.filter((_, i) => i !== index)

    // 删除物理文件
    if (imageToDelete.url && imageToDelete.url.startsWith('/uploads/')) {
      try {
        await deleteBlogThemeImage(imageToDelete.url)
      } catch (error) {
        console.error('删除轮播图文件失败:', error)
      }
    }

    setCarouselImages(newImages)
    setSettings({
      ...settings,
      blogCarouselImages: JSON.stringify(newImages)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        type: 'string'
      }))

      const response = await updateAdminSettings(settingsArray)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '博客主题设置保存成功' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Logo设置 */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900 mb-4 sm:mb-5">Logo设置</h2>

                <div className="space-y-4">
                  {/* Logo图片 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo图片
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {settings.blogLogo && (
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-gray-200 flex-shrink-0">
                          <img
                            src={getImageUrl(settings.blogLogo)}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain p-1"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                        {!settings.blogLogo && (
                          <>
                            <input
                              type="file"
                              id="logoInput"
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                              onChange={handleLogoUpload}
                              disabled={uploadingLogo}
                              className="hidden"
                            />
                            <label
                              htmlFor="logoInput"
                              className={`w-full sm:w-auto inline-flex justify-center px-3 py-2 bg-blue-600 text-white rounded text-sm cursor-pointer hover:bg-blue-700 ${
                                uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {uploadingLogo ? '上传中...' : '上传图片'}
                            </label>
                          </>
                        )}
                        <input
                          type="text"
                          value={settings.blogLogo}
                          onChange={(e) => setSettings({ ...settings, blogLogo: e.target.value })}
                          placeholder="或输入图片URL"
                          className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {settings.blogLogo && (
                          <button
                            type="button"
                            onClick={handleLogoDelete}
                            disabled={deletingLogo}
                            className="w-full sm:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm disabled:opacity-50"
                          >
                            {deletingLogo ? '删除中...' : '删除'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">支持 jpg、jpeg、png、gif、webp、svg、ico 格式</p>
                  </div>

                  {/* Logo文字 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo文字
                    </label>
                    <input
                      type="text"
                      name="blogLogoText"
                      value={settings.blogLogoText}
                      onChange={handleChange}
                      placeholder="例如：我的博客"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">可以单独使用文字，或与Logo图片组合显示</p>
                  </div>
                </div>
              </div>

              {/* 轮播图设置 */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900 mb-4 sm:mb-5">轮播图</h2>

                <div className="space-y-4">
                  {carouselImages.map((image, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {/* 排序按钮 */}
                        <div className="flex flex-row sm:flex-col gap-1 justify-start sm:justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (index === 0) return
                            const newImages = [...carouselImages]
                            const temp = newImages[index]
                            newImages[index] = newImages[index - 1]
                            newImages[index - 1] = temp
                            setCarouselImages(newImages)
                            setSettings({
                              ...settings,
                              blogCarouselImages: JSON.stringify(newImages)
                            })
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="上移"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (index === carouselImages.length - 1) return
                            const newImages = [...carouselImages]
                            const temp = newImages[index]
                            newImages[index] = newImages[index + 1]
                            newImages[index + 1] = temp
                            setCarouselImages(newImages)
                            setSettings({
                              ...settings,
                              blogCarouselImages: JSON.stringify(newImages)
                            })
                          }}
                          disabled={index === carouselImages.length - 1}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="下移"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <div className="w-full sm:w-24 h-24 sm:h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={getImageUrl(image.url)}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1.5">跳转链接（可选）</label>
                          <input
                            type="text"
                            value={image.link || ''}
                            onChange={(e) => {
                              const newImages = [...carouselImages]
                              newImages[index] = { ...newImages[index], link: e.target.value }
                              setCarouselImages(newImages)
                              setSettings({
                                ...settings,
                                blogCarouselImages: JSON.stringify(newImages)
                              })
                            }}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCarouselDelete(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {carouselImages.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    暂无轮播图
                  </div>
                )}

                {carouselImages.length < 3 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="file"
                        id="carouselInput"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                        onChange={handleCarouselUpload}
                        disabled={uploadingCarousel}
                        className="hidden"
                      />
                      <label
                        htmlFor="carouselInput"
                        className={`w-full sm:w-auto inline-flex justify-center px-3 py-2 bg-blue-600 text-white rounded text-sm cursor-pointer hover:bg-blue-700 ${
                          uploadingCarousel ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingCarousel ? '上传中...' : '上传图片'}
                      </label>
                      <input
                        type="text"
                        placeholder="或输入图片URL后按回车"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            if (carouselImages.length >= 3) {
                              setToast({ show: true, type: 'error', message: '最多只能添加3张轮播图' })
                              return
                            }
                            const newImages = [...carouselImages, { url: e.currentTarget.value, alt: '轮播图' }]
                            setCarouselImages(newImages)
                            setSettings({
                              ...settings,
                              blogCarouselImages: JSON.stringify(newImages)
                            })
                            setToast({ show: true, type: 'success', message: '轮播图URL添加成功' })
                            e.currentTarget.value = ''
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">支持 jpg、jpeg、png、gif、webp、svg、ico 格式，最多3张</p>
                  </div>
                )}

                {carouselImages.length >= 3 && (
                  <p className="text-sm text-gray-500">已达到轮播图数量上限（3张）</p>
                )}
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存设置'}
              </button>
              <button
                type="button"
                onClick={() => router.push(getAdminRoute('dashboard'))}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
