/**
 * @file PollEditor.tsx
 * @description 投票编辑器组件
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, GripVertical, Image as ImageIcon, Calendar } from 'lucide-react'
import { uploadAdminPollImage, getImageUrl } from '@/lib/api'

interface PollOption {
  id?: number
  option_text: string
  option_image?: string
  sort_order: number
}

interface PollData {
  id?: number
  title: string
  description?: string
  poll_type: 'single' | 'multiple'
  max_choices: number
  start_time?: string
  end_time?: string
  result_visibility: 'none' | 'after' | 'admin' | 'before'
  show_participants?: boolean
  ip_limit: number
  redirect_url?: string
  is_active: boolean
  options: PollOption[]
}

interface PollEditorProps {
  noteId: number
  poll?: PollData | null
  onSave: (pollData: PollData) => Promise<void>
  onClose: () => void
}

export default function PollEditor({ noteId, poll, onSave, onClose }: PollEditorProps) {
  const [formData, setFormData] = useState<PollData>({
    title: '',
    description: '',
    poll_type: 'single',
    max_choices: 1,
    start_time: '',
    end_time: '',
    result_visibility: 'before',
    show_participants: true,
    ip_limit: 1,
    redirect_url: '',
    is_active: true,
    options: [
      { option_text: '', sort_order: 0 },
      { option_text: '', sort_order: 1 }
    ]
  })

  const [uploading, setUploading] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const normalizeBoolean = (value: any, fallback: boolean) => {
    if (value === undefined || value === null) return fallback
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    const normalized = String(value).trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '') return false
    return fallback
  }

  useEffect(() => {
    if (poll) {
      const resolvedResultVisibility =
        poll.result_visibility === 'none' ? 'admin' : (poll.result_visibility ?? 'before')
      setFormData({
        id: poll.id,
        title: poll.title ?? '',
        description: poll.description ?? '',
        poll_type: poll.poll_type ?? 'single',
        max_choices: Math.max(1, Number(poll.max_choices ?? 1)),
        start_time: formatDateTimeLocal(poll.start_time),
        end_time: formatDateTimeLocal(poll.end_time),
        result_visibility: resolvedResultVisibility,
        show_participants: normalizeBoolean((poll as any).show_participants, true),
        ip_limit: Math.max(1, Number((poll as any).ip_limit ?? 1)),
        redirect_url: (poll as any).redirect_url ?? '',
        is_active: normalizeBoolean((poll as any).is_active, true),
        options: (poll.options ?? []).map((opt, index) => ({
          ...opt,
          sort_order: opt.sort_order ?? index
        }))
      })
    }
  }, [poll])

  const handleAddOption = () => {
    if (formData.options.length >= 20) {
      setErrors({ ...errors, options: '最多只能添加20个选项' })
      return
    }
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { option_text: '', sort_order: formData.options.length }
      ]
    })
  }

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      setErrors({ ...errors, options: '至少需要2个选项' })
      return
    }
    const newOptions = formData.options.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      options: newOptions.map((opt, i) => ({ ...opt, sort_order: i }))
    })
  }

  const handleOptionChange = (index: number, field: keyof PollOption, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setFormData({ ...formData, options: newOptions })
  }

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, [`option_${index}`]: '请选择图片文件' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, [`option_${index}`]: '图片大小不能超过5MB' })
      return
    }

    setUploading(index)
    try {
      const result = await uploadAdminPollImage(file)
      if (result.success) {
        handleOptionChange(index, 'option_image', result.data.url)
        setErrors({ ...errors, [`option_${index}`]: '' })
      } else {
        setErrors({ ...errors, [`option_${index}`]: result.message || '上传失败' })
      }
    } catch (error) {
      setErrors({ ...errors, [`option_${index}`]: '上传失败，请重试' })
    } finally {
      setUploading(index)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newOptions = [...formData.options]
    const draggedOption = newOptions[draggedIndex]
    newOptions.splice(draggedIndex, 1)
    newOptions.splice(index, 0, draggedOption)

    setFormData({
      ...formData,
      options: newOptions.map((opt, i) => ({ ...opt, sort_order: i }))
    })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '请输入投票标题'
    }

    if (formData.options.length < 2) {
      newErrors.options = '至少需要2个选项'
    }

    const emptyOptions = formData.options.filter(opt => !opt.option_text.trim())
    if (emptyOptions.length > 0) {
      newErrors.options = '所有选项都必须填写内容'
    }

    if (formData.poll_type === 'multiple' && formData.max_choices < 1) {
      newErrors.max_choices = '最多选择数必须大于0'
    }

    if (formData.poll_type === 'multiple' && formData.max_choices > formData.options.length) {
      newErrors.max_choices = '最多选择数不能超过选项总数'
    }

    if (formData.ip_limit < 1) {
      newErrors.ip_limit = 'IP限制次数必须大于0'
    }

    if (formData.start_time && formData.end_time) {
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        newErrors.end_time = '结束时间必须晚于开始时间'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        poll_type: formData.poll_type,
        max_choices: formData.max_choices,
        start_time: formData.start_time ? formData.start_time : null,
        end_time: formData.end_time ? formData.end_time : null,
        result_visibility: formData.result_visibility,
        show_participants: formData.show_participants ?? true,
        ip_limit: formData.ip_limit,
        redirect_url: formData.redirect_url || '',
        is_active: !!formData.is_active,
        options: formData.options.map((opt, index) => ({
          id: opt.id,
          option_text: opt.option_text,
          option_image: opt.option_image,
          sort_order: opt.sort_order ?? index
        }))
      }

      await onSave(payload as any)
      onClose()
    } catch (error) {
      console.error('保存投票失败:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {poll ? '编辑投票' : '创建投票'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                投票标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入投票标题"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">投票描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入投票描述（可选）"
                rows={3}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 resize-none"
              />
            </div>
          </div>

          {/* 投票类型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">投票类型</label>
              <select
                value={formData.poll_type}
                onChange={(e) => setFormData({ ...formData, poll_type: e.target.value as 'single' | 'multiple', max_choices: e.target.value === 'single' ? 1 : formData.max_choices })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              >
                <option value="single">单选</option>
                <option value="multiple">多选</option>
              </select>
            </div>

            {formData.poll_type === 'multiple' && (
              <div>
                <label className="block text-sm font-medium mb-2">最多选择数</label>
                <input
                  type="number"
                  min="1"
                  max={formData.options.length}
                  value={formData.max_choices}
                  onChange={(e) => setFormData({ ...formData, max_choices: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                />
                {errors.max_choices && <p className="text-red-500 text-sm mt-1">{errors.max_choices}</p>}
              </div>
            )}
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                开始时间
              </label>
              <input
                type="datetime-local"
                value={formData.start_time ?? ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                结束时间
              </label>
              <input
                type="datetime-local"
                value={formData.end_time ?? ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
              />
              {errors.end_time && <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>}
            </div>
          </div>

          {/* 高级设置 */}
          <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <h3 className="font-medium text-sm">高级设置</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">结果可见性</label>
                <select
                  value={formData.result_visibility}
                  onChange={(e) => setFormData({ ...formData, result_visibility: e.target.value as any })}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                >
                  <option value="before">前台可见</option>
                  <option value="after">投票后可见</option>
                  <option value="admin">仅后台可见</option>
                </select>
                <div className="mt-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_participants ?? true}
                      onChange={(e) => setFormData({ ...formData, show_participants: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">显示参与人数</span>
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                    控制是否在前台显示投票参与人数（独立于结果可见性）
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">IP投票限制</label>
                <input
                  type="number"
                  min="1"
                  value={formData.ip_limit}
                  onChange={(e) => setFormData({ ...formData, ip_limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                />
                {errors.ip_limit && <p className="text-red-500 text-sm mt-1">{errors.ip_limit}</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">跳转URL（可选）</label>
                <input
                  type="text"
                  value={formData.redirect_url || ''}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  placeholder="投票后自动跳转的网址，留空则不跳转"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">启用投票</span>
              </label>
            </div>
          </div>

          {/* 投票选项 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                投票选项 <span className="text-red-500">*</span>
                <span className="text-neutral-500 text-xs ml-2">（拖拽排序）</span>
              </label>
              <button
                onClick={handleAddOption}
                disabled={formData.options.length >= 20}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加选项
              </button>
            </div>

            {errors.options && <p className="text-red-500 text-sm">{errors.options}</p>}

            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-3 p-4 border border-neutral-300 dark:border-neutral-700 rounded-lg ${
                    draggedIndex === index ? 'opacity-50' : ''
                  } hover:border-blue-500 transition-colors`}
                >
                  <div className="cursor-move pt-2">
                    <GripVertical className="w-5 h-5 text-neutral-400" />
                  </div>

                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={option.option_text}
                      onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                      placeholder={`选项 ${index + 1}`}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
                    />

                    {option.option_image && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700">
                        <img
                          src={getImageUrl(option.option_image)}
                          alt={`选项 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleOptionChange(index, 'option_image', '')}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        {uploading === index ? '上传中...' : '添加图片'}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                          className="hidden"
                          disabled={uploading === index}
                        />
                      </label>
                      {errors[`option_${index}`] && (
                        <p className="text-red-500 text-xs">{errors[`option_${index}`]}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveOption(index)}
                    disabled={formData.options.length <= 2}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {poll ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
