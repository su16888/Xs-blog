/**
 * @file NotePoll.tsx
 * @description 前台投票展示组件
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, TrendingUp, Users } from 'lucide-react'
import { submitPollVote, getImageUrl } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface PollOption {
  id: number
  option_text: string
  option_image?: string
  sort_order: number
  vote_count?: number
}

interface Poll {
  id: number
  title: string
  description?: string
  poll_type: 'single' | 'multiple'
  max_choices: number
  start_time?: string
  end_time?: string
  result_visibility: 'before' | 'after' | 'admin' | 'none' | 'public'
  allow_revote: boolean
  ip_limit: number
  redirect_url?: string
  is_active: boolean
  total_votes?: number
  options: PollOption[]
  hasVoted: boolean
  userVotes: number[]
  voteCount: number
  status: 'not_started' | 'active' | 'ended'
}

interface NotePollProps {
  poll: Poll
  notePassword?: string
  onVoteSuccess?: () => void
}

export default function NotePoll({ poll: initialPoll, notePassword, onVoteSuccess }: NotePollProps) {
  const [poll, setPoll] = useState<Poll>(initialPoll)
  const [selectedOptions, setSelectedOptions] = useState<number[]>(poll.userVotes || [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const markVotedIfLimitReached = (message?: string) => {
    if (!message) return
    if (!message.includes('达到投票次数限制')) return
    setPoll(prev => ({ ...prev, hasVoted: true }))
  }

  const resolvedResultVisibility = (() => {
    const value = String(poll.result_visibility ?? '').trim()
    if (!value) return 'before'
    if (value === 'none') return 'admin'
    if (value === 'public') return 'before'
    if (value === 'before' || value === 'after' || value === 'admin') return value
    return 'before'
  })()

  // 检查本地存储的投票状态
  useEffect(() => {
    setPoll(initialPoll)

    const votedPolls = localStorage.getItem('votedPolls')
    if (!votedPolls) {
      setSelectedOptions(initialPoll.userVotes || [])
      return
    }

    try {
      const voted = JSON.parse(votedPolls)
      if (voted[initialPoll.id]) {
        setSelectedOptions(voted[initialPoll.id])
        return
      }
    } catch (e) {
    }

    setSelectedOptions(initialPoll.userVotes || [])
  }, [initialPoll])

  // 判断是否可以查看结果
  const canViewResults = () => {
    if (resolvedResultVisibility === 'before') return true
    if (resolvedResultVisibility === 'after' && poll.hasVoted) return true
    return false
  }

  const totalSelections = Array.isArray(poll.options)
    ? poll.options.reduce((sum, opt) => sum + (typeof opt.vote_count === 'number' ? opt.vote_count : 0), 0)
    : 0

  // 计算投票百分比
  const getPercentage = (voteCount: number) => {
    if (!totalSelections) return 0
    return Math.round((voteCount / totalSelections) * 100)
  }

  // 处理选项选择
  const handleOptionToggle = (optionId: number) => {
    if (poll.status !== 'active') return
    if (poll.hasVoted) return // 已投票则不允许再次选择

    if (poll.poll_type === 'single') {
      setSelectedOptions([optionId])
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId))
      } else {
        if (selectedOptions.length < poll.max_choices) {
          setSelectedOptions([...selectedOptions, optionId])
        } else {
          setError(`最多只能选择${poll.max_choices}个选项`)
          setTimeout(() => setError(''), 3000)
        }
      }
    }
  }

  // 提交投票
  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      setError('请至少选择一个选项')
      setTimeout(() => setError(''), 3000)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const result = await submitPollVote(poll.id, selectedOptions, notePassword)
      if (result.success) {
        // 保存投票状态到本地存储
        const votedPolls = localStorage.getItem('votedPolls')
        const voted = votedPolls ? JSON.parse(votedPolls) : {}
        voted[poll.id] = selectedOptions
        localStorage.setItem('votedPolls', JSON.stringify(voted))

        setPoll({
          ...poll,
          ...result.data,
          hasVoted: true,
          userVotes: selectedOptions,
          voteCount: poll.voteCount + 1
        })
        onVoteSuccess?.()

        // 如果有跳转URL，延迟跳转
        if (poll.redirect_url) {
          setTimeout(() => {
            window.location.href = poll.redirect_url!
          }, 1500)
        }
      } else {
        setError(result.message || '投票失败，请重试')
        markVotedIfLimitReached(result.message)
      }
    } catch (err: any) {
      const message = err.response?.data?.message || '投票失败，请重试'
      setError(message)
      markVotedIfLimitReached(message)
    } finally {
      setSubmitting(false)
    }
  }

  // 获取状态标签
  const getStatusBadge = () => {
    if (poll.status === 'not_started') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3" />
          未开始
        </span>
      )
    }
    if (poll.status === 'ended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-bg-secondary text-text-tertiary rounded-full border border-border-secondary">
          已结束
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800">
          <TrendingUp className="w-3 h-3" />
          进行中
        </span>
    )
  }

  const shouldShowResults = canViewResults()
  const canShowParticipation = poll.total_votes !== undefined && poll.total_votes !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-5 sm:p-6 bg-bg-tertiary border border-border-primary rounded-xl"
    >
      {/* 头部 */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-bold text-text-primary leading-tight">
            {poll.title}
          </h3>
          {getStatusBadge()}
        </div>

        {poll.description && (
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {poll.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-text-tertiary">
          {canShowParticipation && (
            <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              <Users className="w-3.5 h-3.5" />
              {poll.total_votes} 人参与
            </span>
          )}
          {poll.poll_type === 'multiple' && (
            <span className="bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              最多选 {poll.max_choices} 项
            </span>
          )}
          {poll.end_time && (
            <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              <Clock className="w-3.5 h-3.5" />
              截止: {new Date(poll.end_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 投票选项 */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="wait">
          {poll.options.map((option, index) => {
            const isSelected = selectedOptions.includes(option.id)
            const percentage = shouldShowResults && option.vote_count !== undefined
              ? getPercentage(option.vote_count)
              : 0
            const showPercentage = shouldShowResults && option.vote_count !== undefined

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOptionToggle(option.id)}
                className={`group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-transparent bg-bg-secondary hover:border-blue-200 dark:hover:border-blue-800'
                } ${poll.status !== 'active' || poll.hasVoted ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {/* 进度条背景 */}
                {showPercentage && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 bg-blue-100/60 dark:bg-blue-900/30 z-0"
                  />
                )}

                <div className="relative z-10 flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  {/* 选择图标 */}
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-text-tertiary group-hover:text-blue-400 transition-colors" />
                    )}
                  </div>

                  {/* 选项图片 */}
                  {option.option_image && (
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-border-primary bg-bg-tertiary">
                      <img
                        src={getImageUrl(option.option_image)}
                        alt={option.option_text}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* 选项文本 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary leading-snug">
                      {option.option_text}
                    </p>
                  </div>

                  {/* 投票结果 */}
                  {showPercentage && (
                    <div className="flex-shrink-0 text-right pl-2">
                      <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {percentage}%
                      </div>
                      <div className="text-[10px] sm:text-xs text-text-tertiary tabular-nums">
                        {option.vote_count} 票
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.div>
      )}

      {/* 操作按钮 */}
      {poll.status === 'active' && !poll.hasVoted && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-text-tertiary font-medium">
            {selectedOptions.length > 0 ? (
              <span className="text-blue-600 dark:text-blue-400">已选择 {selectedOptions.length} 项</span>
            ) : (
              <span>请选择选项</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedOptions.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-bg-tertiary disabled:text-text-tertiary text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        </div>
      )}

      {/* 已投票/结束提示 */}
      {(poll.hasVoted || poll.status !== 'active') && (
        <div className="pt-2 text-center text-xs font-medium text-text-tertiary border-t border-border-primary mt-4 pt-3">
          {poll.hasVoted ? (
            <span>✓ 您已参与投票 {resolvedResultVisibility === 'after' && '· 感谢您的反馈'}</span>
          ) : poll.status === 'ended' ? (
            <span>本次投票已结束</span>
          ) : (
             <span>投票将于 {new Date(poll.start_time!).toLocaleString('zh-CN')} 开始</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
