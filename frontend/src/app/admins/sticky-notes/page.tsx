'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle2, Copy, Eye, EyeOff } from 'lucide-react'
import {
  getAdminStickyNotes,
  getAdminStickyNoteCategories,
  createAdminStickyNote,
  updateAdminStickyNote,
  deleteAdminStickyNote
} from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'

interface StickyNote {
  id?: number
  title: string
  content: string
  category?: string
  color?: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

type CredentialStickyNoteContent = {
  _type: 'credential'
  url?: string
  account?: string
  password?: string
  remark?: string
  v?: number
}

const COLORS = [
  { name: '黄色', value: '#fef68a' },
  { name: '绿色', value: '#d1fae5' },
  { name: '蓝色', value: '#bfdbfe' },
  { name: '粉色', value: '#fce7f3' },
  { name: '橙色', value: '#fed7aa' },
  { name: '紫色', value: '#e9d5ff' },
]

export default function StickyNotesPage() {
  usePageTitle('便签管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isCredentialNote, setIsCredentialNote] = useState(false)
  const [credentialData, setCredentialData] = useState({
    url: '',
    account: '',
    password: '',
    remark: ''
  })
  const [formData, setFormData] = useState<StickyNote>({
    title: '',
    content: '',
    category: '',
    color: '#fef68a',
    sort_order: 0
  })
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [credentialVisibility, setCredentialVisibility] = useState<Record<number, { url: boolean; account: boolean; password: boolean; remark: boolean }>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [perPage, setPerPage] = useState(30)
  const [notesLoading, setNotesLoading] = useState(false)

  // 使用 useMemo 优化过滤计算
  const filteredNotes = useMemo(() => notes.filter((note) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)

    const matchesCategory = !selectedCategory || note.category === selectedCategory

    return matchesSearch && matchesCategory
  }), [notes, searchQuery, selectedCategory])

  const parseCredentialContent = (raw: string): CredentialStickyNoteContent | null => {
    if (!raw?.trim()) return null
    try {
      const obj = JSON.parse(raw)
      if (!obj || typeof obj !== 'object') return null
      if (obj._type !== 'credential') return null
      return obj as CredentialStickyNoteContent
    } catch {
      return null
    }
  }

  const maskMiddle = (raw: string, maskRatio: number) => {
    const value = (raw || '').toString()
    if (!value) return ''
    const len = value.length
    if (len <= 2) return '*'.repeat(len)

    const keepRatio = Math.max(0, Math.min(0.5, (1 - maskRatio) / 2))
    const keepStart = Math.max(1, Math.floor(len * keepRatio))
    const keepEnd = Math.max(1, Math.floor(len * keepRatio))
    if (keepStart + keepEnd >= len) return '*'.repeat(len)

    const maskedLen = len - keepStart - keepEnd
    return value.slice(0, keepStart) + '*'.repeat(maskedLen) + value.slice(len - keepEnd)
  }

  const getCredentialVisibility = (noteId: number) => {
    return credentialVisibility[noteId] || { url: false, account: false, password: false, remark: false }
  }

  const setCredentialVisibilityFor = (noteId: number, patch: Partial<{ url: boolean; account: boolean; password: boolean; remark: boolean }>) => {
    setCredentialVisibility((prev) => {
      const current = prev[noteId] || { url: false, account: false, password: false, remark: false }
      return { ...prev, [noteId]: { ...current, ...patch } }
    })
  }

  const copyToClipboard = async (value: string, successMessage: string) => {
    const text = (value || '').toString()
    if (!text) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setToast({ show: true, type: 'success', message: successMessage })
    } catch {
      setToast({ show: true, type: 'error', message: '复制失败，请手动复制' })
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const categoriesResponse = await getAdminStickyNoteCategories()
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data || [])
      }
    } catch {
      setCategories([])
    }
  }, [])

  const loadNotes = useCallback(async (pageNum = 1) => {
    setNotesLoading(true)
    try {
      const trimmedSearch = searchQuery.trim()
      const response = await getAdminStickyNotes({
        page: pageNum,
        limit: perPage,
        search: trimmedSearch ? trimmedSearch : undefined,
        category: selectedCategory ? selectedCategory : undefined
      })
      if (response.success) {
        const notesData = Array.isArray(response.data) ? response.data : []
        setNotes(notesData)
        setCurrentPage(pageNum)
        setTotalPages(Number(response.pagination?.total_pages || 1))
        setTotalCount(Number(response.pagination?.total_count || 0))
      }
    } catch (error) {
      setToast({ show: true, type: 'error', message: '加载便签失败' })
      setNotes([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setNotesLoading(false)
    }
  }, [perPage, searchQuery, selectedCategory])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotes(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [loadNotes])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload: StickyNote = {
        ...formData,
        content: isCredentialNote
          ? JSON.stringify({
              _type: 'credential',
              url: credentialData.url || '',
              account: credentialData.account || '',
              password: credentialData.password || '',
              remark: credentialData.remark || '',
              v: 1
            } satisfies CredentialStickyNoteContent)
          : formData.content
      }

      if (editingNote?.id) {
        const response = await updateAdminStickyNote(editingNote.id, payload)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '便签更新成功' })
          await loadNotes(1)
          resetForm()
        }
      } else {
        const response = await createAdminStickyNote(payload)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '便签添加成功' })
          await loadNotes(1)
          resetForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleEdit = (note: StickyNote) => {
    setEditingNote(note)
    const parsed = parseCredentialContent(note.content)
    setFormData({
      title: note.title,
      content: parsed ? '' : note.content,
      category: note.category || '',
      color: note.color || '#fef68a',
      sort_order: note.sort_order || 0
    })
    setIsCredentialNote(!!parsed)
    setCredentialData({
      url: parsed?.url || '',
      account: parsed?.account || '',
      password: parsed?.password || '',
      remark: parsed?.remark || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个便签吗？')) return

    try {
      const response = await deleteAdminStickyNote(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '便签删除成功' })
        await loadNotes(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetForm = () => {
    setFormData({ title: '', content: '', category: '', color: '#fef68a', sort_order: 0 })
    setEditingNote(null)
    setShowForm(false)
    setIsCredentialNote(false)
    setCredentialData({ url: '', account: '', password: '', remark: '' })
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

          {/* 添加按钮、筛选器和搜索框 */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <button
                onClick={() => {
                  if (showForm) {
                    resetForm()
                    return
                  }
                  setEditingNote(null)
                  setFormData({ title: '', content: '', category: '', color: '#fef68a', sort_order: 0 })
                  setIsCredentialNote(false)
                  setCredentialData({ url: '', account: '', password: '', remark: '' })
                  setShowForm(true)
                }}
                className="btn btn-primary"
              >
                {showForm ? '关闭弹窗' : '+ 添加便签'}
              </button>

              <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
                <input
                  type="text"
                  placeholder="搜索便签标题或内容.."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            {/* 分类筛选器 */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">分类筛选：</span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === ''
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  全部
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 添加/编辑弹窗 */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="关闭"
                onClick={resetForm}
                className="absolute inset-0 bg-black/40"
              />
              <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">
                    {editingNote ? '编辑便签' : '添加便签'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCredentialNote((v) => !v)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        isCredentialNote ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-pressed={isCredentialNote}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isCredentialNote ? 'text-emerald-600' : 'text-gray-400'}`} />
                      是否为账号密码
                    </button>
                    <button type="button" onClick={resetForm} className="btn btn-secondary">
                      关闭
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      便签标题
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="input"
                      placeholder="输入便签标题..."
                    />
                  </div>

                  {!isCredentialNote ? (
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                        便签内容
                      </label>
                      <textarea
                        id="content"
                        name="content"
                        rows={5}
                        required
                        value={formData.content}
                        onChange={handleChange}
                        className="input"
                        placeholder="输入便签内容..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label htmlFor="credential_url" className="block text-sm font-medium text-gray-700 mb-2">
                            网址 (可选)
                          </label>
                          <input
                            id="credential_url"
                            type="text"
                            value={credentialData.url}
                            onChange={(e) => setCredentialData({ ...credentialData, url: e.target.value })}
                            className="input"
                            placeholder="输入网址..."
                          />
                        </div>
                        <div>
                          <label htmlFor="credential_account" className="block text-sm font-medium text-gray-700 mb-2">
                            账号 (可选)
                          </label>
                          <input
                            id="credential_account"
                            type="text"
                            value={credentialData.account}
                            onChange={(e) => setCredentialData({ ...credentialData, account: e.target.value })}
                            className="input"
                            placeholder="输入账号..."
                          />
                        </div>
                        <div>
                          <label htmlFor="credential_password" className="block text-sm font-medium text-gray-700 mb-2">
                            密码 (可选)
                          </label>
                          <input
                            id="credential_password"
                            type="text"
                            value={credentialData.password}
                            onChange={(e) => setCredentialData({ ...credentialData, password: e.target.value })}
                            className="input"
                            placeholder="输入密码..."
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="credential_remark" className="block text-sm font-medium text-gray-700 mb-2">
                            备注 (可选)
                          </label>
                          <textarea
                            id="credential_remark"
                            rows={3}
                            value={credentialData.remark}
                            onChange={(e) => setCredentialData({ ...credentialData, remark: e.target.value })}
                            className="input"
                            placeholder="输入备注..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      便签分类 (可选)
                    </label>
                    <input
                      id="category"
                      name="category"
                      type="text"
                      value={formData.category}
                      onChange={handleChange}
                      className="input"
                      placeholder="输入分类，如：工作、学习、生活.."
                      list="category-suggestions"
                    />
                    {categories.length > 0 && (
                      <datalist id="category-suggestions">
                        {categories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                      便签颜色
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: colorOption.value })}
                          className={`w-12 h-12 rounded-lg border-2 transition-all ${
                            formData.color === colorOption.value
                              ? 'border-gray-800 scale-110 shadow-lg'
                              : 'border-gray-300 hover:border-gray-500'
                          }`}
                          style={{ backgroundColor: colorOption.value }}
                          title={colorOption.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                      排序 (可选)
                    </label>
                    <input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={handleChange}
                      className="input"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="submit" className="btn btn-primary w-full sm:w-auto">
                      {editingNote ? '更新' : '添加'}
                    </button>
                    <button type="button" onClick={resetForm} className="btn btn-secondary w-full sm:w-auto">
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 便签列表 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              便签列表 (第 {currentPage}/{totalPages} 页 · 共 {totalCount} 条)
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadNotes(Math.max(1, currentPage - 1))}
                  disabled={notesLoading || currentPage <= 1}
                  className="btn btn-secondary"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => loadNotes(Math.min(totalPages, currentPage + 1))}
                  disabled={notesLoading || currentPage >= totalPages}
                  className="btn btn-secondary"
                >
                  下一页
                </button>
                {notesLoading && (
                  <div className="text-sm text-gray-500">加载中...</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">每页</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="input !py-1.5 !px-2 !w-[88px]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            {filteredNotes.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500">
                  {searchQuery ? '没有找到匹配的便签' : '还没有添加任何便签'}
                </p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg shadow-md p-5 relative transition-transform hover:scale-105 flex flex-col min-w-0 overflow-hidden w-full inline-block mb-4 break-inside-avoid"
                    style={{ backgroundColor: note.color }}
                  >
                    <div className="mb-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 text-lg mb-2">{note.title}</h3>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {note.category && (
                            <span className="text-xs px-2 py-1 bg-blue-500/70 text-white rounded">
                              {note.category}
                            </span>
                          )}
                          {note.sort_order !== undefined && note.sort_order > 0 && (
                            <span className="text-xs px-2 py-1 bg-white/70 text-gray-700 rounded">
                              排序: {note.sort_order}
                            </span>
                          )}
                          {(() => {
                            const parsed = parseCredentialContent(note.content)
                            if (!parsed) return null
                            return (
                              <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-black/10 text-gray-800">
                                账号密码
                              </span>
                            )
                          })()}
                        </div>

                        {(() => {
                          const parsed = parseCredentialContent(note.content)
                          if (!parsed || !note.id) return null
                          const vis = getCredentialVisibility(note.id)
                          const allVisible = vis.url && vis.account && vis.password && vis.remark
                          const urlText = parsed.url || ''
                          const accountText = parsed.account || ''
                          const passwordText = parsed.password || ''
                          const remarkText = parsed.remark || ''
                          return (
                            <div className="flex items-center justify-start gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCredentialVisibilityFor(note.id!, {
                                    url: !allVisible,
                                    account: !allVisible,
                                    password: !allVisible,
                                    remark: !allVisible
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white/70 border border-black/10 text-gray-800 hover:bg-white transition-colors"
                              >
                                {allVisible ? '全部隐藏' : '全部显示'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = [
                                    `标题: ${note.title}`,
                                    `网址: ${urlText}`,
                                    `账号: ${accountText}`,
                                    `密码: ${passwordText}`,
                                    `备注: ${remarkText}`
                                  ].join('\n')
                                  copyToClipboard(text, '已复制全部内容')
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white/70 border border-black/10 text-gray-800 hover:bg-white transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                全部复制
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {(() => {
                      const parsed = parseCredentialContent(note.content)
                      if (!parsed || !note.id) {
                        return <p className="text-gray-700 whitespace-pre-wrap break-all mb-4">{note.content}</p>
                      }

                      const vis = getCredentialVisibility(note.id)
                      const urlText = parsed.url || ''
                      const accountText = parsed.account || ''
                      const passwordText = parsed.password || ''
                      const remarkText = parsed.remark || ''

                      const urlDisplay = vis.url ? urlText : maskMiddle(urlText, 0.8)
                      const accountDisplay = vis.account ? accountText : maskMiddle(accountText, 0.5)
                      const passwordDisplay = vis.password ? passwordText : (passwordText ? '*'.repeat(passwordText.length) : '')
                      const remarkDisplay = vis.remark ? remarkText : maskMiddle(remarkText, 0.8)

                      const FieldRow = ({
                        label,
                        value,
                        maskedValue,
                        canCopy,
                        copyLabel,
                        visible,
                        onToggleVisible,
                        onCopy
                      }: {
                        label: string
                        value: string
                        maskedValue: string
                        canCopy: boolean
                        copyLabel: string
                        visible: boolean
                        onToggleVisible: () => void
                        onCopy: () => void
                      }) => {
                        const shown = visible ? value : maskedValue
                        const display = shown || (value ? shown : '')
                        const empty = !value
                        return (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 sm:w-[52px] shrink-0">{label}</div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-black/10 bg-white/70 overflow-x-auto scrollbar-hide">
                                <div className="text-sm text-gray-800 font-mono whitespace-nowrap">
                                  {empty ? <span className="text-gray-400">未填写</span> : display}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={empty || !canCopy}
                                onClick={onCopy}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                                  empty || !canCopy ? 'border-black/5 text-gray-300 bg-white/40' : 'border-black/10 bg-white/70 hover:bg-white text-gray-800'
                                }`}
                                aria-label={copyLabel || '复制'}
                                title={copyLabel || '复制'}
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={empty}
                                onClick={onToggleVisible}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                                  empty ? 'border-black/5 text-gray-300 bg-white/40' : 'border-black/10 bg-white/70 hover:bg-white text-gray-800'
                                }`}
                                aria-label={visible ? '隐藏' : '显示'}
                                title={visible ? '隐藏' : '显示'}
                              >
                                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div className="mb-4 space-y-2.5">
                          <FieldRow
                            label="网址"
                            value={urlText}
                            maskedValue={urlDisplay}
                            canCopy
                            copyLabel="复制网址"
                            visible={vis.url}
                            onToggleVisible={() => setCredentialVisibilityFor(note.id!, { url: !vis.url })}
                            onCopy={() => copyToClipboard(urlText, '网址已复制')}
                          />
                          <FieldRow
                            label="账号"
                            value={accountText}
                            maskedValue={accountDisplay}
                            canCopy
                            copyLabel="复制账号"
                            visible={vis.account}
                            onToggleVisible={() => setCredentialVisibilityFor(note.id!, { account: !vis.account })}
                            onCopy={() => copyToClipboard(accountText, '账号已复制')}
                          />
                          <FieldRow
                            label="密码"
                            value={passwordText}
                            maskedValue={passwordDisplay}
                            canCopy
                            copyLabel="复制密码"
                            visible={vis.password}
                            onToggleVisible={() => setCredentialVisibilityFor(note.id!, { password: !vis.password })}
                            onCopy={() => copyToClipboard(passwordText, '密码已复制')}
                          />
                          <FieldRow
                            label="备注"
                            value={remarkText}
                            maskedValue={remarkDisplay}
                            canCopy={false}
                            copyLabel=""
                            visible={vis.remark}
                            onToggleVisible={() => setCredentialVisibilityFor(note.id!, { remark: !vis.remark })}
                            onCopy={() => {}}
                          />
                        </div>
                      )
                    })()}

                    <div className="mt-auto">
                      <div className="text-xs text-gray-600 mb-3 space-y-1">
                        {note.created_at && (
                          <div>创建: {formatDate(note.created_at)}</div>
                        )}
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <div>修改: {formatDate(note.updated_at)}</div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(note)}
                          className="flex-1 px-3 py-1.5 bg-white/80 hover:bg-white text-gray-800 rounded text-sm font-medium transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => note.id && handleDelete(note.id)}
                          className="flex-1 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
