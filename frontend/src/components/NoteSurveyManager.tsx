/**
 * @file NoteSurveyManager.tsx
 * @description 后台问卷管理组件
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, BarChart3, Eye, EyeOff, Calendar } from 'lucide-react'
import { getAdminNoteSurveys, deleteAdminSurvey, createAdminSurvey, updateAdminSurvey } from '@/lib/api'
import SurveyEditor from './SurveyEditor'
import SurveyResults from './SurveyResults'

interface Survey {
  id: number
  title: string
  description?: string
  start_time?: string
  end_time?: string
  is_active: boolean
  total_submissions: number
  questions: any[]
  created_at: string
}

interface NoteSurveyManagerProps {
  noteId: number
}

export default function NoteSurveyManager({ noteId }: NoteSurveyManagerProps) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
  const [showResults, setShowResults] = useState<Survey | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSurveys()
  }, [noteId])

  const loadSurveys = async () => {
    setLoading(true)
    try {
      const response = await getAdminNoteSurveys(noteId)
      if (response.success) {
        setSurveys(response.data)
      }
    } catch (error) {
      console.error('加载问卷失败:', error)
      setError('加载问卷失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSurvey(null)
    setShowEditor(true)
  }

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey)
    setShowEditor(true)
  }

  const handleDelete = async (surveyId: number) => {
    if (!confirm('确定要删除这个问卷吗？删除后将无法恢复。')) {
      return
    }

    try {
      const response = await deleteAdminSurvey(noteId, surveyId)
      if (response.success) {
        await loadSurveys()
      }
    } catch (error) {
      console.error('删除问卷失败:', error)
      setError('删除问卷失败')
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (editingSurvey) {
        const response = await updateAdminSurvey(noteId, editingSurvey.id, data)
        if (response.success) {
          setShowEditor(false)
          setEditingSurvey(null)
          await loadSurveys()
        }
      } else {
        const response = await createAdminSurvey(noteId, data)
        if (response.success) {
          setShowEditor(false)
          await loadSurveys()
        }
      }
    } catch (error: any) {
      console.error('保存问卷失败:', error)
      setError(error.response?.data?.message || '保存问卷失败')
      throw error
    }
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingSurvey(null)
  }

  const getStatusBadge = (survey: Survey) => {
    const now = new Date()
    const startTime = survey.start_time ? new Date(survey.start_time) : null
    const endTime = survey.end_time ? new Date(survey.end_time) : null

    if (!survey.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
          <EyeOff className="w-3 h-3" />
          已禁用
        </span>
      )
    }

    if (startTime && startTime > now) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
          <Calendar className="w-3 h-3" />
          未开始
        </span>
      )
    }

    if (endTime && endTime < now) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
          已结束
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
        <Eye className="w-3 h-3" />
        进行中
      </span>
    )
  }

  if (showEditor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {editingSurvey ? '编辑问卷' : '新建问卷'}
          </h3>
        </div>
        <SurveyEditor
          survey={editingSurvey}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          问卷管理
        </h3>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新建问卷
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 问卷列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            还没有创建问卷
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            创建第一个问卷
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {surveys.map((survey) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {survey.title}
                      </h4>
                      {getStatusBadge(survey)}
                    </div>

                    {survey.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                        {survey.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-500">
                      <span>{survey.questions.length} 个题目</span>
                      <span>{survey.total_submissions} 份提交</span>
                      {survey.end_time && (
                        <span>
                          截止: {new Date(survey.end_time).toLocaleString('zh-CN')}
                        </span>
                      )}
                      <span>
                        创建于 {new Date(survey.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowResults(survey)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                      title="查看结果"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(survey)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 问卷结果弹窗 */}
      {showResults && (
        <SurveyResults
          survey={showResults}
          onClose={() => setShowResults(null)}
        />
      )}
    </div>
  )
}
