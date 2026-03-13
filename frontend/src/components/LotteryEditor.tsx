'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadLotteryPrizeImage } from '@/lib/api'
import { getImageUrl } from '@/lib/api'

interface PrizeOption {
  prize_name: string
  prize_image?: string
  prize_description?: string
  probability: number
  quantity: number
  sort_order: number
}

interface LotteryFormData {
  title: string
  description: string
  draw_time: string
  ip_limit: number
  enable_email_notification: boolean
  custom_fields: Array<{
    name: string
    label: string
    type: 'text' | 'email' | 'textarea'
    required: boolean
  }>
  show_prizes: boolean
  show_probability: boolean
  show_quantity: boolean
  show_participants: boolean
  result_visibility: 'before' | 'after' | 'admin'
  redirect_url?: string
  is_active: boolean
  draw_type: 'manual' | 'auto'
  prizes: PrizeOption[]
}

interface LotteryEditorProps {
  lottery?: any
  onSave: (data: LotteryFormData) => Promise<void>
  onCancel: () => void
}

export default function LotteryEditor({ lottery, onSave, onCancel }: LotteryEditorProps) {
  const [formData, setFormData] = useState<LotteryFormData>({
    title: '',
    description: '',
    draw_time: '',
    ip_limit: 1,
    enable_email_notification: true,
    custom_fields: [],
    show_prizes: true,
    show_probability: true,
    show_quantity: true,
    show_participants: true,
    result_visibility: 'before',
    redirect_url: '',
    is_active: true,
    draw_type: 'manual',
    prizes: []
  })

  const [errors, setErrors] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [expandedPrize, setExpandedPrize] = useState<number | null>(null)
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

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

  // 处理图片上传
  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, [`prize_${index}_image`]: '请选择图片文件' })
      return
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, [`prize_${index}_image`]: '图片大小不能超过 5MB' })
      return
    }

    setUploadingImage(index)
    try {
      const response = await uploadLotteryPrizeImage(file)
      if (response.success) {
        updatePrize(index, { prize_image: response.data.url })
        setErrors({ ...errors, [`prize_${index}_image`]: undefined })
      } else {
        setErrors({ ...errors, [`prize_${index}_image`]: response.message || '上传失败' })
      }
    } catch (error: any) {
      setErrors({ ...errors, [`prize_${index}_image`]: error.response?.data?.message || '上传失败' })
    } finally {
      setUploadingImage(null)
    }
  }

  useEffect(() => {
    if (lottery) {
      // 过滤掉 custom_fields 中的邮箱字段（因为邮箱通知功能已单独处理）
      const filteredCustomFields = (lottery.custom_fields || []).filter(
        (field: any) => field.name !== 'email' && field.type !== 'email'
      )
      setFormData({
        title: lottery.title || '',
        description: lottery.description || '',
        draw_time: formatDateTimeLocal(lottery.draw_time),
        ip_limit: lottery.ip_limit || 1,
        enable_email_notification: lottery.enable_email_notification !== undefined ? lottery.enable_email_notification : true,
        custom_fields: filteredCustomFields,
        show_prizes: lottery.show_prizes !== undefined ? lottery.show_prizes : true,
        show_probability: lottery.show_probability !== undefined ? lottery.show_probability : true,
        show_quantity: lottery.show_quantity !== undefined ? lottery.show_quantity : true,
        show_participants: lottery.show_participants !== undefined ? lottery.show_participants : true,
        result_visibility: lottery.result_visibility === 'none' ? 'admin' : (lottery.result_visibility ?? 'before'),
        redirect_url: lottery.redirect_url || '',
        is_active: lottery.is_active !== undefined ? lottery.is_active : true,
        draw_type: lottery.draw_type || 'manual',
        prizes: lottery.prizes || []
      })
    }
  }, [lottery])

  // 添加奖项
  const addPrize = () => {
    const newPrize: PrizeOption = {
      prize_name: '',
      probability: 0,
      quantity: 1,
      sort_order: formData.prizes.length
    }

    // 自动计算平均概率
    const currentPrizes = formData.prizes
    const newCount = currentPrizes.length + 1
    const avgProbability = 100 / newCount

    const updatedPrizes = currentPrizes.map(p => ({
      ...p,
      probability: avgProbability
    }))

    newPrize.probability = avgProbability

    setFormData({
      ...formData,
      prizes: [...updatedPrizes, newPrize]
    })
    setExpandedPrize(formData.prizes.length)
  }

  // 删除奖项
  const removePrize = (index: number) => {
    const newPrizes = formData.prizes.filter((_, i) => i !== index)

    // 重新分配概率
    const count = newPrizes.length
    if (count > 0) {
      const avgProbability = 100 / count
      newPrizes.forEach(p => {
        p.probability = avgProbability
      })
    }

    setFormData({
      ...formData,
      prizes: newPrizes.map((p, i) => ({ ...p, sort_order: i }))
    })

    if (expandedPrize === index) {
      setExpandedPrize(null)
    }
  }

  // 更新奖项
  const updatePrize = (index: number, updates: Partial<PrizeOption>) => {
    const newPrizes = [...formData.prizes]
    newPrizes[index] = { ...newPrizes[index], ...updates }

    // 如果修改了概率，自动调整其他奖项
    if (updates.probability !== undefined) {
      const changedProbability = parseFloat(String(updates.probability))
      const remaining = 100 - changedProbability
      const otherPrizes = newPrizes.filter((_, i) => i !== index)

      if (otherPrizes.length > 0 && remaining >= 0) {
        const totalOther = otherPrizes.reduce((sum, p) => sum + (parseFloat(p.probability as any) || 0), 0)

        if (totalOther > 0) {
          otherPrizes.forEach(p => {
            const ratio = (parseFloat(p.probability as any) || 0) / totalOther
            p.probability = Math.round(remaining * ratio * 100) / 100
          })
        } else {
          const avgRemaining = remaining / otherPrizes.length
          otherPrizes.forEach(p => {
            p.probability = avgRemaining
          })
        }
      }
    }

    setFormData({ ...formData, prizes: newPrizes })
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.title.trim()) {
      newErrors.title = '请输入抽奖主题'
    }

    if (!formData.draw_time) {
      newErrors.draw_time = '请选择开奖时间'
    } else {
      const drawTime = new Date(formData.draw_time)
      const now = new Date()
      if (drawTime <= now) {
        newErrors.draw_time = '开奖时间必须晚于当前时间'
      }
    }

    if (formData.prizes.length === 0) {
      newErrors.prizes = '至少需要1个奖项'
    }

    const totalProbability = formData.prizes.reduce((sum, prize) => sum + (parseFloat(prize.probability as any) || 0), 0)
    if (Math.abs(totalProbability - 100) > 0.01) {
      newErrors.probability = `所有奖项概率总和必须为100%，当前为${totalProbability.toFixed(2)}%`
    }

    formData.prizes.forEach((prize, i) => {
      if (!prize.prize_name.trim()) {
        newErrors[`prize_${i}_name`] = '请输入奖项名称'
      }
      if (prize.probability <= 0 || prize.probability > 100) {
        newErrors[`prize_${i}_probability`] = '概率必须在0-100之间'
      }
      if (prize.quantity < 1) {
        newErrors[`prize_${i}_quantity`] = '奖品数量必须至少为1'
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
          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              抽奖主题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="请输入抽奖主题"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* 详情描述 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              抽奖详情
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="请输入抽奖详情描述（可选）"
            />
          </div>

          {/* 开奖时间 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              开奖时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.draw_time}
              onChange={(e) => setFormData({ ...formData, draw_time: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            {errors.draw_time && <p className="text-red-500 text-sm mt-1">{errors.draw_time}</p>}
          </div>

          {/* IP限制 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                每个IP最多参与次数
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
                placeholder="参与后自动跳转的网址，留空则不跳转"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* 开奖方式 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              开奖方式
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="draw_type"
                  value="manual"
                  checked={formData.draw_type === 'manual'}
                  onChange={() => setFormData({ ...formData, draw_type: 'manual' })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">管理员手动开奖</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="draw_type"
                  value="auto"
                  checked={formData.draw_type === 'auto'}
                  onChange={() => setFormData({ ...formData, draw_type: 'auto' })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">系统自动开奖</span>
              </label>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {formData.draw_type === 'manual' 
                ? '管理员需要在后台手动点击"开奖"按钮。' 
                : '系统将在到达开奖时间后自动执行开奖。'}
            </p>
          </div>

          {/* 选项 */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">基本设置</div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enable_email_notification}
                  onChange={(e) => setFormData({ ...formData, enable_email_notification: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">启用中奖邮箱通知</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">启用抽奖</span>
              </label>
            </div>

            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">前台显示设置</div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">结果可见性</label>
                <select
                  value={formData.result_visibility}
                  onChange={(e) => setFormData({ ...formData, result_visibility: e.target.value as any })}
                  className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                >
                  <option value="before">前台可见</option>
                  <option value="after">参与后可见</option>
                  <option value="admin">仅后台可见</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_prizes}
                  onChange={(e) => setFormData({ ...formData, show_prizes: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">展示具体奖项</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_probability}
                  onChange={(e) => setFormData({ ...formData, show_probability: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">展示奖项概率</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_quantity}
                  onChange={(e) => setFormData({ ...formData, show_quantity: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">展示奖项数量</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_participants}
                  onChange={(e) => setFormData({ ...formData, show_participants: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">展示参与人数</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 奖项设置 */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">奖项设置</h3>
          <button
            type="button"
            onClick={addPrize}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            添加奖项 +
          </button>
        </div>

        {errors.probability && (
          <p className="text-red-500 text-sm mb-4">{errors.probability}</p>
        )}
        {errors.prizes && (
          <p className="text-red-500 text-sm mb-4">{errors.prizes}</p>
        )}

        {/* 奖项列表 */}
        <div className="space-y-4">
          <AnimatePresence>
            {formData.prizes.map((prize, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
              >
                {/* 奖项头部 */}
                <div
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 cursor-pointer"
                  onClick={() => setExpandedPrize(expandedPrize === index ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {prize.prize_name || '未命名奖项'}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        概率: {parseFloat(String(prize.probability)).toFixed(2)}% | 数量: {prize.quantity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {formData.prizes.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePrize(index); }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* 奖项详情（展开时显示） */}
                {expandedPrize === index && (
                  <div className="p-4 space-y-4 bg-white dark:bg-neutral-900">
                    {/* 奖项名称 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        奖项名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={prize.prize_name}
                        onChange={(e) => updatePrize(index, { prize_name: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        placeholder="请输入奖项名称"
                      />
                      {errors[`prize_${index}_name`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`prize_${index}_name`]}</p>
                      )}
                    </div>

                    {/* 奖项图片 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        奖项图片
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={prize.prize_image || ''}
                            onChange={(e) => updatePrize(index, { prize_image: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                            placeholder="输入图片URL"
                          />
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                          ref={(el) => { fileInputRefs.current[index] = el }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(index, file)
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={uploadingImage === index}
                          className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {uploadingImage === index ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              上传中
                            </>
                          ) : (
                            <>📤 上传</>
                          )}
                        </button>
                      </div>
                      {prize.prize_image && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={getImageUrl(prize.prize_image)}
                            alt="预览"
                            className="w-16 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                          />
                          <button
                            type="button"
                            onClick={() => updatePrize(index, { prize_image: '' })}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            删除图片
                          </button>
                        </div>
                      )}
                      {errors[`prize_${index}_image`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`prize_${index}_image`]}</p>
                      )}
                    </div>

                    {/* 奖项描述 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        奖项描述
                      </label>
                      <textarea
                        value={prize.prize_description || ''}
                        onChange={(e) => updatePrize(index, { prize_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        placeholder="请输入奖项描述（可选）"
                      />
                    </div>

                    {/* 概率和数量 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                          中奖概率 (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={prize.probability}
                          onChange={(e) => updatePrize(index, { probability: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        />
                        {errors[`prize_${index}_probability`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`prize_${index}_probability`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                          奖品数量 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={prize.quantity}
                          onChange={(e) => updatePrize(index, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        />
                        {errors[`prize_${index}_quantity`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`prize_${index}_quantity`]}</p>
                        )}
                      </div>
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
          {saving ? '保存中...' : '保存抽奖'}
        </button>
      </div>
    </div>
  )
}
