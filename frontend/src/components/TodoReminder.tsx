'use client'

import { useEffect, useState } from 'react'
import { getPendingReminders, dismissReminder } from '@/lib/api'

interface Todo {
  id: number
  title: string
  description?: string
  due_date?: string
  reminder_enabled: boolean
  reminder_time?: string
  is_completed: boolean
}

interface TodoReminderProps {
  onClose: () => void
}

export default function TodoReminder({ onClose }: TodoReminderProps) {
  const [reminders, setReminders] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      const response = await getPendingReminders()

      if (response.success) {
        const reminderData = Array.isArray(response.data) ? response.data : []
        setReminders(reminderData)
      }
    } catch (error) {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (todoId: number, action: 'ignore' | 'disable') => {
    try {
      await dismissReminder(todoId, action)
      // 从列表中移除已处理的提醒
      setReminders(prev => prev.filter(todo => todo.id !== todoId))

      // 如果所有提醒都已处理，关闭弹窗
      if (reminders.length === 1) {
        onClose()
      }
    } catch (error) {
      // 静默处理错误
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderBottomColor: 'var(--primary-600)' }}></div>
            <p className="text-gray-600">加载提醒中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (reminders.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">待办事项提醒</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {reminders.map((todo) => (
            <div
              key={todo.id}
              className="border border-orange-200 bg-orange-50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {todo.title}
                  </h3>

                  {todo.description && (
                    <p className="text-gray-700 mb-3">
                      {todo.description}
                    </p>
                  )}

                  <div className="text-sm text-gray-600 space-y-1">
                    {todo.due_date && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        截止时间: {formatDate(todo.due_date)}
                      </div>
                    )}

                    {todo.reminder_time && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        提醒时间: {formatDate(todo.reminder_time)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => handleDismiss(todo.id, 'ignore')}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  本次忽略
                </button>
                <button
                  onClick={() => handleDismiss(todo.id, 'disable')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  不再提醒
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>您有 {reminders.length} 个待办事项需要处理</p>
        </div>
      </div>
    </div>
  )
}