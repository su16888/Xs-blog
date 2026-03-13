/**
 * @file api.ts
 * @description Xs-Blog 前端API接口定义
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

import axios, { AxiosInstance } from 'axios'
import { getRuntimeConfig } from './runtimeConfig'
import { getAdminPath, getAdminApiPath } from './adminConfig'
import { requestDeduplicator } from './requestDeduplicator'

// 获取运行时配置
const config = getRuntimeConfig()
const API_URL = config.apiUrl
const API_BASE_URL = API_URL.replace('/api', '') // 去掉 /api 后缀

// 将相对路径转换为完整的后端 URL
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return ''

  // 确保 path 是字符串类型
  const pathStr = typeof path === 'string' ? path : String(path)

  // 如果已经是完整 URL，直接返回
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr
  }

  // 处理绝对路径（容错处理：提取 uploads/ 之后的部分）
  if (pathStr.includes('uploads/') || pathStr.includes('uploads\\')) {
    const normalizedPath = pathStr.replace(/\\/g, '/')
    const uploadsIndex = normalizedPath.indexOf('uploads/')
    if (uploadsIndex !== -1) {
      const relativePath = normalizedPath.substring(uploadsIndex)
      return `${API_BASE_URL}/${relativePath}`
    }
  }

  // 处理以 /uploads/ 开头的路径
  if (pathStr.startsWith('/uploads/')) {
    return `${API_BASE_URL}${pathStr}`
  }

  // 处理不带 / 前缀的相对路径
  if (pathStr.startsWith('uploads/')) {
    return `${API_BASE_URL}/${pathStr}`
  }

  // 其他情况保持不变
  return pathStr
}

// 获取 API 完整 URL（用于直接 fetch 调用）
export const getApiUrl = (endpoint: string = ''): string => {
  if (!endpoint) return API_URL

  // 确保 endpoint 是字符串类型
  const endpointStr = typeof endpoint === 'string' ? endpoint : String(endpoint)

  // 如果已经是完整 URL，直接返回
  if (endpointStr.startsWith('http://') || endpointStr.startsWith('https://')) {
    return endpointStr
  }

  // API路径固定为 /api/admin/，不再进行动态替换
  // 前端自定义路径只影响页面路由，不影响API路径

  // 确保 endpoint 以 / 开头
  const normalizedEndpoint = endpointStr.startsWith('/') ? endpointStr : `/${endpointStr}`

  // 拼接完整 URL
  return `${API_URL}${normalizedEndpoint}`
}

// 构建管理API路径（用于 API 调用）
// 例如：buildAdminPath('/settings') => '/admin456/settings'
// API路径从 .env 读取 NEXT_PUBLIC_ADMIN_API_PATH
export const buildAdminPath = (path: string): string => {
  const adminApiPath = getAdminApiPath() // 从 .env 读取
  // 移除开头的 /admin/ 或 admin/
  const cleanPath = path.replace(/^\/?admin\//, '')
  return `/${adminApiPath}/${cleanPath}`
}

// 创建 axios 实例
const apiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 包装 axios 实例，添加请求去重
const api = new Proxy(apiInstance, {
  get(target, prop) {
    const original = target[prop as keyof typeof target];

    // 只对 get 方法进行去重
    if (prop === 'get' && typeof original === 'function') {
      return function(this: any, url: string, config?: any) {
        const requestKey = `GET:${url}:${JSON.stringify(config?.params || {})}`;
        return requestDeduplicator.deduplicate(requestKey, () =>
          (original as Function).call(target, url, config)
        );
      };
    }

    return original;
  }
}) as AxiosInstance;

// 请求拦截器 - 添加 token
// 注意：API路径固定为 /api/admin/，不再进行动态替换
apiInstance.interceptors.request.use(
  (config) => {
    // 添加认证 token
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        // localStorage 不可用，继续请求但不添加 token
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 只有管理后台的请求（URL包含 /admin）遇到 401 时才跳转到登录页
      // 公开页面的 401 错误（如笔记密码错误）应该让组件自己处理
      const isAdminRequest = error.config?.url?.includes('/admin')
      const isLoginRequest = error.config?.url?.includes('/auth/login')

      if (isAdminRequest && !isLoginRequest) {
        // Token 过期或无效，清除本地存储并重定向到登录页
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
          } catch (error) {
            // localStorage 不可用，忽略清除操作
          }
          // 动态后台路径
          const adminPath = getAdminPath()
          window.location.href = `/${adminPath}/login`
        }
      }
      // 其他情况（公开API、登录请求等），让错误正常传递给调用方处理
    } else if (error.response?.status === 429) {
      // 429 错误 - 请求频率过高
      // 可以在这里添加用户友好的提示
      if (typeof window !== 'undefined') {
        // 静默处理，避免控制台警告干扰
      }
    }
    return Promise.reject(error)
  }
)

// 认证相关
export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password })
  return response.data.data // 返回 data.data，因为后端返回 { success, message, data: { token, user } }
}

export const logout = async () => {
  const response = await api.post('/auth/logout')
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data.data // 返回 data.data，因为后端返回 { success, data: user }
}

// 修改密码
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.put('/auth/password', { currentPassword, newPassword })
  return response.data
}

// 修改用户名
export const changeUsername = async (currentPassword: string, newUsername: string) => {
  const response = await api.put('/auth/username', { currentPassword, newUsername })
  return response.data
}

// 个人资料相关
export const getProfile = async (userId?: number) => {
  const url = userId ? `/profile/${userId}` : '/profile'
  const response = await api.get(url)
  return response.data.data // 返回 data.data
}

export const updateProfile = async (data: any) => {
  const response = await api.put('/profile', data)
  return response.data.data // 返回 data.data
}

export const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.post('/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteAvatar = async () => {
  const response = await api.delete('/profile/avatar')
  return response.data
}

// 社交链接相关
export const getSocialLinks = async (userId?: number) => {
  const url = userId ? `/social-links/${userId}` : '/social-links'
  const response = await api.get(url)
  return response.data
}

export const createSocialLink = async (data: any) => {
  const response = await api.post('/social-links', data)
  return response.data
}

export const updateSocialLink = async (id: number, data: any) => {
  const response = await api.put(`/social-links/${id}`, data)
  return response.data
}

export const deleteSocialLink = async (id: number) => {
  const response = await api.delete(`/social-links/${id}`)
  return response.data
}

// 上传社交链接图标
export const uploadSocialLinkIcon = async (file: File) => {
  const formData = new FormData()
  formData.append('icon', file)
  const response = await api.post('/social-links/upload/icon', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 上传社交链接二维码
export const uploadSocialLinkQRCode = async (file: File) => {
  const formData = new FormData()
  formData.append('qrcode', file)
  const response = await api.post('/social-links/upload/qrcode', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 网站导航相关
export const getSites = async (userId?: number, category?: string) => {
  const url = userId ? `/sites/${userId}` : '/sites'
  const response = await api.get(url, { params: { category } })
  return response.data
}

export const getSitesGroupedByCategory = async (params?: { page?: number; limit?: number; search?: string; category_id?: number }) => {
  const response = await api.get('/sites/grouped/by-category', { params })
  return response.data
}

export const createSite = async (data: any) => {
  const response = await api.post('/sites', data)
  return response.data
}

export const updateSite = async (id: number, data: any) => {
  const response = await api.put(`/sites/${id}`, data)
  return response.data
}

export const deleteSite = async (id: number) => {
  const response = await api.delete(`/sites/${id}`)
  return response.data
}

// 导航分类相关
export const getNavigationCategories = async () => {
  const response = await api.get('/navigation-categories')
  return response.data
}

export const getNavigationCategory = async (id: number) => {
  const response = await api.get(`/navigation-categories/${id}`)
  return response.data
}

export const createNavigationCategory = async (data: any) => {
  const response = await api.post('/navigation-categories', data)
  return response.data
}

export const updateNavigationCategory = async (id: number, data: any) => {
  const response = await api.put(`/navigation-categories/${id}`, data)
  return response.data
}

export const deleteNavigationCategory = async (id: number) => {
  const response = await api.delete(`/navigation-categories/${id}`)
  return response.data
}

// ==================== 图库相关 ====================
// 获取公开图册列表
export const getGalleries = async (params?: { category_id?: number; search?: string }) => {
  const response = await api.get('/galleries', { params })
  return response.data
}

// 获取单个图册详情（需要密码参数）
export const getGallery = async (id: number, password?: string) => {
  const response = await api.get(`/galleries/${id}`, { params: { password } })
  return response.data
}

// 验证图册密码
export const verifyGalleryPassword = async (id: number, password: string) => {
  const response = await api.post(`/galleries/${id}/verify`, { password })
  return response.data
}

// 获取图册密码尝试状态
export const getGalleryPasswordStatus = async () => {
  const response = await api.get('/galleries/password-status')
  return response.data
}

// 获取图册分类列表
export const getGalleryCategories = async () => {
  const response = await api.get('/gallery-categories')
  return response.data
}

// ==================== 管理端图库API ====================
// 获取所有图册（管理后台）
export const getAdminGalleries = async (params?: { category_id?: number; search?: string; page?: number; limit?: number }) => {
  const response = await api.get('/admin/galleries', { params })
  return response.data
}

// 获取单个图册（管理后台）
export const getAdminGallery = async (id: number) => {
  const response = await api.get(`/admin/galleries/${id}`)
  return response.data
}

// 创建图册
export const createGallery = async (data: any) => {
  const response = await api.post('/admin/galleries', data)
  return response.data
}

// 更新图册
export const updateGallery = async (id: number, data: any) => {
  const response = await api.put(`/admin/galleries/${id}`, data)
  return response.data
}

// 删除图册
export const deleteGallery = async (id: number) => {
  const response = await api.delete(`/admin/galleries/${id}`)
  return response.data
}

// 上传图片到图册
export const uploadGalleryImages = async (id: number, formData: FormData) => {
  const response = await api.post(`/admin/galleries/${id}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 删除图册中的图片
export const deleteGalleryImage = async (galleryId: number, imageId: number) => {
  const response = await api.delete(`/admin/galleries/${galleryId}/images/${imageId}`)
  return response.data
}

// 更新图片排序
export const updateGalleryImageOrder = async (id: number, imageOrders: any[]) => {
  const response = await api.put(`/admin/galleries/${id}/images/order`, { imageOrders })
  return response.data
}

// 更新图册排序
export const updateGalleryOrder = async (galleryOrders: any[]) => {
  const response = await api.put('/admin/galleries/order', { galleryOrders })
  return response.data
}

// 获取所有图册分类（管理后台）
export const getAdminGalleryCategories = async () => {
  const response = await api.get('/admin/gallery-categories')
  return response.data
}

// 获取单个图册分类
export const getAdminGalleryCategory = async (id: number) => {
  const response = await api.get(`/admin/gallery-categories/${id}`)
  return response.data
}

// 创建图册分类
export const createGalleryCategory = async (data: any) => {
  const response = await api.post('/admin/gallery-categories', data)
  return response.data
}

// 更新图册分类
export const updateGalleryCategory = async (id: number, data: any) => {
  const response = await api.put(`/admin/gallery-categories/${id}`, data)
  return response.data
}

// 删除图册分类
export const deleteGalleryCategory = async (id: number) => {
  const response = await api.delete(`/admin/gallery-categories/${id}`)
  return response.data
}

// 更新图册分类排序
export const updateGalleryCategoryOrder = async (categoryOrders: any[]) => {
  const response = await api.put('/admin/gallery-categories/order', { categoryOrders })
  return response.data
}

// ==================== 服务业务相关 ====================
// 获取公开服务列表
export const getServices = async (params?: { category_id?: number; search?: string; page?: number; limit?: number }) => {
  const response = await api.get('/services', { params })
  return response.data
}

// 获取单个服务详情
export const getService = async (id: number | string) => {
  const response = await api.get(`/services/${id}`)
  return response.data
}

// 按分类分组获取服务
export const getServicesGroupedByCategory = async () => {
  const response = await api.get('/services/grouped/by-category')
  return response.data
}

// 获取服务分类列表
export const getServiceCategories = async () => {
  const response = await api.get('/service-categories')
  return response.data
}

// 创建订单
export const createOrder = async (data: {
  service_id: number
  buyer_name?: string
  buyer_contact?: string
  buyer_email?: string
  buyer_phone?: string
  buyer_address?: string
  payment_config_id?: number | null
}) => {
  const response = await api.post('/orders', data)
  return response.data
}

export const createOrderPayment = async (orderId: number) => {
  const response = await api.post(`/orders/${orderId}/pay`)
  return response.data
}

export const getOrderStatus = async (orderId: number) => {
  const response = await api.get(`/orders/${orderId}/status`)
  return response.data
}

export const getPublicPaymentConfigs = async () => {
  const response = await api.get('/payment-configs')
  return response.data
}

// ==================== 管理端服务API ====================
// 获取所有服务（管理后台）
export const getAdminServices = async (params?: { category_id?: number; search?: string; page?: number; limit?: number }) => {
  const response = await api.get('/admin/services', { params })
  return response.data
}

// 获取单个服务（管理后台）
export const getAdminService = async (id: number) => {
  const response = await api.get(`/admin/services/${id}`)
  return response.data
}

// 创建服务
export const createService = async (data: any) => {
  const response = await api.post('/admin/services', data)
  return response.data
}

// 更新服务
export const updateService = async (id: number, data: any) => {
  const response = await api.put(`/admin/services/${id}`, data)
  return response.data
}

// 删除服务
export const deleteService = async (id: number) => {
  const response = await api.delete(`/admin/services/${id}`)
  return response.data
}

// 批量删除服务
export const batchDeleteServices = async (ids: number[]) => {
  const response = await api.post('/admin/services/batch-delete', { ids })
  return response.data
}

// 上传服务封面图
export const uploadServiceCover = async (file: File) => {
  const formData = new FormData()
  formData.append('cover', file)
  const response = await api.post('/admin/services/cover/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 获取所有服务分类（管理后台）
export const getAdminServiceCategories = async () => {
  const response = await api.get('/admin/service-categories')
  return response.data
}

// 获取单个服务分类
export const getAdminServiceCategory = async (id: number) => {
  const response = await api.get(`/admin/service-categories/${id}`)
  return response.data
}

// 创建服务分类
export const createServiceCategory = async (data: any) => {
  const response = await api.post('/admin/service-categories', data)
  return response.data
}

// 更新服务分类
export const updateServiceCategory = async (id: number, data: any) => {
  const response = await api.put(`/admin/service-categories/${id}`, data)
  return response.data
}

// 删除服务分类
export const deleteServiceCategory = async (id: number) => {
  const response = await api.delete(`/admin/service-categories/${id}`)
  return response.data
}

// 批量删除服务分类
export const batchDeleteServiceCategories = async (ids: number[]) => {
  const response = await api.post('/admin/service-categories/batch-delete', { ids })
  return response.data
}

// 获取服务分类统计
export const getServiceCategoryStats = async () => {
  const response = await api.get('/admin/service-categories/stats')
  return response.data
}

export const getAdminPaymentConfigs = async (params?: { is_enabled?: boolean; search?: string }) => {
  const response = await api.get('/admin/payment-configs', { params })
  return response.data
}

export const getAdminPaymentConfig = async (id: number) => {
  const response = await api.get(`/admin/payment-configs/${id}`)
  return response.data
}

export const createAdminPaymentConfig = async (data: any) => {
  const response = await api.post('/admin/payment-configs', data)
  return response.data
}

export const updateAdminPaymentConfig = async (id: number, data: any) => {
  const response = await api.put(`/admin/payment-configs/${id}`, data)
  return response.data
}

export const deleteAdminPaymentConfig = async (id: number) => {
  const response = await api.delete(`/admin/payment-configs/${id}`)
  return response.data
}

export const getAdminOrders = async (params?: any) => {
  const response = await api.get('/admin/orders', { params })
  return response.data
}

export const getAdminOrder = async (id: number) => {
  const response = await api.get(`/admin/orders/${id}`)
  return response.data
}

export const updateAdminOrder = async (id: number, data: any) => {
  const response = await api.put(`/admin/orders/${id}`, data)
  return response.data
}

export const markAdminOrderPaid = async (id: number) => {
  const response = await api.post(`/admin/orders/${id}/mark-paid`)
  return response.data
}

export const cancelAdminOrder = async (id: number, cancel_reason?: string) => {
  const response = await api.post(`/admin/orders/${id}/cancel`, { cancel_reason })
  return response.data
}

export const completeAdminOrder = async (id: number) => {
  const response = await api.post(`/admin/orders/${id}/complete`)
  return response.data
}

export const shipAdminOrder = async (id: number, tracking_no: string) => {
  const response = await api.post(`/admin/orders/${id}/ship`, { tracking_no })
  return response.data
}

export const deleteAdminOrder = async (id: number) => {
  const response = await api.delete(`/admin/orders/${id}`)
  return response.data
}

export const bulkDeleteAdminOrders = async (action: 'unpaid' | 'paid' | 'all') => {
  const confirm_token =
    action === 'unpaid'
      ? 'DELETE_UNPAID_ORDERS'
      : action === 'paid'
        ? 'DELETE_PAID_ORDERS'
        : 'DELETE_ALL_ORDERS'
  const response = await api.post('/admin/orders/bulk-delete', { action, confirm_token })
  return response.data
}

export const getAdminCards = async (params?: any) => {
  const response = await api.get('/admin/cards', { params })
  return response.data
}

export const importAdminCards = async (data: { service_id: number; card_codes?: string[]; cards_text?: string }) => {
  const response = await api.post('/admin/cards/import', data)
  return response.data
}

export const updateAdminCard = async (id: number, data: any) => {
  const response = await api.put(`/admin/cards/${id}`, data)
  return response.data
}

export const deleteAdminCard = async (id: number) => {
  const response = await api.delete(`/admin/cards/${id}`)
  return response.data
}

// 笔记相关
export const getNotes = async (userId?: number, params?: any) => {
  const url = userId ? `/notes/${userId}` : '/notes'
  const response = await api.get(url, { params })
  return response.data
}

export const getNote = async (id: number) => {
  const response = await api.get(`/notes/${id}`)
  return response.data
}

export const createNote = async (data: any) => {
  const response = await api.post('/notes', data)
  return response.data
}

export const updateNote = async (id: number, data: any) => {
  const response = await api.put(`/notes/${id}`, data)
  return response.data
}

export const deleteNote = async (id: number) => {
  const response = await api.delete(`/notes/${id}`)
  return response.data
}

export const searchNotes = async (query: string, params?: any) => {
  const response = await api.get('/notes/search', { params: { q: query, ...params } })
  return response.data
}

// 上传笔记媒体文件
export const uploadNoteMedia = async (files: FileList) => {
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('files', file)
  })
  const response = await api.post('/notes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// ==================== 管理API（/api/admin/*） ====================
// 以下函数用于后台管理，需要认证，路径为 /api/admin/*

// 管理 - 设置相关
export const getAdminSettings = async () => {
  const response = await api.get('/admin/settings')
  return response.data
}

export const getAdminSetting = async (key: string) => {
  const response = await api.get(`/admin/settings/${key}`)
  return response.data
}

// 管理 - S3存储配置
export const getS3Config = async () => {
  const response = await api.get('/admin/settings/s3/config')
  return response.data
}

export const saveS3Config = async (config: {
  storageType: string
  endpoint?: string
  region?: string
  bucket?: string
  accessKeyId?: string
  secretAccessKey?: string
  customDomain?: string
  pathStyle?: boolean
}) => {
  const response = await api.post('/admin/settings/s3/config', config)
  return response.data
}

export const testS3Connection = async (config: {
  endpoint: string
  region?: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  pathStyle?: boolean
}) => {
  const response = await api.post('/admin/settings/s3/test', config)
  return response.data
}

// 管理 - 个人资料
export const getAdminProfile = async () => {
  const response = await api.get('/admin/profile')
  return response.data.data
}

// 管理 - 社交链接
export const getAdminSocialLinks = async () => {
  const response = await api.get('/admin/social-links')
  return response.data
}

// 管理 - 网站导航
export const getAdminSites = async (paramsOrCategory?: string | { category?: string; search?: string; page?: number; limit?: number }) => {
  const params =
    typeof paramsOrCategory === 'string'
      ? { category: paramsOrCategory }
      : (paramsOrCategory ?? {});

  const response = await api.get('/admin/sites', { params })
  return response.data
}

// 管理 - 导航分类
export const getAdminNavigationCategories = async () => {
  const response = await api.get('/admin/navigation-categories')
  return response.data
}

// 管理 - 笔记
export const getAdminNotes = async (params?: any) => {
  const response = await api.get('/admin/notes', { params })
  return response.data
}

export const getAdminNote = async (id: number) => {
  const response = await api.get(`/admin/notes/${id}`)
  return response.data
}

export const getAdminNoteCategories = async () => {
  const response = await api.get('/admin/notes/categories/list')
  return response.data
}

export const getAdminNoteTagStats = async () => {
  const response = await api.get('/admin/notes/tags/stats')
  return response.data
}

export const getAdminNoteDisks = async (id: number) => {
  const response = await api.get(`/admin/notes/${id}/disks`)
  return response.data
}

// 管理 - 便签
export const getAdminStickyNotes = async (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
  const response = await api.get('/admin/sticky-notes', { params })
  return response.data
}

export const getAdminStickyNoteCategories = async () => {
  const response = await api.get('/admin/sticky-notes/categories')
  return response.data
}

export const getAdminStickyNote = async (id: number) => {
  const response = await api.get(`/admin/sticky-notes/${id}`)
  return response.data
}

// 管理 - 待办事项
export const getAdminTodos = async (params?: { page?: number; limit?: number; search?: string; status?: 'pending' | 'completed' | 'all' }) => {
  const response = await api.get('/admin/todos', { params })
  return response.data
}

export const getAdminTodo = async (id: number) => {
  const response = await api.get(`/admin/todos/${id}`)
  return response.data
}

export const getAdminPendingReminders = async () => {
  const response = await api.get('/admin/todos/reminders')
  return response.data
}

// 管理 - 标签
export const getAdminTags = async (params?: { category?: string; search?: string }) => {
  const response = await api.get('/admin/tags', { params })
  return response.data
}

export const getAdminTagStats = async () => {
  const response = await api.get('/admin/tags/stats')
  return response.data
}

export const getAdminTagCategories = async () => {
  const response = await api.get('/admin/tags/categories')
  return response.data
}

export const getAdminTag = async (id: number) => {
  const response = await api.get(`/admin/tags/${id}`)
  return response.data
}

// 管理 - 分类
export const getAdminCategories = async (params?: { type?: string; search?: string }) => {
  const response = await api.get('/admin/categories', { params })
  return response.data
}

export const getAdminCategory = async (id: number) => {
  const response = await api.get(`/admin/categories/${id}`)
  return response.data
}

export const getAdminCategoryStats = async (type: string) => {
  const response = await api.get('/admin/categories/stats', { params: { type } })
  return response.data
}

// 管理 - 留言分类
export const getAdminMessageCategories = async () => {
  const response = await api.get('/admin/message-categories')
  return response.data
}

// 管理 - 留言
export const getAdminMessages = async (params?: any) => {
  const response = await api.get('/admin/messages', { params })
  return response.data
}

export const getAdminMessage = async (id: number) => {
  const response = await api.get(`/admin/messages/${id}`)
  return response.data
}

// 管理 - 元数据
export const getAdminMetadataStats = async () => {
  const response = await api.get('/admin/metadata/stats')
  return response.data
}

// 管理 - 设置修改
export const updateAdminSetting = async (key: string, value: any, type?: string) => {
  const response = await api.put(`/admin/settings/${key}`, { value, type })
  return response.data
}

export const deleteAdminSetting = async (key: string) => {
  const response = await api.delete(`/admin/settings/${key}`)
  return response.data
}

export const updateAdminSettings = async (settings: any) => {
  const response = await api.post('/admin/settings/batch', { settings })
  return response.data
}

export const uploadAdminBackgroundImage = async (file: File) => {
  const formData = new FormData()
  formData.append('background', file)
  const response = await api.post('/admin/settings/background/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteAdminBackgroundImage = async () => {
  const response = await api.delete('/admin/settings/background')
  return response.data
}

export const uploadAdminImage = async (fileOrFormData: File | FormData) => {
  let formData: FormData

  if (fileOrFormData instanceof File) {
    formData = new FormData()
    formData.append('image', fileOrFormData)
  } else {
    formData = fileOrFormData
  }

  const response = await api.post('/admin/settings/image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 博客主题上传函数
export const uploadBlogThemeLogo = async (file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  const response = await api.post('/admin/blog-theme/logo/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const uploadBlogThemeCarousel = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/admin/blog-theme/carousel/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const uploadBlogThemeNavIcon = async (file: File) => {
  const formData = new FormData()
  formData.append('icon', file)
  const response = await api.post('/admin/blog-theme/nav-icon/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const uploadAdminPaymentConfigLogo = async (id: number, file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  const response = await api.post(`/admin/payment-configs/${id}/logo/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 博客主题删除函数
export const deleteBlogThemeImage = async (url: string) => {
  const response = await api.delete('/admin/blog-theme/logo', { data: { url } })
  return response.data
}

// 网站导航上传函数
export const uploadSiteLogo = async (file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  const response = await api.post('/admin/sites/logo/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteSiteLogo = async (url: string) => {
  const response = await api.delete('/admin/sites/logo', { data: { url } })
  return response.data
}

export const uploadAdminCustomFont = async (file: File) => {
  const formData = new FormData()
  formData.append('font', file)
  const response = await api.post('/admin/settings/font/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteAdminCustomFont = async () => {
  const response = await api.delete('/admin/settings/font')
  return response.data
}

// 管理 - 个人资料修改
export const updateAdminProfile = async (data: any) => {
  const response = await api.put('/admin/profile', data)
  return response.data
}

export const uploadAdminAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.post('/admin/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteAdminAvatar = async () => {
  const response = await api.delete('/admin/profile/avatar')
  return response.data
}

export const uploadAdminProfileBackground = async (file: File) => {
  const formData = new FormData()
  formData.append('background', file)
  const response = await api.post('/admin/profile/background', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteAdminProfileBackground = async () => {
  const response = await api.delete('/admin/profile/background')
  return response.data
}

// 管理 - 社交链接修改
export const getAdminSocialLink = async (id: number) => {
  const response = await api.get(`/admin/social-links/${id}`)
  return response.data
}

export const createAdminSocialLink = async (data: any) => {
  const response = await api.post('/admin/social-links', data)
  return response.data
}

export const updateAdminSocialLink = async (id: number, data: any) => {
  const response = await api.put(`/admin/social-links/${id}`, data)
  return response.data
}

export const deleteAdminSocialLink = async (id: number) => {
  const response = await api.delete(`/admin/social-links/${id}`)
  return response.data
}

export const uploadAdminSocialLinkIcon = async (file: File) => {
  const formData = new FormData()
  formData.append('icon', file)
  const response = await api.post('/admin/social-links/upload/icon', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const uploadAdminSocialLinkQRCode = async (file: File) => {
  const formData = new FormData()
  formData.append('qrcode', file)
  const response = await api.post('/admin/social-links/upload/qrcode', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 管理 - 网站导航修改
export const getAdminSite = async (id: number) => {
  const response = await api.get(`/admin/sites/${id}`)
  return response.data
}

export const createAdminSite = async (data: any) => {
  const response = await api.post('/admin/sites', data)
  return response.data
}

export const updateAdminSite = async (id: number, data: any) => {
  const response = await api.put(`/admin/sites/${id}`, data)
  return response.data
}

export const deleteAdminSite = async (id: number) => {
  const response = await api.delete(`/admin/sites/${id}`)
  return response.data
}

// 管理 - 导航分类修改
export const getAdminNavigationCategory = async (id: number) => {
  const response = await api.get(`/admin/navigation-categories/${id}`)
  return response.data
}

export const createAdminNavigationCategory = async (data: any) => {
  const response = await api.post('/admin/navigation-categories', data)
  return response.data
}

export const updateAdminNavigationCategory = async (id: number, data: any) => {
  const response = await api.put(`/admin/navigation-categories/${id}`, data)
  return response.data
}

export const deleteAdminNavigationCategory = async (id: number) => {
  const response = await api.delete(`/admin/navigation-categories/${id}`)
  return response.data
}

// 管理 - 笔记修改
export const createAdminNote = async (data: any) => {
  const response = await api.post('/admin/notes', data)
  return response.data
}

export const updateAdminNote = async (id: number, data: any) => {
  const response = await api.put(`/admin/notes/${id}`, data)
  return response.data
}

export const deleteAdminNote = async (id: number) => {
  const response = await api.delete(`/admin/notes/${id}`)
  return response.data
}

export const uploadAdminNoteMedia = async (files: FileList) => {
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('files', file)
  })
  const response = await api.post('/admin/notes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const addAdminNoteDisk = async (noteId: number, data: any) => {
  const response = await api.post(`/admin/notes/${noteId}/disks`, data)
  return response.data
}

export const updateAdminNoteDisk = async (noteId: number, diskId: number, data: any) => {
  const response = await api.put(`/admin/notes/${noteId}/disks/${diskId}`, data)
  return response.data
}

export const deleteAdminNoteDisk = async (noteId: number, diskId: number) => {
  const response = await api.delete(`/admin/notes/${noteId}/disks/${diskId}`)
  return response.data
}

// 管理 - 便签修改
export const createAdminStickyNote = async (data: any) => {
  const response = await api.post('/admin/sticky-notes', data)
  return response.data
}

export const updateAdminStickyNote = async (id: number, data: any) => {
  const response = await api.put(`/admin/sticky-notes/${id}`, data)
  return response.data
}

export const deleteAdminStickyNote = async (id: number) => {
  const response = await api.delete(`/admin/sticky-notes/${id}`)
  return response.data
}

export const updateAdminStickyNotesOrder = async (notes: Array<{id: number, sort_order: number}>) => {
  const response = await api.post('/admin/sticky-notes/sort', { notes })
  return response.data
}

// 管理 - 待办事项修改
export const createAdminTodo = async (data: any) => {
  const response = await api.post('/admin/todos', data)
  return response.data
}

export const updateAdminTodo = async (id: number, data: any) => {
  const response = await api.put(`/admin/todos/${id}`, data)
  return response.data
}

export const deleteAdminTodo = async (id: number) => {
  const response = await api.delete(`/admin/todos/${id}`)
  return response.data
}

export const dismissAdminReminder = async (id: number, action: 'ignore' | 'disable') => {
  const response = await api.post(`/admin/todos/${id}/dismiss-reminder`, { action })
  return response.data
}

// 管理 - 标签修改
export const getAdminTagNotes = async (id: number) => {
  const response = await api.get(`/admin/tags/${id}/notes`)
  return response.data
}

export const createAdminTag = async (data: any) => {
  const response = await api.post('/admin/tags', data)
  return response.data
}

export const updateAdminTag = async (id: number, data: any) => {
  const response = await api.put(`/admin/tags/${id}`, data)
  return response.data
}

export const deleteAdminTag = async (id: number) => {
  const response = await api.delete(`/admin/tags/${id}`)
  return response.data
}

// 管理 - 分类修改
export const createAdminCategory = async (data: any) => {
  const response = await api.post('/admin/categories', data)
  return response.data
}

export const updateAdminCategory = async (id: number, data: any) => {
  const response = await api.put(`/admin/categories/${id}`, data)
  return response.data
}

export const deleteAdminCategory = async (id: number) => {
  const response = await api.delete(`/admin/categories/${id}`)
  return response.data
}

// 管理 - 留言分类修改
export const getAdminMessageCategory = async (id: number) => {
  const response = await api.get(`/admin/message-categories/${id}`)
  return response.data
}

export const createAdminMessageCategory = async (data: any) => {
  const response = await api.post('/admin/message-categories', data)
  return response.data
}

export const updateAdminMessageCategory = async (id: number, data: any) => {
  const response = await api.put(`/admin/message-categories/${id}`, data)
  return response.data
}

export const deleteAdminMessageCategory = async (id: number) => {
  const response = await api.delete(`/admin/message-categories/${id}`)
  return response.data
}

// 管理 - 留言修改
export const updateAdminMessageStatus = async (id: number, status: string) => {
  const response = await api.put(`/admin/messages/${id}/status`, { status })
  return response.data
}

export const deleteAdminMessage = async (id: number) => {
  const response = await api.delete(`/admin/messages/${id}`)
  return response.data
}

// ==================== 公开API（/api/*） ====================
// 以下函数用于前台公开访问，无需认证

// 设置相关
export const getSettings = async () => {
  const response = await api.get('/settings')
  return response.data
}

export const getSetting = async (key: string) => {
  const response = await api.get(`/settings/${key}`)
  return response.data
}

export const updateSetting = async (key: string, value: any, type?: string) => {
  const response = await api.put('/settings', { key, value, type })
  return response.data
}

export const updateSettings = async (settings: any) => {
  const response = await api.post('/settings/batch', { settings })
  return response.data
}

export const deleteSetting = async (key: string) => {
  const response = await api.delete(`/settings/${key}`)
  return response.data
}

// 背景图片相关
export const uploadBackgroundImage = async (file: File) => {
  const formData = new FormData()
  formData.append('background', file)
  const response = await api.post('/settings/background/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteBackgroundImage = async () => {
  const response = await api.delete('/settings/background')
  return response.data
}

// 通用图片上传（不保存到设置中）
export const uploadImage = async (fileOrFormData: File | FormData) => {
  let formData: FormData

  // 如果传入的是 File 对象，创建 FormData
  if (fileOrFormData instanceof File) {
    formData = new FormData()
    formData.append('image', fileOrFormData)
  } else {
    // 如果传入的已经是 FormData，直接使用
    formData = fileOrFormData
  }

  const response = await api.post('/settings/image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 自定义字体相关
export const uploadCustomFont = async (file: File) => {
  const formData = new FormData()
  formData.append('font', file)
  const response = await api.post('/settings/font/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteCustomFont = async () => {
  const response = await api.delete('/settings/font')
  return response.data
}

// 便签相关
export const getStickyNotes = async (params?: { category?: string; search?: string }) => {
  const response = await api.get('/sticky-notes', { params })
  return response.data
}

export const getStickyNoteCategories = async () => {
  const response = await api.get('/sticky-notes/categories')
  return response.data
}

export const getStickyNote = async (id: number) => {
  const response = await api.get(`/sticky-notes/${id}`)
  return response.data
}

export const createStickyNote = async (data: any) => {
  const response = await api.post('/sticky-notes', data)
  return response.data
}

export const updateStickyNote = async (id: number, data: any) => {
  const response = await api.put(`/sticky-notes/${id}`, data)
  return response.data
}

export const deleteStickyNote = async (id: number) => {
  const response = await api.delete(`/sticky-notes/${id}`)
  return response.data
}

export const updateStickyNotesOrder = async (notes: Array<{id: number, sort_order: number}>) => {
  const response = await api.post('/sticky-notes/sort', { notes })
  return response.data
}

// 待办事项相关
export const getTodos = async () => {
  const response = await api.get('/todos')
  return response.data
}

export const getTodo = async (id: number) => {
  const response = await api.get(`/todos/${id}`)
  return response.data
}

export const createTodo = async (data: any) => {
  const response = await api.post('/todos', data)
  return response.data
}

export const updateTodo = async (id: number, data: any) => {
  const response = await api.put(`/todos/${id}`, data)
  return response.data
}

export const deleteTodo = async (id: number) => {
  const response = await api.delete(`/todos/${id}`)
  return response.data
}

export const getPendingReminders = async () => {
  const response = await api.get('/admin/todos/reminders')
  return response.data
}

export const dismissReminder = async (id: number, action: 'ignore' | 'disable') => {
  const response = await api.post(`/admin/todos/${id}/dismiss-reminder`, { action })
  return response.data
}

// 标签相关
export const getTags = async (params?: { category?: string; search?: string }) => {
  const response = await api.get('/tags', { params })
  return response.data
}

export const getTag = async (id: number) => {
  const response = await api.get(`/tags/${id}`)
  return response.data
}

export const createTag = async (data: any) => {
  const response = await api.post('/tags', data)
  return response.data
}

export const updateTag = async (id: number, data: any) => {
  const response = await api.put(`/tags/${id}`, data)
  return response.data
}

export const deleteTag = async (id: number) => {
  const response = await api.delete(`/tags/${id}`)
  return response.data
}

export const getTagStats = async () => {
  const response = await api.get('/tags/stats')
  return response.data
}

export const getTagNotes = async (id: number) => {
  const response = await api.get(`/tags/${id}/notes`)
  return response.data
}

export const getTagCategories = async () => {
  const response = await api.get('/tags/categories')
  return response.data
}

// 分类相关
export const getCategories = async (params?: { type?: string; search?: string }) => {
  const response = await api.get('/categories', { params })
  return response.data
}

export const getCategory = async (id: number) => {
  const response = await api.get(`/categories/${id}`)
  return response.data
}

export const createCategory = async (data: any) => {
  const response = await api.post('/categories', data)
  return response.data
}

export const updateCategory = async (id: number, data: any) => {
  const response = await api.put(`/categories/${id}`, data)
  return response.data
}

export const deleteCategory = async (id: number) => {
  const response = await api.delete(`/categories/${id}`)
  return response.data
}

export const getCategoryStats = async (type: string) => {
  const response = await api.get('/categories/stats', { params: { type } })
  return response.data
}

// 笔记分类和标签相关
export const getNoteCategories = async () => {
  const response = await api.get('/notes/categories/list')
  return response.data
}

export const createNoteCategory = async (data: any) => {
  const response = await api.post('/categories', { ...data, type: 'note' })
  return response.data
}

export const updateNoteCategory = async (id: number, data: any) => {
  const response = await api.put(`/categories/${id}`, data)
  return response.data
}

export const deleteNoteCategory = async (id: number) => {
  const response = await api.delete(`/categories/${id}`)
  return response.data
}

export const getNoteTagStats = async () => {
  const response = await api.get('/notes/tags/stats')
  return response.data
}

// 版本管理相关
export const getCurrentVersion = async () => {
  try {
    const response = await api.get('/admin/version/current')
    return response.data
  } catch (error) {
    console.error('获取当前版本失败:', error)
    throw error
  }
}

export const checkVersionUpdate = async () => {
  try {
    const response = await api.get('/admin/version/check-update')
    return response.data
  } catch (error) {
    console.error('检查版本更新失败:', error)
    throw error
  }
}

// 忽略版本更新提醒
export const dismissVersionUpdate = async (version: string) => {
  try {
    // 将忽略的版本保存到 localStorage
    try {
      localStorage.setItem('dismissedVersion', version)
    } catch (storageError) {
      // localStorage 不可用，返回失败
      return { success: false, error: 'localStorage not available' }
    }
    return { success: true }
  } catch (error) {
    console.error('保存忽略版本失败:', error)
    throw error
  }
}

// 获取已忽略的版本
export const getDismissedVersion = (): string | null => {
  try {
    return localStorage.getItem('dismissedVersion')
  } catch (error) {
    // localStorage 不可用，返回 null
    return null
  }
}

// 清除已忽略的版本（用于重新显示更新提醒）
export const clearDismissedVersion = () => {
  try {
    try {
      localStorage.removeItem('dismissedVersion')
    } catch (storageError) {
      // localStorage 不可用，返回失败
      return { success: false, error: 'localStorage not available' }
    }
    return { success: true }
  } catch (error) {
    console.error('清除忽略版本失败:', error)
    throw error
  }
}

// 留言相关
// 获取留言分类
export const getMessageCategories = async () => {
  const response = await api.get('/message-categories')
  return response.data
}

// 创建留言分类
export const createMessageCategory = async (data: any) => {
  const response = await api.post('/message-categories', data)
  return response.data
}

// 更新留言分类
export const updateMessageCategory = async (id: number, data: any) => {
  const response = await api.put(`/message-categories/${id}`, data)
  return response.data
}

// 删除留言分类
export const deleteMessageCategory = async (id: number) => {
  const response = await api.delete(`/message-categories/${id}`)
  return response.data
}

// 获取留言列表
export const getMessages = async (params?: any) => {
  const response = await api.get('/messages', { params })
  return response.data
}

// 获取单个留言详情
export const getMessage = async (id: number) => {
  const response = await api.get(`/messages/${id}`)
  return response.data
}

// 更新留言状态
export const updateMessageStatus = async (id: number, status: string) => {
  const response = await api.put(`/messages/${id}/status`, { status })
  return response.data
}

// 删除留言
export const deleteMessage = async (id: number) => {
  const response = await api.delete(`/messages/${id}`)
  return response.data
}

// 提交留言
export const submitMessage = async (data: any) => {
  const response = await api.post('/messages', data)
  return response.data
}

// 获取验证码
export const getCaptcha = async () => {
  const response = await api.get('/captcha')
  return response.data
}

// 获取待处理留言数量
export const getPendingMessagesCount = async () => {
  const response = await api.get('/admin/messages?status=pending&page=1&limit=1')
  return response.data
}

// 官网主题图片上传（保存到 uploads/official 目录）
export const uploadOfficialImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/admin/settings/official/image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 删除官网主题图片
export const deleteOfficialImage = async (url: string) => {
  const response = await api.delete('/admin/settings/official/image', { data: { url } })
  return response.data
}

// ==================== 官网主题相关 ====================
// 获取官网主题所有数据（公开API）
export const getPromoData = async () => {
  const response = await api.get('/promo/data')
  return response.data
}

// ==================== 管理端官网主题API ====================
// 基础配置管理
export const getPromoConfigs = async () => {
  const response = await api.get('/promo/admin/configs')
  return response.data
}

export const updatePromoConfig = async (key: string, data: any) => {
  const response = await api.put(`/promo/admin/configs/${key}`, data)
  return response.data
}

export const batchUpdatePromoConfigs = async (configs: any) => {
  const response = await api.post('/promo/admin/configs/batch', { configs })
  return response.data
}

// 导航菜单管理
export const getPromoNavItems = async () => {
  const response = await api.get('/promo/admin/nav-items')
  return response.data
}

export const createPromoNavItem = async (data: any) => {
  const response = await api.post('/promo/admin/nav-items', data)
  return response.data
}

export const updatePromoNavItem = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/nav-items/${id}`, data)
  return response.data
}

export const deletePromoNavItem = async (id: number) => {
  const response = await api.delete(`/promo/admin/nav-items/${id}`)
  return response.data
}

// 统计数据管理
export const getPromoStats = async () => {
  const response = await api.get('/promo/admin/stats')
  return response.data
}

export const createPromoStat = async (data: any) => {
  const response = await api.post('/promo/admin/stats', data)
  return response.data
}

export const updatePromoStat = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/stats/${id}`, data)
  return response.data
}

export const deletePromoStat = async (id: number) => {
  const response = await api.delete(`/promo/admin/stats/${id}`)
  return response.data
}

// 服务分类管理
export const getPromoServiceCategories = async () => {
  const response = await api.get('/promo/admin/service-categories')
  return response.data
}

export const createPromoServiceCategory = async (data: any) => {
  const response = await api.post('/promo/admin/service-categories', data)
  return response.data
}

export const updatePromoServiceCategory = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/service-categories/${id}`, data)
  return response.data
}

export const deletePromoServiceCategory = async (id: number) => {
  const response = await api.delete(`/promo/admin/service-categories/${id}`)
  return response.data
}

// 服务项管理
export const getPromoServices = async () => {
  const response = await api.get('/promo/admin/services')
  return response.data
}

export const createPromoService = async (data: any) => {
  const response = await api.post('/promo/admin/services', data)
  return response.data
}

export const updatePromoService = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/services/${id}`, data)
  return response.data
}

export const deletePromoService = async (id: number) => {
  const response = await api.delete(`/promo/admin/services/${id}`)
  return response.data
}

// 团队成员管理
export const getPromoTeamMembers = async () => {
  const response = await api.get('/promo/admin/team-members')
  return response.data
}

export const createPromoTeamMember = async (data: any) => {
  const response = await api.post('/promo/admin/team-members', data)
  return response.data
}

export const updatePromoTeamMember = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/team-members/${id}`, data)
  return response.data
}

export const deletePromoTeamMember = async (id: number) => {
  const response = await api.delete(`/promo/admin/team-members/${id}`)
  return response.data
}

// 合作伙伴管理
export const getPromoPartners = async () => {
  const response = await api.get('/promo/admin/partners')
  return response.data
}

export const createPromoPartner = async (data: any) => {
  const response = await api.post('/promo/admin/partners', data)
  return response.data
}

export const updatePromoPartner = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/partners/${id}`, data)
  return response.data
}

export const deletePromoPartner = async (id: number) => {
  const response = await api.delete(`/promo/admin/partners/${id}`)
  return response.data
}

// 联系方式管理
export const getPromoContactMethods = async () => {
  const response = await api.get('/promo/admin/contact-methods')
  return response.data
}

export const createPromoContactMethod = async (data: any) => {
  const response = await api.post('/promo/admin/contact-methods', data)
  return response.data
}

export const updatePromoContactMethod = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/contact-methods/${id}`, data)
  return response.data
}

export const deletePromoContactMethod = async (id: number) => {
  const response = await api.delete(`/promo/admin/contact-methods/${id}`)
  return response.data
}

// 底部链接分组管理
export const getPromoFooterLinkGroups = async () => {
  const response = await api.get('/promo/admin/footer-link-groups')
  return response.data
}

export const createPromoFooterLinkGroup = async (data: any) => {
  const response = await api.post('/promo/admin/footer-link-groups', data)
  return response.data
}

export const updatePromoFooterLinkGroup = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/footer-link-groups/${id}`, data)
  return response.data
}

export const deletePromoFooterLinkGroup = async (id: number) => {
  const response = await api.delete(`/promo/admin/footer-link-groups/${id}`)
  return response.data
}

// 底部链接管理
export const getPromoFooterLinks = async (groupId?: number) => {
  const response = await api.get('/promo/admin/footer-links', { params: { group_id: groupId } })
  return response.data
}

export const createPromoFooterLink = async (data: any) => {
  const response = await api.post('/promo/admin/footer-links', data)
  return response.data
}

export const updatePromoFooterLink = async (id: number, data: any) => {
  const response = await api.put(`/promo/admin/footer-links/${id}`, data)
  return response.data
}

export const deletePromoFooterLink = async (id: number) => {
  const response = await api.delete(`/promo/admin/footer-links/${id}`)
  return response.data
}

// 官网主题图片上传
export const uploadPromoImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/promo/admin/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 官网主题图片删除
export const deletePromoImage = async (path: string) => {
  const response = await api.delete('/promo/admin/image', { data: { path } })
  return response.data
}

// ==================== 朋友圈相关 ====================
// 获取朋友圈个人资料（公开）
export const getSocialFeedProfile = async () => {
  const response = await api.get('/social-feed/profile')
  return response.data
}

// 更新朋友圈个人资料（需要认证）
export const updateSocialFeedProfile = async (data: any) => {
  const response = await api.put('/social-feed/profile', data)
  return response.data
}

// 上传朋友圈封面图（需要认证）
export const uploadSocialFeedCover = async (file: File) => {
  const formData = new FormData()
  formData.append('cover', file)
  const response = await api.post('/social-feed/profile/cover', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 上传朋友圈头像（需要认证）
export const uploadSocialFeedAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.post('/social-feed/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 获取朋友圈动态列表（公开）
export const getSocialFeedPosts = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get('/social-feed/posts', { params })
  return response.data
}

// 获取所有朋友圈动态列表（管理后台用，包含草稿）
export const getAllSocialFeedPosts = async (params?: { page?: number; limit?: number; status?: 'all' | 'published' | 'draft' }) => {
  const response = await api.get('/social-feed/posts/all', { params })
  return response.data
}

// 获取朋友圈动态详情（公开）
export const getSocialFeedPost = async (id: number) => {
  const response = await api.get(`/social-feed/posts/${id}`)
  return response.data
}

// 创建朋友圈动态（需要认证）
export const createSocialFeedPost = async (data: any) => {
  const response = await api.post('/social-feed/posts', data)
  return response.data
}

// 更新朋友圈动态（需要认证）
export const updateSocialFeedPost = async (id: number, data: any) => {
  const response = await api.put(`/social-feed/posts/${id}`, data)
  return response.data
}

// 删除朋友圈动态（需要认证）
export const deleteSocialFeedPost = async (id: number) => {
  const response = await api.delete(`/social-feed/posts/${id}`)
  return response.data
}

// 上传朋友圈动态图片（需要认证）
export const uploadSocialFeedImages = async (files: FileList | File[]) => {
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('images', file)
  })
  const response = await api.post('/social-feed/posts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 批量删除朋友圈动态（需要认证）
export const batchDeleteSocialFeedPosts = async (ids: number[]) => {
  const response = await api.post('/social-feed/posts/batch-delete', { ids })
  return response.data
}

// 更新朋友圈动态排序（需要认证）
export const updateSocialFeedPostSort = async (id: number, sort_order: number) => {
  const response = await api.put(`/social-feed/posts/${id}/sort`, { sort_order })
  return response.data
}

// ==================== 统计数据相关 ====================
// 记录页面访问（公开）
export const recordPageVisit = async (page_type: string, page_path?: string) => {
  try {
    const response = await api.post('/visit', { page_type, page_path })
    return response.data
  } catch (error) {
    // 静默处理错误，不影响用户体验
    return { success: false }
  }
}

// 获取访问趋势（管理端）
export const getVisitTrends = async (params?: { period?: 'day' | 'week' | 'month'; page_type?: string }) => {
  const response = await api.get('/admin/statistics/trends', { params })
  return response.data
}

// 获取模块统计数据（管理端）
export const getModuleStats = async () => {
  const response = await api.get('/admin/statistics/modules')
  return response.data
}

// 获取IP访问排行（管理端）
export const getIPRanking = async (params?: { limit?: number; days?: number }) => {
  const response = await api.get('/admin/statistics/ip-ranking', { params })
  return response.data
}

// 获取仪表盘概览（管理端）
export const getDashboardOverview = async () => {
  const response = await api.get('/admin/statistics/overview')
  return response.data
}

// 清理访问数据（管理端）
export const clearVisitData = async () => {
  const response = await api.delete('/admin/statistics/clear-visits')
  return response.data
}

// 清理前台 Redis 缓存（管理端）
export const clearFrontendRedisCache = async () => {
  const response = await api.delete('/admin/cache/frontend')
  return response.data
}

// 获取缓存状态（管理端）
export const getCacheStatus = async () => {
  const response = await api.get('/admin/cache/status')
  return response.data
}

// ==================== 页面文本配置相关 ====================
// 获取所有页面文本配置（公开）
export const getPageTexts = async () => {
  const response = await api.get('/page-texts')
  return response.data
}

// 获取单个页面文本配置（公开）
export const getPageText = async (pageKey: string) => {
  const response = await api.get(`/page-texts/${pageKey}`)
  return response.data
}

// 获取所有页面文本配置（管理端）
export const getAdminPageTexts = async () => {
  const response = await api.get('/admin/page-texts')
  return response.data
}

// 更新单个页面文本配置（管理端）
export const updateAdminPageText = async (pageKey: string, data: any) => {
  const response = await api.put(`/admin/page-texts/${pageKey}`, data)
  return response.data
}

// 批量更新页面文本配置（管理端）
export const updateAdminPageTexts = async (pageTexts: any) => {
  const response = await api.post('/admin/page-texts/batch', { pageTexts })
  return response.data
}

// ==================== 文档排序相关 ====================
// 文档配置项接口
export interface DocConfig {
  name: string
  showInList: boolean
}

// 获取文档列表和排序配置（管理端）
export const getDocsOrder = async () => {
  const response = await api.get('/admin/docs/order')
  return response.data
}

// 保存文档排序配置（管理端）
export const saveDocsOrder = async (docsConfig: DocConfig[]) => {
  const response = await api.post('/admin/docs/order', { docsConfig })
  return response.data
}

// ==================== 投票相关 ====================
// 管理端 - 创建投票
export const createAdminPoll = async (noteId: number, data: any) => {
  const response = await api.post(`/admin/notes/${noteId}/polls`, data)
  return response.data
}

// 管理端 - 更新投票
export const updateAdminPoll = async (noteId: number, pollId: number, data: any) => {
  const response = await api.put(`/admin/notes/${noteId}/polls/${pollId}`, data)
  return response.data
}

// 管理端 - 删除投票
export const deleteAdminPoll = async (noteId: number, pollId: number) => {
  const response = await api.delete(`/admin/notes/${noteId}/polls/${pollId}`)
  return response.data
}

// 管理端 - 获取笔记的所有投票
export const getAdminNotePolls = async (noteId: number) => {
  const response = await api.get(`/admin/notes/${noteId}/polls`)
  return response.data
}

// 管理端 - 获取投票统计数据
export const getAdminPollStatistics = async (pollId: number) => {
  const response = await api.get(`/admin/polls/${pollId}/statistics`)
  return response.data
}

// 管理端 - 上传投票选项图片
export const uploadAdminPollImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/admin/polls/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 前台 - 获取笔记的投票列表
export const getNotePolls = async (noteId: number, password?: string) => {
  const response = await api.get(`/notes/${noteId}/polls`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 前台 - 提交投票
export const submitPollVote = async (pollId: number, optionIds: number[], password?: string) => {
  const response = await api.post(`/polls/${pollId}/vote`, { option_ids: optionIds, ...(password ? { password } : {}) })
  return response.data
}

// 前台 - 获取投票结果
export const getPollResults = async (pollId: number, password?: string) => {
  const response = await api.get(`/polls/${pollId}/results`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 前台 - 获取当前用户的投票记录
export const getMyPollVote = async (pollId: number, password?: string) => {
  const response = await api.get(`/polls/${pollId}/my-vote`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 管理端 - 获取投票详细记录
export const getPollVotes = async (pollId: number, page: number = 1, limit: number = 20) => {
  const response = await api.get(`/admin/polls/${pollId}/votes`, {
    params: { page, limit }
  })
  return response.data
}

// ==================== 问卷相关接口 ====================

// 管理端 - 创建问卷
export const createAdminSurvey = async (noteId: number, data: any) => {
  const response = await api.post(`/admin/notes/${noteId}/surveys`, data)
  return response.data
}

// 管理端 - 更新问卷
export const updateAdminSurvey = async (noteId: number, surveyId: number, data: any) => {
  const response = await api.put(`/admin/notes/${noteId}/surveys/${surveyId}`, data)
  return response.data
}

// 管理端 - 删除问卷
export const deleteAdminSurvey = async (noteId: number, surveyId: number) => {
  const response = await api.delete(`/admin/notes/${noteId}/surveys/${surveyId}`)
  return response.data
}

// 管理端 - 获取笔记的所有问卷
export const getAdminNoteSurveys = async (noteId: number) => {
  const response = await api.get(`/admin/notes/${noteId}/surveys`)
  return response.data
}

// 管理端 - 获取问卷提交记录
export const getSurveySubmissions = async (surveyId: number, page = 1, limit = 20) => {
  const response = await api.get(`/admin/surveys/${surveyId}/submissions`, {
    params: { page, limit }
  })
  return response.data
}

// 前台 - 获取笔记的问卷列表
export const getNoteSurveys = async (noteId: number, password?: string) => {
  const response = await api.get(`/notes/${noteId}/surveys`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 前台 - 提交问卷
export const submitSurveyAnswer = async (surveyId: number, answers: any[], password?: string) => {
  const response = await api.post(`/surveys/${surveyId}/submit`, { answers, ...(password ? { password } : {}) })
  return response.data
}

// 前台 - 获取我的提交记录
export const getMySurveySubmission = async (surveyId: number, password?: string) => {
  const response = await api.get(`/surveys/${surveyId}/my-submission`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 前台 - 获取问卷统计结果
export const getSurveyStatistics = async (surveyId: number, password?: string) => {
  const response = await api.get(`/surveys/${surveyId}/statistics`, {
    params: password ? { password } : {}
  })
  return response.data
}

// 管理端 - 导出投票数据
export const exportPollData = async (noteId: number, pollId: number) => {
  const response = await api.get(`/admin/notes/${noteId}/polls/${pollId}/export`, {
    responseType: 'blob'
  })
  return response
}

// 管理端 - 导出问卷数据
export const exportSurveyData = async (surveyId: number) => {
  const response = await api.get(`/admin/surveys/${surveyId}/export`, {
    responseType: 'blob'
  })
  return response
}

// ==================== 抽奖相关接口 ====================

// 管理端 - 创建抽奖
export const createAdminLottery = async (noteId: number, data: any) => {
  const response = await api.post(`/admin/notes/${noteId}/lotteries`, data)
  return response.data
}

// 管理端 - 更新抽奖
export const updateAdminLottery = async (noteId: number, lotteryId: number, data: any) => {
  const response = await api.put(`/admin/notes/${noteId}/lotteries/${lotteryId}`, data)
  return response.data
}

// 管理端 - 删除抽奖
export const deleteAdminLottery = async (noteId: number, lotteryId: number) => {
  const response = await api.delete(`/admin/notes/${noteId}/lotteries/${lotteryId}`)
  return response.data
}

// 管理端 - 获取笔记的所有抽奖
export const getAdminNoteLotteries = async (noteId: number) => {
  const response = await api.get(`/admin/notes/${noteId}/lotteries`)
  return response.data
}

// 管理端 - 获取抽奖统计数据
export const getAdminLotteryStatistics = async (lotteryId: number) => {
  const response = await api.get(`/admin/lotteries/${lotteryId}/statistics`)
  return response.data
}

// 管理端 - 获取抽奖参与记录
export const getLotteryEntries = async (lotteryId: number, page = 1, limit = 20) => {
  const response = await api.get(`/admin/lotteries/${lotteryId}/entries`, {
    params: { page, limit }
  })
  return response.data
}

// 管理端 - 执行开奖
export const drawLottery = async (lotteryId: number) => {
  const response = await api.post(`/admin/lotteries/${lotteryId}/draw`)
  return response.data
}

// 管理端 - 导出抽奖数据
export const exportLotteryData = async (noteId: number, lotteryId: number) => {
  const response = await api.get(`/admin/notes/${noteId}/lotteries/${lotteryId}/export`, {
    responseType: 'blob'
  })
  return response
}

// 管理端 - 上传奖项图片
export const uploadLotteryPrizeImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/admin/lotteries/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 前台 - 获取笔记的抽奖列表
export const getNoteLotteries = async (noteId: number) => {
  const response = await api.get(`/notes/${noteId}/lotteries`)
  return response.data
}

// 前台 - 参与抽奖
export const enterLottery = async (lotteryId: number, data: any) => {
  const response = await api.post(`/lotteries/${lotteryId}/enter`, data)
  return response.data
}

// 前台 - 获取我的参与记录
export const getLotteryEntry = async (lotteryId: number) => {
  const response = await api.get(`/lotteries/${lotteryId}/my-entry`)
  return response.data
}

export default api
