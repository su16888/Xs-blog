'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminGalleries,
  getAdminGallery,
  createGallery,
  updateGallery,
  deleteGallery,
  uploadGalleryImages,
  deleteGalleryImage,
  updateGalleryImageOrder,
  getAdminGalleryCategories,
  createGalleryCategory,
  updateGalleryCategory,
  deleteGalleryCategory,
  getImageUrl
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'
import { Image, Plus, Edit, Trash2, Upload, Eye, EyeOff, Lock, Folder } from 'lucide-react'

interface Gallery {
  id?: number
  title: string
  description?: string
  category_id?: number | null
  password?: string
  cover_image?: string
  is_visible?: boolean
  sort_order?: number
  image_count?: number
  images?: GalleryImage[]
  hasPassword?: boolean
}

interface GalleryImage {
  id: number
  filename: string
  path: string
  sort_order: number
}

interface GalleryCategory {
  id?: number
  name: string
  description?: string
  icon?: string
  sort_order?: number
  is_visible?: boolean
  galleryCount?: number
}

export default function GalleriesPage() {
  usePageTitle('图库管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'galleries' | 'categories'>('galleries')

  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // 图册管理状态
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null)
  const [showGalleryForm, setShowGalleryForm] = useState(false)
  const [galleryFormData, setGalleryFormData] = useState<Gallery>({
    title: '',
    description: '',
    category_id: null,
    password: '',
    is_visible: true,
    sort_order: 0
  })
  const [showPassword, setShowPassword] = useState(false)

  // 分类管理状态
  const [editingCategory, setEditingCategory] = useState<GalleryCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState<GalleryCategory>({
    name: '',
    description: '',
    icon: '',
    sort_order: 0,
    is_visible: true
  })

  // 图片上传状态
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedGalleryForUpload, setSelectedGalleryForUpload] = useState<number | null>(null)

  // 图片管理状态
  const [showImageManager, setShowImageManager] = useState(false)
  const [managingGallery, setManagingGallery] = useState<Gallery | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null)

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setPage(1)
    try {
      await Promise.all([fetchGalleries(1, true), fetchCategories()])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGalleries = async (pageNum: number = page, reset: boolean = false) => {
    try {
      const response = await getAdminGalleries({ page: pageNum, limit: pageSize })
      if (response.success) {
        const pageData = Array.isArray(response.data) ? response.data : []

        if (reset) {
          setGalleries(pageData)
        } else {
          setGalleries(prev => {
            const existingIds = new Set(prev.map((g: any) => g.id))
            const newGalleries = pageData.filter((g: any) => !existingIds.has(g.id))
            return [...prev, ...newGalleries]
          })
        }

        const pagination = response.pagination
        const totalPages = Number(pagination?.total_pages ?? pagination?.totalPages)
        setHasMore(Number.isFinite(totalPages) ? pageNum < totalPages : pageData.length >= pageSize)
      }
    } catch (error) {
      console.error('Failed to fetch galleries:', error)
    }
  }

  const loadMoreGalleries = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)

    try {
      await fetchGalleries(nextPage, false)
    } catch (error) {
      console.error('Failed to load more galleries:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await getAdminGalleryCategories()
      if (response.success) {
        setCategories(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message })
  }

  // ==================== 图册管理 ====================
  const handleCreateGallery = () => {
    setEditingGallery(null)
    setGalleryFormData({
      title: '',
      description: '',
      category_id: null,
      password: '',
      is_visible: true,
      sort_order: 0
    })
    setShowGalleryForm(true)
  }

  const handleEditGallery = (gallery: Gallery) => {
    setEditingGallery(gallery)
    setGalleryFormData({
      title: gallery.title,
      description: gallery.description || '',
      category_id: gallery.category_id || null,
      password: gallery.password || '',
      is_visible: gallery.is_visible !== false,
      sort_order: gallery.sort_order || 0
    })
    setShowGalleryForm(true)
  }

  const handleSaveGallery = async () => {
    if (!galleryFormData.title.trim()) {
      showToast('error', '请输入图册标题')
      return
    }

    try {
      if (editingGallery?.id) {
        const response = await updateGallery(editingGallery.id, galleryFormData)
        if (response.success) {
          showToast('success', '图册更新成功')
          await fetchGalleries(1, true)
          setShowGalleryForm(false)
        }
      } else {
        const response = await createGallery(galleryFormData)
        if (response.success) {
          showToast('success', '图册创建成功')
          await fetchGalleries(1, true)
          setShowGalleryForm(false)
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '操作失败')
    }
  }

  const handleDeleteGallery = async (id: number) => {
    if (!confirm('确定要删除这个图册吗？这将同时删除图册中的所有图片！')) return

    try {
      const response = await deleteGallery(id)
      if (response.success) {
        showToast('success', '图册删除成功')
        await fetchGalleries(1, true)
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '删除失败')
    }
  }

  const handleUploadImages = async (galleryId: number, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setSelectedGalleryForUpload(galleryId)

    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('images', file)
      })

      const response = await uploadGalleryImages(galleryId, formData)
      if (response.success) {
        showToast('success', `成功上传 ${files.length} 张图片`)

        // 重新获取图册列表
        await fetchGalleries(1, true)

        // 如果当前正在管理这个图册，立即更新图片管理器
        if (managingGallery?.id === galleryId) {
          try {
            const refreshed = await getAdminGallery(galleryId)
            if (refreshed.success) {
              setManagingGallery(refreshed.data)
            }
          } catch {}
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '上传失败')
    } finally {
      setUploadingImages(false)
      setSelectedGalleryForUpload(null)
    }
  }

  // 打开图片管理器
  const handleManageImages = async (gallery: Gallery) => {
    if (!gallery?.id) return
    try {
      const response = await getAdminGallery(gallery.id)
      if (response.success) {
        setManagingGallery(response.data)
        setShowImageManager(true)
      } else {
        showToast('error', response.message || '加载图册图片失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || error.message || '加载图册图片失败')
    }
  }

  // 拖拽开始
  const handleDragStart = (index: number) => {
    setDraggedImageIndex(index)
  }

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverImageIndex(index)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    if (draggedImageIndex === null || dragOverImageIndex === null || !managingGallery?.images) {
      setDraggedImageIndex(null)
      setDragOverImageIndex(null)
      return
    }

    if (draggedImageIndex === dragOverImageIndex) {
      setDraggedImageIndex(null)
      setDragOverImageIndex(null)
      return
    }

    // 重新排序图片
    const newImages = [...managingGallery.images]
    const [removed] = newImages.splice(draggedImageIndex, 1)
    newImages.splice(dragOverImageIndex, 0, removed)

    // 更新sort_order
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      sort_order: index
    }))

    // 更新本地状态
    setManagingGallery({
      ...managingGallery,
      images: updatedImages
    })

    // 保存到服务器
    saveImageOrder(managingGallery.id!, updatedImages)

    setDraggedImageIndex(null)
    setDragOverImageIndex(null)
  }

  // 保存图片排序
  const saveImageOrder = async (galleryId: number, images: GalleryImage[]) => {
    try {
      const imageOrders = images.map((img, index) => ({
        id: img.id,
        sort_order: index
      }))

      const response = await updateGalleryImageOrder(galleryId, imageOrders)
      if (response.success) {
        showToast('success', '排序已保存')

        // 更新封面图片（第一张为封面）
        const newCoverImage = images.length > 0 ? images[0].path : null

        // 同步更新 galleries 列表中的封面
        setGalleries(prev => prev.map(g =>
          g.id === galleryId
            ? { ...g, cover_image: newCoverImage || undefined }
            : g
        ))

        // 更新 managingGallery 的封面
        if (managingGallery?.id === galleryId) {
          setManagingGallery(prev => prev ? { ...prev, cover_image: newCoverImage || undefined } : null)
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '排序保存失败')
    }
  }

  // 删除单张图片
  const handleDeleteImage = async (galleryId: number, imageId: number) => {
    if (!confirm('确定要删除这张图片吗？')) return

    try {
      const response = await deleteGalleryImage(galleryId, imageId)
      if (response.success) {
        showToast('success', '图片删除成功')

        // 立即从本地状态中移除图片，实现即时更新
        if (managingGallery?.id === galleryId && managingGallery.images) {
          const updatedImages = managingGallery.images.filter(img => img.id !== imageId)
          const newImageCount = updatedImages.length

          // 更新封面图片（第一张为封面）
          const newCoverImage = updatedImages.length > 0 ? updatedImages[0].path : null

          setManagingGallery({
            ...managingGallery,
            images: updatedImages,
            image_count: newImageCount,
            cover_image: newCoverImage || undefined
          })

          // 同时更新 galleries 列表中的对应图册
          setGalleries(prev => prev.map(g =>
            g.id === galleryId
              ? { ...g, image_count: newImageCount, cover_image: newCoverImage || undefined }
              : g
          ))
        } else {
          // 如果不在管理器中，只刷新图册列表
          await fetchGalleries(1, true)
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '删除失败')
    }
  }

  // ==================== 分类管理 ====================
  const handleCreateCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({
      name: '',
      description: '',
      icon: '',
      sort_order: 0,
      is_visible: true
    })
    setShowCategoryForm(true)
  }

  const handleEditCategory = (category: GalleryCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      sort_order: category.sort_order || 0,
      is_visible: category.is_visible !== false
    })
    setShowCategoryForm(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showToast('error', '请输入分类名称')
      return
    }

    try {
      if (editingCategory?.id) {
        const response = await updateGalleryCategory(editingCategory.id, categoryFormData)
        if (response.success) {
          showToast('success', '分类更新成功')
          await fetchCategories()
          setShowCategoryForm(false)
        }
      } else {
        const response = await createGalleryCategory(categoryFormData)
        if (response.success) {
          showToast('success', '分类创建成功')
          await fetchCategories()
          setShowCategoryForm(false)
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '操作失败')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？')) return

    try {
      const response = await deleteGalleryCategory(id)
      if (response.success) {
        showToast('success', '分类删除成功')
        await fetchCategories()
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '删除失败')
    }
  }

  // 不显示页面级loading UI，直接渲染内容
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
            <div className="flex gap-2 sm:gap-4 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('galleries')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'galleries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                图册管理
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                分类管理
              </button>
            </div>

            {/* 图册管理Tab内容 */}
            {activeTab === 'galleries' && (
              <div className="mt-6">
                {/* 操作栏 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="text-sm text-gray-500">
                    共 {galleries.length} 个图册
                  </div>
                  <button
                    onClick={handleCreateGallery}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    创建图册
                  </button>
                </div>

                {/* 图册列表 - 横向列表布局 */}
                <div className="space-y-3">
                  {galleries.map((gallery) => (
                    <div
                      key={gallery.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-wrap items-start gap-4 p-4">
                        {/* 左侧封面图 */}
                        <div className="relative w-24 h-24 flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg overflow-hidden">
                          {gallery.cover_image ? (
                            <img
                              src={getImageUrl(gallery.cover_image)}
                              alt={gallery.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-8 h-8 text-blue-400" />
                            </div>
                          )}
                          {gallery.hasPassword && (
                            <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded-full p-1">
                              <Lock className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {!gallery.is_visible && (
                            <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
                              未发布
                            </div>
                          )}
                        </div>

                        {/* 中间信息区 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 mb-1 truncate">
                            {gallery.title}
                          </h3>
                          {gallery.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                              {gallery.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              {gallery.image_count || 0} 张图片
                            </span>
                            {gallery.category_id && categories.find(c => c.id === gallery.category_id) && (
                              <span className="flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {categories.find(c => c.id === gallery.category_id)?.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 右侧操作按钮 */}
                        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-2 flex-shrink-0">
                          <label className="cursor-pointer w-full">
                            <input
                              type="file"
                              multiple
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                              className="hidden"
                              onChange={(e) => handleUploadImages(gallery.id!, e.target.files)}
                              disabled={uploadingImages && selectedGalleryForUpload === gallery.id}
                            />
                            <div className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors whitespace-nowrap">
                              <Upload className="w-4 h-4" />
                              {uploadingImages && selectedGalleryForUpload === gallery.id ? '上传中...' : '上传'}
                            </div>
                          </label>
                          <button
                            onClick={() => handleManageImages(gallery)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors whitespace-nowrap"
                            title="管理图片"
                          >
                            <Image className="w-4 h-4" />
                            管理
                          </button>
                          <button
                            onClick={() => handleEditGallery(gallery)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGallery(gallery.id!)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {galleries.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                      <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>暂无图册</p>
                    </div>
                  )}

                  {/* 加载更多按钮 */}
                  {hasMore && galleries.length > 0 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={loadMoreGalleries}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </span>
                        ) : (
                          '加载更多'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

      {/* 分类管理Tab内容 */}
      {activeTab === 'categories' && (
        <div className="mt-6">
          {/* 操作栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="text-sm text-gray-500">
              共 {categories.length} 个分类
            </div>
            <button
              onClick={handleCreateCategory}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加分类
            </button>
          </div>

          {/* 分类列表 */}
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无分类
            </div>
          ) : (
            <>
              <div className="sm:hidden bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 break-words">{category.name}</div>
                          <div className="mt-2 text-sm text-gray-500 break-words">
                            {category.description || '-'}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              图册 {category.galleryCount || 0}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              排序 {category.sort_order}
                            </span>
                            {category.is_visible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 font-medium bg-green-100 text-green-700 rounded">
                                <Eye className="w-3 h-3" />
                                可见
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 font-medium bg-gray-100 text-gray-700 rounded">
                                <EyeOff className="w-3 h-3" />
                                隐藏
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id!)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden sm:block bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      描述
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      图册数
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      排序
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {category.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {category.galleryCount || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {category.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        {category.is_visible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            <Eye className="w-3 h-3" />
                            可见
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            <EyeOff className="w-3 h-3" />
                            隐藏
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id!)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </div>
</div>

      {/* 图册表单弹窗 */}
      {showGalleryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-hidden">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveGallery(); }} className="p-4 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <h2 className="text-xl font-bold mb-6">
                {editingGallery ? '编辑图册' : '创建图册'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    图册标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={galleryFormData.title}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入图册标题"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    图册描述
                  </label>
                  <textarea
                    value={galleryFormData.description}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入图册描述"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    所属分类
                  </label>
                  <select
                    value={galleryFormData.category_id || ''}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, category_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">无分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    访问密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="gallery-password"
                      autoComplete="off"
                      value={galleryFormData.password}
                      onChange={(e) => setGalleryFormData({ ...galleryFormData, password: e.target.value })}
                      className="w-full px-4 py-2 pr-10 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={editingGallery?.hasPassword ? '已设置密码，留空则不修改' : '留空则无需密码'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">设置密码后，用户需要输入密码才能查看图片</p>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={galleryFormData.is_visible}
                      onChange={(e) => setGalleryFormData({ ...galleryFormData, is_visible: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-border-primary rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-primary">前台可见</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    排序
                  </label>
                  <input
                    type="number"
                    value={galleryFormData.sort_order}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, sort_order: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="数字越小越靠前"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowGalleryForm(false)}
                  className="w-full sm:flex-1 px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 分类表单弹窗 */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <h2 className="text-xl font-bold mb-6">
                {editingCategory ? '编辑分类' : '创建分类'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    分类名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入分类名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    分类描述
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入分类描述"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    排序
                  </label>
                  <input
                    type="number"
                    value={categoryFormData.sort_order}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="数字越小越靠前"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryFormData.is_visible}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, is_visible: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-border-primary rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-primary">前台可见</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setShowCategoryForm(false)}
                  className="w-full sm:flex-1 px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="w-full sm:flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 图片管理器弹窗 */}
      {showImageManager && managingGallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200">
            <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl font-bold break-words">
                      {managingGallery.title} - 图片管理
                    </h2>
                    <p className="text-xs sm:text-sm text-text-tertiary mt-1 break-words">
                      共 {managingGallery.images?.length || 0} 张图片 • 拖拽图片可调整排序 • 第一张为封面
                    </p>
                  </div>
                  <button
                    onClick={() => setShowImageManager(false)}
                    className="p-2 hover:bg-bg-secondary rounded-lg transition-colors shrink-0"
                    aria-label="关闭"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">

              {/* 图片网格 */}
              {managingGallery.images && managingGallery.images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {managingGallery.images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group bg-bg-secondary rounded-lg overflow-hidden cursor-move ${
                        draggedImageIndex === index ? 'opacity-50' : ''
                      } ${
                        dragOverImageIndex === index ? 'ring-2 ring-primary-600' : ''
                      }`}
                    >
                      {/* 图片 */}
                      <div className="relative w-full pt-[100%]">
                        <img
                          src={getImageUrl(image.path)}
                          alt={image.filename}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* 排序标识 */}
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
                          #{index + 1}
                          {index === 0 && <span className="ml-1">封面</span>}
                        </div>
                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteImage(managingGallery.id!, image.id)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除图片"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* 文件名 */}
                      <div className="p-2">
                        <p className="text-xs text-text-tertiary truncate" title={image.filename}>
                          {image.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-tertiary">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>暂无图片，请先上传图片</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowImageManager(false)}
                  className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  完成
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
