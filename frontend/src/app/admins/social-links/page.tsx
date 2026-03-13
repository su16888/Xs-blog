'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminSocialLinks,
  createAdminSocialLink,
  updateAdminSocialLink,
  deleteAdminSocialLink,
  uploadAdminSocialLinkIcon,
  uploadAdminSocialLinkQRCode
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
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
}

export default function SocialLinksPage() {
  usePageTitle('社交链接管理')
  const router = useRouter()
  const { user } = useAuth()
  const [links, setLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<SocialLink>({
    platform: '',
    account: '',
    link: '',
    icon: '',
    qrcode: '',
    show_in_profile: false
  })
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingQRCode, setUploadingQRCode] = useState(false)

  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    try {
      const response = await getAdminSocialLinks()
      if (response.success) {
        const linksData = Array.isArray(response.data) ? response.data : []
        setLinks(linksData)
      }
    } catch (error) {
      console.error('加载社交链接失败:', error)
      setLinks([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingLink?.id) {
        const response = await updateAdminSocialLink(editingLink.id, formData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '社交链接更新成功' })
          await loadLinks()
          resetForm()
        }
      } else {
        const response = await createAdminSocialLink(formData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '社交链接添加成功' })
          await loadLinks()
          resetForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleEdit = (link: SocialLink) => {
    setEditingLink(link)
    setFormData({
      platform: link.platform,
      account: link.account,
      link: link.link || '',
      icon: link.icon || '',
      qrcode: link.qrcode || '',
      show_in_profile: link.show_in_profile || false
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
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

  const resetForm = () => {
    setFormData({ platform: '', account: '', link: '', icon: '', qrcode: '', show_in_profile: false })
    setEditingLink(null)
    setShowForm(false)
  }

  // 处理图标上传
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
        // 清除文件输入
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '图标上传失败' })
    } finally {
      setUploadingIcon(false)
    }
  }

  // 处理图标删除
  const handleIconDelete = () => {
    setFormData({
      ...formData,
      icon: ''
    })
    setToast({ show: true, type: 'success', message: '图标删除成功' })
  }

  // 处理二维码上传
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
        // 清除文件输入
        e.target.value = ''
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '二维码上传失败' })
    } finally {
      setUploadingQRCode(false)
    }
  }

  // 处理二维码删除
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

          {/* 添加按钮 */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary"
            >
              {showForm ? '取消' : '+ 添加社交链接'}
            </button>
          </div>

          {/* 添加/编辑表单 */}
          {showForm && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingLink ? '编辑社交链接' : '添加社交链接'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    onChange={handleChange}
                    className="input"
                    placeholder="例如：GitHub, Twitter, LinkedIn"
                  />
                </div>

                <div>
                  <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-2">
                    账号/用户名                  </label>
                  <input
                    id="account"
                    name="account"
                    type="text"
                    required
                    value={formData.account}
                    onChange={handleChange}
                    className="input"
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
                    onChange={handleChange}
                    className="input"
                    placeholder="https://localhost"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    支持完整URL、相对路径（如 /about）或锚点链接（如 #contact）                  </p>
                </div>

                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
                    图标 (可选)
                  </label>
                  <div className="flex items-start gap-3">
                    {/* 左侧预览?*/}
                    {formData.icon && (
                      <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
                        <img
                          src={formData.icon}
                          alt="图标"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    {/* 中间操作?*/}
                    <div className="flex-1 flex items-center gap-3">
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
                            className={`px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap ${
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
                        onChange={handleChange}
                        placeholder="图标 URL"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                    </div>
                    {/* 右侧删除按钮 */}
                    {formData.icon && (
                      <button
                        type="button"
                        onClick={handleIconDelete}
                        className="flex-shrink-0 px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                      >
                        删除
                      </button>
                    )}
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
                  <div className="flex items-start gap-3">
                    {/* 左侧预览?*/}
                    {formData.qrcode && (
                      <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
                        <img
                          src={formData.qrcode}
                          alt="二维码"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    {/* 中间操作区 */}
                    <div className="flex-1 flex items-center gap-3">
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
                            className={`px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap ${
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
                        onChange={handleChange}
                        placeholder="二维码图?URL"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                    </div>
                    {/* 右侧删除按钮 */}
                    {formData.qrcode && (
                      <button
                        type="button"
                        onClick={handleQRCodeDelete}
                        className="flex-shrink-0 px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    支持 jpg、jpeg、png、gif、webp、svg、ico 格式
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="show_in_profile"
                      name="show_in_profile"
                      checked={formData.show_in_profile || false}
                      onChange={(e) => setFormData({ ...formData, show_in_profile: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      在个人资料卡片中显示（最多显示6个），博客模式下建议只选择4个！
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    勾选后，此社交链接将显示在博客主题的个人资料卡片下方，图标会根据数量自动调整大小和间距
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button type="submit" className="btn btn-primary">
                    {editingLink ? '更新' : '添加'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 社交链接列表 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">已添加的社交链接</h2>
            {links.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                还没有添加任何社交链?              </p>
            ) : (
              <div className="divide-y divide-gray-200">
                {links.map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    {/* 排序按钮 */}
                    <div className="flex flex-col gap-1 mr-3">
                      <button
                        onClick={async () => {
                          if (index === 0) return
                          const newLinks = [...links]
                          const temp = newLinks[index]
                          newLinks[index] = newLinks[index - 1]
                          newLinks[index - 1] = temp

                          // 更新本地状态
                          setLinks(newLinks)

                          // 更新排序到后端
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
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="上移"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          if (index === links.length - 1) return
                          const newLinks = [...links]
                          const temp = newLinks[index]
                          newLinks[index] = newLinks[index + 1]
                          newLinks[index + 1] = temp

                          // 更新本地状态
                          setLinks(newLinks)

                          // 更新排序到后端
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
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="下移"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{link.platform}</h3>
                        {link.show_in_profile && (
                          <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                            显示在资料卡
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">账号：{link.account}</p>
                      {link.link && (
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline"
                        >
                          {link.link}
                        </a>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(link)}
                        className="btn btn-secondary text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => link.id && handleDelete(link.id)}
                        className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
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
    </>
  )
}


