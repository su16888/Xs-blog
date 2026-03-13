/**
 * @file SurveyResults.tsx
 * @description 问卷结果展示组件
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Users, Calendar, TrendingUp, FileText, X } from 'lucide-react'
import { getSurveySubmissions, getApiUrl } from '@/lib/api'

interface Question {
  id: number
  question_type: string
  question_title: string
  question_description?: string
  config: any
  options?: Array<{
    id: number
    option_text: string
    sort_order: number
  }>
}

interface Answer {
  id: number
  question_id: number
  answer_text?: string
  answer_file?: string
  selected_options?: number[]
  question: Question
}

interface Submission {
  id: number
  submitter_ip: string
  submitted_at: string
  answers: Answer[]
}

interface Survey {
  id: number
  title: string
  description?: string
  total_submissions: number
  questions: Question[]
}

interface SurveyResultsProps {
  survey: Survey
  onClose: () => void
}

export default function SurveyResults({ survey, onClose }: SurveyResultsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<'statistics' | 'details'>('statistics')

  useEffect(() => {
    loadSubmissions()
  }, [currentPage])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const response = await getSurveySubmissions(survey.id, currentPage, 20)
      if (response.success) {
        setSubmissions(response.data.submissions)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('加载提交记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算统计数据
  const calculateStatistics = (question: Question) => {
    if (['radio', 'checkbox'].includes(question.question_type)) {
      const optionCounts: Record<number, number> = {}
      question.options?.forEach(opt => {
        optionCounts[opt.id] = 0
      })

      submissions.forEach(submission => {
        const answer = submission.answers.find(a => a.question_id === question.id)
        if (answer?.selected_options) {
          answer.selected_options.forEach(optId => {
            if (optionCounts[optId] !== undefined) {
              optionCounts[optId]++
            }
          })
        }
      })

      return optionCounts
    }

    if (question.question_type === 'rating') {
      const ratings: number[] = []
      submissions.forEach(submission => {
        const answer = submission.answers.find(a => a.question_id === question.id)
        if (answer?.answer_text) {
          ratings.push(parseInt(answer.answer_text))
        }
      })

      const average = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : '0'

      return { average, count: ratings.length, ratings }
    }

    return null
  }

  // 导出数据
  const handleExport = async () => {
    try {
      const response = await fetch(getApiUrl(`/admin/surveys/${survey.id}/export`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `survey-${survey.id}-${Date.now()}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-neutral-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {survey.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {survey.total_submissions} 份提交
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {survey.questions.length} 个题目
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              导出数据
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setViewMode('statistics')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              viewMode === 'statistics'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            统计分析
          </button>
          <button
            onClick={() => setViewMode('details')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              viewMode === 'details'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            详细答案
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : viewMode === 'statistics' ? (
            // 统计视图
            <div className="space-y-6">
              {survey.questions.map((question, index) => {
                const stats = calculateStatistics(question)

                return (
                  <div
                    key={question.id}
                    className="p-5 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                  >
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      {index + 1}. {question.question_title}
                    </h3>

                    {/* 单选/多选统计 */}
                    {['radio', 'checkbox'].includes(question.question_type) && stats && (
                      <div className="space-y-3">
                        {question.options?.map(option => {
                          const count = (stats as Record<number, number>)[option.id] || 0
                          const percentage = survey.total_submissions > 0
                            ? Math.round((count / survey.total_submissions) * 100)
                            : 0

                          return (
                            <div key={option.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                  {option.option_text}
                                </span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {count} 票 ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 评分统计 */}
                    {question.question_type === 'rating' && stats && (
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                          {(stats as any).average}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          平均分 (共 {(stats as any).count} 人评分)
                        </div>
                      </div>
                    )}

                    {/* 文本题统计 */}
                    {['text', 'textarea'].includes(question.question_type) && (
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        共收到 {submissions.filter(s =>
                          s.answers.find(a => a.question_id === question.id && a.answer_text)
                        ).length} 份回答
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // 详细答案视图
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <div
                  key={submission.id}
                  className="p-5 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      提交 #{(currentPage - 1) * 20 + index + 1}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                      </span>
                      <span>IP: {submission.submitter_ip}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {survey.questions.map((question, qIndex) => {
                      const answer = submission.answers.find(a => a.question_id === question.id)

                      return (
                        <div key={question.id} className="text-sm">
                          <div className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            {qIndex + 1}. {question.question_title}
                          </div>
                          <div className="text-neutral-900 dark:text-neutral-100 pl-4">
                            {answer ? (
                              <>
                                {answer.answer_text && <div>{answer.answer_text}</div>}
                                {answer.selected_options && answer.selected_options.length > 0 && (
                                  <div>
                                    {answer.selected_options.map(optId => {
                                      const option = question.options?.find(o => o.id === optId)
                                      return option ? option.option_text : ''
                                    }).filter(Boolean).join(', ')}
                                  </div>
                                )}
                                {answer.answer_file && (
                                  <a
                                    href={answer.answer_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    查看文件
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="text-neutral-400">未回答</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
