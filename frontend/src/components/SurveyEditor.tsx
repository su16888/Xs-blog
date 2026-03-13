'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 题目类型定义
const QUESTION_TYPES = [
  { value: 'text', label: '单行文本', icon: '📝' },
  { value: 'textarea', label: '多行文本', icon: '📄' },
  { value: 'radio', label: '单选题', icon: '⭕' },
  { value: 'checkbox', label: '多选题', icon: '☑️' },
  { value: 'file', label: '文件上传', icon: '📎' },
  { value: 'rating', label: '评分', icon: '⭐' },
  { value: 'date', label: '日期', icon: '📅' },
  { value: 'time', label: '时间', icon: '⏰' }
]

interface QuestionOption {
  option_text: string
  option_image?: string
  sort_order: number
}

interface Question {
  question_type: string
  question_title: string
  question_description?: string
  question_image?: string
  is_required: boolean
  sort_order: number
  config: any
  options?: QuestionOption[]
}

interface SurveyFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  ip_limit: number
  allow_resubmit: boolean
  result_visibility: 'before' | 'after' | 'admin'
  show_participants?: boolean
  redirect_url?: string
  is_active: boolean
  questions: Question[]
}

interface SurveyEditorProps {
  survey?: any
  onSave: (data: SurveyFormData) => Promise<void>
  onCancel: () => void
}

export default function SurveyEditor({ survey, onSave, onCancel }: SurveyEditorProps) {
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    ip_limit: 1,
    allow_resubmit: false,
    result_visibility: 'before',
    show_participants: true,
    redirect_url: '',
    is_active: true,
    questions: []
  })

  const [errors, setErrors] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  // 将日期转换为本地 datetime-local 格式
  const formatDateTimeLocal = (dateString: string | undefined | null): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      // 使用本地时间格式化，避免时区问题
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  useEffect(() => {
    if (survey) {
      const rawVisibility =
        survey.result_visibility !== undefined
          ? survey.result_visibility
          : (survey.show_results_after_submit ? 'after' : 'before')
      const resolvedResultVisibility = rawVisibility === 'none' ? 'admin' : rawVisibility

      setFormData({
        title: survey.title || '',
        description: survey.description || '',
        start_time: formatDateTimeLocal(survey.start_time),
        end_time: formatDateTimeLocal(survey.end_time),
        ip_limit: survey.ip_limit || 1,
        allow_resubmit: survey.allow_resubmit || false,
        result_visibility: resolvedResultVisibility,
        show_participants: survey.show_participants ?? true,
        redirect_url: survey.redirect_url || '',
        is_active: survey.is_active !== undefined ? survey.is_active : true,
        questions: survey.questions || []
      })
    }
  }, [survey])

  // 添加题目
  const addQuestion = (type: string) => {
    const newQuestion: Question = {
      question_type: type,
      question_title: '',
      question_description: '',
      is_required: false,
      sort_order: formData.questions.length,
      config: {},
      options: ['radio', 'checkbox'].includes(type) ? [
        { option_text: '', sort_order: 0 },
        { option_text: '', sort_order: 1 }
      ] : undefined
    }

    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    })
    setExpandedQuestion(formData.questions.length)
  }

  // 删除题目
  const removeQuestion = (index: number) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      questions: newQuestions.map((q, i) => ({ ...q, sort_order: i }))
    })
  }

  // 更新题目
  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setFormData({ ...formData, questions: newQuestions })
  }

  // 添加选项
  const addOption = (questionIndex: number) => {
    const question = formData.questions[questionIndex]
    if (!question.options) return

    const newOption: QuestionOption = {
      option_text: '',
      sort_order: question.options.length
    }

    updateQuestion(questionIndex, {
      options: [...question.options, newOption]
    })
  }

  // 删除选项
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = formData.questions[questionIndex]
    if (!question.options) return

    const newOptions = question.options.filter((_, i) => i !== optionIndex)
    updateQuestion(questionIndex, {
      options: newOptions.map((opt, i) => ({ ...opt, sort_order: i }))
    })
  }

  // 更新选项
  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const question = formData.questions[questionIndex]
    if (!question.options) return

    const newOptions = [...question.options]
    newOptions[optionIndex] = { ...newOptions[optionIndex], option_text: text }
    updateQuestion(questionIndex, { options: newOptions })
  }

  // 题目上移
  const moveQuestionUp = (index: number) => {
    if (index === 0) return
    const newQuestions = [...formData.questions]
    ;[newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]]
    setFormData({
      ...formData,
      questions: newQuestions.map((q, i) => ({ ...q, sort_order: i }))
    })
  }

  // 题目下移
  const moveQuestionDown = (index: number) => {
    if (index === formData.questions.length - 1) return
    const newQuestions = [...formData.questions]
    ;[newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]]
    setFormData({
      ...formData,
      questions: newQuestions.map((q, i) => ({ ...q, sort_order: i }))
    })
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.title.trim()) {
      newErrors.title = '请输入问卷标题'
    }

    if (formData.questions.length === 0) {
      newErrors.questions = '至少需要添加一个题目'
    }

    formData.questions.forEach((q, i) => {
      if (!q.question_title.trim()) {
        newErrors[`question_${i}_title`] = '请输入题目标题'
      }

      if (['radio', 'checkbox'].includes(q.question_type)) {
        if (!q.options || q.options.length < 2) {
          newErrors[`question_${i}_options`] = '至少需要2个选项'
        } else {
          const emptyOptions = q.options.filter(opt => !opt.option_text.trim())
          if (emptyOptions.length > 0) {
            newErrors[`question_${i}_options`] = '选项内容不能为空'
          }
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">基本信息</h3>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              问卷标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="请输入问卷标题"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              问卷描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="请输入问卷描述（可选）"
            />
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                开始时间
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                截止时间
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* IP限制 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                每个IP最多提交次数
              </label>
              <input
                type="number"
                min="1"
                value={formData.ip_limit}
                onChange={(e) => setFormData({ ...formData, ip_limit: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                跳转URL（可选）
              </label>
              <input
                type="text"
                value={formData.redirect_url || ''}
                onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                placeholder="提交后自动跳转的网址，留空则不跳转"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* 选项 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">结果可见性</span>
              <select
                value={formData.result_visibility}
                onChange={(e) => setFormData({ ...formData, result_visibility: e.target.value as any })}
                className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
              >
                <option value="before">前台可见</option>
                <option value="after">提交后可见</option>
                <option value="admin">仅后台可见</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_participants ?? true}
                  onChange={(e) => setFormData({ ...formData, show_participants: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">显示参与人数</span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                控制是否在前台显示问卷提交人数（独立于结果可见性）
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">启用问卷</span>
            </label>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">题目设置</h3>
          <div className="relative group">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              添加题目 +
            </button>

            {/* 题目类型下拉菜单 */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {QUESTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => addQuestion(type.value)}
                  className="w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 first:rounded-t-lg last:rounded-b-lg transition-colors text-neutral-900 dark:text-neutral-100"
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errors.questions && (
          <p className="text-red-500 text-sm mb-4">{errors.questions}</p>
        )}

        {/* 题目列表 */}
        <div className="space-y-4">
          <AnimatePresence>
            {formData.questions.map((question, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
              >
                {/* 题目头部 */}
                <div
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 cursor-pointer"
                  onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {QUESTION_TYPES.find(t => t.value === question.question_type)?.icon}
                    </span>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {question.question_title || '未命名题目'}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {QUESTION_TYPES.find(t => t.value === question.question_type)?.label}
                        {question.is_required && <span className="text-red-500 ml-2">*必填</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveQuestionUp(index); }}
                      disabled={index === 0}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveQuestionDown(index); }}
                      disabled={index === formData.questions.length - 1}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeQuestion(index); }}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* 题目详情（展开时显示） */}
                {expandedQuestion === index && (
                  <div className="p-4 space-y-4 bg-white dark:bg-neutral-900">
                    {/* 题目标题 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        题目标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={question.question_title}
                        onChange={(e) => updateQuestion(index, { question_title: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        placeholder="请输入题目标题"
                      />
                      {errors[`question_${index}_title`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`question_${index}_title`]}</p>
                      )}
                    </div>

                    {/* 题目描述 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        题目描述
                      </label>
                      <textarea
                        value={question.question_description || ''}
                        onChange={(e) => updateQuestion(index, { question_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        placeholder="请输入题目描述（可选）"
                      />
                    </div>

                    {/* 选项（单选/多选题） */}
                    {['radio', 'checkbox'].includes(question.question_type) && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                          选项设置
                        </label>
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="text-neutral-500 dark:text-neutral-400">{optIndex + 1}.</span>
                              <input
                                type="text"
                                value={option.option_text}
                                onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                                placeholder={`选项 ${optIndex + 1}`}
                              />
                              {question.options && question.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optIndex)}
                                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addOption(index)}
                          className="mt-2 px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors"
                        >
                          + 添加选项
                        </button>
                        {errors[`question_${index}_options`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`question_${index}_options`]}</p>
                        )}
                      </div>
                    )}

                    {/* 多选题配置 */}
                    {question.question_type === 'checkbox' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                            最少选择数
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={question.config?.minChoices || 0}
                            onChange={(e) => updateQuestion(index, {
                              config: { ...question.config, minChoices: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                            最多选择数
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={question.config?.maxChoices || question.options?.length || 10}
                            onChange={(e) => updateQuestion(index, {
                              config: { ...question.config, maxChoices: parseInt(e.target.value) || 10 }
                            })}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* 文本题配置 */}
                    {['text', 'textarea'].includes(question.question_type) && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              最小字数
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={question.config?.minLength || 0}
                              onChange={(e) => updateQuestion(index, {
                                config: { ...question.config, minLength: parseInt(e.target.value) || 0 }
                              })}
                              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              最大字数
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={question.config?.maxLength || 500}
                              onChange={(e) => updateQuestion(index, {
                                config: { ...question.config, maxLength: parseInt(e.target.value) || 500 }
                              })}
                              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            />
                          </div>
                        </div>
                        {question.question_type === 'text' && (
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              输入类型
                            </label>
                            <select
                              value={question.config?.inputType || 'any'}
                              onChange={(e) => updateQuestion(index, {
                                config: { ...question.config, inputType: e.target.value }
                              })}
                              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            >
                              <option value="any">任意文本</option>
                              <option value="email">邮箱</option>
                              <option value="phone">手机号</option>
                              <option value="number">数字</option>
                              <option value="url">网址</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 评分题配置 */}
                    {question.question_type === 'rating' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                            最小分值
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={question.config?.minValue || 1}
                            onChange={(e) => updateQuestion(index, {
                              config: { ...question.config, minValue: parseInt(e.target.value) || 1 }
                            })}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                            最大分值
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={question.config?.maxValue || 5}
                            onChange={(e) => updateQuestion(index, {
                              config: { ...question.config, maxValue: parseInt(e.target.value) || 5 }
                            })}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* 文件上传配置 */}
                    {question.question_type === 'file' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                            允许的文件类型
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['image', 'pdf', 'doc', 'excel'].map(type => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={question.config?.allowedTypes?.includes(type) || false}
                                  onChange={(e) => {
                                    const types = question.config?.allowedTypes || []
                                    const newTypes = e.target.checked
                                      ? [...types, type]
                                      : types.filter((t: string) => t !== type)
                                    updateQuestion(index, {
                                      config: { ...question.config, allowedTypes: newTypes }
                                    })
                                  }}
                                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{type}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              最大文件大小 (MB)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={question.config?.maxSize || 10}
                              onChange={(e) => updateQuestion(index, {
                                config: { ...question.config, maxSize: parseInt(e.target.value) || 10 }
                              })}
                              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              最多上传数量
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.config?.maxCount || 1}
                              onChange={(e) => updateQuestion(index, {
                                config: { ...question.config, maxCount: parseInt(e.target.value) || 1 }
                              })}
                              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 必填选项 */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.is_required}
                          onChange={(e) => updateQuestion(index, { is_required: e.target.checked })}
                          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">必填题目</span>
                      </label>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存问卷'}
        </button>
      </div>
    </div>
  )
}
