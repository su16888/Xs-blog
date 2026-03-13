'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAdminNotes,
  createAdminNote,
  updateAdminNote,
  deleteAdminNote,
  uploadAdminNoteMedia,
  getAdminNoteCategories,
  getAdminNoteTagStats,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getImageUrl,
  createAdminPoll,
  updateAdminPoll,
  deleteAdminPoll,
  getAdminNotePolls,
  addAdminNoteDisk,
  createAdminSurvey,
  updateAdminSurvey,
  deleteAdminSurvey,
  getAdminNoteSurveys,
  getSurveySubmissions,
  getPollVotes,
  exportPollData,
  exportSurveyData,
  getAdminLotteryStatistics,
  drawLottery,
  exportLotteryData,
  deleteAdminLottery
} from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'
import DiskModal from '@/components/DiskModal'
import PollEditor from '@/components/PollEditor'
import SurveyEditor from '@/components/SurveyEditor'
import LotteryEditor from '@/components/LotteryEditor'

interface Note {
  id?: number
  title: string
  content: string
  summary?: string
  category?: string
  tags?: string
  has_poll?: boolean
  has_survey?: boolean
  has_lottery?: boolean
  has_disk?: boolean
  password?: string
  sort_order?: number
  is_pinned?: boolean
  show_in_list?: boolean
  cover_image?: string
  source_type?: 'none' | 'original' | 'reprint'
  source_url?: string
  source_text?: string
  is_published?: boolean
  custom_slug?: string
}

interface NoteCategory {
  id?: number
  name: string
  description?: string
  icon?: string
  sort_order?: number
}

export default function NotesPage() {
  usePageTitle('笔记管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [categories, setCategories] = useState<NoteCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [listPage, setListPage] = useState(1)
  const [listTotalPages, setListTotalPages] = useState(1)
  const [listTotalCount, setListTotalCount] = useState(0)
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'notes' | 'categories' | 'drafts' | 'editNote'>('notes')

  // 笔记管理相关状?
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Note>({
    title: '',
    content: '',
    summary: '',
    category: '',
    tags: '',
    password: '',
    sort_order: 0,
    is_pinned: false,
    show_in_list: true,
    cover_image: '',
    source_type: 'none',
    source_url: '',
    source_text: '',
    custom_slug: '',
  })

  // 分类管理相关状?
  const [editingCategory, setEditingCategory] = useState<NoteCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState<NoteCategory>({
    name: '',
    description: '',
    icon: '',
    sort_order: 0
  })

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })
  const [showPreview, setShowPreview] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [linkData, setLinkData] = useState({ text: '', url: '' })
  const [imageData, setImageData] = useState({ alt: '', url: '', blur: false, align: 'center' as 'left' | 'center' | 'right', scale: 100 })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<FileList | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 网盘管理相关状?
  const [showDiskModal, setShowDiskModal] = useState(false)
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 投票管理相关状态
  const [showPollEditor, setShowPollEditor] = useState(false)
  const [editingPoll, setEditingPoll] = useState<any>(null)
  const [notePolls, setNotePolls] = useState<any[]>([])
  const [pendingPolls, setPendingPolls] = useState<any[]>([]) // 暂存的投票（新建笔记时）
  const [pendingDisks, setPendingDisks] = useState<any[]>([]) // 暂存的云盘资源（新建笔记时）
  const [viewingPollData, setViewingPollData] = useState<any>(null) // 查看投票数据的模态框
  const [showPollDataModal, setShowPollDataModal] = useState(false) // 控制投票数据模态框显示
  const [pollVotes, setPollVotes] = useState<any[]>([]) // 投票记录
  const [pollVotesLoading, setPollVotesLoading] = useState(false) // 加载状态
  const [pollVotesError, setPollVotesError] = useState<string | null>(null) // 错误状态
  const [pollVotesPage, setPollVotesPage] = useState(1) // 当前页码
  const [pollVotesTotal, setPollVotesTotal] = useState(0) // 总记录数

  // 问卷管理相关状态
  const [showSurveyEditor, setShowSurveyEditor] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<any>(null)
  const [noteSurveys, setNoteSurveys] = useState<any[]>([])
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([]) // 暂存的问卷（新建笔记时）
  const [viewingSurveyData, setViewingSurveyData] = useState<any>(null) // 查看问卷数据的模态框
  const [viewingSurveyId, setViewingSurveyId] = useState<number | null>(null) // 当前查看数据的问卷ID
  const [showSurveyDataModal, setShowSurveyDataModal] = useState(false) // 控制数据查看模态框显示
  const [surveySubmissions, setSurveySubmissions] = useState<any[]>([]) // 问卷提交记录
  const [surveySubmissionsLoading, setSurveySubmissionsLoading] = useState(false) // 加载状态
  const [surveySubmissionsError, setSurveySubmissionsError] = useState<string | null>(null) // 错误状态
  const [surveySubmissionsPage, setSurveySubmissionsPage] = useState(1) // 当前页码
  const [surveySubmissionsTotal, setSurveySubmissionsTotal] = useState(0) // 总记录数

  // 抽奖管理相关状态
  const [showLotteryEditor, setShowLotteryEditor] = useState(false)
  const [editingLottery, setEditingLottery] = useState<any>(null)
  const [noteLotteries, setNoteLotteries] = useState<any[]>([])
  const [pendingLotteries, setPendingLotteries] = useState<any[]>([]) // 暂存的抽奖（新建笔记时）
  const [viewingLotteryData, setViewingLotteryData] = useState<any>(null) // 查看抽奖数据的模态框
  const [viewingLotteryId, setViewingLotteryId] = useState<number | null>(null) // 当前查看数据的抽奖ID
  const [showLotteryDataModal, setShowLotteryDataModal] = useState(false) // 控制数据查看模态框显示
  const [lotteryEntries, setLotteryEntries] = useState<any[]>([]) // 抽奖参与记录
  const [lotteryEntriesLoading, setLotteryEntriesLoading] = useState(false) // 加载状态
  const [lotteryEntriesError, setLotteryEntriesError] = useState<string | null>(null) // 错误状态
  const [lotteryEntriesPage, setLotteryEntriesPage] = useState(1) // 当前页码
  const [lotteryEntriesTotal, setLotteryEntriesTotal] = useState(0) // 总记录数
  const [lotteryStats, setLotteryStats] = useState<any>(null)
  const [lotteryStatsLoading, setLotteryStatsLoading] = useState(false)
  const [lotteryStatsError, setLotteryStatsError] = useState<string | null>(null)

  useEffect(() => {
    loadNotesData()
  }, [])

  useEffect(() => {
    if (activeTab !== 'notes' && activeTab !== 'drafts') return
    setListPage(1)
    setListTotalPages(1)
    setListTotalCount(0)
    loadNotesList(1)
  }, [activeTab, searchTerm, filterCategory, filterTag])

  // 加载问卷提交数据
  useEffect(() => {
    if (viewingSurveyId && showSurveyDataModal) {
      loadSurveySubmissions(viewingSurveyId, surveySubmissionsPage)
    }
  }, [viewingSurveyId, showSurveyDataModal, surveySubmissionsPage])

  // 加载抽奖参与数据
  useEffect(() => {
    if (viewingLotteryId && showLotteryDataModal) {
      loadLotteryEntries(viewingLotteryId, lotteryEntriesPage)
    }
  }, [viewingLotteryId, showLotteryDataModal, lotteryEntriesPage])

  useEffect(() => {
    if (viewingLotteryId && showLotteryDataModal) {
      loadLotteryStats(viewingLotteryId)
    }
  }, [viewingLotteryId, showLotteryDataModal])

  const loadNotesData = async () => {
    try {
      await Promise.all([loadNotesList(1), loadCategories(), loadTagStats()])
    } catch (error) {
      console.error('加载笔记数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildNotesQueryParams = (page: number) => {
    const params: any = { page, limit: 20 }

    const trimmedSearch = searchTerm.trim()
    if (trimmedSearch) params.search = trimmedSearch

    if (filterCategory !== 'all') {
      if (filterCategory === 'uncategorized') {
        params.category_empty = 'true'
      } else {
        params.category = filterCategory
      }
    }

    if (filterTag !== 'all') {
      params.tag = filterTag
    }

    if (activeTab === 'drafts') {
      params.is_published = 'false'
    }

    return params
  }

  const loadNotesList = async (page: number = listPage) => {
    setListLoading(true)
    try {
      const response = await getAdminNotes(buildNotesQueryParams(page))
      if (!response?.success) return

      const notesData = Array.isArray(response?.data?.notes) ? response.data.notes : []
      setNotes(notesData)

      const pagination = response?.data?.pagination
      const totalPages = Number(pagination?.total_pages ?? pagination?.totalPages ?? 1)
      const totalCount = Number(pagination?.total_count ?? pagination?.totalCount ?? 0)
      setListTotalPages(Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1)
      setListTotalCount(Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : 0)
      setListPage(page)
    } catch (error) {
      setToast({ show: true, type: 'error', message: '加载笔记失败' })
      setNotes([])
    } finally {
      setListLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await getAdminNoteCategories()
      if (response.success) {
        const categoriesData = Array.isArray(response.data) ? response.data : []
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('加载笔记分类失败:', error)
      setCategories([])
    }
  }

  const loadTagStats = async () => {
    try {
      const response = await getAdminNoteTagStats()
      if (response?.success) {
        const stats = Array.isArray(response.data) ? response.data : []
        const tags = stats.map((t: any) => String(t?.name || '').trim()).filter(Boolean)
        setTagOptions(Array.from(new Set(tags)))
      }
    } catch {
      setTagOptions([])
    }
  }

  // 笔记管理相关函数
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type } = e.target
    let value: any = (e.target as HTMLInputElement).value

    if (type === 'checkbox') {
      value = (e.target as HTMLInputElement).checked
    } else if (name === 'sort_order') {
      value = parseInt(value) || 0
    }

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const apiData = {
        ...formData
        // 保持原有的发布状态，不强制设置为发布
      }

      if (editingNote?.id) {
        const response = await updateAdminNote(editingNote.id, apiData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '笔记更新成功' })
          await loadNotesList(1)
          resetForm()
        }
      } else {
        // 新建笔记时默认发布
        const response = await createAdminNote({
          ...apiData,
          is_published: true
        })
        if (response.success && response.data) {
          const newNoteId = response.data.id

          // 批量创建暂存的投票
          if (pendingPolls.length > 0) {
            for (const poll of pendingPolls) {
              try {
                const { tempId, ...pollData } = poll // 移除临时ID
                await createAdminPoll(newNoteId, pollData)
              } catch (error) {
                console.error('创建投票失败:', error)
              }
            }
            setPendingPolls([]) // 清空暂存
          }

          // 批量创建暂存的问卷
          if (pendingSurveys.length > 0) {
            for (const survey of pendingSurveys) {
              try {
                const { tempId, ...surveyData } = survey // 移除临时ID
                await createAdminSurvey(newNoteId, surveyData)
              } catch (error) {
                console.error('创建问卷失败:', error)
              }
            }
            setPendingSurveys([]) // 清空暂存
          }

          // 批量创建暂存的抽奖
          if (pendingLotteries.length > 0) {
            for (const lottery of pendingLotteries) {
              try {
                const { tempId, ...lotteryData } = lottery // 移除临时ID
                const lotteryResponse = await fetch(`/api/admin/notes/${newNoteId}/lotteries`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(lotteryData)
                })
                const lotteryResult = await lotteryResponse.json()
                if (!lotteryResult.success) {
                  console.error('创建抽奖失败:', lotteryResult.message)
                }
              } catch (error) {
                console.error('创建抽奖失败:', error)
              }
            }
            setPendingLotteries([]) // 清空暂存
          }

          // 批量创建暂存的云盘资源
          if (pendingDisks.length > 0) {
            for (const disk of pendingDisks) {
              try {
                await addAdminNoteDisk(newNoteId, disk)
              } catch (error) {
                console.error('创建云盘资源失败:', error)
              }
            }
            setPendingDisks([]) // 清空暂存
          }

          setToast({ show: true, type: 'success', message: '笔记创建成功' })
          await loadNotesList(1)
          // 将新创建的笔记设置为当前编辑笔记，以便继续编辑
          setEditingNote(response.data)
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  // 保存草稿
  const handleSaveDraft = async () => {
    try {
      const apiData = {
        ...formData,
        is_published: false // 保存为草稿
      }

      if (editingNote?.id) {
        const response = await updateAdminNote(editingNote.id, apiData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '草稿保存成功' })
          await loadNotesList(1)
        }
      } else {
        const response = await createAdminNote(apiData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '草稿保存成功' })
          await loadNotesList(1)
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '草稿保存失败' })
    }
  }

  // 发布草稿
  const handlePublish = async (id: number) => {
    try {
      const note = notes.find(note => note.id === id)
      if (!note) {
        setToast({ show: true, type: 'error', message: '笔记不存在' })
        return
      }

      const apiData = {
        ...note,
        is_published: true // 发布笔记
      }

      const response = await updateAdminNote(id, apiData)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '笔记发布成功' })
        await loadNotesList(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '发布失败' })
    }
  }

  const handleEdit = async (note: Note) => {
    setEditingNote(note)
    setFormData({
      title: note.title,
      content: note.content,
      summary: note.summary || '',
      category: note.category || '',
      tags: note.tags || '',
      password: note.password || '',
      sort_order: note.sort_order || 0,
      is_pinned: note.is_pinned || false,
      show_in_list: note.show_in_list !== undefined ? note.show_in_list : true,
      cover_image: note.cover_image || '',
      source_type: note.source_type || 'none',
      source_url: note.source_url || '',
      source_text: note.source_text || '',
      custom_slug: note.custom_slug || ''
    })
    setShowForm(true)
    setActiveTab('editNote')

    // 加载该笔记的投票数据、问卷数据和抽奖数据
    if (note.id) {
      await loadNotePolls(note.id)
      await loadNoteSurveys(note.id)
      await loadNoteLotteries(note.id)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇笔记吗？')) return

    try {
      const response = await deleteAdminNote(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '笔记删除成功' })
        await loadNotesList(1)
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetForm = () => {
    setFormData({ title: '', content: '', summary: '', category: '', tags: '', password: '', sort_order: 0, is_pinned: false, show_in_list: true, cover_image: '', source_type: 'none', source_url: '', source_text: '', custom_slug: '' })
    setEditingNote(null)
    setShowForm(false)
    setShowPreview(false)
    setShowLinkModal(false)
    setShowImageModal(false)
    setLinkData({ text: '', url: '' })
    setImageData({ alt: '', url: '', blur: false, align: 'center', scale: 100 })
    setActiveTab('notes')
    setIsFullscreen(false)
    // 清空暂存的投票和云盘资源
    setPendingPolls([])
    setPendingDisks([])
  }

  // 分类管理相关函数
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    let finalValue: any = value
    if (name === 'sort_order') {
      finalValue = parseInt(value) || 0
    }
    setCategoryFormData({
      ...categoryFormData,
      [name]: finalValue
    })
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      setToast({ show: true, type: 'error', message: '分类名称不能为空' })
      return
    }

    try {
      if (editingCategory?.id) {
        const response = await updateAdminCategory(editingCategory.id, categoryFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '分类更新成功' })
          await loadCategories()
          resetCategoryForm()
        }
      } else {
        const response = await createAdminCategory(categoryFormData)
        if (response.success) {
          setToast({ show: true, type: 'success', message: '分类添加成功' })
          await loadCategories()
          resetCategoryForm()
        }
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  const handleCategoryEdit = (category: NoteCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      sort_order: category.sort_order || 0
    })
    setShowCategoryForm(true)
  }

  const handleCategoryDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？如果有笔记使用此分类，将无法删除。')) return

    try {
      const response = await deleteAdminCategory(id)
      if (response.success) {
        setToast({ show: true, type: 'success', message: '分类删除成功' })
        await loadCategories()
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
    }
  }

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '', icon: '', sort_order: 0 })
    setEditingCategory(null)
    setShowCategoryForm(false)
  }

  // 加载笔记的投票列表
  const loadNotePolls = async (noteId: number) => {
    try {
      const response = await getAdminNotePolls(noteId)
      if (response.success) {
        setNotePolls(response.data)
      }
    } catch (error) {
      console.error('加载投票失败:', error)
    }
  }

  // 加载笔记的问卷列表
  const loadNoteSurveys = async (noteId: number) => {
    try {
      const response = await getAdminNoteSurveys(noteId)
      if (response.success) {
        setNoteSurveys(response.data)
      }
    } catch (error) {
      console.error('加载问卷失败:', error)
    }
  }

  const loadNoteLotteries = async (noteId: number) => {
    try {
      const response = await fetch(`/api/admin/notes/${noteId}/lotteries`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setNoteLotteries(data.data)
      }
    } catch (error) {
      console.error('加载抽奖失败:', error)
    }
  }

  // 加载问卷提交数据
  const loadSurveySubmissions = async (surveyId: number, page: number = 1) => {
    setSurveySubmissionsLoading(true)
    setSurveySubmissionsError(null)
    try {
      const response = await getSurveySubmissions(surveyId, page, 20)
      if (response.success) {
        setSurveySubmissions(response.data.submissions || [])
        setSurveySubmissionsTotal(response.data.pagination?.total || 0)
        // 找到当前问卷的详细信息
        const survey = noteSurveys.find(s => s.id === surveyId)
        setViewingSurveyData(survey)
      }
    } catch (error: any) {
      console.error('加载问卷提交数据失败:', error)
      setSurveySubmissionsError(error.response?.data?.message || '加载失败')
    } finally {
      setSurveySubmissionsLoading(false)
    }
  }

  // 加载投票记录数据
  const loadPollVotes = async (pollId: number, page: number = 1) => {
    setPollVotesLoading(true)
    setPollVotesError(null)
    try {
      const response = await getPollVotes(pollId, page, 20)
      if (response.success) {
        setPollVotes(response.data.votes || [])
        setPollVotesTotal(response.data.total || 0)
        // 更新 viewingPollData 以包含选项信息
        if (response.data.poll) {
          setViewingPollData(response.data.poll)
        }
      }
    } catch (error: any) {
      console.error('加载投票记录失败:', error)
      setPollVotesError(error.response?.data?.message || '加载失败')
    } finally {
      setPollVotesLoading(false)
    }
  }

  // 加载抽奖参与记录数据
  const loadLotteryEntries = async (lotteryId: number, page: number = 1) => {
    setLotteryEntriesLoading(true)
    setLotteryEntriesError(null)
    try {
      const response = await fetch(`/api/admin/lotteries/${lotteryId}/entries?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setLotteryEntries(data.data.entries || [])
        setLotteryEntriesTotal(data.data.total || 0)
        // 找到当前抽奖的详细信息
        const lottery = noteLotteries.find(l => l.id === lotteryId)
        setViewingLotteryData(lottery)
      }
    } catch (error: any) {
      console.error('加载抽奖参与记录失败:', error)
      setLotteryEntriesError(error.response?.data?.message || '加载失败')
    } finally {
      setLotteryEntriesLoading(false)
    }
  }

  const loadLotteryStats = async (lotteryId: number) => {
    setLotteryStatsLoading(true)
    setLotteryStatsError(null)
    try {
      const response = await getAdminLotteryStatistics(lotteryId)
      if (response.success) {
        setLotteryStats(response.data)
      }
    } catch (error: any) {
      console.error('加载抽奖统计数据失败:', error)
      setLotteryStatsError(error.response?.data?.message || '加载失败')
    } finally {
      setLotteryStatsLoading(false)
    }
  }

  // 保存投票
  const handleSavePoll = async (pollData: any) => {
    try {
      if (editingNote?.id) {
        // 已有笔记ID，直接保存到后端
        if (editingPoll) {
          const response = await updateAdminPoll(editingNote.id, editingPoll.id, pollData)
          if (response.success) {
            setToast({ show: true, type: 'success', message: '投票更新成功' })
          }
        } else {
          const response = await createAdminPoll(editingNote.id, pollData)
          if (response.success) {
            setToast({ show: true, type: 'success', message: '投票创建成功' })
          }
        }
        await loadNotePolls(editingNote.id)
      } else {
        // 新建笔记，暂存到前端
        if (editingPoll) {
          // 更新暂存的投票
          setPendingPolls(pendingPolls.map(p =>
            p.tempId === editingPoll.tempId ? { ...pollData, tempId: editingPoll.tempId } : p
          ))
          setToast({ show: true, type: 'success', message: '投票已更新（保存笔记后生效）' })
        } else {
          // 添加新的暂存投票
          setPendingPolls([...pendingPolls, { ...pollData, tempId: Date.now() }])
          setToast({ show: true, type: 'success', message: '投票已添加（保存笔记后生效）' })
        }
      }

      setShowPollEditor(false)
      setEditingPoll(null)
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  // 保存问卷
  const handleSaveSurvey = async (surveyData: any) => {
    try {
      if (editingNote?.id) {
        // 已有笔记ID，直接保存到后端
        if (editingSurvey) {
          const response = await updateAdminSurvey(editingNote.id, editingSurvey.id, surveyData)
          if (response.success) {
            setToast({ show: true, type: 'success', message: '问卷更新成功' })
          }
        } else {
          const response = await createAdminSurvey(editingNote.id, surveyData)
          if (response.success) {
            setToast({ show: true, type: 'success', message: '问卷创建成功' })
          }
        }
        await loadNoteSurveys(editingNote.id)
      } else {
        // 新建笔记，暂存到前端
        if (editingSurvey) {
          // 更新暂存的问卷
          setPendingSurveys(pendingSurveys.map(s =>
            s.tempId === editingSurvey.tempId ? { ...surveyData, tempId: editingSurvey.tempId } : s
          ))
          setToast({ show: true, type: 'success', message: '问卷已更新（保存笔记后生效）' })
        } else {
          // 添加新的暂存问卷
          setPendingSurveys([...pendingSurveys, { ...surveyData, tempId: Date.now() }])
          setToast({ show: true, type: 'success', message: '问卷已添加（保存笔记后生效）' })
        }
      }

      setShowSurveyEditor(false)
      setEditingSurvey(null)
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  // 保存抽奖
  const handleSaveLottery = async (lotteryData: any) => {
    try {
      if (editingNote?.id) {
        // 已有笔记ID，直接保存到后端
        const response = await fetch(`/api/admin/notes/${editingNote.id}/lotteries${editingLottery ? `/${editingLottery.id}` : ''}`, {
          method: editingLottery ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(lotteryData)
        })
        const data = await response.json()
        if (data.success) {
          setToast({ show: true, type: 'success', message: editingLottery ? '抽奖更新成功' : '抽奖创建成功' })
          await loadNoteLotteries(editingNote.id)
        }
      } else {
        // 新建笔记，暂存到前端
        if (editingLottery) {
          // 更新暂存的抽奖
          setPendingLotteries(pendingLotteries.map(l =>
            l.tempId === editingLottery.tempId ? { ...lotteryData, tempId: editingLottery.tempId } : l
          ))
          setToast({ show: true, type: 'success', message: '抽奖已更新（保存笔记后生效）' })
        } else {
          // 添加新的暂存抽奖
          setPendingLotteries([...pendingLotteries, { ...lotteryData, tempId: Date.now() }])
          setToast({ show: true, type: 'success', message: '抽奖已添加（保存笔记后生效）' })
        }
      }

      setShowLotteryEditor(false)
      setEditingLottery(null)
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '操作失败' })
    }
  }

  // 插入文本到光标位置
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const scrollTop = textarea.scrollTop // 保存滚动位置

    const newText = formData.content.substring(0, start) + text + formData.content.substring(end)
    setFormData({
      ...formData,
      content: newText
    })

    // 设置光标位置并恢复滚动位?
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
      textarea.scrollTop = scrollTop // 恢复滚动位置
    }, 0)
  }

  // 插入链接
  const insertLink = () => {
    if (!linkData.text || !linkData.url) {
      alert('请填写链接文本和URL')
      return
    }

    const markdownLink = `[${linkData.text}](${linkData.url})`
    insertTextAtCursor(markdownLink)
    setShowLinkModal(false)
    setLinkData({ text: '', url: '' })
  }

  // 生成图片HTML
  const generateImageHtml = (url: string, alt: string, blur: boolean, align: 'left' | 'center' | 'right', scale: number) => {
    const alignClass = align === 'left' ? 'img-align-left' : align === 'right' ? 'img-align-right' : 'img-align-center'
    const blurClass = blur ? 'blur-image' : ''
    const blurAttr = blur ? 'data-blur="true"' : ''
    const scaleStyle = scale !== 100 ? `width: ${scale}%;` : ''
    const classes = [alignClass, blurClass].filter(Boolean).join(' ')

    return `<img src="${url}" alt="${alt}" class="${classes}" style="${scaleStyle}" ${blurAttr} />`
  }

  // 插入图片
  const insertImage = () => {
    if (!imageData.url) {
      alert('请填写图片URL')
      return
    }

    const markdownImage = generateImageHtml(imageData.url, imageData.alt || '', imageData.blur, imageData.align, imageData.scale)
    insertTextAtCursor(markdownImage)
    setShowImageModal(false)
    setImageData({ alt: '', url: '', blur: false, align: 'center', scale: 100 })
  }

  // 插入格式
  const insertFormat = (format: 'bold' | 'italic' | 'underline' | 'code' | 'quote' | 'list' | 'numberedList' | 'h1' | 'h2' | 'h3' | 'strikethrough' | 'hr' | 'codeblock' | 'table' | 'tasklist' | 'collapse' | 'blur' | 'mermaid') => {
    const formats = {
      bold: { prefix: '**', suffix: '**', placeholder: '粗体文本' },
      italic: { prefix: '*', suffix: '*', placeholder: '斜体文本' },
      underline: { prefix: '<u>', suffix: '</u>', placeholder: '下划线文本' },
      code: { prefix: '`', suffix: '`', placeholder: '代码' },
      quote: { prefix: '> ', suffix: '', placeholder: '引用文本' },
      list: { prefix: '- ', suffix: '', placeholder: '列表项' },
      numberedList: { prefix: '1. ', suffix: '', placeholder: '列表项' },
      h1: { prefix: '# ', suffix: '', placeholder: '一级标题' },
      h2: { prefix: '## ', suffix: '', placeholder: '二级标题' },
      h3: { prefix: '### ', suffix: '', placeholder: '三级标题' },
      strikethrough: { prefix: '~~', suffix: '~~', placeholder: '删除线文本' },
      hr: { prefix: '\n---\n', suffix: '', placeholder: '' },
      codeblock: { prefix: '```javascript\n', suffix: '\n```', placeholder: 'console.log("Hello World");' },
      table: { prefix: '| ? | ? | ? |\n| --- | --- | --- |\n| ', suffix: ' | 内容 | 内容 |', placeholder: '内容' },
      tasklist: { prefix: '- [ ] ', suffix: '', placeholder: '待办事项' },
      collapse: { prefix: '<details>\n<summary>点击展开/收起</summary>\n\n', suffix: '\n\n</details>', placeholder: '这里是可折叠的内容' },
      blur: { prefix: '<span class="blur-content">', suffix: '</span>', placeholder: '模糊内容（鼠标悬停显示）' },
      mermaid: { prefix: '```mermaid\n', suffix: '\n```', placeholder: 'graph TD\n    A[开始] --> B{判断}\n    B -->|是| C[执行A]\n    B -->|否| D[执行B]\n    C --> E[结束]\n    D --> E' }
    }

    const { prefix, suffix, placeholder } = formats[format]
    insertTextAtCursor(`${prefix}${placeholder}${suffix}`)
  }

  // 处理图片文件选择（打开设置弹窗?
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 复制文件到数组中（因为清?input.value ?FileList 会被清空?
    const fileArray = Array.from(files)

    // 创建一?DataTransfer 对象来保存文?
    const dataTransfer = new DataTransfer()
    fileArray.forEach(file => dataTransfer.items.add(file))

    // 保存待上传的文件，打开图片设置弹窗
    setPendingUploadFiles(dataTransfer.files)
    setImageData({ alt: '', url: '', blur: false, align: 'center', scale: 100 })
    setShowImageModal(true)
    // 清除文件输入
    e.target.value = ''
  }

  // 执行图片上传
  const handleImageUpload = async () => {
    if (!pendingUploadFiles || pendingUploadFiles.length === 0) return

    setUploadingImage(true)

    try {
      const response = await uploadAdminNoteMedia(pendingUploadFiles)
      if (response.success) {
        // 获取第一个上传的图片URL
        const imageUrl = response.data.urls[0]
        const markdownImage = generateImageHtml(
          imageUrl,
          imageData.alt,
          imageData.blur,
          imageData.align,
          imageData.scale
        )
        insertTextAtCursor(markdownImage)
        setToast({ show: true, type: 'success', message: '图片上传成功' })
        setShowImageModal(false)
        setPendingUploadFiles(null)
        setImageData({ alt: '', url: '', blur: false, align: 'center', scale: 100 })
      }
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.response?.data?.message || '图片上传失败' })
    } finally {
      setUploadingImage(false)
    }
  }

  // 获取所有分类和标签用于筛选（使用 useMemo 优化?
  const noteCategoryNames = useMemo(() => {
    const names = categories.map(c => c.name).filter(Boolean)
    return Array.from(new Set(names))
  }, [categories])

  const uniqueTags = useMemo(() => tagOptions, [tagOptions])

  // 过滤笔记（使?useMemo 优化?
  const filteredNotes = notes

  // 过滤草稿（使?useMemo 优化?
  const filteredDrafts = notes

  return (
    <>
      {/* 弹窗提示 */}
      <AdminToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* 固定导航栏 */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              笔记管理
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              分类管理
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drafts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              草稿箱
            </button>
            <button
              onClick={() => {
                if (!showForm) {
                  setFormData({ title: '', content: '', summary: '', category: '', tags: '', password: '', sort_order: 0, is_pinned: false, show_in_list: true, cover_image: '', source_type: 'none', source_url: '', source_text: '', custom_slug: '' })
                  setEditingNote(null)
                  setShowPreview(false)
                  setShowForm(true)
                }
                setActiveTab('editNote')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'editNote'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {editingNote ? '编辑笔记' : '新建笔记'}
            </button>
          </nav>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* 笔记管理标签?*/}
          {activeTab === 'notes' && (
            <>


          {/* 搜索和筛选 */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">搜索和筛选</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关键词搜索
                </label>
                <input
                  type="text"
                  placeholder="搜索标题、内容或标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类筛选
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input"
                >
                  <option value="all">所有分类</option>
                  <option value="uncategorized">未分类</option>
                  {noteCategoryNames.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签筛选
                </label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="input"
                >
                  <option value="all">所有标签</option>
                  {uniqueTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              找到 {listTotalCount || filteredNotes.length} 篇笔记
            </div>
          </div>

          {/* 笔记列表 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">我的笔记</h2>
            {listLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : filteredNotes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                还没有创建任何笔?
              </p>
            ) : (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 break-words">{note.title || '(无标题)'}</h3>
                          {note.is_pinned && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">
                              置顶
                            </span>
                          )}
                          {note.has_poll && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0">
                              投票
                            </span>
                          )}
                          {note.has_survey && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded flex-shrink-0">
                              问卷
                            </span>
                          )}
                          {note.has_lottery && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0">
                              抽奖
                            </span>
                          )}
                          {note.has_disk && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded flex-shrink-0">
                              含资源
                            </span>
                          )}
                          {note.category && (
                            <span
                              onClick={() => setFilterCategory(note.category!)}
                              className="inline-flex text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded cursor-pointer hover:bg-green-200 transition-colors flex-shrink-0"
                              title={`筛选${note.category}"分类`}
                            >
                              分类: {note.category}
                            </span>
                          )}
                          {note.tags && note.tags.split(',').map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              onClick={() => setFilterTag(tag.trim())}
                              className="inline-flex text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded cursor-pointer hover:bg-purple-200 transition-colors flex-shrink-0"
                              title={`筛选${tag.trim()}"标签`}
                            >
                              {tag.trim()}
                            </span>
                          ))}
                          {note.sort_order !== undefined && note.sort_order > 0 && (
                            <span className="inline-flex text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0">
                              排序: {note.sort_order}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 break-words">
                          {note.summary || (note.content ? note.content.substring(0, 150) + '...' : '暂无内容')}
                        </p>
                      </div>
                      <div className="flex sm:flex-col gap-2 sm:ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(note)}
                          className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => note.id && handleDelete(note.id)}
                          className="flex-1 sm:flex-initial px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {listTotalPages > 1 && !listLoading && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  第 {listPage} 页 / 共 {listTotalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = Math.max(1, listPage - 1)
                      loadNotesList(next)
                    }}
                    disabled={listPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => {
                      const next = Math.min(listTotalPages, listPage + 1)
                      loadNotesList(next)
                    }}
                    disabled={listPage >= listTotalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {/* 编辑笔记标签?*/}
          {activeTab === 'editNote' && showForm && (
            <>
              {/* 添加/编辑表单 */}
              <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">
                          {editingNote ? '编辑笔记' : '新建笔记'}
                        </h2>
                        {editingNote && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">|</span>
                            <a
                              href={formData.password && formData.password.trim() !== ''
                                ? `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}?password=${encodeURIComponent(formData.password)}`
                                : `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline flex items-center gap-1 max-w-md truncate"
                              title={formData.password && formData.password.trim() !== '' ? "点击访问带密码的笔记链接" : "点击访问笔记链接"}
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {formData.password && formData.password.trim() !== ''
                                ? `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}?password=${encodeURIComponent(formData.password)}`
                                : `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}`}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const url = formData.password && formData.password.trim() !== ''
                                  ? `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}?password=${encodeURIComponent(formData.password)}`
                                  : `${typeof window !== 'undefined' ? window.location.origin : ''}/note/${editingNote.id}`;
                                navigator.clipboard.writeText(url);
                                setToast({ show: true, type: 'success', message: '链接已复制到剪贴板' });
                              }}
                              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                              title="复制链接"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className={`btn btn-secondary text-sm ${showPreview ? 'bg-primary-600 text-white' : ''}`}
                        >
                          {showPreview ? '编辑模式' : '预览模式'}
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 标题输入 - 在全屏模式下隐藏 */}
                  {!isFullscreen && (
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        className="input"
                        placeholder="笔记标题（必填）"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                      内容
                    </label>

                    {showPreview ? (
                      <div className="min-h-[300px] border border-gray-300 rounded-lg p-4 bg-white overflow-auto">
                        {formData.content ? (
                          <div className="note-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                img: ({ src, alt, className, style, ...props }) => {
                                  let imageSrc = src;
                                  if (typeof src === 'string' && src.startsWith('/uploads/')) {
                                    imageSrc = getImageUrl(src);
                                  }
                                  // 检查是否是模糊图片
                                  const isBlurImage = className?.includes('blur-image') || (props as any)['data-blur'] === 'true';
                                  const [revealed, setRevealed] = React.useState(false);

                                  // 检查对齐方?
                                  const hasAlignClass = className?.includes('img-align-');
                                  const alignClass = hasAlignClass ? '' : 'img-align-center';

                                  // 获取容器的对齐样?
                                  const getContainerAlign = () => {
                                    if (className?.includes('img-align-right')) return 'text-right';
                                    if (className?.includes('img-align-left')) return 'text-left';
                                    return 'text-center';
                                  };

                                  const handleClick = () => {
                                    if (isBlurImage && !revealed) {
                                      setRevealed(true);
                                    }
                                  };

                                  // 解析 style 字符串或对象
                                  let styleObj: React.CSSProperties = {};
                                  if (typeof style === 'string') {
                                    (style as string).split(';').forEach(item => {
                                      const [key, value] = item.split(':').map(s => s.trim());
                                      if (key && value) {
                                        (styleObj as any)[key] = value;
                                      }
                                    });
                                  } else if (style) {
                                    styleObj = style;
                                  }

                                  return (
                                    <div className={`my-4 ${getContainerAlign()} ${isBlurImage ? 'blur-image-container' : ''} ${revealed ? 'revealed' : ''}`}>
                                      <img
                                        src={imageSrc}
                                        alt={alt || ''}
                                        className={`max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow ${className || ''} ${alignClass} ${
                                          isBlurImage && !revealed ? 'blur-image' : ''
                                        } ${revealed ? 'revealed' : ''}`}
                                        style={{ maxHeight: '360px', objectFit: 'contain', ...styleObj }}
                                        loading="lazy"
                                        onClick={handleClick}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                        {...props}
                                      />
                                    </div>
                                  );
                                },
                                iframe: ({ node, ...props }) => (
                                  <div className="iframe-container my-4">
                                    <iframe {...props} />
                                  </div>
                                ),
                                pre: ({ node, children, ...props }: any) => {
                                  // 提取代码文本用于复制
                                  const getCodeText = (children: React.ReactNode): string => {
                                    if (typeof children === 'string') return children;
                                    if (Array.isArray(children)) {
                                      return children.map(getCodeText).join('');
                                    }
                                    if (React.isValidElement(children)) {
                                      const childProps = children.props as { children?: React.ReactNode };
                                      return getCodeText(childProps.children || '');
                                    }
                                    return '';
                                  };

                                  // 提取语言类型
                                  const getLanguage = (children: React.ReactNode): string => {
                                    if (React.isValidElement(children)) {
                                      const childProps = children.props as { className?: string };
                                      const match = /language-(\w+)/.exec(childProps.className || '');
                                      return match ? match[1] : '';
                                    }
                                    return '';
                                  };
                                  const language = getLanguage(children);

                                  return (
                                    <div className="code-block-wrapper relative group my-4">
                                      {language && (
                                        <div className="code-language-tag absolute top-0 left-4 px-2 py-0.5 text-xs rounded-b bg-gray-200 text-gray-600">
                                          {language}
                                        </div>
                                      )}
                                      <pre className="bg-gray-900 text-gray-100 p-4 pt-8 rounded-lg overflow-x-auto" {...props}>
                                        {children}
                                      </pre>
                                    </div>
                                  );
                                },
                                code: ({ node, inline, className, children, ...props }: any) => {
                                  if (inline) {
                                    return (
                                      <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                  return (
                                    <code className={`text-sm font-mono ${className || ''}`} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                blockquote: ({ node, children, ...props }) => (
                                  <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 bg-blue-50 py-2 rounded-r" {...props}>
                                    {children}
                                  </blockquote>
                                ),
                                table: ({ node, children, ...props }) => (
                                  <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse" {...props}>
                                      {children}
                                    </table>
                                  </div>
                                ),
                                th: ({ node, children, ...props }) => (
                                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left" {...props}>
                                    {children}
                                  </th>
                                ),
                                td: ({ node, children, ...props }) => (
                                  <td className="border border-gray-300 px-4 py-2" {...props}>
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {formData.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-16">
                            <div className="text-4xl mb-2">📝</div>
                            <p>输入内容后预览将在这里显示</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* 工具栏 - 合并为一个矩形框 */}
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                          {/* 第一行 - 格式化工具 */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => insertFormat('h1')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="一级标题"
                            >
                              H1
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('h2')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="二级标题"
                            >
                              H2
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('h3')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="三级标题"
                            >
                              H3
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('bold')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="粗体"
                            >
                              <strong>B</strong>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('italic')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="斜体"
                            >
                              <em>I</em>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('underline')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="下划线"
                            >
                              <span className="underline">U</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('strikethrough')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="删除线"
                            >
                              <s>S</s>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('code')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="行内代码"
                            >
                              {`</>`}
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('codeblock')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="代码块"
                            >
                              {`{}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('quote')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="引用"
                            >
                              ""
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('list')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="无序列表"
                            >
                              •
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('numberedList')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="有序列表"
                            >
                              1.
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('tasklist')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="任务列表"
                            >
                              ☑
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsFullscreen(!isFullscreen)}
                              className={`flex-1 min-w-[56px] h-9 text-xs border rounded flex items-center justify-center ${
                                isFullscreen
                                  ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                              title={isFullscreen ? '退出编辑模式' : '编辑模式'}
                            >
                              {isFullscreen ? '📱 正常' : '📱 编辑'}
                            </button>
                          </div>

                          {/* 第二行 - 插入元素、网盘、投票、问卷 */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setShowLinkModal(true)}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="插入链接"
                            >
                              链接
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowImageModal(true)}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="插入图片"
                            >
                              图片
                            </button>
                            <label className="cursor-pointer flex-1 min-w-[56px]">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                onChange={handleImageFileSelect}
                                disabled={uploadingImage}
                                className="hidden"
                                multiple
                              />
                              <div className="w-full h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center">
                                上传
                              </div>
                            </label>
                            <button
                              type="button"
                              onClick={() => insertFormat('table')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="插入表格"
                            >
                              表格
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('hr')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="分隔线"
                            >
                              —
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('collapse')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="展开/收起内容块"
                            >
                              折叠
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('blur')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="内容模糊（鼠标悬停显示）"
                            >
                              模糊
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormat('mermaid')}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="插入Mermaid图表"
                            >
                              图表
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingNote?.id) {
                                  setCurrentNoteId(editingNote.id)
                                  setShowDiskModal(true)
                                } else {
                                  alert('请先保存笔记后再管理网盘')
                                }
                              }}
                              className="flex-1 min-w-[56px] h-9 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                              title="管理网盘资源"
                            >
                              📁 网盘
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const hasPoll = editingNote?.id ? notePolls.length > 0 : pendingPolls.length > 0
                                const hasSurvey = editingNote?.id ? noteSurveys.length > 0 : pendingSurveys.length > 0
                                const hasLottery = editingNote?.id ? noteLotteries.length > 0 : pendingLotteries.length > 0
                                if (hasPoll || hasSurvey || hasLottery) {
                                  alert('该笔记已有投票、问卷或抽奖，不能再创建')
                                  return
                                }
                                setEditingPoll(null)
                                setShowPollEditor(true)
                              }}
                              disabled={editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)}
                              className={`flex-1 min-w-[56px] h-9 text-xs border rounded flex items-center justify-center ${
                                (editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0))
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-white border-gray-300 hover:bg-gray-100'
                              }`}
                              title={(editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)) ? '已有投票、问卷或抽奖，不能创建' : '创建投票'}
                            >
                              📊 投票
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const hasPoll = editingNote?.id ? notePolls.length > 0 : pendingPolls.length > 0
                                const hasSurvey = editingNote?.id ? noteSurveys.length > 0 : pendingSurveys.length > 0
                                const hasLottery = editingNote?.id ? noteLotteries.length > 0 : pendingLotteries.length > 0
                                if (hasPoll || hasSurvey || hasLottery) {
                                  alert('该笔记已有投票、问卷或抽奖，不能再创建')
                                  return
                                }
                                setEditingSurvey(null)
                                setShowSurveyEditor(true)
                              }}
                              disabled={editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)}
                              className={`flex-1 min-w-[56px] h-9 text-xs border rounded flex items-center justify-center ${
                                (editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0))
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-white border-gray-300 hover:bg-gray-100'
                              }`}
                              title={(editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)) ? '已有投票、问卷或抽奖，不能创建' : '创建问卷'}
                            >
                              📋 问卷
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const hasPoll = editingNote?.id ? notePolls.length > 0 : pendingPolls.length > 0
                                const hasSurvey = editingNote?.id ? noteSurveys.length > 0 : pendingSurveys.length > 0
                                const hasLottery = editingNote?.id ? noteLotteries.length > 0 : pendingLotteries.length > 0
                                if (hasPoll || hasSurvey || hasLottery) {
                                  alert('该笔记已有投票、问卷或抽奖，不能再创建')
                                  return
                                }
                                setEditingLottery(null)
                                setShowLotteryEditor(true)
                              }}
                              disabled={editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)}
                              className={`flex-1 min-w-[56px] h-9 text-xs border rounded flex items-center justify-center ${
                                (editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0))
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-white border-gray-300 hover:bg-gray-100'
                              }`}
                              title={(editingNote?.id ? (notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) : (pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0)) ? '已有投票、问卷或抽奖，不能创建' : '创建抽奖'}
                            >
                              🎰 抽奖
                            </button>
                          </div>
                        </div>

                        <textarea
                          ref={textareaRef}
                          id="content"
                          name="content"
                          rows={isFullscreen ? 20 : 12}
                          required
                          value={formData.content}
                          onChange={handleChange}
                          className={`input font-mono text-sm w-full ${
                            isFullscreen
                              ? 'min-h-[500px] text-base'
                              : 'min-h-[300px]'
                          }`}
                          placeholder="# 标题\n\n这里是你的笔记内容...\n\n- 支持列表\n- 支持**粗体**\n- 支持*斜体*\n- 支持代码块\n\n```javascript\nconsole.log('Hello World!');\n```"
                        />
                      </div>
                    )}
                  </div>


                  {/* 其他设置 - 在全屏模式下隐藏 */}
                  {!isFullscreen && (
                    <>
                      {/* 分类和标签设?*/}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                            分类
                          </label>
                          <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="input"
                          >
                            <option value="">请选择分类（可选）</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.name}>
                                {category.icon ? `${category.icon} ` : ''}{category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                            标签
                          </label>
                          <input
                            id="tags"
                            name="tags"
                            type="text"
                            value={formData.tags}
                            onChange={handleChange}
                            className="input"
                            placeholder="多个标签用英文逗号分隔（可选）"
                          />
                        </div>
                      </div>

                      {/* 摘要设置 */}
                      <div>
                        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                          笔记摘要
                        </label>
                        <textarea
                          id="summary"
                          name="summary"
                          rows={3}
                          value={formData.summary || ''}
                          onChange={handleChange}
                          className="input"
                          placeholder="输入笔记摘要（可选，留空则自动截取正文前150字）"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          💡 摘要会显示在笔记列表中，帮助读者快速了解内容
                        </p>
                      </div>

                      {/* 密码保护设置 */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          访问密码
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="password"
                            name="password"
                            type="text"
                            value={formData.password || ''}
                            onChange={handleChange}
                            className="input w-48"
                            placeholder="设置访问密码（可选）"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              // 生成4-6位随机密码（小写字母和数字）
                              const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                              const length = Math.floor(Math.random() * 3) + 4; // 4-6?
                              let password = '';
                              for (let i = 0; i < length; i++) {
                                password += chars.charAt(Math.floor(Math.random() * chars.length));
                              }
                              setFormData({ ...formData, password });
                            }}
                            className="px-3 py-2 text-sm bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 text-blue-700 whitespace-nowrap"
                          >
                            🎲 随机生成
                          </button>
                          {formData.password && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, password: '' })}
                              className="px-3 py-2 text-sm bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 text-red-700 whitespace-nowrap"
                            >
                              清除
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          💡 设置密码后，访客需要输入正确密码才能查看笔记内容
                        </p>
                      </div>

                      {/* 自定义URL路径 */}
                      <div>
                        <label htmlFor="custom_slug" className="block text-sm font-medium text-gray-700 mb-2">
                          自定义URL路径
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">/</span>
                          <input
                            id="custom_slug"
                            name="custom_slug"
                            type="text"
                            value={formData.custom_slug || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '')
                              setFormData({ ...formData, custom_slug: val })
                            }}
                            className="input w-48"
                            placeholder="例如: my-article"
                          />
                          {formData.custom_slug && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, custom_slug: '' })}
                              className="px-3 py-2 text-sm bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 text-red-700 whitespace-nowrap"
                            >
                              清除
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          💡 设置后可通过 /{formData.custom_slug || 'xxx'} 访问，留空则使用默认路径 /note/ID，修改自定义路径名中如果包含符号，仅支持“-”、“_”。
                        </p>
                      </div>

                      {/* 来源类型设置 */}
                      <div>
                        <label htmlFor="source_type" className="block text-sm font-medium text-gray-700 mb-2">
                          来源类型
                        </label>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="source_type"
                                value="none"
                                checked={formData.source_type === 'none'}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                              />
                              <span className="ml-2 text-sm text-gray-700">不展示</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="source_type"
                                value="original"
                                checked={formData.source_type === 'original'}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                              />
                              <span className="ml-2 text-sm text-gray-700">原创</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="source_type"
                                value="reprint"
                                checked={formData.source_type === 'reprint'}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
                              />
                              <span className="ml-2 text-sm text-gray-700">转载</span>
                            </label>
                          </div>

                          {/* 转载来源输入?*/}
                          {formData.source_type === 'reprint' && (
                            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <label htmlFor="source_text" className="block text-sm font-medium text-gray-700 mb-2">
                                文章来源
                              </label>
                              <textarea
                                id="source_text"
                                name="source_text"
                                rows={3}
                                value={formData.source_text || ''}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="请输入文章来源信息，可以是网址、作者名、平台名称等..."
                              />
                              <p className="mt-2 text-xs text-gray-500">
                                💡 转载时请务必注明来源，支持输入网址、作者名、平台名称等任意文本
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 封面图设?*/}
                      <div>
                        <label htmlFor="cover_image" className="block text-sm font-bold text-gray-700 mb-2">
                          封面图
                        </label>
                        <div className="flex gap-4">
                          {/* 左侧预览?*/}
                          {formData.cover_image && (
                            <div className="flex-shrink-0">
                              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                                <img
                                  src={getImageUrl(formData.cover_image)}
                                  alt="封面预览"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* 右侧输入和操作区 */}
                          <div className="flex-1 space-y-2">
                            <input
                              id="cover_image"
                              name="cover_image"
                              type="text"
                              value={formData.cover_image || ''}
                              onChange={handleChange}
                              className="input"
                              placeholder="输入封面图URL（可选）"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                id="cover-upload"
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return

                                  if (file.size > 5 * 1024 * 1024) {
                                    setToast({ show: true, type: 'error', message: '图片大小不能超过5MB' })
                                    return
                                  }

                                  setUploadingImage(true)
                                  try {
                                    // 创建FileList兼容对象
                                    const fileList = e.target.files!
                                    const response = await uploadAdminNoteMedia(fileList)

                                    if (response.success && response.data && response.data.urls && response.data.urls.length > 0) {
                                      setFormData({ ...formData, cover_image: response.data.urls[0] })
                                      setToast({ show: true, type: 'success', message: '封面图上传成功' })
                                    }
                                  } catch (error: any) {
                                    const message = error.response?.data?.message || error.message || '封面图上传失败'
                                    setToast({ show: true, type: 'error', message })
                                  } finally {
                                    setUploadingImage(false)
                                    e.target.value = ''
                                  }
                                }}
                                className="hidden"
                              />
                              <label
                                htmlFor="cover-upload"
                                className={`px-3 py-2 text-sm bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 text-blue-700 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {uploadingImage ? '上传中..' : '📁 选择图片'}
                              </label>
                              {formData.cover_image && (
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, cover_image: '' })}
                                  className="px-3 py-2 text-sm bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 text-red-700"
                                >
                                  🥨 删除
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              💡 封面图将在笔记列表中显示（支持jpg、jpeg、png、gif、webp、svg、ico，建议尺寸1:1，最大5MB）
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 置顶和排序设?*/}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            id="is_pinned"
                            name="is_pinned"
                            type="checkbox"
                            checked={formData.is_pinned}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <label htmlFor="is_pinned" className="ml-2 text-sm font-medium text-gray-700">
                            置顶笔记
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            id="show_in_list"
                            name="show_in_list"
                            type="checkbox"
                            checked={formData.show_in_list}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <label htmlFor="show_in_list" className="ml-2 text-sm font-medium text-gray-700">
                            在列表中展示
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                            排序权重
                          </label>
                          <input
                            id="sort_order"
                            name="sort_order"
                            type="number"
                            value={formData.sort_order}
                            onChange={handleChange}
                            className="input"
                            placeholder="数字越大越靠前"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-4">
                        <button type="submit" className="btn btn-primary">
                          {editingNote ? '更新并发布' : '创建'}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            await handleSaveDraft();
                          }}
                          className="btn btn-secondary"
                        >
                          保存草稿
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="btn btn-secondary"
                        >
                          取消
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {/* 投票、问卷、抽奖管理区域 */}
              {!isFullscreen && (editingNote?.id || pendingPolls.length > 0 || pendingSurveys.length > 0 || pendingLotteries.length > 0 || notePolls.length > 0 || noteSurveys.length > 0 || noteLotteries.length > 0) && (
                <div className="card mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">投票、问卷、抽奖管理</h2>
                  </div>

                  {/* 已有笔记的投票列表 */}
                  {editingNote?.id && notePolls.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">已发布的投票</h3>
                      {notePolls.map((poll: any) => {
                        const totalSelections = Array.isArray(poll.options)
                          ? poll.options.reduce((sum: number, opt: any) => sum + (typeof opt.vote_count === 'number' ? opt.vote_count : 0), 0)
                          : 0

                        return (
                        <div
                          key={poll.id}
                          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                          {/* 投票头部 */}
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-800 text-base">{poll.title}</h4>
                          </div>

                          {/* 投票内容 */}
                          <div className="p-4">
                            {/* 选项列表 */}
                            <div className="space-y-2 mb-3">
                              {poll.options?.map((option: any, index: number) => {
                                const percentage = totalSelections > 0
                                  ? ((option.vote_count / totalSelections) * 100).toFixed(1)
                                  : '0.0'
                                return (
                                  <div key={index} className="relative">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-700">{option.option_text}</span>
                                      <span className="text-xs font-semibold text-gray-900">{option.vote_count} 票 ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-purple-400 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* 投票统计和标签 */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                {poll.total_votes || 0} 人参与
                              </div>
                              <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 2a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h5a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {totalSelections} 票
                              </div>
                              {poll.poll_type === 'multiple' && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                  多选（最多{poll.max_choices || 1}项）
                                </span>
                              )}
                              {(() => {
                                const rv =
                                  poll.result_visibility === 'none'
                                    ? 'admin'
                                    : (poll.result_visibility === 'public' ? 'before' : poll.result_visibility)
                                if (rv === 'admin') {
                                  return (
                                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                                      仅后台可见
                                    </span>
                                  )
                                }
                                if (rv === 'after') {
                                  return (
                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium">
                                      投票后可见
                                    </span>
                                  )
                                }
                                return (
                                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                    前台可见
                                  </span>
                                )
                              })()}
                              {poll.show_participants === false && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  隐藏参与人数
                                </span>
                              )}
                              {poll.end_time && (
                                <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                                  截止: {new Date(poll.end_time).toLocaleDateString('zh-CN')}
                                </span>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
                              <button
                                onClick={() => {
                                  setViewingPollData(poll)
                                  setShowPollDataModal(true)
                                  loadPollVotes(poll.id, 1)
                                }}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 transition-colors text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                数据
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPoll(poll)
                                  setShowPollEditor(true)
                                }}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                编辑
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await exportPollData(editingNote.id!, poll.id)
                                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `poll-${poll.id}-data.csv`
                                    link.download = decodeURIComponent(filename)
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    window.URL.revokeObjectURL(url)
                                    setToast({ show: true, type: 'success', message: '导出成功' })
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100 transition-colors text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                导出
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('确定要删除这个投票吗？')) return
                                  try {
                                    const response = await deleteAdminPoll(editingNote.id!, poll.id)
                                    if (response.success) {
                                      setToast({ show: true, type: 'success', message: '投票删除成功' })
                                      await loadNotePolls(editingNote.id!)
                                    }
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 transition-colors text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}

                  {/* 新建笔记的暂存投票列表 */}
                  {!editingNote?.id && pendingPolls.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">待保存的投票（保存笔记后生效）</h3>
                      {pendingPolls.map((poll: any) => (
                        <div
                          key={poll.tempId}
                          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-2">{poll.title}</h4>
                              <div className="space-y-1">
                                {poll.options?.map((option: any, index: number) => (
                                  <div key={index} className="text-sm text-gray-600">
                                    • {option.option_text}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                {poll.poll_type === 'multiple' && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    多选（最多{poll.max_choices || 1}项）
                                  </span>
                                )}
                                {poll.end_time && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    截止: {new Date(poll.end_time).toLocaleString('zh-CN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => {
                                  setEditingPoll(poll)
                                  setShowPollEditor(true)
                                }}
                                className="px-3 py-1.5 text-sm bg-blue-50 border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => {
                                  if (!confirm('确定要删除这个投票吗？')) return
                                  setPendingPolls(pendingPolls.filter(p => p.tempId !== poll.tempId))
                                  setToast({ show: true, type: 'success', message: '投票已移除' })
                                }}
                                className="px-3 py-1.5 text-sm bg-red-50 border border-red-300 text-red-700 rounded hover:bg-red-100"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 空状态 */}
                  {editingNote?.id && notePolls.length === 0 && noteSurveys.length === 0 && noteLotteries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>还没有创建任何投票、问卷或抽奖</p>
                      <p className="text-sm mt-1">点击上方按钮开始创建</p>
                    </div>
                  )}

                  {/* 已有笔记的问卷列表 */}
                  {editingNote?.id && noteSurveys.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">已发布的问卷</h3>
                      {noteSurveys.map((survey: any) => (
                        <div
                          key={survey.id}
                          className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                        >
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-bold text-white text-base">{survey.title}</h4>
                            {survey.description && (
                              <p className="text-indigo-100 text-xs mt-1 line-clamp-1">{survey.description}</p>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                {survey.total_submissions || 0} 份提交
                              </div>
                              <span className="px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                                📋 {survey.questions?.length || 0} 个题目
                              </span>
                              {survey.end_time && (
                                <span className="px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold">
                                  ⏰ {new Date(survey.end_time).toLocaleDateString('zh-CN')}
                                </span>
                              )}
                              {survey.is_active ? (
                                <span className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                                  ✓ 进行中
                                </span>
                              ) : (
                                <span className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                                  ✕ 已关闭
                                </span>
                              )}
                              {(() => {
                                const rv =
                                  survey.result_visibility === 'none'
                                    ? 'admin'
                                    : (survey.result_visibility === 'public' ? 'before' : survey.result_visibility)
                                if (rv === 'admin') {
                                  return (
                                    <span className="px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                                      仅后台可见
                                    </span>
                                  )
                                }
                                if (rv === 'after') {
                                  return (
                                    <span className="px-2.5 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold">
                                      提交后可见
                                    </span>
                                  )
                                }
                                return (
                                  <span className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                                    前台可见
                                  </span>
                                )
                              })()}
                              {survey.show_participants === false && (
                                <span className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                                  隐藏提交人数
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <button
                                onClick={() => {
                                  setEditingSurvey(survey)
                                  setShowSurveyEditor(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                编辑
                              </button>
                              <button
                                onClick={() => {
                                  setViewingSurveyId(survey.id)
                                  setShowSurveyDataModal(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-xs font-semibold shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                数据
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await exportSurveyData(survey.id)
                                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `survey-${survey.id}-data.csv`
                                    link.download = decodeURIComponent(filename)
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    window.URL.revokeObjectURL(url)
                                    setToast({ show: true, type: 'success', message: '导出成功' })
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                导出
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('确定要删除这个问卷吗？所有提交数据也会被删除！')) return
                                  try {
                                    const response = await deleteAdminSurvey(editingNote.id!, survey.id)
                                    if (response.success) {
                                      setToast({ show: true, type: 'success', message: '问卷删除成功' })
                                      await loadNoteSurveys(editingNote.id!)
                                    }
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 已有笔记的抽奖列表 */}
                  {editingNote?.id && noteLotteries.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">已发布的抽奖</h3>
                      {noteLotteries.map((lottery: any) => {
                        const isDrawn = lottery.is_drawn === true || lottery.is_drawn === 1 || lottery.is_drawn === '1'
                        const isActive = lottery.is_active === true || lottery.is_active === 1 || lottery.is_active === '1'
                        const drawTime = lottery.draw_time ? new Date(lottery.draw_time) : null

                        return (
                          <div
                            key={lottery.id}
                            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                          >
                          {/* 抽奖头部 - 琥珀色渐变 */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-base">{lottery.title}</h4>
                                {lottery.description && (
                                  <p className="text-amber-700 text-xs mt-1 line-clamp-1">{lottery.description}</p>
                                )}
                              </div>
                              {isDrawn ? (
                                <span className="flex-shrink-0 ml-3 px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">
                                  🏆 已开奖
                                </span>
                              ) : isActive ? (
                                <span className="flex-shrink-0 ml-3 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-sm">
                                  ✓ 进行中
                                </span>
                              ) : (
                                <span className="flex-shrink-0 ml-3 px-3 py-1 bg-gray-400 text-white rounded-full text-xs font-bold shadow-sm">
                                  ✕ 未启用
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 抽奖内容 */}
                          <div className="p-4">
                            {/* 统计信息 */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                {lottery.total_participants || 0} 人参与
                              </div>
                              <span className="px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold">
                                🎁 {lottery.prizes?.length || 0} 个奖项
                              </span>
                              <span className="px-2.5 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold">
                                ⏰ {new Date(lottery.draw_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 开奖
                              </span>
                              <span className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${lottery.draw_type === 'auto' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'}`}>
                                ⚙️ {lottery.draw_type === 'auto' ? '自动开奖' : '手动开奖'}
                              </span>
                              {lottery.ip_limit > 1 && (
                                <span className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                                  IP限{lottery.ip_limit}次
                                </span>
                              )}
                              {lottery.enable_email_notification && (
                                <span className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                                  📧 邮件通知
                                </span>
                              )}
                              {(() => {
                                const rv =
                                  lottery.result_visibility === 'none'
                                    ? 'admin'
                                    : (lottery.result_visibility === 'public' ? 'before' : lottery.result_visibility)
                                if (rv === 'admin') {
                                  return (
                                    <span className="px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                                      仅后台可见
                                    </span>
                                  )
                                }
                                if (rv === 'after') {
                                  return (
                                    <span className="px-2.5 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold">
                                      参与后可见
                                    </span>
                                  )
                                }
                                return (
                                  <span className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                                    前台可见
                                  </span>
                                )
                              })()}
                              {lottery.show_participants === false && (
                                <span className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                                  隐藏参与人数
                                </span>
                              )}
                            </div>

                            {/* 奖项预览 */}
                            {lottery.prizes && lottery.prizes.length > 0 && (
                              <div className="mb-3 space-y-2">
                                {lottery.prizes.slice(0, 3).map((prize: any, idx: number) => (
                                  <div key={prize.id} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🎁</span>
                                      <span className="font-medium text-gray-700">{prize.prize_name}</span>
                                      {prize.prize_image && (
                                        <img src={getImageUrl(prize.prize_image)} alt="" className="w-6 h-6 rounded object-cover" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-bold text-xs">
                                        {prize.probability}%
                                      </span>
                                      <span className="text-gray-500">×{prize.quantity}</span>
                                    </div>
                                  </div>
                                ))}
                                {lottery.prizes.length > 3 && (
                                  <div className="text-xs text-gray-500 text-center pt-1">
                                    还有 {lottery.prizes.length - 3} 个奖项...
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                              {/* 开奖按钮 - 仅在时间已过且未开奖时显示 */}
                              {isActive && !isDrawn && drawTime && drawTime <= new Date() && (
                                <button
                                  onClick={async () => {
                                    if (!confirm('确定要立即开奖吗？\n开奖后将不能撤销，系统会自动计算中奖结果并发送通知。')) return
                                    try {
                                      const response = await drawLottery(lottery.id)
                                      if (response.success) {
                                        setToast({ show: true, type: 'success', message: response.message || '开奖成功' })
                                        await loadNoteLotteries(editingNote.id!)
                                      }
                                    } catch (error: any) {
                                      setToast({ show: true, type: 'error', message: error.response?.data?.message || '开奖失败' })
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                  </svg>
                                  开奖
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingLottery(lottery)
                                  setShowLotteryEditor(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isDrawn}
                                title={isDrawn ? '已开奖，不能编辑' : '编辑抽奖'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                编辑
                              </button>
                              <button
                                onClick={() => {
                                  setViewingLotteryId(lottery.id)
                                  setShowLotteryDataModal(true)
                                  loadLotteryEntries(lottery.id, 1)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                数据
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await exportLotteryData(editingNote.id!, lottery.id)
                                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    const filename = `lottery-${lottery.id}-data.csv`
                                    link.download = filename
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    window.URL.revokeObjectURL(url)
                                    setToast({ show: true, type: 'success', message: '导出成功' })
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                导出
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = isDrawn
                                    ? confirm('该抽奖已开奖。\n删除会同时清空参与记录、中奖结果等数据，且不可恢复。\n确定继续删除吗？')
                                    : confirm('确定要删除这个抽奖吗？所有数据也会被删除！')
                                  if (!confirmed) return
                                  try {
                                    const response = await deleteAdminLottery(editingNote.id!, lottery.id)
                                    if (response.success) {
                                      setToast({ show: true, type: 'success', message: '抽奖删除成功' })
                                      await loadNoteLotteries(editingNote.id!)
                                    }
                                  } catch (error: any) {
                                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '删除失败' })
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-semibold shadow-sm sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isDrawn ? '已开奖，谨慎删除' : '删除抽奖'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 新建笔记的暂存抽奖列表 */}
                  {!editingNote?.id && pendingLotteries.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">待保存的抽奖（保存笔记后生效）</h3>
                      {pendingLotteries.map((lottery: any) => (
                        <div
                          key={lottery.tempId}
                          className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-2">{lottery.title}</h4>
                              {lottery.description && (
                                <p className="text-sm text-gray-600 mb-2">{lottery.description}</p>
                              )}
                              <div className="space-y-1 mb-2">
                                {lottery.prizes?.map((prize: any, index: number) => (
                                  <div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                                    <span>🎁</span>
                                    <span>{prize.prize_name}</span>
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                                      {prize.probability}%
                                    </span>
                                    <span className="text-gray-500">×{prize.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  开奖: {new Date(lottery.draw_time).toLocaleString('zh-CN')}
                                </span>
                                <span className={`px-2 py-0.5 rounded ${lottery.draw_type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {lottery.draw_type === 'auto' ? '自动' : '手动'}
                                </span>
                                {lottery.enable_email_notification && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">邮件通知</span>
                                )}
                                {lottery.ip_limit > 1 && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    IP限{lottery.ip_limit}次
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => {
                                  setEditingLottery(lottery)
                                  setShowLotteryEditor(true)
                                }}
                                className="px-3 py-1.5 text-sm bg-blue-50 border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => {
                                  if (!confirm('确定要删除这个抽奖吗？')) return
                                  setPendingLotteries(pendingLotteries.filter(l => l.tempId !== lottery.tempId))
                                  setToast({ show: true, type: 'success', message: '抽奖已移除' })
                                }}
                                className="px-3 py-1.5 text-sm bg-red-50 border border-red-300 text-red-700 rounded hover:bg-red-100"
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
              )}

              {/* 链接模态框 */}
              {showLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">插入链接</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          链接文本
                        </label>
                        <input
                          type="text"
                          value={linkData.text}
                          onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
                          className="input"
                          placeholder="链接显示文本"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          链接地址
                        </label>
                        <input
                          type="text"
                          value={linkData.url}
                          onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                          className="input"
                          placeholder="https://... 或 /path 或 #anchor"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          支持完整URL、相对路径（如 /about）或锚点链接（如 #contact）
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4 mt-6">
                      <button
                        onClick={insertLink}
                        className="btn btn-primary flex-1"
                      >
                        插入
                      </button>
                      <button
                        onClick={() => setShowLinkModal(false)}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 图片模态框 */}
              {showImageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">
                      {pendingUploadFiles ? '上传图片设置' : '插入图片'}
                    </h3>
                    <div className="space-y-4">
                      {/* 上传模式显示文件信息 */}
                      {pendingUploadFiles && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            已选择文件：{pendingUploadFiles[0]?.name}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          图片描述（可选）
                        </label>
                        <input
                          type="text"
                          value={imageData.alt}
                          onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
                          className="input"
                          placeholder="图片描述"
                        />
                      </div>
                      {/* URL模式显示地址输入 */}
                      {!pendingUploadFiles && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            图片地址
                          </label>
                          <input
                            type="text"
                            value={imageData.url}
                            onChange={(e) => setImageData({ ...imageData, url: e.target.value })}
                            className="input"
                            placeholder="https://... 或 /uploads/..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            支持完整URL或相对路径
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          对齐方式
                        </label>
                        <div className="flex gap-4">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <label key={align} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="imageAlign"
                                checked={imageData.align === align}
                                onChange={() => setImageData({ ...imageData, align })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">
                                {align === 'left' ? '居左' : align === 'center' ? '居中' : '居右'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          缩放比例：{imageData.scale}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="10"
                          value={imageData.scale}
                          onChange={(e) => setImageData({ ...imageData, scale: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>10%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={imageData.blur}
                            onChange={(e) => setImageData({ ...imageData, blur: e.target.checked })}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">图片模糊</span>
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          开启后图片将高度模糊显示，点击图片才会显示具体画面
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4 mt-6">
                      <button
                        onClick={pendingUploadFiles ? handleImageUpload : insertImage}
                        disabled={uploadingImage}
                        className="btn btn-primary flex-1 disabled:opacity-50"
                      >
                        {uploadingImage ? '上传中..' : (pendingUploadFiles ? '上传' : '插入')}
                      </button>
                      <button
                        onClick={() => {
                          setShowImageModal(false)
                          setPendingUploadFiles(null)
                          setImageData({ alt: '', url: '', blur: false, align: 'center', scale: 100 })
                        }}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 编辑笔记标签?- 空状?*/}
          {activeTab === 'editNote' && !showForm && (
            <div className="card">
              <div className="text-center py-16">
                <div className="text-6xl mb-4 text-gray-300">📝</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {editingNote ? '正在编辑笔记' : '准备创建新笔记'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {editingNote
                    ? '您正在编辑一篇笔记。如需返回笔记列表，请点击左侧"笔记管理"选项卡。'
                    : '点击"新建笔记"选项卡开始创建您的第一篇笔记，或从"笔记管理"选项卡中选择一篇笔记进行编辑。'
                  }
                </p>
                {!editingNote && (
                  <button
                    onClick={() => {
                      setFormData({ title: '', content: '', summary: '', category: '', tags: '', password: '', sort_order: 0, is_pinned: false, show_in_list: true, cover_image: '', source_type: 'none', source_url: '', source_text: '', custom_slug: '' })
                      setEditingNote(null)
                      setShowPreview(false)
                      setShowForm(true)
                    }}
                    className="btn btn-primary"
                  >
                    开始创建笔?
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 草稿箱标签页 */}
          {activeTab === 'drafts' && (
            <>
              {/* 草稿列表 */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">草稿箱</h2>
                {listLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredDrafts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    还没有保存任何草稿
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredDrafts.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-gray-900 break-words">{note.title || '(无标题)'}</h3>
                              <span className="inline-flex text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded flex-shrink-0">
                                草稿
                              </span>
                              {note.category && (
                                <span
                                  className="inline-flex text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex-shrink-0"
                                >
                                  分类: {note.category}
                                </span>
                              )}
                              {note.tags && note.tags.split(',').map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex-shrink-0"
                                >
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 break-words">
                              {note.summary || (note.content ? note.content.substring(0, 150) + '...' : '暂无内容')}
                            </p>
                          </div>
                          <div className="flex sm:flex-col gap-2 sm:ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(note)}
                              className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => note.id && handlePublish(note.id)}
                              className="flex-1 sm:flex-initial px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                            >
                              发布
                            </button>
                            <button
                              onClick={() => note.id && handleDelete(note.id)}
                              className="flex-1 sm:flex-initial px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {listTotalPages > 1 && !listLoading && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      第 {listPage} 页 / 共 {listTotalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const next = Math.max(1, listPage - 1)
                          loadNotesList(next)
                        }}
                        disabled={listPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <button
                        onClick={() => {
                          const next = Math.min(listTotalPages, listPage + 1)
                          loadNotesList(next)
                        }}
                        disabled={listPage >= listTotalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 分类管理标签?*/}
          {activeTab === 'categories' && (
            <>
              {/* 添加按钮 */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className="btn btn-primary"
                >
                  {showCategoryForm ? '取消' : '+ 添加分类'}
                </button>
              </div>

              {/* 添加/编辑表单 */}
              {showCategoryForm && (
                <div className="card mb-6">
                  <h2 className="text-lg font-semibold mb-4">
                    {editingCategory ? '编辑分类' : '添加分类'}
                  </h2>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分类名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={categoryFormData.name}
                        onChange={handleCategoryChange}
                        className="input"
                        placeholder="例如：技术笔记"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分类描述
                      </label>
                      <textarea
                        name="description"
                        value={categoryFormData.description}
                        onChange={handleCategoryChange}
                        rows={3}
                        className="input"
                        placeholder="分类的详细描述"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          分类图标
                        </label>
                        <input
                          type="text"
                          name="icon"
                          value={categoryFormData.icon}
                          onChange={handleCategoryChange}
                          className="input"
                          placeholder="例如：📝 或 emoji 表情"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          可以使用 emoji 表情作为图标
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          排序顺序
                        </label>
                        <input
                          type="number"
                          name="sort_order"
                          value={categoryFormData.sort_order}
                          onChange={handleCategoryChange}
                          className="input"
                          placeholder="数字越小越靠前"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <button type="submit" className="btn btn-primary">
                        {editingCategory ? '更新' : '添加'}
                      </button>
                      <button
                        type="button"
                        onClick={resetCategoryForm}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 分类列表 */}
              <div className="card overflow-hidden">
                <h2 className="text-lg font-semibold mb-4 px-6 pt-6">分类列表</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          图标
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          描述
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          排序
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            暂无分类数据
                          </td>
                        </tr>
                      ) : (
                        categories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-2xl">
                              {category.icon || '📁'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {category.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {category.description || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.sort_order}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleCategoryEdit(category)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => category.id && handleCategoryDelete(category.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
      </div>

      {/* 网盘管理弹窗 */}
      {currentNoteId && (
        <DiskModal
          isOpen={showDiskModal}
          onClose={() => setShowDiskModal(false)}
          noteId={currentNoteId}
          isAdmin={true}
        />
      )}

      {/* 投票编辑器弹窗 */}
      {showPollEditor && (
        <PollEditor
          noteId={editingNote?.id || 0}
          poll={editingPoll}
          onSave={handleSavePoll}
          onClose={() => {
            setShowPollEditor(false)
            setEditingPoll(null)
          }}
        />
      )}

      {/* 问卷编辑器弹窗 */}
      {showSurveyEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingSurvey ? '编辑问卷' : '新建问卷'}
              </h3>
              <button
                onClick={() => {
                  setShowSurveyEditor(false)
                  setEditingSurvey(null)
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <SurveyEditor
                survey={editingSurvey}
                onSave={handleSaveSurvey}
                onCancel={() => {
                  setShowSurveyEditor(false)
                  setEditingSurvey(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 抽奖编辑器弹窗 */}
      {showLotteryEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingLottery ? '编辑抽奖' : '新建抽奖'}
              </h3>
              <button
                onClick={() => {
                  setShowLotteryEditor(false)
                  setEditingLottery(null)
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <LotteryEditor
                lottery={editingLottery}
                onSave={handleSaveLottery}
                onCancel={() => {
                  setShowLotteryEditor(false)
                  setEditingLottery(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 查看投票数据模态框 */}
      {showPollDataModal && viewingPollData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 模态框头部 */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-bold text-white">投票数据详情</h3>
              </div>
              <button
                onClick={() => {
                  setShowPollDataModal(false)
                  setViewingPollData(null)
                  setPollVotes([])
                  setPollVotesPage(1)
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {pollVotesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                </div>
              ) : pollVotesError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">{pollVotesError}</p>
                </div>
              ) : (
                <>
                  {/* 投票基本信息 */}
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-900 mb-3">{viewingPollData.title}</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        总投票记录: {pollVotesTotal}
                      </span>
                      {viewingPollData.poll_type === 'multiple' && (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          多选投票（最多{viewingPollData.max_choices || 1}项）
                        </span>
                      )}
                      {viewingPollData.end_time && (
                        <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          截止时间: {new Date(viewingPollData.end_time).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 投票记录表格 */}
                  {pollVotes.length === 0 ? (
                    <div className="text-center py-16">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-gray-500 text-lg">暂无投票记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300">
                        <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                          <tr>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">序号</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">提交时间</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">IP地址</th>
                            {viewingPollData?.options?.map((option: any) => (
                              <th key={option.id} className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[120px]">
                                {option.option_text}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {pollVotes.map((vote: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {(pollVotesPage - 1) * 20 + index + 1}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {new Date(vote.created_at).toLocaleString('zh-CN')}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {vote.voter_ip || '-'}
                              </td>
                              {viewingPollData?.options?.map((option: any) => (
                                <td key={option.id} className="border border-gray-300 px-4 py-3 text-center text-sm">
                                  {vote.selected_options?.includes(option.id) ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 分页控制 */}
                  {pollVotesTotal > 20 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          const newPage = Math.max(1, pollVotesPage - 1)
                          setPollVotesPage(newPage)
                          loadPollVotes(viewingPollData.id, newPage)
                        }}
                        disabled={pollVotesPage === 1}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="text-gray-700">
                        第 {pollVotesPage} 页 / 共 {Math.ceil(pollVotesTotal / 20)} 页
                      </span>
                      <button
                        onClick={() => {
                          const newPage = pollVotesPage + 1
                          setPollVotesPage(newPage)
                          loadPollVotes(viewingPollData.id, newPage)
                        }}
                        disabled={pollVotesPage >= Math.ceil(pollVotesTotal / 20)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 模态框底部操作 */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <button
                onClick={async () => {
                  try {
                    const response = await exportPollData(editingNote?.id!, viewingPollData.id)
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `poll-${viewingPollData.id}-data.csv`
                    link.download = decodeURIComponent(filename)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                    setToast({ show: true, type: 'success', message: '导出成功' })
                  } catch (error: any) {
                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出数据
              </button>
              <button
                onClick={() => {
                  setShowPollDataModal(false)
                  setViewingPollData(null)
                  setPollVotes([])
                  setPollVotesPage(1)
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看问卷数据模态框 */}
      {showSurveyDataModal && viewingSurveyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 模态框头部 */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-bold text-white">问卷数据详情</h3>
              </div>
              <button
                onClick={() => {
                  setShowSurveyDataModal(false)
                  setViewingSurveyId(null)
                  setViewingSurveyData(null)
                  setSurveySubmissions([])
                  setSurveySubmissionsPage(1)
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {surveySubmissionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                </div>
              ) : surveySubmissionsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">{surveySubmissionsError}</p>
                </div>
              ) : (
                <>
                  {/* 问卷基本信息 */}
                  {viewingSurveyData && (
                    <div className="mb-6">
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">{viewingSurveyData.title}</h4>
                      {viewingSurveyData.description && (
                        <p className="text-gray-600 mb-3">{viewingSurveyData.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                          总提交数: {surveySubmissionsTotal}
                        </span>
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          题目数: {viewingSurveyData.questions?.length || 0}
                        </span>
                        {viewingSurveyData.end_time && (
                          <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                            截止时间: {new Date(viewingSurveyData.end_time).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 提交记录表格 */}
                  {surveySubmissions.length === 0 ? (
                    <div className="text-center py-16">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 text-lg">暂无提交记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                          <tr>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">序号</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">提交时间</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">IP地址</th>
                            {viewingSurveyData?.questions?.map((question: any, qIndex: number) => (
                              <th key={question.id} className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[150px]">
                                {qIndex + 1}. {question.question_title}
                                {question.is_required && <span className="text-red-500 ml-1">*</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {surveySubmissions.map((submission: any, index: number) => (
                            <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {(surveySubmissionsPage - 1) * 20 + index + 1}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {submission.submitter_ip || '-'}
                              </td>
                              {viewingSurveyData?.questions?.map((question: any) => {
                                const answer = submission.answers?.find((a: any) => a.question_id === question.id)
                                
                                // 处理未回答的情况
                                if (!answer) {
                                  return (
                                    <td key={question.id} className="border border-gray-300 px-4 py-3 text-sm text-gray-500 italic">
                                      -
                                    </td>
                                  )
                                }

                                return (
                                  <td key={question.id} className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                    <div className="max-w-xs overflow-hidden text-ellipsis">
                                      {question.question_type === 'file' ? (
                                        answer.answer_text || answer.answer_file ? (
                                          <div className="flex flex-col gap-1">
                                            {(answer.answer_text || answer.answer_file || '').split(',').map((url: string, idx: number) => {
                                              // 处理相对路径，添加 API Base URL
                                              const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${url.startsWith('/') ? '' : '/'}${url}`;
                                              return (
                                                <a
                                                  key={idx}
                                                  href={fullUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                  </svg>
                                                  <span className="truncate max-w-[150px]">{url}</span>
                                                </a>
                                              );
                                            })}
                                          </div>
                                        ) : '-'
                                      ) : ['radio', 'checkbox'].includes(question.question_type) ? (
                                        answer.selected_options && answer.selected_options.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {answer.selected_options.map((optionId: number) => {
                                              const option = question.options?.find((o: any) => o.id === optionId)
                                              return (
                                                <span key={optionId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                  {option?.option_text || `选项${optionId}`}
                                                </span>
                                              )
                                            })}
                                          </div>
                                        ) : '-'
                                      ) : question.question_type === 'rating' ? (
                                        <div className="flex items-center gap-1">
                                          <span className="font-semibold text-yellow-600">{answer.answer_text || '0'}</span>
                                          <span className="text-gray-400">/ {question.config?.maxValue || 5}</span>
                                          <span className="text-yellow-400 text-xs">⭐</span>
                                        </div>
                                      ) : question.question_type === 'date' ? (
                                        answer.answer_text ? new Date(answer.answer_text).toLocaleDateString('zh-CN') : '-'
                                      ) : (
                                        <span title={answer.answer_text}>{answer.answer_text || '-'}</span>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 分页控制 */}
                  {surveySubmissionsTotal > 20 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button
                        onClick={() => setSurveySubmissionsPage(Math.max(1, surveySubmissionsPage - 1))}
                        disabled={surveySubmissionsPage === 1}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="text-gray-700">
                        第 {surveySubmissionsPage} 页 / 共 {Math.ceil(surveySubmissionsTotal / 20)} 页
                      </span>
                      <button
                        onClick={() => setSurveySubmissionsPage(surveySubmissionsPage + 1)}
                        disabled={surveySubmissionsPage >= Math.ceil(surveySubmissionsTotal / 20)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 模态框底部操作 */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <button
                onClick={async () => {
                  try {
                    const response = await exportSurveyData(viewingSurveyId!)
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `survey-${viewingSurveyId}-data.csv`
                    link.download = decodeURIComponent(filename)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                    setToast({ show: true, type: 'success', message: '导出成功' })
                  } catch (error: any) {
                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出数据
              </button>
              <button
                onClick={() => {
                  setShowSurveyDataModal(false)
                  setViewingSurveyId(null)
                  setViewingSurveyData(null)
                  setSurveySubmissions([])
                  setSurveySubmissionsPage(1)
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看抽奖数据模态框 */}
      {showLotteryDataModal && viewingLotteryId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 模态框头部 - 紫粉渐变 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2v2M8.227 12.565a2 2 0 11-2.828 2.828 2 2 0 012.828-2.828zm7.778-7.778a2 2 0 11-2.828 2.828 2 2 0 012.828-2.828z" />
                </svg>
                <h3 className="text-xl font-bold text-white">抽奖数据详情</h3>
              </div>
              <button
                onClick={() => {
                  setShowLotteryDataModal(false)
                  setViewingLotteryId(null)
                  setViewingLotteryData(null)
                  setLotteryEntries([])
                  setLotteryEntriesPage(1)
                  setLotteryStats(null)
                  setLotteryStatsError(null)
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {lotteryEntriesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                </div>
              ) : lotteryEntriesError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">{lotteryEntriesError}</p>
                </div>
              ) : (
                <>
                  {/* 抽奖基本信息 */}
                  {viewingLotteryData && (
                    <div className="mb-6">
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">{viewingLotteryData.title}</h4>
                      {viewingLotteryData.description && (
                        <p className="text-gray-600 mb-3">{viewingLotteryData.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          总参与数: {lotteryStats?.totalParticipants ?? lotteryEntriesTotal}
                        </span>
                        <span className="px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                          奖项数: {viewingLotteryData.prizes?.length || 0}
                        </span>
                        {lotteryStats?.totalWinners !== undefined && (
                          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            中奖人数: {lotteryStats.totalWinners}
                          </span>
                        )}
                        {lotteryStats?.uniqueIPs !== undefined && (
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            唯一IP: {lotteryStats.uniqueIPs}
                          </span>
                        )}
                        {(viewingLotteryData.is_drawn === true || viewingLotteryData.is_drawn === 1 || viewingLotteryData.is_drawn === '1') && (
                          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            已开奖
                          </span>
                        )}
                        {viewingLotteryData.draw_time && (
                          <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                            开奖时间: {new Date(viewingLotteryData.draw_time).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {lotteryStatsLoading && (
                        <div className="mt-2 text-sm text-gray-500">
                          统计数据加载中...
                        </div>
                      )}
                      {lotteryStatsError && (
                        <div className="mt-2 text-sm text-red-600">
                          统计数据加载失败：{lotteryStatsError}
                        </div>
                      )}

                      {/* 奖项统计 */}
                      {(viewingLotteryData.is_drawn === true || viewingLotteryData.is_drawn === 1 || viewingLotteryData.is_drawn === '1') && viewingLotteryData.prizes && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {viewingLotteryData.prizes.map((prize: any) => {
                            const winners =
                              lotteryStats?.prizeWinners?.[String(prize.id)] ??
                              lotteryStats?.prizeWinners?.[prize.id] ??
                              0
                            return (
                              <div key={prize.id} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                                <div className="text-sm text-gray-600 mb-1">{prize.prize_name}</div>
                                <div className="text-xl font-bold text-purple-700">
                                  {winners} 人
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  数量: {prize.quantity}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 参与记录表格 */}
                  {lotteryEntries.length === 0 ? (
                    <div className="text-center py-16">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2v2M8.227 12.565a2 2 0 11-2.828 2.828 2 2 0 012.828-2.828zm7.778-7.778a2 2 0 11-2.828 2.828 2 2 0 012.828-2.828z" />
                      </svg>
                      <p className="text-gray-500 text-lg">暂无参与记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300">
                        <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                          <tr>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">序号</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">参与时间</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">邮箱</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">IP地址</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">中奖情况</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {lotteryEntries.map((entry: any, index: number) => (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {(lotteryEntriesPage - 1) * 20 + index + 1}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {new Date(entry.created_at).toLocaleString('zh-CN')}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                {entry.participant_email || '-'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {entry.participant_ip}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm">
                                {entry.is_winner ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    {entry.prize?.prize_name || '已中奖'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">未中奖</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 分页控制 */}
                  {lotteryEntriesTotal > 20 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          const newPage = Math.max(1, lotteryEntriesPage - 1)
                          setLotteryEntriesPage(newPage)
                          loadLotteryEntries(viewingLotteryId!, newPage)
                        }}
                        disabled={lotteryEntriesPage === 1}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="text-gray-700">
                        第 {lotteryEntriesPage} 页 / 共 {Math.ceil(lotteryEntriesTotal / 20)} 页
                      </span>
                      <button
                        onClick={() => {
                          const newPage = Math.min(Math.ceil(lotteryEntriesTotal / 20), lotteryEntriesPage + 1)
                          setLotteryEntriesPage(newPage)
                          loadLotteryEntries(viewingLotteryId!, newPage)
                        }}
                        disabled={lotteryEntriesPage >= Math.ceil(lotteryEntriesTotal / 20)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 模态框底部操作 */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <button
                onClick={async () => {
                  try {
                    const response = await exportLotteryData(editingNote?.id || 0, viewingLotteryId!)
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    const filename = `lottery-${viewingLotteryId}-data.csv`
                    link.download = filename
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                    setToast({ show: true, type: 'success', message: '导出成功' })
                  } catch (error: any) {
                    setToast({ show: true, type: 'error', message: error.response?.data?.message || '导出失败' })
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出数据
              </button>
              <button
                onClick={() => {
                  setShowLotteryDataModal(false)
                  setViewingLotteryId(null)
                  setViewingLotteryData(null)
                  setLotteryEntries([])
                  setLotteryEntriesPage(1)
                  setLotteryStats(null)
                  setLotteryStatsError(null)
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}



