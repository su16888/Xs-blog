'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'
import OrdersManager from '@/components/admin/OrdersManager'
import CardsManager from '@/components/admin/CardsManager'
import PaymentConfigsManager from '@/components/admin/PaymentConfigsManager'
import UserNotifySettingsManager from '@/components/admin/UserNotifySettingsManager'
import { Plus, Edit, Trash2, Save, X, Upload, Image as ImageIcon } from 'lucide-react'
import axios from 'axios'
import { getApiUrl, getImageUrl } from '@/lib/api'

interface ServiceSpec {
  spec_name: string
  spec_value: string
  sort_order: number
}

interface Service {
  id?: number
  name: string
  description?: string
  content?: string
  content_format?: 'text' | 'markdown' | 'html'
  cover_image?: string
  price?: string
  category_id?: number | null
  is_visible?: boolean
  is_recommended?: boolean
  sort_order?: number
  show_order_button?: boolean
  order_button_text?: string
  order_button_url?: string
  spec_title?: string
  product_type?: 'card' | 'virtual' | 'physical'
  stock_total?: number
  stock_sold?: number
  show_stock?: boolean
  show_sales?: boolean
  payment_config_id?: number | null
  order_page_slug?: string
  specifications?: ServiceSpec[]
}

interface ServiceCategory {
  id?: number
  name: string
  description?: string
  icon?: string
  sort_order?: number
  is_visible?: boolean
}

interface PaymentConfig {
  id: number
  name: string
  provider_key: string
  provider_type?: string | null
  is_enabled: boolean
  sort_order: number
  remark?: string | null
}

type ProductType = NonNullable<Service['product_type']>

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  card: '卡密商品',
  virtual: '虚拟商品',
  physical: '实物商品'
}

export default function ServicesPage() {
  usePageTitle('服务业务管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [siteOrigin, setSiteOrigin] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([])
  const [activeTab, setActiveTab] = useState<'services' | 'categories' | 'orders' | 'cards' | 'payment-configs' | 'user-notify'>('services')

  // 服务管理相关状?
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceFormData, setServiceFormData] = useState<Service>({
    name: '',
    description: '',
    content: '',
    content_format: 'markdown',
    cover_image: '',
    price: '',
    category_id: null,
    is_visible: true,
    is_recommended: false,
    sort_order: 0,
    show_order_button: false,
    order_button_text: '立即下单',
    order_button_url: '',
    spec_title: '服务规格',
    product_type: 'virtual',
    stock_total: 0,
    stock_sold: 0,
    show_stock: true,
    show_sales: true,
    payment_config_id: null,
    order_page_slug: '',
    specifications: []
  })

  // 分类管理相关状?
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState<ServiceCategory>({
    name: '',
    description: '',
    icon: '',
    sort_order: 0,
    is_visible: true
  })

  // 搜索和上传状?
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [servicesLoading, setServicesLoading] = useState(false)

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSiteOrigin(window.location.origin)
  }, [])

  const loadData = async () => {
    try {
      await Promise.all([loadCategories(), loadPaymentConfigs()])
    } catch (error) {
      console.error('加载服务数据失败:', error)
    }
  }

  const loadServices = useCallback(async (pageNum = 1) => {
    setServicesLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(getApiUrl('/admin/services'), {
        params: {
          page: pageNum,
          limit: perPage,
          search: searchQuery.trim() ? searchQuery.trim() : undefined,
          category_id: selectedCategory !== null ? selectedCategory : undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setServices(response.data.data || [])
        setCurrentPage(pageNum)
        setTotalPages(Number(response.data.pagination?.total_pages || 1))
        setTotalCount(Number(response.data.pagination?.total_count || 0))
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '加载服务列表失败'
      setToast({ show: true, type: 'error', message })
      setServices([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setServicesLoading(false)
    }
  }, [perPage, searchQuery, selectedCategory])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab !== 'services') return
      loadServices(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [activeTab, loadServices])

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(getApiUrl('/admin/service-categories'), {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setCategories(response.data.data || [])
      }
    } catch (error) {
      console.error('加载服务分类失败:', error)
      setCategories([])
    }
  }

  const loadPaymentConfigs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(getApiUrl('/admin/payment-configs'), {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setPaymentConfigs(response.data.data || [])
      }
    } catch (error) {
      setPaymentConfigs([])
    }
  }

  const generateOrderPageSlug = (length = 10) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const bytes = new Uint8Array(length)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes)
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
    }
    return Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('')
  }

  const isValidPaymentPrice = (value: any) => {
    const raw = String(value ?? '').trim()
    if (!raw) return false
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return false
    const n = Number(raw)
    return Number.isFinite(n) && n > 0
  }

  const computeOrderButtonUrlFromSlug = (orderPageSlug: any) => {
    const raw = String(orderPageSlug ?? '').trim()
    if (!raw) return ''
    return raw.startsWith('/') ? raw : `/p/${raw}`
  }

  const computeOrderButtonFullUrlFromSlug = (orderPageSlug: any) => {
    const path = computeOrderButtonUrlFromSlug(orderPageSlug)
    if (!path) return ''
    const origin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : '')
    return origin ? `${origin}${path}` : path
  }

  // 服务管理函数
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue: any = value
    if (type === 'checkbox') {
      finalValue = checked
    } else if (name === 'sort_order' || name === 'stock_total' || name === 'stock_sold') {
      finalValue = parseInt(value) || 0
    } else if (name === 'category_id') {
      finalValue = value === '' ? null : parseInt(value)
    } else if (name === 'payment_config_id') {
      finalValue = value === '' ? null : parseInt(value)
    }

    setServiceFormData(prev => {
      const next = { ...prev, [name]: finalValue } as any
      if (name === 'payment_config_id' && finalValue !== null) {
        const hasSlug = typeof prev.order_page_slug === 'string' && prev.order_page_slug.trim() !== ''
        if (!hasSlug) {
          next.order_page_slug = generateOrderPageSlug(10)
        }
        next.show_order_button = true
        next.order_button_url = computeOrderButtonUrlFromSlug(next.order_page_slug || prev.order_page_slug)
      }
      return next
    })
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (!file) return

    setUploadingCover(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('cover', file)

      const response = await axios.post(getApiUrl('/admin/services/cover/upload'), formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        setServiceFormData({
          ...serviceFormData,
          cover_image: response.data.data.url
        })
        setToast({ show: true, type: 'success', message: '封面上传成功' })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '封面上传失败' })
    } finally {
      setUploadingCover(false)
    }
  }

  const handleAddSpec = () => {
    setServiceFormData({
      ...serviceFormData,
      specifications: [
        ...(serviceFormData.specifications || []),
        { spec_name: '', spec_value: '', sort_order: serviceFormData.specifications?.length || 0 }
      ]
    })
  }

  const handleSpecChange = (index: number, field: 'spec_name' | 'spec_value', value: string) => {
    const newSpecs = [...(serviceFormData.specifications || [])]
    newSpecs[index] = { ...newSpecs[index], [field]: value }
    setServiceFormData({ ...serviceFormData, specifications: newSpecs })
  }

  const handleRemoveSpec = (index: number) => {
    const newSpecs = (serviceFormData.specifications || []).filter((_, i) => i !== index)
    setServiceFormData({ ...serviceFormData, specifications: newSpecs })
  }

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (!editingService && !String(serviceFormData.cover_image || '').trim()) {
        setToast({ show: true, type: 'error', message: '请上传封面图或填写封面图URL' })
        return
      }
      if (serviceFormData.payment_config_id !== null && !isValidPaymentPrice(serviceFormData.price)) {
        setToast({ show: true, type: 'error', message: '绑定支付方式时，价格必须为合法数字（最多两位小数且大于0）' })
        return
      }

      const token = localStorage.getItem('token')
      const url = editingService?.id
        ? getApiUrl(`/admin/services/${editingService.id}`)
        : getApiUrl('/admin/services')

      const method = editingService?.id ? 'put' : 'post'

      const payload: any = { ...serviceFormData }
      if (payload.payment_config_id !== null) {
        if (!payload.order_page_slug || String(payload.order_page_slug).trim() === '') {
          payload.order_page_slug = generateOrderPageSlug(10)
        }
        payload.show_order_button = true
        payload.order_button_url = computeOrderButtonUrlFromSlug(payload.order_page_slug)
      }

      const response = await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: editingService ? '服务更新成功' : '服务创建成功' })
        await loadServices(1)
        resetServiceForm()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleServiceEdit = (service: Service) => {
    setEditingService(service)
    const boundPaymentConfigId = service.payment_config_id || null
    const orderPageSlug = service.order_page_slug || ''
    const boundOrderUrl = boundPaymentConfigId !== null ? computeOrderButtonUrlFromSlug(orderPageSlug) : (service.order_button_url || '')
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      content: service.content || '',
      content_format: service.content_format || 'markdown',
      cover_image: service.cover_image || '',
      price: service.price || '',
      category_id: service.category_id || null,
      is_visible: service.is_visible !== undefined ? service.is_visible : true,
      is_recommended: service.is_recommended || false,
      sort_order: service.sort_order || 0,
      show_order_button: boundPaymentConfigId !== null ? true : (service.show_order_button || false),
      order_button_text: service.order_button_text || '立即下单',
      order_button_url: boundOrderUrl,
      product_type: service.product_type || 'virtual',
      stock_total: service.stock_total || 0,
      stock_sold: service.stock_sold || 0,
      show_stock: service.show_stock !== undefined ? service.show_stock : true,
      show_sales: service.show_sales !== undefined ? service.show_sales : true,
      payment_config_id: boundPaymentConfigId,
      order_page_slug: orderPageSlug,
      specifications: service.specifications || []
    })
    setShowServiceForm(true)
  }

  const handleServiceDelete = async (id: number) => {
    if (!confirm('确定要删除这个服务吗？')) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(getApiUrl(`/admin/services/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: '服务删除成功' })
        await loadServices(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      description: '',
      content: '',
      content_format: 'markdown',
      cover_image: '',
      price: '',
      category_id: null,
      is_visible: true,
      is_recommended: false,
      sort_order: 0,
      show_order_button: false,
      order_button_text: '立即下单',
      order_button_url: '',
      product_type: 'virtual',
      stock_total: 0,
      stock_sold: 0,
      show_stock: true,
      show_sales: true,
      payment_config_id: null,
      order_page_slug: '',
      specifications: []
    })
    setEditingService(null)
    setShowServiceForm(false)
  }

  // 分类管理函数
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue: any = value
    if (type === 'checkbox') {
      finalValue = checked
    } else if (name === 'sort_order') {
      finalValue = parseInt(value) || 0
    }

    setCategoryFormData({ ...categoryFormData, [name]: finalValue })
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      setToast({ show: true, type: 'error', message: '分类名称不能为空' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingCategory?.id
        ? getApiUrl(`/admin/service-categories/${editingCategory.id}`)
        : getApiUrl('/admin/service-categories')

      const method = editingCategory?.id ? 'put' : 'post'

      const response = await axios[method](url, categoryFormData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: editingCategory ? '分类更新成功' : '分类创建成功' })
        await loadCategories()
        resetCategoryForm()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleCategoryEdit = (category: ServiceCategory) => {
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
    if (!confirm('确定要删除这个分类吗？该分类下的服务将不会被删除。')) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(getApiUrl(`/admin/service-categories/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ show: true, type: 'success', message: '分类删除成功' })
        await loadCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      icon: '',
      sort_order: 0,
      is_visible: true
    })
    setEditingCategory(null)
    setShowCategoryForm(false)
  }

  // 不显示页面级loading UI，直接渲染内容
  return (
    <>
      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {/* 功能选项?*/}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex flex-nowrap gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap border-b border-gray-200">
              <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                服务管理
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'categories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                分类管理
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                订单管理
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'cards'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                卡密管理
              </button>
              <button
                onClick={() => setActiveTab('payment-configs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'payment-configs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                支付配置
              </button>
              <button
                onClick={() => setActiveTab('user-notify')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === 'user-notify'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                用户通知
              </button>
            </div>

            {/* 服务管理Tab内容 */}
            {activeTab === 'services' && (
              <div className="mt-6">
                {/* 操作?*/}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <div className="text-sm text-gray-500">
                   第 {currentPage}/{totalPages} 页 · 共 {totalCount} 个服务
                  </div>
                  <button
                    onClick={() => setShowServiceForm(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加服务
                  </button>
                </div>

                {/* 搜索和筛选*/}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="搜索服务..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="w-full sm:w-56 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCategory === null ? '' : selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value === '' ? null : parseInt(e.target.value))}
                  >
                    <option value="">所有分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadServices(Math.max(1, currentPage - 1))}
                      disabled={servicesLoading || currentPage <= 1}
                      className="btn btn-secondary"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      onClick={() => loadServices(Math.min(totalPages, currentPage + 1))}
                      disabled={servicesLoading || currentPage >= totalPages}
                      className="btn btn-secondary"
                    >
                      下一页
                    </button>
                    {servicesLoading && (
                      <div className="text-sm text-gray-500">加载中...</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">每页</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* 服务列表 - 矩形网格布局，缩?0% */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* 封面图- 正方?1:1 */}
                      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-200">
                        {service.cover_image ? (
                          <img
                            src={getImageUrl(service.cover_image)}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-purple-400" />
                          </div>
                        )}
                        {service.is_recommended && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-semibold">
                            推荐
                          </div>
                        )}
                        {!service.is_visible && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs">
                            未发布
                          </div>
                        )}
                      </div>

                      {/* 服务信息 */}
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={service.name}>
                          {service.name}
                        </h3>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {service.price && (
                              <span className="text-purple-600 font-bold text-base shrink-0">
                                ¥{service.price}
                              </span>
                            )}
                            {service.product_type && (
                              <span className="text-[11px] text-gray-700 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md shrink-0">
                                {PRODUCT_TYPE_LABEL[service.product_type]}
                              </span>
                            )}
                          </div>
                          {service.category_id && categories.find(c => c.id === service.category_id) && (
                            <span className="text-xs text-gray-500 truncate min-w-0">
                              {categories.find(c => c.id === service.category_id)?.icon}{categories.find(c => c.id === service.category_id)?.name ? ` ${categories.find(c => c.id === service.category_id)?.name}` : ''}
                            </span>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleServiceEdit(service)}
                            className="flex-1 h-9 flex items-center justify-center px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleServiceDelete(service.id!)}
                            className="h-9 w-9 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalCount === 0 && !servicesLoading && (
                  <div className="text-center py-12 text-gray-500">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无服务数据</p>
                  </div>
                )}
              </div>
            )}

            {/* 分类管理Tab内容 */}
            {activeTab === 'categories' && (
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <div className="text-sm text-gray-500">
                   共 {categories.length} 个分类
                  </div>
                  <button
                    onClick={() => setShowCategoryForm(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加分类
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 w-full max-w-full overflow-x-auto overflow-y-auto overscroll-x-none touch-pan-x">
                  <table className="w-full min-w-full sm:min-w-[720px] divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类名称</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排序</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map(category => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {category.icon && <span>{category.icon}</span>}
                              <span className="font-medium text-gray-900">{category.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                            {category.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{category.sort_order}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${category.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {category.is_visible ? '可见' : '隐藏'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 sm:whitespace-nowrap">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleCategoryEdit(category)}
                                className="text-blue-600 hover:text-blue-900 text-sm text-left"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleCategoryDelete(category.id!)}
                                className="text-red-600 hover:text-red-900 text-sm text-left"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      暂无分类数据
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <OrdersManager />
            )}

            {activeTab === 'cards' && (
              <CardsManager />
            )}

            {activeTab === 'payment-configs' && (
              <PaymentConfigsManager />
            )}

            {activeTab === 'user-notify' && (
              <UserNotifySettingsManager />
            )}
          </div>
        </div>
      </div>

      {/* 服务表单弹窗 */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* 头部 - 固定 */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-semibold">{editingService ? '编辑服务' : '添加服务'}</h2>
              <button onClick={resetServiceForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 表单内容 - 可滚动，带美化滚动条 */}
            <div className="overflow-y-auto flex-1 custom-scrollbar-admin">
              <style jsx global>{`
                .custom-scrollbar-admin::-webkit-scrollbar {
                  width: 10px;
                }
                .custom-scrollbar-admin::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 10px;
                }
                .custom-scrollbar-admin::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.5);
                  border-radius: 10px;
                  transition: all 0.3s ease;
                }
                .custom-scrollbar-admin::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.7);
                }
                /* Firefox */
                .custom-scrollbar-admin {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(255, 255, 255, 0.5) rgba(255, 255, 255, 0.1);
                }
              `}</style>

              <form onSubmit={handleServiceSubmit} className="p-6 space-y-4">
                {/* 封面图 - 移到最上面，必填 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    封面图（1:1正方形）<span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="cover_image"
                      value={serviceFormData.cover_image || ''}
                      onChange={handleServiceChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="可填写 URL（如 /uploads/... 或 https://...）"
                    />

                    {serviceFormData.cover_image ? (
                      <div className="relative w-40 h-40">
                        <img src={getImageUrl(serviceFormData.cover_image)} alt="封面" className="w-full h-full object-cover rounded-lg border-2 border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setServiceFormData({ ...serviceFormData, cover_image: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                          onChange={handleCoverUpload}
                          disabled={uploadingCover}
                          className="sr-only"
                          id="cover-upload"
                        />
                        <label
                          htmlFor="cover-upload"
                          className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 border-2 border-dashed border-blue-300 transition-all"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="font-medium">
                            {uploadingCover ? '上传中...' : '点击上传封面图片'}
                          </span>
                        </label>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">支持 jpg、jpeg、png、gif、webp、svg、ico；建议上传正方形图片(1:1比例)</p>
                  </div>
                </div>

                {/* 服务名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服务名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={serviceFormData.name}
                    onChange={handleServiceChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

              {/* 服务详情 */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-sm font-medium text-gray-700">服务详情</label>
                  <select
                    name="content_format"
                    value={serviceFormData.content_format || 'markdown'}
                    onChange={handleServiceChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="text">纯文本</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                <textarea
                  name="content"
                  value={serviceFormData.content}
                  onChange={handleServiceChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm whitespace-pre-wrap"
                  rows={10}
                  placeholder="支持默认换行..."
                />
              </div>

              {/* 价格和分?*/}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">价格</label>
                  <input
                    type="text"
                    name="price"
                    value={serviceFormData.price}
                    onChange={handleServiceChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="如： 999 或 面议面议"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">服务分类</label>
                  <select
                    name="category_id"
                    value={serviceFormData.category_id === null ? '' : serviceFormData.category_id}
                    onChange={handleServiceChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">无分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品类型</label>
                  <select
                    name="product_type"
                    value={serviceFormData.product_type || 'virtual'}
                    onChange={handleServiceChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="card">卡密</option>
                    <option value="virtual">虚拟商品</option>
                    <option value="physical">实物商品</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">绑定支付配置</label>
                  <select
                    name="payment_config_id"
                    value={serviceFormData.payment_config_id === null ? '' : serviceFormData.payment_config_id}
                    onChange={handleServiceChange}
                    disabled={!isValidPaymentPrice(serviceFormData.price)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">不绑定</option>
                    {paymentConfigs.map(config => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                        {config.provider_type ? `（${config.provider_type}）` : ''}
                        {config.is_enabled ? '' : '（已禁用）'}
                      </option>
                    ))}
                  </select>
                  {!isValidPaymentPrice(serviceFormData.price) && (
                    <p className="text-xs text-gray-500 mt-1">绑定支付方式前，请先将价格填写为合法数字（最多两位小数且大于0）。</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">库存总量</label>
                  <input
                    type="number"
                    name="stock_total"
                    value={serviceFormData.stock_total}
                    onChange={handleServiceChange}
                    disabled={serviceFormData.product_type === 'card'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    min={0}
                  />
                  {serviceFormData.product_type === 'card' && (
                    <p className="text-xs text-gray-500 mt-1">卡密商品库存与卡密数量联动，无法手动修改。</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">销量（展示）</label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="show_sales"
                        checked={serviceFormData.show_sales}
                        onChange={handleServiceChange}
                        className="rounded"
                      />
                      展示
                    </label>
                  </div>
                  <input
                    type="number"
                    name="stock_sold"
                    value={serviceFormData.stock_sold}
                    onChange={handleServiceChange}
                    disabled={!serviceFormData.show_sales}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    min={0}
                  />
                  <p className="text-xs text-gray-500 mt-1">用于前台“销量”展示与排序，不会自动回写真实支付结果。</p>
                </div>
              </div>

              {serviceFormData.payment_config_id !== null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">下单页路径（系统生成）</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      name="order_page_slug"
                      value={computeOrderButtonFullUrlFromSlug(serviceFormData.order_page_slug)}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const url = computeOrderButtonFullUrlFromSlug(serviceFormData.order_page_slug)
                        try { await navigator.clipboard.writeText(url) } catch (e) {}
                      }}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                    >
                      复制链接
                    </button>
                  </div>
                  {serviceFormData.order_page_slug && (
                    <p className="text-xs text-gray-500 mt-1">前台访问：{computeOrderButtonFullUrlFromSlug(serviceFormData.order_page_slug)}</p>
                  )}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">“立即下单”按钮文案</label>
                    <input
                      type="text"
                      name="order_button_text"
                      value={serviceFormData.order_button_text}
                      onChange={handleServiceChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="例如：立即购买 / 立即下单"
                    />
                  </div>
                </div>
              )}

              {/* 服务规格 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">服务规格</label>
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    + 添加规格
                  </button>
                </div>

                {/* 规格标题自定?*/}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">规格标题（可自定义）</label>
                  <input
                    type="text"
                    name="spec_title"
                    value={serviceFormData.spec_title || '服务规格'}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="服务规格"
                  />
                </div>

                <div className="space-y-2">
                  {(serviceFormData.specifications || []).map((spec, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="规格名称"
                        value={spec.spec_name}
                        onChange={(e) => handleSpecChange(index, 'spec_name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        placeholder="规格值"
                        value={spec.spec_value}
                        onChange={(e) => handleSpecChange(index, 'spec_value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(index)}
                        className="w-full sm:w-auto px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 下单按钮配置 */}
              <div className="space-y-2">
                {serviceFormData.payment_config_id !== null ? (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="show_order_button"
                        checked
                        disabled
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">已绑定支付方式：默认显示下单按钮</span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="show_order_button"
                        checked={serviceFormData.show_order_button}
                        onChange={handleServiceChange}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">显示"立即下单"按钮</span>
                    </label>
                    {serviceFormData.show_order_button && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <input
                          type="text"
                          name="order_button_text"
                          value={serviceFormData.order_button_text}
                          onChange={handleServiceChange}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="按钮文字"
                        />
                        <div>
                          <input
                            type="text"
                            name="order_button_url"
                            value={serviceFormData.order_button_url}
                            onChange={handleServiceChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg w-full"
                            placeholder="跳转URL（支持相对路径）"
                          />
                          <p className="text-xs text-gray-500 mt-1">支持完整URL或相对路径</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 其他选项 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_visible"
                    checked={serviceFormData.is_visible}
                    onChange={handleServiceChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">前台可见</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_recommended"
                    checked={serviceFormData.is_recommended}
                    onChange={handleServiceChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">推荐服务</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="show_stock"
                    checked={serviceFormData.show_stock}
                    onChange={handleServiceChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">展示库存</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">排序</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={serviceFormData.sort_order}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="排序"
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingService ? '更新服务' : '创建服务'}
                </button>
                <button
                  type="button"
                  onClick={resetServiceForm}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      )}

      {/* 分类表单弹窗 */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingCategory ? '编辑分类' : '添加分类'}</h2>
              <button onClick={resetCategoryForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={categoryFormData.name}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类描述</label>
                <textarea
                  name="description"
                  value={categoryFormData.description}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">图标</label>
                <input
                  type="text"
                  name="icon"
                  value={categoryFormData.icon}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="如 📦"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">排序</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={categoryFormData.sort_order}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_visible"
                      checked={categoryFormData.is_visible}
                      onChange={handleCategoryChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">前台可见</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingCategory ? '更新分类' : '创建分类'}
                </button>
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminToast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </>
  )
}


