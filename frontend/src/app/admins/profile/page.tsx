'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminProfile,
  updateAdminProfile,
  uploadAdminAvatar,
  deleteAdminAvatar,
  getAdminSocialLinks,
  createAdminSocialLink,
  updateAdminSocialLink,
  deleteAdminSocialLink,
  uploadAdminSocialLinkIcon,
  uploadAdminSocialLinkQRCode,
  getImageUrl
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import ImageCropper from '@/components/ImageCropper'
import { getAdminRoute } from '@/lib/adminConfig'
import { safeFetch } from '@/lib/utils'

interface SocialLink {
  id?: number
  platform: string
  account: string
  link?: string
  icon?: string
  qrcode?: string
  show_in_profile?: boolean
  is_visible?: boolean
}

export default function ProfilePage() {
  usePageTitle('个人资料', true)
  const router = useRouter()
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>({
    name: '',
    title: '',
    bio: '',
    location: '',
    avatar: '',
    website: '',
    website_title: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deletingAvatar, setDeletingAvatar] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [links, setLinks] = useState<SocialLink[]>([])
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<SocialLink>({
    platform: '',
    account: '',
    link: '',
    icon: '',
    qrcode: '',
    show_in_profile: false,
    is_visible: true
  })
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingQRCode, setUploadingQRCode] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [])

  useEffect(() => {
    if (!showForm) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetLinkForm()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showForm])

  const loadProfileData = async () => {
    try {
      const profileData = await getAdminProfile()
      // 确保所有字段都有默认值，避免 null
      setProfile({
        name: profileData?.name || '',
        title: profileData?.title || '',
        bio: profileData?.bio || '',
        location: profileData?.location || '',
        avatar: profileData?.avatar || '',
        website: profileData?.website || '',
        website_title: profileData?.website_title || ''
      })

      // 加载社交链接
      await loadLinks()
    } catch (error) {
      console.error('加载个人资料失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    })
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setToast({ show: true, type: 'error', message: '请选择图片文件' })
      return
    }

    // 读取图片并显示裁剪器
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)

    // 清空input，允许重复选择同一文件
    e.target.value = ''
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setShowCropper(false)
    setUploadingAvatar(true)

    try {
      // 将Blob转换为File
      const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' })
      const response = await uploadAdminAvatar(file)
      if (response.success) {
        setProfile({
          ...profile,
          avatar: response.data.avatar
        })
        setToast({ show: true, type: 'success', message: '头像上传成功' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '头像上传失败' })
    } finally {
      setUploadingAvatar(false)
      setImageToCrop(null)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setImageToCrop(null)
  }

  const handleAvatarDelete = async () => {
    setDeletingAvatar(true)

    try {
      const response = await deleteAdminAvatar()
      if (response.success) {
        setProfile({
          ...profile,
          avatar: ''
        })
        setToast({ show: true, type: 'success', message: '头像删除成功' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '头像删除失败' })
    } finally {
      setDeletingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateAdminProfile(profile)
      setToast({ show: true, type: 'success', message: '个人资料更新成功' })
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '更新失败' })
    } finally {
      setSaving(false)
    }
  }

  // 社交链接相关函数
  const loadLinks = async () => {
    try {
      const response = await getAdminSocialLinks()
      if (response.success) {
        const linksData = Array.isArray(response.data) ? response.data : []
        setLinks(linksData)
      }
    } catch (error) {
      console.error('Failed to load social links:', error)
      setLinks([])
    }
  }

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const submitLinkForm = async () => {
    try {
      if (editingLink?.id) {
        const response = await updateAdminSocialLink(editingLink.id, formData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '社交链接更新成功' })
          await loadLinks()
          resetLinkForm()
        }
      } else {
        const response = await createAdminSocialLink(formData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '社交链接添加成功' })
          await loadLinks()
          resetLinkForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleEditLink = (link: SocialLink) => {
    setEditingLink(link)
    setFormData({
      platform: link.platform,
      account: link.account,
      link: link.link || '',
      icon: link.icon || '',
      qrcode: link.qrcode || '',
      show_in_profile: link.show_in_profile || false,
      is_visible: link.is_visible !== undefined ? link.is_visible : true
    })
    setShowForm(true)
  }

  const handleDeleteLink = async (id: number) => {
    if (!confirm('确定要删除这个社交链接吗？')) return

    try {
      const response = await deleteAdminSocialLink(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '社交链接删除成功' })
        await loadLinks()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetLinkForm = () => {
    setFormData({ platform: '', account: '', link: '', icon: '', qrcode: '', show_in_profile: false, is_visible: true })
    setEditingLink(null)
    setShowForm(false)
  }

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingIcon(true)

    try {
      const response = await uploadAdminSocialLinkIcon(file)
      if (response.success) {
        setFormData({
          ...formData,
          icon: response.data.url
        })
        setToast({ show: true, type: 'success', message: '图标上传成功' })
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '图标上传失败' })
    } finally {
      setUploadingIcon(false)
    }
  }

  const handleIconDelete = () => {
    setFormData({
      ...formData,
      icon: ''
    })
    setToast({ show: true, type: 'success', message: '图标删除成功' })
  }

  const handleQRCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingQRCode(true)

    try {
      const response = await uploadAdminSocialLinkQRCode(file)
      if (response.success) {
        setFormData({
          ...formData,
          qrcode: response.data.url
        })
        setToast({ show: true, type: 'success', message: '二维码上传成功' })
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '二维码上传失败' })
    } finally {
      setUploadingQRCode(false)
    }
  }

  const handleQRCodeDelete = () => {
    setFormData({
      ...formData,
      qrcode: ''
    })
    setToast({ show: true, type: 'success', message: '二维码删除成功' })
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <form onSubmit={handleSubmit}>
              {/* 个人资料卡片 - 包含头像、基本信息、社交信息 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                {/* 头像设置 */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">头像设置</h2>
                      <p className="text-sm text-gray-500">设置您的个人头像</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 头像预览 */}
                    {profile.avatar && (
                      <div className="flex justify-center py-4">
                        <div className="relative group">
                          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-4 border-white shadow-lg ring-2 ring-blue-100">
                            <img
                              src={getImageUrl(profile.avatar)}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
                        </div>
                      </div>
                    )}

                    {/* 操作?*/}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {!profile.avatar && (
                        <>
                          <input
                            type="file"
                            id="avatarInput"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                            className="hidden"
                          />
                          <label
                            htmlFor="avatarInput"
                            className={`w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg text-sm cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                              uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {uploadingAvatar ? '上传中..' : '选择文件'}
                          </label>
                        </>
                      )}
                      <input
                        type="text"
                        name="avatar"
                        value={profile.avatar}
                        onChange={handleChange}
                        placeholder="或输入图片URL地址"
                        className="min-w-0 w-full sm:flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                      {profile.avatar && (
                        <button
                          type="button"
                          onClick={handleAvatarDelete}
                          disabled={deletingAvatar}
                          className="w-full sm:w-auto flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium transition-all duration-300 hover:from-red-600 hover:to-red-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingAvatar ? '删除?..' : '删除'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      支持 jpg、jpeg、png、gif、webp、svg、ico 格式，或输入自定义URL
                    </p>
                  </div>
                </div>

              {/* 基本信息?*/}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
                    <p className="text-sm text-gray-500">设置您的个人基本信息</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* 姓名 */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      姓名
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={profile.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="你的名字"
                    />
                  </div>

                  {/* 职位/头衔 */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      职位/头衔
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={profile.title}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如：全栈开发工程师"
                    />
                  </div>

                  {/* 简介*/}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      个人简介                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={profile.bio}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="介绍一下自己.."
                    />
                  </div>

                  {/* 所在地 */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      所在地
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={profile.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如：北京"
                    />
                  </div>
                </div>
              </div>

              {/* 社交信息 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">社交信息</h2>
                    <p className="text-sm text-gray-500">设置您的个人网站信息</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* 个人网站链接 */}
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      个人网站链接
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      value={profile.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://localhost"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      支持完整URL、相对路径（如 /about）或锚点链接（如 #contact）                    </p>
                  </div>

                  {/* 网站显示标题 */}
                  <div>
                    <label htmlFor="website_title" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      网站显示标题
                    </label>
                    <input
                      id="website_title"
                      name="website_title"
                      type="text"
                      value={profile.website_title}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如：我的博客"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      如果不填写，将显示网站链接本身                    </p>
                  </div>
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saving ? '保存?..' : '保存更改'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(getAdminRoute('dashboard'))}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium transition-all duration-300 hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消
                </button>
              </div>
              </div>
            </form>

            {/* 社交链接管理?*/}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">社交链接管理</h2>
                  <p className="text-sm text-gray-500">添加和管理您的社交媒体链接</p>
                </div>
              </div>

              {/* 添加按钮 */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (showForm) {
                      resetLinkForm()
                      return
                    }
                    setEditingLink(null)
                    setFormData({ platform: '', account: '', link: '', icon: '', qrcode: '', show_in_profile: false, is_visible: true })
                    setShowForm(true)
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showForm ? '取消' : '添加社交链接'}
                </button>
              </div>

              {/* 添加/编辑弹窗 */}
              {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={resetLinkForm}
                    className="absolute inset-0 bg-black/40"
                  />
                  <div className="relative w-full sm:max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
                      <h3 className="text-base font-semibold text-gray-900">
                        {editingLink ? '编辑社交链接' : '添加社交链接'}
                      </h3>
                      <button
                        type="button"
                        onClick={resetLinkForm}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium transition-all duration-300 hover:bg-gray-200"
                      >
                        关闭
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        submitLinkForm()
                      }}
                      className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]"
                    >
                      <div>
                        <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
                          平台名称
                        </label>
                        <input
                          id="platform"
                          name="platform"
                          type="text"
                          required
                          value={formData.platform}
                          onChange={handleLinkChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                          placeholder="例如：GitHub, Twitter, LinkedIn"
                        />
                      </div>

                      <div>
                        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-2">
                          账号/用户名
                        </label>
                        <input
                          id="account"
                          name="account"
                          type="text"
                          required
                          value={formData.account}
                          onChange={handleLinkChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                          placeholder="例如：yourusername"
                        />
                      </div>

                      <div>
                        <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
                          链接地址 (可选)
                        </label>
                        <input
                          id="link"
                          name="link"
                          type="text"
                          value={formData.link}
                          onChange={handleLinkChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                          placeholder="https://localhost"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          支持完整URL、相对路径（如 /about）或锚点链接（如 #contact）
                        </p>
                      </div>

                      <div>
                        <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
                          图标 (可选)
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {formData.icon && (
                            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-white rounded border border-gray-200">
                              <img
                                src={getImageUrl(formData.icon)}
                                alt="图标"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                            {!formData.icon && (
                              <>
                                <input
                                  type="file"
                                  id="iconInput"
                                  accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                  onChange={handleIconUpload}
                                  disabled={uploadingIcon}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="iconInput"
                                  className={`w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-orange-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap text-center ${
                                    uploadingIcon ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {uploadingIcon ? '上传中..' : '选择文件'}
                                </label>
                              </>
                            )}
                            <input
                              id="icon"
                              name="icon"
                              type="text"
                              value={formData.icon}
                              onChange={handleLinkChange}
                              placeholder="图标 URL"
                              className="w-full sm:flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white placeholder-gray-400"
                            />
                            {formData.icon && (
                              <button
                                type="button"
                                onClick={handleIconDelete}
                                className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          强烈建议使用PNG、SVG格式图片，且尺寸不能低于50x50像素
                        </p>
                      </div>

                      <div>
                        <label htmlFor="qrcode" className="block text-sm font-medium text-gray-700 mb-2">
                          二维码图片 (可选)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          上传二维码后，前台点击社交链接将显示二维码弹窗，不会跳转URL
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {formData.qrcode && (
                            <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center bg-white rounded border border-gray-200">
                              <img
                                src={getImageUrl(formData.qrcode)}
                                alt="二维码"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                            {!formData.qrcode && (
                              <>
                                <input
                                  type="file"
                                  id="qrcodeInput"
                                  accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                  onChange={handleQRCodeUpload}
                                  disabled={uploadingQRCode}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="qrcodeInput"
                                  className={`w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-orange-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap text-center ${
                                    uploadingQRCode ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {uploadingQRCode ? '上传中..' : '选择文件'}
                                </label>
                              </>
                            )}
                            <input
                              id="qrcode"
                              name="qrcode"
                              type="text"
                              value={formData.qrcode}
                              onChange={handleLinkChange}
                              placeholder="二维码图片URL"
                              className="w-full sm:flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white placeholder-gray-400"
                            />
                            {formData.qrcode && (
                              <button
                                type="button"
                                onClick={handleQRCodeDelete}
                                className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          支持 jpg、jpeg、png、gif、webp、svg、ico 格式
                        </p>
                      </div>

                      <div>
                        <label className="flex items-start gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            id="show_in_profile"
                            name="show_in_profile"
                            checked={formData.show_in_profile || false}
                            onChange={(e) => setFormData({ ...formData, show_in_profile: e.target.checked })}
                            className="w-4 h-4 mt-0.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            在个人资料卡片中显示（最多显示6个），博客模式下建议只选择4个！
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          勾选后，此社交链接将显示在博客主题的个人资料卡片下方，图标会根据数量自动调整大小和间距
                        </p>
                      </div>

                      <div>
                        <label className="flex items-start gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            id="is_visible"
                            name="is_visible"
                            checked={formData.is_visible !== undefined ? formData.is_visible : true}
                            onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                            className="w-4 h-4 mt-0.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            前台可见
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          取消勾选后，此社交链接将不会在前台显示，仅在后台管理中可见
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg"
                        >
                          {editingLink ? '更新' : '添加'}
                        </button>
                        <button
                          type="button"
                          onClick={resetLinkForm}
                          className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium transition-all duration-300 hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 社交链接列表 */}
              <div>
                <h3 className="text-base font-semibold mb-4 text-gray-900">已添加的社交链接</h3>
                {links.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                    还没有添加任何社交链?                  </p>
                ) : (
                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div
                        key={link.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-orange-300 transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                if (index === 0) return
                                const newLinks = [...links]
                                const temp = newLinks[index]
                                newLinks[index] = newLinks[index - 1]
                                newLinks[index - 1] = temp

                                setLinks(newLinks)

                                try {
                                  const sortData = newLinks.map((l, i) => ({ id: l.id, sort_order: i }))
                                  await safeFetch('/api/admin/social-links/sort/update', {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ sortData })
                                  })
                                } catch (error) {
                                  console.error('Failed to update sort order:', error)
                                }
                              }}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="上移"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (index === links.length - 1) return
                                const newLinks = [...links]
                                const temp = newLinks[index]
                                newLinks[index] = newLinks[index + 1]
                                newLinks[index + 1] = temp

                                setLinks(newLinks)

                                try {
                                  const sortData = newLinks.map((l, i) => ({ id: l.id, sort_order: i }))
                                  await safeFetch('/api/admin/social-links/sort/update', {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ sortData })
                                  })
                                } catch (error) {
                                  console.error('Failed to update sort order:', error)
                                }
                              }}
                              disabled={index === links.length - 1}
                              className="p-1 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="下移"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-gray-900">{link.platform}</h4>
                              {link.show_in_profile && (
                                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                                  显示在资料卡
                                </span>
                              )}
                              {link.is_visible === false && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  前台隐藏
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 break-words">账号：{link.account}</p>
                            {link.link && (
                              <a
                                href={link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-orange-600 hover:underline break-all"
                              >
                                {link.link}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end sm:ml-auto">
                          <button
                            type="button"
                            onClick={() => handleEditLink(link)}
                            className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-gray-50 hover:border-gray-400"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => link.id && handleDeleteLink(link.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-300"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片裁剪?*/}
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </>
  )
}
