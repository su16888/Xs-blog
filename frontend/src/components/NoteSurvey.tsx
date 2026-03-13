'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { submitSurveyAnswer, getSurveyStatistics } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface Survey {
  id: number
  title: string
  description?: string
  start_time?: string
  end_time?: string
  ip_limit: number
  result_visibility: 'before' | 'after' | 'admin' | 'none' | 'public'
  show_participants?: boolean
  redirect_url?: string
  is_active: boolean
  total_submissions?: number
  status: 'not_started' | 'active' | 'ended'
  hasSubmitted: boolean
  submissionCount: number
  questions: Question[]
}

interface Question {
  id: number
  question_type: string
  question_title: string
  question_description?: string
  question_image?: string
  is_required: boolean
  sort_order: number
  config: any
  options?: QuestionOption[]
}

interface QuestionOption {
  id: number
  option_text: string
  option_image?: string
  sort_order: number
}

interface NoteSurveyProps {
  survey: Survey
  noteId?: number | string
  notePassword?: string
  onSubmitSuccess?: () => void
}

export default function NoteSurvey({ survey: initialSurvey, noteId, notePassword, onSubmitSuccess }: NoteSurveyProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [survey, setSurvey] = useState<Survey>(initialSurvey)
  const [answers, setAnswers] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [hoverRatings, setHoverRatings] = useState<{[key: number]: number}>({})

  const resolvedResultVisibility = (() => {
    const value = String(survey.result_visibility ?? '').trim()
    if (!value) return 'before'
    if (value === 'none') return 'admin'
    if (value === 'public') return 'before'
    if (value === 'before' || value === 'after' || value === 'admin') return value
    return 'before'
  })()

  const canViewResults =
    resolvedResultVisibility === 'before' ||
    (resolvedResultVisibility === 'after' && (survey.hasSubmitted || isAdmin))

  useEffect(() => {
    setSurvey(initialSurvey)
  }, [initialSurvey])

  // 检查本地存储的提交状态
  useEffect(() => {
    const submittedSurveys = localStorage.getItem('submittedSurveys')
    if (submittedSurveys) {
      try {
        const submitted = JSON.parse(submittedSurveys)
        if (submitted[initialSurvey.id]) {
          setSurvey({ ...initialSurvey, hasSubmitted: true })
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }, [initialSurvey])

  // 处理答案变化
  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers((prev: any) => ({
      ...prev,
      [questionId]: value
    }))
  }

  // 加载统计数据
  const loadStatistics = async () => {
    // 如果已经显示结果，则切换回表单视图
    if (showResults) {
      setShowResults(false)
      return
    }

    if (!canViewResults) {
      setError('该问卷不允许查看结果')
      return
    }

    setLoadingStats(true)
    try {
      const response = await getSurveyStatistics(survey.id, notePassword)
      if (response.success) {
        setStatistics(response.data)
        setShowResults(true)
      } else {
        setError(response.message || '加载统计数据失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '加载统计数据失败')
    } finally {
      setLoadingStats(false)
    }
  }

  // 验证表单
  const validateForm = () => {
    for (const question of survey.questions) {
      if (question.is_required) {
        const answer = answers[question.id]

        // 文件类型题目：检查是否有上传的文件URL
        if (question.question_type === 'file') {
          if (!answer || (typeof answer === 'string' && !answer.trim())) {
            setError(`请回答必填题目：${question.question_title}`)
            return false
          }
          continue
        }

        if (!answer) {
          setError(`请回答必填题目：${question.question_title}`)
          return false
        }

        if (question.question_type === 'text' || question.question_type === 'textarea') {
          if (!answer.trim()) {
            setError(`请回答必填题目：${question.question_title}`)
            return false
          }
        }

        if (question.question_type === 'checkbox') {
          if (!Array.isArray(answer) || answer.length === 0) {
            setError(`请回答必填题目：${question.question_title}`)
            return false
          }
        }
      }
    }

    return true
  }

  // 提交问卷
  const handleSubmit = async () => {
    setError('')

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // 构建答案数据
      const answerData = survey.questions.map(question => {
        const answer = answers[question.id]

        if (question.question_type === 'text' || question.question_type === 'textarea') {
          return {
            question_id: question.id,
            answer_text: answer || ''
          }
        } else if (question.question_type === 'radio') {
          return {
            question_id: question.id,
            selected_options: answer ? [answer] : []
          }
        } else if (question.question_type === 'checkbox') {
          return {
            question_id: question.id,
            selected_options: answer || []
          }
        } else if (question.question_type === 'file') {
          return {
            question_id: question.id,
            answer_file: answer || ''
          }
        } else {
          return {
            question_id: question.id,
            answer_text: answer ? String(answer) : ''
          }
        }
      })

      const result = await submitSurveyAnswer(survey.id, answerData, notePassword)

      if (result.success) {
        // 保存提交状态到本地存储
        const submittedSurveys = localStorage.getItem('submittedSurveys')
        const submitted = submittedSurveys ? JSON.parse(submittedSurveys) : {}
        submitted[survey.id] = true
        localStorage.setItem('submittedSurveys', JSON.stringify(submitted))

        setSurvey({ ...survey, hasSubmitted: true })
        setSuccess(true)
        onSubmitSuccess?.()

        // 如果配置了跳转URL，延迟跳转
        if (survey.redirect_url) {
          setTimeout(() => {
            window.location.href = survey.redirect_url!
          }, 1500)
        }
      } else {
        setError(result.message || '提交失败，请重试')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 渲染题目
  const renderQuestion = (question: Question) => {
    const answer = answers[question.id]

    switch (question.question_type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 bg-bg-primary text-text-primary"
            placeholder="请输入答案"
            disabled={survey.hasSubmitted || survey.status !== 'active'}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 bg-bg-primary text-text-primary"
            placeholder="请输入答案"
            disabled={survey.hasSubmitted || survey.status !== 'active'}
          />
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  answer === option.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'border-border-primary hover:bg-bg-secondary'
                } ${survey.hasSubmitted || survey.status !== 'active' ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option.id}
                  checked={answer === option.id}
                  onChange={() => handleAnswerChange(question.id, option.id)}
                  disabled={survey.hasSubmitted || survey.status !== 'active'}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-text-primary">{option.option_text}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => {
              const selectedOptions = answer || []
              const isChecked = selectedOptions.includes(option.id)

              return (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                      : 'border-border-primary hover:bg-bg-secondary'
                  } ${survey.hasSubmitted || survey.status !== 'active' ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleAnswerChange(question.id, [...selectedOptions, option.id])
                      } else {
                        handleAnswerChange(question.id, selectedOptions.filter((id: number) => id !== option.id))
                      }
                    }}
                    disabled={survey.hasSubmitted || survey.status !== 'active'}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-text-primary">{option.option_text}</span>
                </label>
              )
            })}
          </div>
        )

      case 'rating':
        const maxRating = question.config?.maxValue || 5
        // 确保 answer 转为数字进行比较
        const currentRating = answer ? Number(answer) : 0
        const hoverRating = hoverRatings[question.id] || 0

        return (
          <div className="flex flex-col gap-2">
            <div 
              className="flex gap-2"
              onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [question.id]: 0 }))}
            >
              {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleAnswerChange(question.id, rating)}
                  onMouseEnter={() => !survey.hasSubmitted && survey.status === 'active' && setHoverRatings(prev => ({ ...prev, [question.id]: rating }))}
                  disabled={survey.hasSubmitted || survey.status !== 'active'}
                  className={`text-3xl transition-all p-1 ${
                    (hoverRating || currentRating) >= rating 
                      ? 'text-yellow-400 scale-110 opacity-100' 
                      : 'text-gray-400 dark:text-gray-500 opacity-15'
                  } ${survey.hasSubmitted || survey.status !== 'active' ? 'cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <div className="text-sm text-text-tertiary h-5">
              {currentRating > 0 ? `已评分: ${currentRating} 星` : '请点击星星评分'}
            </div>
          </div>
        )

      case 'date':
        const today = new Date().toISOString().split('T')[0]
        const maxDate = '2099-12-31'
        
        return (
          <input
            type="date"
            value={answer || ''}
            min={today}
            max={maxDate}
            onChange={(e) => {
              const val = e.target.value
              // 简单验证年份长度，虽然 type="date" 已经有一定限制，但为了安全起见
              if (val) {
                const year = val.split('-')[0]
                if (year.length > 4) return
              }
              handleAnswerChange(question.id, val)
            }}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 bg-bg-primary text-text-primary"
            disabled={survey.hasSubmitted || survey.status !== 'active'}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 bg-bg-primary text-text-primary"
            disabled={survey.hasSubmitted || survey.status !== 'active'}
          />
        )

      case 'file':
        const allowedTypes = question.config?.allowedTypes || ['image', 'pdf', 'doc']
        const maxSize = question.config?.maxSize || 10 // MB
        const maxCount = question.config?.maxCount || 1

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files
          if (!files || files.length === 0) return

          // 验证文件数量
          if (files.length > maxCount) {
            setError(`最多只能上传${maxCount}个文件`)
            setTimeout(() => setError(''), 3000)
            return
          }

          // 验证文件大小和类型
          for (const file of Array.from(files)) {
            if (file.size > maxSize * 1024 * 1024) {
              setError(`文件"${file.name}"超过${maxSize}MB限制`)
              setTimeout(() => setError(''), 3000)
              return
            }

            const fileType = file.type
            const isAllowed = allowedTypes.some((type: string) => {
              if (type === 'image') return fileType.startsWith('image/')
              if (type === 'pdf') return fileType === 'application/pdf'
              if (type === 'doc') return fileType.includes('word') || fileType.includes('document')
              if (type === 'excel') return fileType.includes('sheet') || fileType.includes('excel')
              return false
            })

            if (!isAllowed) {
              setError(`文件"${file.name}"类型不支持`)
              setTimeout(() => setError(''), 3000)
              return
            }
          }

          // 上传文件
          try {
            const formData = new FormData()
            Array.from(files).forEach(file => formData.append('files', file))

            // 使用动态路径上传接口
            // 路径格式: /api/upload/surveys/:noteId/submissions
            const uploadUrl = noteId 
              ? `/api/upload/surveys/${noteId}/submissions` 
              : '/api/upload/survey'; // 降级到默认路径

            const response = await fetch(uploadUrl, {
              method: 'POST',
              body: formData
            })

            if (response.ok) {
              const result = await response.json()
              handleAnswerChange(question.id, result.urls ? result.urls.join(',') : result.url)
            } else {
              setError('文件上传失败，请重试')
              setTimeout(() => setError(''), 3000)
            }
          } catch (err) {
            setError('文件上传失败，请重试')
            setTimeout(() => setError(''), 3000)
          }
        }

        return (
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              multiple={maxCount > 1}
              accept={allowedTypes.map((type: string) => {
                if (type === 'image') return 'image/*'
                if (type === 'pdf') return '.pdf'
                if (type === 'doc') return '.doc,.docx'
                if (type === 'excel') return '.xls,.xlsx'
                return ''
              }).join(',') || '*'}
              className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 bg-bg-primary text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
              disabled={survey.hasSubmitted || survey.status !== 'active'}
            />
            <p className="text-xs text-text-tertiary mt-2">
              支持类型: {allowedTypes.join(', ')} | 最大{maxSize}MB | 最多{maxCount}个文件
            </p>
            {answer && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                   </svg>
                   <span>已上传 {answer.split(',').length} 个文件</span>
                </div>
                {answer.split(',').map((url: string, idx: number) => (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline pl-6 truncate block"
                  >
                    {url.split('/').pop()}
                  </a>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // 获取状态标签
  const getStatusBadge = () => {
    if (survey.status === 'not_started') {
      return (
        <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-700/50">
          未开始
        </span>
      )
    } else if (survey.status === 'ended') {
      return (
        <span className="px-2.5 py-1 bg-bg-secondary text-text-tertiary rounded-full text-xs font-medium border border-border-secondary">
          已结束
        </span>
      )
    } else if (survey.hasSubmitted) {
      return (
        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-700/50">
          已提交
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-700/50">
          进行中
        </span>
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-5 sm:p-6 bg-bg-tertiary border border-border-primary rounded-xl"
    >
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-bold text-text-primary leading-tight">
            {survey.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge()}
            {canViewResults && (
              <button
                onClick={loadStatistics}
                disabled={loadingStats}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200 dark:border-purple-700/50"
              >
                {loadingStats ? '加载中...' : showResults ? '返回问卷' : '查看结果'}
              </button>
            )}
          </div>
        </div>

        {survey.description && (
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {survey.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-tertiary">
          {survey.end_time && (
            <span className="bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              截止: {new Date(survey.end_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {(survey.show_participants !== false) && survey.total_submissions !== undefined && (
            <span className="bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              {survey.total_submissions} 人已提交
            </span>
          )}
        </div>
      </div>

      {/* 成功提示 */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            提交成功！感谢您的参与
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 统计结果视图 */}
      {showResults && statistics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 mb-6"
        >
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {statistics.total_submissions}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-500 mt-1 font-medium">
                总提交数
              </div>
            </div>
          </div>

          {statistics.questions.map((questionStat: any, index: number) => {
            const question = survey.questions.find(q => q.id === questionStat.id)
            if (!question) return null

            return (
              <motion.div
                key={questionStat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 sm:p-5 bg-bg-secondary border border-border-primary rounded-xl shadow-sm"
              >
                <div className="mb-4">
                  <div className="flex items-start gap-2.5 mb-1">
                    <span className="text-text-tertiary font-bold text-sm mt-0.5">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-text-primary">
                        {question.question_title}
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1">
                        {questionStat.total_answers} 人回答
                      </p>
                    </div>
                  </div>
                </div>

                {/* 选择题统计 */}
                {['radio', 'checkbox'].includes(questionStat.question_type) && questionStat.options && (
                  <div className="space-y-3">
                    {questionStat.options.map((option: any) => (
                      <div key={option.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-text-secondary font-medium">
                            {option.option_text}
                          </span>
                          <span className="text-text-tertiary tabular-nums">
                            {option.count} 票 ({option.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${option.percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 评分题统计 */}
                {questionStat.question_type === 'rating' && (
                  <div className="text-center py-2">
                    <div className="text-4xl font-bold text-yellow-500 mb-2 tabular-nums">
                      {questionStat.average}
                    </div>
                    <div className="flex justify-center gap-1 mb-2">
                      {Array.from({ length: question.config?.maxValue || 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`text-xl ${
                            i < Math.round(parseFloat(questionStat.average))
                              ? 'text-yellow-400'
                              : 'text-gray-200 dark:text-gray-700'
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      平均评分 · {questionStat.count} 人评分
                    </div>
                  </div>
                )}

                {/* 文本题统计 */}
                {!['radio', 'checkbox', 'rating'].includes(questionStat.question_type) && (
                  <div className="text-center py-6 bg-bg-tertiary rounded-lg border border-dashed border-border-primary">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {questionStat.total_answers}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      收到文本回答
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* 题目列表 */}
      {!showResults && survey.status === 'active' && !survey.hasSubmitted && (
        <div className="space-y-4 mb-6">
          {survey.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 sm:p-5 bg-bg-secondary border border-border-primary rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <div className="flex items-start gap-2.5 mb-1">
                  <span className="text-text-tertiary font-bold text-sm mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-text-primary">
                      {question.question_title}
                      {question.is_required && (
                        <span className="text-red-500 ml-1" title="必填">*</span>
                      )}
                    </h4>
                    {question.question_description && (
                      <p className="text-xs text-text-tertiary mt-1.5">
                        {question.question_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {renderQuestion(question)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 提交按钮 */}
      {survey.status === 'active' && !survey.hasSubmitted && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto px-10 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-bg-tertiary disabled:text-text-tertiary text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交问卷'}
          </button>
        </div>
      )}

      {/* 已提交提示 */}
      {survey.hasSubmitted && !success && (
        <div className="text-center py-4 text-sm font-medium text-text-secondary bg-bg-secondary rounded-lg border border-border-primary">
          ✓ 您已提交过此问卷
          {resolvedResultVisibility !== 'admin' && ' · 感谢参与'}
        </div>
      )}

      {/* 未开始/已结束提示 */}
      {survey.status === 'not_started' && (
        <div className="text-center py-4 text-sm font-medium text-text-tertiary bg-bg-secondary rounded-lg border border-border-primary">
          问卷尚未开始
        </div>
      )}

      {/* {survey.status === 'ended' && (
        <div className="text-center py-4 text-sm font-medium text-text-tertiary bg-bg-secondary rounded-lg border border-border-primary">
          问卷已结束，感谢关注
        </div>
      )} */}
    </motion.div>
  )
}
