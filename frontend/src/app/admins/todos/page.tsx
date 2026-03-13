'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminTodos,
  createAdminTodo,
  updateAdminTodo,
  deleteAdminTodo
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'

interface Todo {
  id?: number
  title: string
  description?: string
  due_date?: string
  reminder_enabled: boolean
  reminder_time?: string
  is_completed: boolean
  // v2.5 新增字段
  progress?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  category?: string
  estimated_hours?: number
  actual_hours?: number
  parent_id?: number
  order_index?: number
  start_date?: string
  completed_at?: string
  created_at?: string
  updated_at?: string
  // v2.6 新增字段
  time_logs?: TimeLog[]
}

// v2.6 新增：时间点记录类型
interface TimeLog {
  id: number
  time: string
  description: string
}

// 辅助函数：将 ISO 日期字符串转换为 datetime-local 格式
const formatDateTimeLocal = (dateString: string | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    // 转换为本地时间的 YYYY-MM-DDTHH:MM 格式
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    return ''
  }
}

export default function TodosPage() {
  usePageTitle('待办事项管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Todo>({
    title: '',
    description: '',
    due_date: '',
    reminder_enabled: false,
    reminder_time: '',
    is_completed: false,
    progress: 0,
    priority: 'medium',
    status: 'todo',
    category: '',
    estimated_hours: undefined,
    actual_hours: undefined,
    start_date: '',
    time_logs: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')

  // 控制项目进度管理区域的显示
  const [progressManagementEnabled, setProgressManagementEnabled] = useState(false)

  // 进度记录弹窗相关状态
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [progressFormData, setProgressFormData] = useState<Todo>({
    title: '',
    description: '',
    due_date: '',
    reminder_enabled: false,
    reminder_time: '',
    is_completed: false,
    progress: 0,
    priority: 'medium',
    status: 'todo',
    category: '',
    estimated_hours: undefined,
    actual_hours: undefined,
    start_date: '',
    time_logs: []
  })
  const [newTimeLog, setNewTimeLog] = useState({ time: '', description: '' })

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [perPage, setPerPage] = useState(30)
  const [todosLoading, setTodosLoading] = useState(false)

  const loadTodos = useCallback(async (pageNum = 1) => {
    setTodosLoading(true)
    try {
      const trimmedSearch = searchTerm.trim()
      const response = await getAdminTodos({
        page: pageNum,
        limit: perPage,
        search: trimmedSearch ? trimmedSearch : undefined,
        status: filterStatus
      })
      if (response.success) {
        const todosData = Array.isArray(response.data) ? response.data : []
        setTodos(todosData)
        setCurrentPage(pageNum)
        setTotalPages(Number(response.pagination?.total_pages || 1))
        setTotalCount(Number(response.pagination?.total_count || 0))
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '加载待办事项失败'
      setToast({ show: true, type: 'error', message })
      setTodos([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setTodosLoading(false)
    }
  }, [filterStatus, perPage, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTodos(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [loadTodos])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type, value } = e.target
    let finalValue: any = value

    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked
    }

    setFormData({
      ...formData,
      [name]: finalValue
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // 清理数据：将空字符串的日期字段转换为 undefined
      const cleanedData = {
        ...formData,
        due_date: formData.due_date || undefined,
        reminder_time: formData.reminder_time || undefined,
        // 如果项目进度管理未启用，清空相关字段
        progress: progressManagementEnabled ? formData.progress : 0,
        priority: progressManagementEnabled ? formData.priority : 'medium',
        status: progressManagementEnabled ? formData.status : 'todo',
        category: progressManagementEnabled ? formData.category : null,
        estimated_hours: progressManagementEnabled ? formData.estimated_hours : null,
        actual_hours: progressManagementEnabled ? formData.actual_hours : null,
        start_date: progressManagementEnabled ? (formData.start_date || undefined) : null,
        time_logs: progressManagementEnabled ? formData.time_logs : []
      }

      if (editingTodo?.id) {
        const todoExists = todos.find(todo => todo.id === editingTodo.id)
        if (!todoExists) {
          setToast({ show: true, type: 'error', message: '待办事项不存在，可能已被删除' })
          resetForm()
          return
        }

        const response = await updateAdminTodo(editingTodo.id, cleanedData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '待办事项更新成功' })
          await loadTodos(1)
          resetForm()
        }
      } else {
        const response = await createAdminTodo(cleanedData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '待办事项创建成功' })
          await loadTodos(1)
          resetForm()
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setToast({ show: true, type: 'error', message: '待办事项不存在，可能已被删除' })
        resetForm()
      } else {
        setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
      }
    }
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
    setFormData({
      title: todo.title,
      description: todo.description || '',
      due_date: formatDateTimeLocal(todo.due_date),
      reminder_enabled: todo.reminder_enabled,
      reminder_time: formatDateTimeLocal(todo.reminder_time),
      is_completed: todo.is_completed,
      progress: todo.progress || 0,
      priority: todo.priority || 'medium',
      status: todo.status || 'todo',
      category: todo.category || '',
      estimated_hours: todo.estimated_hours,
      actual_hours: todo.actual_hours,
      start_date: formatDateTimeLocal(todo.start_date),
      time_logs: todo.time_logs || []
    })
    // 如果有项目进度管理相关数据，自动启用项目进度管理
    const hasProgressData = Boolean(
      (todo.progress && todo.progress > 0) ||
      (todo.priority && todo.priority !== 'medium') ||
      (todo.status && todo.status !== 'todo') ||
      todo.category ||
      todo.estimated_hours ||
      todo.actual_hours ||
      todo.start_date ||
      (todo.time_logs && todo.time_logs.length > 0)
    )
    setProgressManagementEnabled(hasProgressData)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个待办事项吗？')) return

    try {
      const response = await deleteAdminTodo(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '待办事项删除成功' })

        if (editingTodo?.id === id) {
          resetForm()
        }

        await loadTodos(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const handleToggleComplete = async (id: number, completed: boolean) => {
    try {
      const response = await updateAdminTodo(id, { is_completed: !completed })
      if (response.success) {
        setToast({ show: true, type: 'success', message: completed ? '标记为未完成' : '标记为已完成' })
        await loadTodos(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      reminder_enabled: false,
      reminder_time: '',
      is_completed: false,
      progress: 0,
      priority: 'medium',
      status: 'todo',
      category: '',
      estimated_hours: undefined,
      actual_hours: undefined,
      start_date: '',
      time_logs: []
    })
    setEditingTodo(null)
    setShowForm(false)
    setProgressManagementEnabled(false)
  }

  // 打开进度记录弹窗
  const handleOpenProgressModal = (todo: Todo) => {
    setSelectedTodo(todo)
    setProgressFormData({
      ...todo,
      time_logs: todo.time_logs || []
    })
    setShowProgressModal(true)
  }

  // 关闭进度记录弹窗
  const handleCloseProgressModal = () => {
    setShowProgressModal(false)
    setSelectedTodo(null)
    setNewTimeLog({ time: '', description: '' })
  }

  // 进度表单字段变化
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type, value } = e.target
    let finalValue: any = value

    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked
    } else if (name === 'progress') {
      finalValue = parseInt(value)
    } else if (name === 'estimated_hours' || name === 'actual_hours') {
      finalValue = value === '' ? undefined : parseFloat(value)
    }

    setProgressFormData({
      ...progressFormData,
      [name]: finalValue
    })
  }

  // 添加时间点记录
  const handleAddTimeLog = () => {
    if (!newTimeLog.time || !newTimeLog.description.trim()) {
      setToast({ show: true, type: 'error', message: '请填写完整的时间点和描述' })
      return
    }

    const timeLog: TimeLog = {
      id: Date.now(),
      time: newTimeLog.time,
      description: newTimeLog.description.trim()
    }

    setProgressFormData({
      ...progressFormData,
      time_logs: [...(progressFormData.time_logs || []), timeLog]
    })

    setNewTimeLog({ time: '', description: '' })
    setToast({ show: true, type: 'success', message: '时间点记录已添加' })
  }

  // 删除时间点记录
  const handleDeleteTimeLog = (id: number) => {
    setProgressFormData({
      ...progressFormData,
      time_logs: (progressFormData.time_logs || []).filter(log => log.id !== id)
    })
    setToast({ show: true, type: 'success', message: '时间点记录已删除' })
  }

  // 编辑时间点记录
  const handleEditTimeLog = (id: number, field: 'time' | 'description', value: string) => {
    setProgressFormData({
      ...progressFormData,
      time_logs: (progressFormData.time_logs || []).map(log =>
        log.id === id ? { ...log, [field]: value } : log
      )
    })
  }

  // 保存进度记录
  const handleSaveProgress = async () => {
    if (!selectedTodo?.id) return

    try {
      // 清理数据：将空字符串的日期字段转换为 undefined
      const cleanedData = {
        ...progressFormData,
        due_date: progressFormData.due_date || undefined,
        reminder_time: progressFormData.reminder_time || undefined,
        start_date: progressFormData.start_date || undefined
      }

      const response = await updateAdminTodo(selectedTodo.id, cleanedData)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '项目进度更新成功' })
        await loadTodos(1)
        handleCloseProgressModal()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '保存失败' })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索待办事项..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="pending">未完成</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>

        {/* 添加按钮 */}
        <div className="mb-6">
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + 添加待办事项
          </button>
        </div>

        {/* 待办事项列表 */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">待办事项列表 (第 {currentPage}/{totalPages} 页 · 共 {totalCount} 条)</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadTodos(Math.max(1, currentPage - 1))}
                disabled={todosLoading || currentPage <= 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() => loadTodos(Math.min(totalPages, currentPage + 1))}
                disabled={todosLoading || currentPage >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
              {todosLoading && (
                <div className="text-sm text-gray-500">加载中...</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          {totalCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">{searchTerm || filterStatus !== 'all' ? '没有找到匹配的待办事项' : '还没有添加任何待办事项'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => {
                // 判断是否有项目进度管理数据
                const hasProgressData = (todo.progress && todo.progress > 0) ||
                  (todo.priority && todo.priority !== 'medium') ||
                  (todo.status && todo.status !== 'todo') ||
                  todo.category ||
                  todo.estimated_hours ||
                  todo.actual_hours ||
                  todo.start_date ||
                  (todo.time_logs && todo.time_logs.length > 0)

                return (
                  <div
                    key={todo.id}
                    className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                      todo.is_completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <button
                            onClick={() => todo.id && handleToggleComplete(todo.id, todo.is_completed)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              todo.is_completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {todo.is_completed && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <h3 className={`font-medium break-words ${
                            todo.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}>
                            {todo.title}
                          </h3>

                          {/* 标签显示 */}
                          {todo.priority && todo.priority !== 'medium' && (
                            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                              todo.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              todo.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {todo.priority === 'urgent' ? '🔴 紧急' :
                               todo.priority === 'high' ? '🟠 高' : '🟢 低'}
                            </span>
                          )}

                          {todo.status && todo.status !== 'todo' && (
                            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                              todo.status === 'completed' ? 'bg-green-100 text-green-700' :
                              todo.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {todo.status === 'completed' ? '✅ 已完成' :
                               todo.status === 'in_progress' ? '⚙️ 进行中' : '❌ 已取消'}
                            </span>
                          )}

                          {todo.category && (
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded flex-shrink-0">
                              🏷️ {todo.category}
                            </span>
                          )}

                          {todo.reminder_enabled && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0">
                              🔔 提醒
                            </span>
                          )}
                        </div>

                        {/* 进度 */}
                        {todo.progress !== undefined && todo.progress > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>进度</span>
                              <span className="font-semibold">{todo.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  todo.progress === 100 ? 'bg-green-500' :
                                  todo.progress >= 75 ? 'bg-blue-500' :
                                  todo.progress >= 50 ? 'bg-yellow-500' :
                                  'bg-orange-500'
                                }`}
                                style={{ width: `${todo.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {todo.description && (
                          <p className={`text-sm mb-1.5 break-words ${
                            todo.is_completed ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {todo.description}
                          </p>
                        )}

                        {((todo.estimated_hours || todo.actual_hours) || todo.start_date || todo.due_date || (todo.reminder_enabled && todo.reminder_time)) && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {(todo.estimated_hours || todo.actual_hours) && (
                              <div className="flex items-center gap-3 flex-wrap">
                                {todo.estimated_hours && (
                                  <span>⏱️ 预计: {todo.estimated_hours}h</span>
                                )}
                                {todo.actual_hours && (
                                  <span>⏱️ 实际: {todo.actual_hours}h</span>
                                )}
                                {todo.estimated_hours && todo.actual_hours && (
                                  <span className={`font-semibold ${
                                    todo.actual_hours > todo.estimated_hours ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    ({todo.actual_hours > todo.estimated_hours ? '+' : ''}{(todo.actual_hours - todo.estimated_hours).toFixed(1)}h)
                                  </span>
                                )}
                              </div>
                            )}
                            {todo.start_date && (
                              <div>📅 开始: {formatDate(todo.start_date)}</div>
                            )}
                            {todo.due_date && (
                              <div>⏰ 截止:  {formatDate(todo.due_date)}</div>
                            )}
                            {todo.reminder_enabled && todo.reminder_time && (
                              <div>🔔 提醒: {formatDate(todo.reminder_time)}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2 flex-shrink-0">
                        {hasProgressData && (
                          <button
                            onClick={() => handleOpenProgressModal(todo)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                          >
                            📊 进度记录
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(todo)}
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => todo.id && handleDelete(todo.id)}
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-gray-900">{editingTodo ? '编辑待办事项' : '添加待办事项'}</div>
              <button
                type="button"
                onClick={resetForm}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                关闭
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="待办事项标题"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="详细描述..."
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                    截止日期
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start">
                    <input
                      id="reminder_enabled"
                      name="reminder_enabled"
                      type="checkbox"
                      checked={formData.reminder_enabled}
                      onChange={handleChange}
                      className="w-4 h-4 mt-1 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="ml-3">
                      <label htmlFor="reminder_enabled" className="font-medium text-gray-900">
                        启用提醒功能
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        开启后，将在设定的时间通过弹窗提醒您处理此待办事项
                      </p>
                    </div>
                  </div>

                  {formData.reminder_enabled && (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="reminder_time" className="block text-sm font-medium text-gray-700 mb-2">
                          提醒时间
                        </label>
                        <input
                          id="reminder_time"
                          name="reminder_time"
                          type="datetime-local"
                          value={formData.reminder_time}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">快速设置：</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const date = new Date()
                              date.setHours(date.getHours() + 1)
                              setFormData({ ...formData, reminder_time: formatDateTimeLocal(date.toISOString()) })
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          >
                            1小时后
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const date = new Date()
                              date.setHours(date.getHours() + 3)
                              setFormData({ ...formData, reminder_time: formatDateTimeLocal(date.toISOString()) })
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          >
                            3小时后
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const date = new Date()
                              date.setDate(date.getDate() + 1)
                              date.setHours(9, 0, 0, 0)
                              setFormData({ ...formData, reminder_time: formatDateTimeLocal(date.toISOString()) })
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          >
                            明天上午9点
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const date = new Date()
                              date.setDate(date.getDate() + 1)
                              date.setHours(14, 0, 0, 0)
                              setFormData({ ...formData, reminder_time: formatDateTimeLocal(date.toISOString()) })
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          >
                            明天下午2点
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start">
                    <input
                      id="progress_management_enabled"
                      name="progress_management_enabled"
                      type="checkbox"
                      checked={progressManagementEnabled}
                      onChange={(e) => setProgressManagementEnabled(e.target.checked)}
                      className="w-4 h-4 mt-1 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="ml-3">
                      <label htmlFor="progress_management_enabled" className="font-medium text-gray-900">
                        启用项目进度管理
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        开启后，可以设置优先级、状态、进度、工时等详细的项目管理信息
                      </p>
                    </div>
                  </div>

                  {progressManagementEnabled && (
                    <div className="space-y-4 pt-3 border-t border-purple-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                            优先级
                          </label>
                          <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="low">🟢 低</option>
                            <option value="medium">🟡 中</option>
                            <option value="high">🟠 高</option>
                            <option value="urgent">🔴 紧急</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                            任务状态
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="todo">📋 待开始</option>
                            <option value="in_progress">⚙️ 进行中</option>
                            <option value="completed">✅ 已完成</option>
                            <option value="cancelled">❌ 已取消</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                            分类标签
                          </label>
                          <input
                            id="category"
                            name="category"
                            type="text"
                            value={formData.category || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="如：前端开发"
                          />
                        </div>

                        <div>
                          <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-2">
                            完成进度 ({formData.progress}%)
                          </label>
                          <input
                            id="progress"
                            name="progress"
                            type="range"
                            min="0"
                            max="100"
                            value={formData.progress || 0}
                            onChange={handleChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div>
                          <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-2">
                            预计工时 (小时)
                          </label>
                          <input
                            id="estimated_hours"
                            name="estimated_hours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.estimated_hours || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="如：8"
                          />
                        </div>

                        <div>
                          <label htmlFor="actual_hours" className="block text-sm font-medium text-gray-700 mb-2">
                            实际工时 (小时)
                          </label>
                          <input
                            id="actual_hours"
                            name="actual_hours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.actual_hours || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="如：10"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                            开始日期
                          </label>
                          <input
                            id="start_date"
                            name="start_date"
                            type="datetime-local"
                            value={formData.start_date || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    id="is_completed"
                    name="is_completed"
                    type="checkbox"
                    checked={formData.is_completed}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="is_completed" className="ml-2 text-sm font-medium text-gray-700">
                    标记为已完成
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingTodo ? '更新' : '添加'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 进度记录弹窗 */}
      {showProgressModal && selectedTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-2 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 sm:py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                    📊 项目进度管理 - {selectedTodo.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    管理项目进度、时间点记录和项目信息
                  </p>
                </div>
                <button
                  onClick={handleCloseProgressModal}
                  className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* 项目信息总览 */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 项目信息总览</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">优先级</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {progressFormData.priority === 'urgent' ? '🔴 紧急' :
                       progressFormData.priority === 'high' ? '🟠 高' :
                       progressFormData.priority === 'low' ? '🟢 低' : '🟡 中'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">状态</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {progressFormData.status === 'completed' ? '✅ 已完成' :
                       progressFormData.status === 'in_progress' ? '⚙️ 进行中' :
                       progressFormData.status === 'cancelled' ? '❌ 已取消' : '📋 待开始'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">进度</div>
                    <div className="text-sm font-semibold mt-0.5 text-purple-600">{progressFormData.progress}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">分类</div>
                    <div className="text-sm font-semibold mt-0.5 truncate">{progressFormData.category || '未分类'}</div>
                  </div>
                </div>
              </div>

              {/* 基础信息 */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 sm:mb-4">📋 基础信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      优先级                    </label>
                    <select
                      name="priority"
                      value={progressFormData.priority}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">🟢 低</option>
                      <option value="medium">🟡 中</option>
                      <option value="high">🟠 高</option>
                      <option value="urgent">🔴 紧急</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      任务状态
                    </label>
                    <select
                      name="status"
                      value={progressFormData.status}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="todo">📋 待开始</option>
                      <option value="in_progress">⚙️ 进行中</option>
                      <option value="completed">✅ 已完成</option>
                      <option value="cancelled">❌ 已取消</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分类标签
                    </label>
                    <input
                      name="category"
                      type="text"
                      value={progressFormData.category || ''}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="如：前端开发"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始日期                    </label>
                    <input
                      name="start_date"
                      type="datetime-local"
                      value={progressFormData.start_date || ''}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 进度跟踪 */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 sm:mb-4">📈 进度跟踪</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    完成进度: {progressFormData.progress}%
                  </label>
                  <input
                    name="progress"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressFormData.progress}
                    onChange={handleProgressChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* 工时统计 */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">⏱️ 工时统计</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      预计工时 (小时)
                    </label>
                    <input
                      name="estimated_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={progressFormData.estimated_hours || ''}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="如：8"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      实际工时 (小时)
                    </label>
                    <input
                      name="actual_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={progressFormData.actual_hours || ''}
                      onChange={handleProgressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="如：10"
                    />
                  </div>
                </div>

                {/* 工时偏差提示 */}
                {progressFormData.estimated_hours && progressFormData.actual_hours && (
                  <div className={`mt-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg ${
                    progressFormData.actual_hours > progressFormData.estimated_hours
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {progressFormData.actual_hours > progressFormData.estimated_hours ? '⚠️ 超时' : '✅ 未超时'}
                      </span>
                      <span>
                        偏差: {progressFormData.actual_hours > progressFormData.estimated_hours ? '+' : ''}
                        {(progressFormData.actual_hours - progressFormData.estimated_hours).toFixed(1)}h
                        ({((progressFormData.actual_hours - progressFormData.estimated_hours) / progressFormData.estimated_hours * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 时间点记录 */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">🕐 时间点记录</h3>

                {/* 添加时间点 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">添加时间点</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        时间点 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={newTimeLog.time}
                        onChange={(e) => setNewTimeLog({ ...newTimeLog, time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        工作内容 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newTimeLog.description}
                          onChange={(e) => setNewTimeLog({ ...newTimeLog, description: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTimeLog()}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="如：完成了用户登录模块"
                        />
                        <button
                          type="button"
                          onClick={handleAddTimeLog}
                          className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 时间点列表 */}
                {progressFormData.time_logs && progressFormData.time_logs.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      已记录 {progressFormData.time_logs.length} 个时间点
                    </h4>
                    <div className="sm:hidden space-y-2">
                      {[...progressFormData.time_logs]
                        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                        .map((log, index) => (
                          <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-gray-500">#{index + 1}</div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTimeLog(log.id)}
                                className="text-xs text-red-600 hover:text-red-900"
                              >
                                删除
                              </button>
                            </div>
                            <div className="space-y-2">
                              <input
                                type="datetime-local"
                                value={log.time}
                                onChange={(e) => handleEditTimeLog(log.id, 'time', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                value={log.description}
                                onChange={(e) => handleEditTimeLog(log.id, 'description', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              序号
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              时间点
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              工作内容
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[...progressFormData.time_logs]
                            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                            .map((log, index) => (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <input
                                    type="datetime-local"
                                    value={log.time}
                                    onChange={(e) => handleEditTimeLog(log.id, 'time', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <input
                                    type="text"
                                    value={log.description}
                                    onChange={(e) => handleEditTimeLog(log.id, 'description', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTimeLog(log.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    删除
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 时间轴预览 */}
                    <div className="mt-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">时间轴预览</h4>
                      <div className="space-y-3">
                        {[...progressFormData.time_logs]
                          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                          .map((log, index) => (
                            <div key={log.id} className="flex items-start bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="ml-3 flex-1">
                                <div className="text-xs text-gray-500">
                                  {formatDate(log.time)}
                                </div>
                                <div className="text-sm text-gray-900 mt-1">
                                  {log.description}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-base font-medium text-gray-900 mb-2">暂无时间点记录</h4>
                    <p className="text-gray-500">请添加第一个时间点记录来跟踪任务进度</p>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={handleCloseProgressModal}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveProgress}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
