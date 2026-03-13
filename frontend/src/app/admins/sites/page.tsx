'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminSites,
  createAdminSite,
  updateAdminSite,
  deleteAdminSite,
  getAdminNavigationCategories,
  createAdminNavigationCategory,
  updateAdminNavigationCategory,
  deleteAdminNavigationCategory,
  uploadAdminImage,
  uploadSiteLogo,
  deleteSiteLogo,
  getImageUrl
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'

interface Site {
  id?: number
  name: string
  link: string
  description?: string
  logo?: string
  sort_order?: number
  display_type?: 'frontend' | 'backend' | 'both'
  is_frontend_visible?: boolean // 兼容旧数据
  category_id?: number | null
  is_recommended?: boolean
}

interface NavigationCategory {
  id?: number
  name: string
  description?: string
  icon?: string
  sort_order?: number
  is_visible?: boolean
}

export default function SitesPage() {
  usePageTitle('网站导航管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [categories, setCategories] = useState<NavigationCategory[]>([])
  const [activeTab, setActiveTab] = useState<'sites' | 'categories'>('sites')

  // 网站管理相关状态
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [siteFormData, setSiteFormData] = useState<Site>({
    name: '',
    link: '',
    description: '',
    logo: '',
    sort_order: 0,
    display_type: 'both',
    category_id: null,
    is_recommended: false
  })

  // 分类管理相关状态
  const [editingCategory, setEditingCategory] = useState<NavigationCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState<NavigationCategory>({
    name: '',
    description: '',
    icon: '',
    sort_order: 0,
    is_visible: true
  })

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [sitesLoading, setSitesLoading] = useState(false)

  // 上传相关状态
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  const loadCategories = useCallback(async () => {
    try {
      const response = await getAdminNavigationCategories()
      if (response.success) {
        const categoriesData = Array.isArray(response.data) ? response.data : []
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('加载导航分类失败:', error)
      setCategories([])
    }
  }, [])

  const loadSites = useCallback(async (pageNum = 1) => {
    setSitesLoading(true)
    try {
      const trimmedSearch = searchQuery.trim()
      const response = await getAdminSites({
        page: pageNum,
        limit: perPage,
        search: trimmedSearch ? trimmedSearch : undefined
      })
      if (response.success) {
        const sitesData = Array.isArray(response.data) ? response.data : []
        setSites(sitesData)
        setCurrentPage(pageNum)
        setTotalPages(Number(response.pagination?.total_pages || 1))
        setTotalCount(Number(response.pagination?.total_count || 0))
      }
    } catch (error) {
      setToast({ show: true, type: 'error', message: '加载网站导航失败' })
      setSites([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setSitesLoading(false)
    }
  }, [perPage, searchQuery])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSites(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [loadSites, perPage, searchQuery])

  // 网站管理相关函数
  const handleSiteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue: any = value
    if (type === 'checkbox') {
      finalValue = checked
    } else if (name === 'sort_order') {
      finalValue = parseInt(value) || 0
    } else if (name === 'category_id') {
      finalValue = value === '' ? null : parseInt(value)
    }

    setSiteFormData({
      ...siteFormData,
      [name]: finalValue
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)

    try {
      const response = await uploadSiteLogo(file)
      if (response.success) {
        setSiteFormData({
          ...siteFormData,
          logo: response.data.url
        })
        setToast({ show: true, type: 'success', message: 'Logo上传成功' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || 'Logo上传失败' })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    // 删除物理文件
    if (siteFormData.logo && siteFormData.logo.startsWith('/uploads/')) {
      try {
        await deleteSiteLogo(siteFormData.logo)
      } catch (error) {
        console.error('删除网站Logo文件失败:', error)
      }
    }

    setSiteFormData({
      ...siteFormData,
      logo: ''
    })
    setToast({ show: true, type: 'success', message: 'Logo删除成功' })
  }

  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingSite?.id) {
        const response = await updateAdminSite(editingSite.id, siteFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '网站更新成功' })
          await loadSites(1)
          resetSiteForm()
        }
      } else {
        const response = await createAdminSite(siteFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '网站添加成功' })
          await loadSites(1)
          resetSiteForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleSiteEdit = (site: Site) => {
    setEditingSite(site)
    // 兼容旧数据：如果?is_frontend_visible 字段，转换为 display_type
    let displayType: 'frontend' | 'backend' | 'both' = site.display_type || 'both'
    if (!site.display_type && site.is_frontend_visible !== undefined) {
      displayType = site.is_frontend_visible ? 'both' : 'backend'
    }
    setSiteFormData({
      name: site.name,
      link: site.link,
      description: site.description || '',
      logo: site.logo || '',
      sort_order: site.sort_order || 0,
      display_type: displayType,
      category_id: site.category_id || null,
      is_recommended: site.is_recommended || false
    })
    setShowSiteForm(true)
  }

  const handleSiteDelete = async (id: number) => {
    if (!confirm('确定要删除这个网站吗？')) return

    try {
      const response = await deleteAdminSite(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '网站删除成功' })
        await loadSites(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetSiteForm = () => {
    setSiteFormData({
      name: '',
      link: '',
      description: '',
      logo: '',
      sort_order: 0,
      display_type: 'both',
      category_id: null,
      is_recommended: false
    })
    setEditingSite(null)
    setShowSiteForm(false)
  }

  // 分类管理相关函数
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue: any = value
    if (type === 'checkbox') {
      finalValue = checked
    } else if (name === 'sort_order') {
      finalValue = parseInt(value) || 0
    }

    setCategoryFormData({
      ...categoryFormData,
      [name]: finalValue
    })
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      setToast({ show: true, type: 'error', message: '分类名称不能为空' })
      return
    }

    try {
      if (editingCategory?.id) {
        const response = await updateAdminNavigationCategory(editingCategory.id, categoryFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '分类更新成功' })
          await loadCategories()
          resetCategoryForm()
        }
      } else {
        const response = await createAdminNavigationCategory(categoryFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '分类添加成功' })
          await loadCategories()
          resetCategoryForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleCategoryEdit = (category: NavigationCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      sort_order: category.sort_order || 0,
      is_visible: category.is_visible !== undefined ? category.is_visible : true
    })
    setShowCategoryForm(true)
  }

  const handleCategoryDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？如果有站点使用此分类，将无法删除。')) return

    try {
      const response = await deleteAdminNavigationCategory(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '分类删除成功' })
        await loadCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '', icon: '', sort_order: 0, is_visible: true })
    setEditingCategory(null)
    setShowCategoryForm(false)
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

          {/* 标签页切?*/}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('sites')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'sites'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                网站导航管理
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                导航分类管理
              </button>
            </nav>
          </div>

          {/* 网站导航管理标签?*/}
          {activeTab === 'sites' && (
            <>
              {/* 添加按钮 */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    if (showSiteForm) {
                      resetSiteForm()
                      return
                    }
                    setEditingSite(null)
                    setSiteFormData({
                      name: '',
                      link: '',
                      description: '',
                      logo: '',
                      sort_order: 0,
                      display_type: 'both',
                      category_id: null,
                      is_recommended: false
                    })
                    setShowSiteForm(true)
                  }}
                  className="btn btn-primary"
                >
                  {showSiteForm ? '关闭弹窗' : '+ 添加网站'}
                </button>
              </div>

              {/* 添加/编辑弹窗 */}
              {showSiteForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={resetSiteForm}
                    className="absolute inset-0 bg-black/40"
                  />
                  <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold">
                        {editingSite ? '编辑网站' : '添加网站'}
                      </h2>
                      <button type="button" onClick={resetSiteForm} className="btn btn-secondary">
                        关闭
                      </button>
                    </div>

                    <form onSubmit={handleSiteSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          网站名称
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={siteFormData.name}
                          onChange={handleSiteChange}
                          className="input"
                          placeholder="例如：GitHub"
                        />
                      </div>

                      <div>
                        <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
                          网站地址
                        </label>
                        <input
                          id="link"
                          name="link"
                          type="text"
                          required
                          value={siteFormData.link}
                          onChange={handleSiteChange}
                          className="input"
                          placeholder="https://localhost"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          支持完整URL、相对路径（如 /about）或锚点链接（如 #contact）                      </p>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                          描述 (可选)
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          value={siteFormData.description}
                          onChange={handleSiteChange}
                          className="input"
                          placeholder="简单描述这个网站.."
                        />
                      </div>

                      <div>
                        <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                          Logo (可选)
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {siteFormData.logo && (
                            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
                              <img
                                src={getImageUrl(siteFormData.logo)}
                                alt="Logo"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                            {!siteFormData.logo && (
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
                                  className={`w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-600 hover:shadow-md text-xs cursor-pointer whitespace-nowrap text-center ${
                                    uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {uploadingLogo ? '上传中..' : '选择文件'}
                                </label>
                              </>
                            )}
                            <input
                              id="logo"
                              name="logo"
                              type="text"
                              value={siteFormData.logo}
                              onChange={handleSiteChange}
                              placeholder="Logo URL"
                              className="w-full sm:flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                            />
                            {siteFormData.logo && (
                              <button
                                type="button"
                                onClick={handleLogoDelete}
                                className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:bg-red-600 hover:shadow-md text-xs whitespace-nowrap"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          上传Logo图片或输入自定义URL
                        </p>
                      </div>

                      <div>
                        <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                          导航分类
                        </label>
                        <select
                          id="category_id"
                          name="category_id"
                          value={siteFormData.category_id || ''}
                          onChange={handleSiteChange}
                          className="input"
                        >
                          <option value="">未分类</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.icon ? `${category.icon} ` : ''}{category.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          选择导航所属的分类，未选择则不会在前台分类展示中显示                      </p>
                      </div>

                      <div>
                        <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                          排序 (可选)
                        </label>
                        <input
                          id="sort_order"
                          name="sort_order"
                          type="number"
                          value={siteFormData.sort_order}
                          onChange={handleSiteChange}
                          className="input"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          展示位置
                        </label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="display_type"
                              value="frontend"
                              checked={siteFormData.display_type === 'frontend'}
                              onChange={handleSiteChange}
                              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-gray-700">前台展示</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="display_type"
                              value="backend"
                              checked={siteFormData.display_type === 'backend'}
                              onChange={handleSiteChange}
                              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-gray-700">后台展示</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="display_type"
                              value="both"
                              checked={siteFormData.display_type === 'both'}
                              onChange={handleSiteChange}
                              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-gray-700">前后台都展示</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="is_recommended"
                          name="is_recommended"
                          type="checkbox"
                          checked={siteFormData.is_recommended}
                          onChange={handleSiteChange}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <label htmlFor="is_recommended" className="ml-2 text-sm font-medium text-gray-700">
                          推荐导航（勾选后会在"导航推荐"区块中显示）
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button type="submit" className="btn btn-primary w-full sm:w-auto">
                          {editingSite ? '更新' : '添加'}
                        </button>
                        <button type="button" onClick={resetSiteForm} className="btn btn-secondary w-full sm:w-auto">
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 搜索?*/}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="搜索网站名称、链接或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* 网站列表 */}
              <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">已添加的网站</h2>
                    <div className="text-sm text-gray-500 mt-0.5">
                      第 {currentPage}/{totalPages} 页 · 共 {totalCount} 条
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadSites(Math.max(1, currentPage - 1))}
                      disabled={sitesLoading || currentPage <= 1}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSites(Math.min(totalPages, currentPage + 1))}
                      disabled={sitesLoading || currentPage >= totalPages}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      下一页
                    </button>
                    {sitesLoading && (
                      <div className="text-sm text-gray-500 whitespace-nowrap">加载中...</div>
                    )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 whitespace-nowrap">每页</span>
                      <select
                        value={perPage}
                        onChange={(e) => setPerPage(Number(e.target.value))}
                        className="input !py-1.5 !px-2 !w-[88px]"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
                {totalCount === 0 && !searchQuery.trim() ? (
                  <p className="text-gray-500 text-center py-8">
                    还没有添加任何网站                  </p>
                ) : totalCount === 0 && searchQuery.trim() ? (
                  <p className="text-gray-500 text-center py-8">
                    没有找到匹配 "{searchQuery}" 的网站                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {sites.map((site) => (
                      <div
                        key={site.id}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-gray-900 break-words">{site.name}</h3>
                            {site.sort_order !== undefined && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                排序: {site.sort_order}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              // 兼容旧数据逻辑
                              (() => {
                                const displayType = site.display_type || (site.is_frontend_visible === false ? 'backend' : 'both');
                                return displayType === 'frontend' ? 'bg-purple-100 text-purple-700' :
                                       displayType === 'backend' ? 'bg-gray-100 text-gray-700' :
                                       'bg-green-100 text-green-700';
                              })()
                            }`}>
                              {(() => {
                                const displayType = site.display_type || (site.is_frontend_visible === false ? 'backend' : 'both');
                                return displayType === 'frontend' ? '前台' :
                                       displayType === 'backend' ? '后台' : '前后台';
                              })()}
                            </span>
                          </div>
                          <a
                            href={site.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline break-all"
                          >
                            {site.link}
                          </a>
                          {site.description && (
                            <p className="text-sm text-gray-600 mt-1">{site.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-4">
                          <button
                            onClick={() => handleSiteEdit(site)}
                            className="btn btn-secondary text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => site.id && handleSiteDelete(site.id)}
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
            </>
          )}

          {/* 导航分类管理标签?*/}
          {activeTab === 'categories' && (
            <>
              {/* 添加按钮 */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    if (showCategoryForm) {
                      resetCategoryForm()
                      return
                    }
                    setEditingCategory(null)
                    setCategoryFormData({ name: '', description: '', icon: '', sort_order: 0, is_visible: true })
                    setShowCategoryForm(true)
                  }}
                  className="btn btn-primary"
                >
                  {showCategoryForm ? '关闭弹窗' : '+ 添加分类'}
                </button>
              </div>

              {/* 添加/编辑弹窗 */}
              {showCategoryForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={resetCategoryForm}
                    className="absolute inset-0 bg-black/40"
                  />
                  <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold">
                        {editingCategory ? '编辑分类' : '添加分类'}
                      </h2>
                      <button type="button" onClick={resetCategoryForm} className="btn btn-secondary">
                        关闭
                      </button>
                    </div>

                    <form onSubmit={handleCategorySubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          分类名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={categoryFormData.name}
                          onChange={handleCategoryChange}
                          className="input"
                          placeholder="例如：开发工具"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          分类描述
                        </label>
                        <textarea
                          name="description"
                          value={categoryFormData.description}
                          onChange={handleCategoryChange}
                          rows={3}
                          className="input"
                          placeholder="分类的详细描述"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          分类图标
                        </label>
                        <input
                          type="text"
                          name="icon"
                          value={categoryFormData.icon}
                          onChange={handleCategoryChange}
                          className="input"
                          placeholder="例如：📝 或 emoji 表情"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          可以使用 emoji 表情作为图标
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          排序顺序
                        </label>
                        <input
                          type="number"
                          name="sort_order"
                          value={categoryFormData.sort_order}
                          onChange={handleCategoryChange}
                          className="input"
                          placeholder="数字越小越靠前"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_visible"
                          checked={categoryFormData.is_visible}
                          onChange={handleCategoryChange}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          前端可见
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button type="submit" className="btn btn-primary w-full sm:w-auto">
                          {editingCategory ? '更新' : '添加'}
                        </button>
                        <button type="button" onClick={resetCategoryForm} className="btn btn-secondary w-full sm:w-auto">
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 分类列表 */}
              <div className="card overflow-hidden">
                <h2 className="text-lg font-semibold mb-4 px-6 pt-6">分类列表</h2>
                <div className="sm:hidden">
                  {categories.length === 0 ? (
                    <div className="px-6 pb-6 text-center text-gray-500">
                      暂无分类数据
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {categories.map((category) => (
                        <div key={category.id} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{category.icon || '📁'}</span>
                                <span className="text-sm font-medium text-gray-900 break-words">{category.name}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-white/70 text-gray-700 rounded">
                                  排序: {category.sort_order}
                                </span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  category.is_visible
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {category.is_visible ? '可见' : '隐藏'}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-gray-500 break-words">
                                {category.description || '-'}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleCategoryEdit(category)}
                                className="btn btn-secondary text-sm"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => category.id && handleCategoryDelete(category.id)}
                                className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          图标
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          描述
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          排序
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状?                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            暂无分类数据
                          </td>
                        </tr>
                      ) : (
                        categories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-2xl">
                              {category.icon || '📁'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {category.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {category.description || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.sort_order}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                category.is_visible
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {category.is_visible ? '可见' : '隐藏'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleCategoryEdit(category)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => category.id && handleCategoryDelete(category.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
