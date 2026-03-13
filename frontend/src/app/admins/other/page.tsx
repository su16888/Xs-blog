'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminMessages,
  getAdminMessageCategories,
  updateAdminMessageStatus,
  deleteAdminMessage,
  createAdminMessageCategory,
  updateAdminMessageCategory,
  deleteAdminMessageCategory
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getAdminRoute } from '@/lib/adminConfig'
import AdminToast from '@/components/AdminToast'

interface Message {
  id: number
  name: string
  contact: string
  category_id?: number
  MessageCategory?: {
    id: number
    name: string
  }
  content: string
  attachments?: string
  ip_address: string
  user_agent?: string
  status: 'pending' | 'read' | 'replied'
  created_at: string
  updated_at: string
}

interface MessageCategory {
  id: number
  name: string
  sort_order: number
}

export default function MessageManagementPage() {
  usePageTitle('留言管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'message-categories'>('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageCategories, setMessageCategories] = useState<MessageCategory[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<MessageCategory | null>(null)
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    if (activeTab === 'messages') {
      setSelectedMessage(null)
      loadMessages(1)
    } else if (activeTab === 'message-categories') {
      loadMessageCategories()
    }
  }, [activeTab])

  // 留言管理相关函数
  const loadMessages = async (page = 1, limit = perPage) => {
    setLoadingMessages(true)
    try {
      const response = await getAdminMessages({ page, limit })
      if (response.success && response.data) {
        // 后端返回格式：{ success: true, data: { messages: [], pagination: {} } }
        setMessages(response.data.messages || [])
        const pagination = response.data.pagination || {}
        const nextTotalPages = Number(pagination.total_pages ?? pagination.totalPages ?? 1)
        const nextTotalCount = Number(pagination.total_count ?? pagination.total ?? 0)
        const nextPage = Number(pagination.page ?? page)
        setTotalPages(Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1)
        setTotalCount(Number.isFinite(nextTotalCount) && nextTotalCount >= 0 ? nextTotalCount : 0)
        setCurrentPage(Number.isFinite(nextPage) && nextPage > 0 ? nextPage : 1)
      } else {
        setMessages([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalCount(0)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoadingMessages(false)
    }
  }

  const loadMessageCategories = async () => {
    try {
      const response = await getAdminMessageCategories()
      if (response.success && response.data) {
        setMessageCategories(response.data)
      }
    } catch (error) {
      console.error('Failed to load message categories:', error)
      setMessageCategories([])
    }
  }

  const handleUpdateMessageStatus = async (id: number, status: 'pending' | 'read' | 'replied') => {
    try {
      const response = await updateAdminMessageStatus(id, status)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '状态更新成功' })
        loadMessages()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '更新失败' })
    }
  }

  const handleDeleteMessage = async (id: number) => {
    if (!confirm('确定要删除这条留言吗？此操作不可恢复。')) {
      return
    }

    try {
      const response = await deleteAdminMessage(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '留言删除成功' })
        loadMessages()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setToast({ show: true, type: 'error', message: '分类名称不能为空' })
      return
    }

    try {
      const response = await createAdminMessageCategory({ name: newCategoryName })
      if (response.success) {
        setToast({ show: true, type: 'success', message: '分类创建成功' })
        setNewCategoryName('')
        loadMessageCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '创建失败' })
    }
  }

  const handleUpdateCategory = async (category: MessageCategory) => {
    try {
      const response = await updateAdminMessageCategory(category.id, {
        name: category.name,
        sort_order: category.sort_order
      })
      if (response.success) {
        setToast({ show: true, type: 'success', message: '分类更新成功' })
        setEditingCategory(null)
        loadMessageCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '更新失败' })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？此操作不可恢复。')) {
      return
    }

    try {
      const response = await deleteAdminMessageCategory(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '分类删除成功' })
        loadMessageCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'read': return 'bg-blue-100 text-blue-800'
      case 'replied': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理'
      case 'read': return '已读'
      case 'replied': return '已回复'
      default: return status
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
        <div className="max-w-4xl mx-auto">
          {/* 功能选项卡 */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                留言列表
              </button>
              <button
                onClick={() => setActiveTab('message-categories')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'message-categories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                留言分类
              </button>
            </div>

            {/* 留言管理内容 */}
            {activeTab === 'messages' && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">留言列表</h2>
                  {/* <div className="text-sm text-gray-500">
                    留言提交页面：<a href="/messages" target="_blank" className="text-blue-600 hover:text-blue-800">/messages</a>
                  </div> */}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="text-sm text-gray-500">
                    第 {currentPage}/{totalPages} 页 · 共 {totalCount} 条
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadMessages(Math.max(1, currentPage - 1))}
                        disabled={loadingMessages || currentPage <= 1}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        onClick={() => loadMessages(Math.min(totalPages, currentPage + 1))}
                        disabled={loadingMessages || currentPage >= totalPages}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        下一页
                      </button>
                      {loadingMessages && <div className="text-sm text-gray-500 whitespace-nowrap">加载中...</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 whitespace-nowrap">每页</span>
                      <select
                        value={perPage}
                        onChange={(e) => {
                          const next = Number(e.target.value) || 20
                          setPerPage(next)
                          loadMessages(1, next)
                        }}
                        className="px-2 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 !w-[88px]"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>

                {messages.length === 0 && !loadingMessages ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无留言
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 max-w-full overflow-x-auto overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            时间
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            用户
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            分类
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
                        {messages.map((message) => (
                          <tr key={message.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {new Date(message.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{message.name}</div>
                                <div className="text-sm text-gray-500">{message.contact}</div>
                                <div className="text-xs text-gray-400 font-mono">{message.ip_address}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {message.MessageCategory?.name || '未分类'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={message.status}
                                onChange={(e) => handleUpdateMessageStatus(message.id, e.target.value as any)}
                                className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${getStatusColor(message.status)} border-0 focus:ring-0`}
                              >
                                <option value="pending">待处理</option>
                                <option value="read">已读</option>
                                <option value="replied">已回复</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedMessage(message)}
                                  className="text-blue-600 hover:text-blue-900 text-sm"
                                >
                                  查看
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
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
                )}

                {/* 留言详情弹窗 */}
                {selectedMessage && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">留言详情</h3>
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">用户称呼</label>
                          <div className="bg-gray-50 p-3 rounded">{selectedMessage.name}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                          <div className="bg-gray-50 p-3 rounded">{selectedMessage.contact}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">留言分类</label>
                          <div className="bg-gray-50 p-3 rounded">
                            {selectedMessage.MessageCategory?.name || '未分类'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">留言内容</label>
                          <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap">
                            {selectedMessage.content}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
                          <div className="bg-gray-50 p-3 rounded font-mono">{selectedMessage.ip_address}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">提交时间</label>
                          <div className="bg-gray-50 p-3 rounded">
                            {new Date(selectedMessage.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 留言分类管理内容 */}
            {activeTab === 'message-categories' && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">留言分类管理</h2>

                {/* 添加新分类 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-md font-medium text-blue-900 mb-2">添加新分类</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="输入分类名称"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCreateCategory}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {/* 分类列表 */}
                {messageCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无分类
                  </div>
                ) : (
                  <>
                    <div className="sm:hidden space-y-3">
                      {messageCategories.map((category) => {
                        const isEditing = editingCategory?.id === category.id
                        return (
                          <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">分类名称</div>
                                    <input
                                      type="text"
                                      value={editingCategory.name}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">排序</div>
                                    <input
                                      type="number"
                                      value={editingCategory.sort_order}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, sort_order: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleUpdateCategory(editingCategory)}
                                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => setEditingCategory(null)}
                                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 break-words">{category.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">排序：{category.sort_order}</div>
                                </div>
                                <div className="flex shrink-0 flex-col gap-2">
                                  <button
                                    onClick={() => setEditingCategory(category)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="hidden sm:block bg-gray-50 rounded-lg border border-gray-200 max-w-full overflow-x-auto">
                      <table className="min-w-[520px] divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              分类名称
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              排序
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {messageCategories.map((category) => (
                            <tr key={category.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                {editingCategory?.id === category.id ? (
                                  <input
                                    type="text"
                                    value={editingCategory.name}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-900">{category.name}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {editingCategory?.id === category.id ? (
                                  <input
                                    type="number"
                                    value={editingCategory.sort_order}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span>{category.sort_order}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex flex-wrap gap-2">
                                  {editingCategory?.id === category.id ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateCategory(editingCategory)}
                                        className="text-green-600 hover:text-green-900 text-sm"
                                      >
                                        保存
                                      </button>
                                      <button
                                        onClick={() => setEditingCategory(null)}
                                        className="text-gray-600 hover:text-gray-900 text-sm"
                                      >
                                        取消
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setEditingCategory(category)}
                                        className="text-blue-600 hover:text-blue-900 text-sm"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="text-red-600 hover:text-red-900 text-sm"
                                      >
                                        删除
                                      </button>
                                    </>
                                  )}
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
    </>
  )
}
