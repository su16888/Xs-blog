/**
 * @file NoteLottery.tsx
 * @description 前台抽奖展示组件
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Users, Ticket, Award } from 'lucide-react'
import { enterLottery, getLotteryEntry, getImageUrl } from '@/lib/api'

interface LotteryPrize {
  id: number
  prize_name: string
  prize_image?: string
  prize_description?: string
  probability: number
  quantity: number
  sort_order: number
}

interface Lottery {
  id: number
  title: string
  description?: string
  draw_time: string
  ip_limit: number
  enable_email_notification: boolean
  custom_fields?: any
  redirect_url?: string
  show_prizes?: boolean
  show_probability?: boolean
  show_quantity?: boolean
  show_participants?: boolean
  is_active: boolean
  is_drawn: boolean
  total_participants?: number
  prizes: LotteryPrize[]
  hasEntered: boolean
  entryCount: number
  status: 'active' | 'ended' | 'drawn'
  myEntry?: {
    id: number
    is_winner: boolean
    prize_id?: number
    prize?: LotteryPrize
  }
}

interface NoteLotteryProps {
  lottery: Lottery
  onEnterSuccess?: () => void
}

export default function NoteLottery({ lottery: initialLottery, onEnterSuccess }: NoteLotteryProps) {
  const [lottery, setLottery] = useState<Lottery>(initialLottery)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [email, setEmail] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(false)

  // 检查本地存储的参与状态
  useEffect(() => {
    const enteredLotteries = localStorage.getItem('enteredLotteries')
    if (enteredLotteries) {
      try {
        const entered = JSON.parse(enteredLotteries)
        if (entered[initialLottery.id]) {
          setLottery({ ...initialLottery, hasEntered: true })
        }
      } catch (e) {
        setLottery(initialLottery)
      }
    } else {
      setLottery(initialLottery)
    }
  }, [initialLottery])

  // 加载我的参与记录
  useEffect(() => {
    if (lottery.hasEntered && !lottery.myEntry) {
      loadMyEntry()
    }
  }, [lottery.hasEntered])

  const loadMyEntry = async () => {
    setLoadingEntry(true)
    try {
      const response = await getLotteryEntry(lottery.id)
      if (response.success && response.data) {
        setLottery(prev => ({ ...prev, myEntry: response.data }))
      }
    } catch (err) {
      console.error('加载参与记录失败:', err)
    } finally {
      setLoadingEntry(false)
    }
  }

  // 处理参与抽奖
  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证邮箱（如果启用邮件通知）
    if (lottery.enable_email_notification && !email) {
      setError('请填写邮箱地址')
      return
    }

    if (lottery.enable_email_notification && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('请输入有效的邮箱地址')
        return
      }
    }

    // 验证自定义字段
    const requiredFields = lottery.custom_fields?.filter((field: any) => field.required) || []
    for (const field of requiredFields) {
      if (!customFieldValues[field.name]) {
        setError(`请填写${field.label}`)
        return
      }
    }

    setSubmitting(true)

    try {
      const entryData = {
        participant_email: lottery.enable_email_notification ? email : undefined,
        custom_data: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      }

      const result = await enterLottery(lottery.id, entryData)

      if (result.success) {
        // 保存参与状态到本地存储
        const enteredLotteries = localStorage.getItem('enteredLotteries')
        const entered = enteredLotteries ? JSON.parse(enteredLotteries) : {}
        entered[lottery.id] = true
        localStorage.setItem('enteredLotteries', JSON.stringify(entered))

        setLottery({
          ...lottery,
          hasEntered: true,
          total_participants: (lottery.total_participants ?? 0) + 1,
          entryCount: lottery.entryCount + 1
        })
        setShowEntryModal(false)
        setSuccess(true)
        onEnterSuccess?.()

        // 如果配置了跳转URL，延迟跳转
        if (lottery.redirect_url) {
          setTimeout(() => {
            window.location.href = lottery.redirect_url!
          }, 1500)
        }

        // 3秒后隐藏成功提示
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.message || '参与失败，请重试')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '参与失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 获取状态标签
  const getStatusBadge = () => {
    if (lottery.is_drawn || lottery.status === 'drawn') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
          <Award className="w-3 h-3" />
          已开奖
        </span>
      )
    }
    if (lottery.status === 'ended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-800">
          <Clock className="w-3 h-3" />
          等待开奖
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800">
        <Ticket className="w-3 h-3" />
        进行中
      </span>
    )
  }

  // 判断是否可以参与
  const canEnter = () => {
    return lottery.status === 'active' && !lottery.is_drawn && !lottery.hasEntered
  }

  // 判断是否显示中奖信息
  const showWinnerInfo = lottery.is_drawn && lottery.myEntry?.is_winner

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-5 sm:p-6 bg-bg-tertiary border border-border-primary rounded-xl"
    >
      {/* 头部 */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-bold text-text-primary leading-tight">
              {lottery.title}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {lottery.description && (
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {lottery.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-text-tertiary">
          {(lottery.show_participants !== false) && lottery.total_participants !== undefined && (
            <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              <Users className="w-3.5 h-3.5" />
              {lottery.total_participants} 人参与
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
            <Clock className="w-3.5 h-3.5" />
            开奖: {new Date(lottery.draw_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {lottery.ip_limit > 1 && (
            <span className="bg-bg-secondary px-2 py-1 rounded-md border border-border-primary">
              每IP限{lottery.ip_limit}次
            </span>
          )}
        </div>
      </div>

      {/* 中奖恭喜 */}
      {showWinnerInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mb-1">
                🎉 恭喜中奖！
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                您获得了：{lottery.myEntry?.prize?.prize_name}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 成功提示 */}
      <AnimatePresence>
        {success && !showWinnerInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            参与成功！等待开奖，祝您好运！
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
            className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 奖项列表 */}
      {(lottery.show_prizes !== false) && (
        <div className="mb-6">
          <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            奖项设置
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lottery.prizes.map((prize, index) => (
              <motion.div
                key={prize.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-bg-secondary p-4 rounded-xl border border-border-primary hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {prize.prize_image && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border-primary bg-bg-tertiary">
                      <img
                        src={getImageUrl(prize.prize_image)}
                        alt={prize.prize_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-bold text-text-primary truncate">
                        {prize.prize_name}
                      </h5>
                      {(lottery.show_probability !== false) && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-bold tabular-nums">
                          {prize.probability}%
                        </span>
                      )}
                    </div>
                    {prize.prize_description && (
                      <p className="text-xs text-text-secondary mb-2 line-clamp-2">
                        {prize.prize_description}
                      </p>
                    )}
                    {(lottery.show_quantity !== false) && (
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span className="bg-bg-tertiary px-2 py-0.5 rounded border border-border-primary">
                          数量: {prize.quantity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {canEnter() && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowEntryModal(true)}
            className="w-full sm:w-auto px-10 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            立即参与抽奖
          </button>
        </div>
      )}

      {/* 已参与提示 */}
      {lottery.hasEntered && !lottery.is_drawn && !success && (
        <div className="text-center py-4 text-sm font-medium text-text-secondary bg-bg-secondary rounded-lg border border-border-primary">
          <Ticket className="w-4 h-4 inline mr-2 text-amber-600 dark:text-amber-400" />
          您已参与抽奖 · 等待开奖
        </div>
      )}

      {/* 等待开奖提示 */}
      {lottery.status === 'ended' && !lottery.hasEntered && (
        <div className="text-center py-4 text-sm font-medium text-text-tertiary bg-bg-secondary rounded-lg border border-border-primary">
          <Clock className="w-4 h-4 inline mr-2" />
          参与时间已截止，等待开奖
        </div>
      )}

      {/* 参与弹窗 */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-secondary rounded-xl max-w-md w-full max-h-[90vh] overflow-auto shadow-2xl border border-border-primary"
          >
            {/* 头部 */}
            <div className="p-5 border-b border-border-primary">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  参与抽奖
                </h3>
                <button
                  onClick={() => {
                    setShowEntryModal(false)
                    setError('')
                    setEmail('')
                    setCustomFieldValues({})
                  }}
                  className="p-1 rounded-lg hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                {lottery.title}
              </p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleEnter} className="p-5 space-y-4">
              {lottery.enable_email_notification && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    邮箱地址 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱地址（中奖后将收到通知）"
                    className="w-full px-4 py-2.5 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* 自定义字段 */}
              {lottery.custom_fields?.map((field: any, index: number) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={customFieldValues[field.name] || ''}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                      placeholder={field.placeholder || `请输入${field.label}`}
                      className="w-full px-4 py-2.5 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required={field.required}
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={customFieldValues[field.name] || ''}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                      placeholder={field.placeholder || `请输入${field.label}`}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required={field.required}
                    />
                  )}
                  {field.description && (
                    <p className="text-xs text-text-tertiary mt-1">{field.description}</p>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEntryModal(false)
                    setError('')
                    setEmail('')
                    setCustomFieldValues({})
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-bg-tertiary hover:bg-border-primary rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-bg-tertiary disabled:text-text-tertiary rounded-lg transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      提交中...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      确认参与
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
