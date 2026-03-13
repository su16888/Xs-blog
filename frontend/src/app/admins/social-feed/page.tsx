'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'
import { getAdminRoute } from '@/lib/adminConfig'
import { getImageUrl, getApiUrl } from '@/lib/api'
import {
  getSocialFeedProfile,
  updateSocialFeedProfile,
  uploadSocialFeedCover,
  uploadSocialFeedAvatar,
  getAllSocialFeedPosts,
  createSocialFeedPost,
  updateSocialFeedPost,
  deleteSocialFeedPost,
  uploadSocialFeedImages,
  batchDeleteSocialFeedPosts
} from '@/lib/api'

// 常用表情列表
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜',
  '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
  '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪',
  '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
  '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
  '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
  '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
  '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
  '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚',
  '🖐️', '✋', '🖖', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '🌹', '🌸', '💐', '🌷', '🌺', '🌻', '🌼', '🏵️', '🌾', '🍀',
  '☀️', '🌙', '⭐', '🌟', '✨', '💫', '🔥', '💧', '🌊', '🎉'
]

interface Profile {
  cover_image: string
  avatar: string
  nickname: string
  signature: string
  custom_copyright: string
}

interface Post {
  id: number
  content: string
  images: string[]
  video: string | null
  likes_count: number
  comments_count: number
  is_pinned: boolean
  is_published: boolean
  sort_order: number
  created_at: string
}

// 发布状态类型
type PublishStatus = 'all' | 'published' | 'draft'

export default function SocialFeedPage() {
  usePageTitle('朋友圈管理', true)
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 个人资料状态
  const [profile, setProfile] = useState<Profile>({
    cover_image: '',
    avatar: '',
    nickname: '朋友圈',
    signature: '',
    custom_copyright: ''
  })

  // 动态列表状态
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsPage, setPostsPage] = useState(1)
  const [postsTotalPages, setPostsTotalPages] = useState(1)
  const [postCounts, setPostCounts] = useState({ total: 0, published: 0, draft: 0 })
  const [showPostForm, setShowPostForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [postForm, setPostForm] = useState({
    content: '',
    images: [] as string[],
    is_pinned: false,
    is_published: true
  })

  // 发布状态筛选
  const [publishFilter, setPublishFilter] = useState<PublishStatus>('all')

  // 批量选择状?
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])

  // 图片上传状?
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 表情选择器状?
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // 抖音视频分享状?
  const [showDouyinForm, setShowDouyinForm] = useState(false)
  const [douyinForm, setDouyinForm] = useState({
    apiUrl: '',
    fieldPath: '',
    douyinUrl: ''
  })
  const [parsingDouyin, setParsingDouyin] = useState(false)

  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab !== 'posts') return
    setSelectedPosts([])
    setPostsPage(1)
    loadPosts(1, publishFilter)
  }, [publishFilter, activeTab])

  const loadData = async () => {
    try {
      await Promise.all([loadProfile(), loadPosts(1, publishFilter)])
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async () => {
    try {
      const data = await getSocialFeedProfile()
      if (data.success) {
        setProfile(data.data)
      }
    } catch (error) {
      console.error('加载个人资料失败:', error)
    }
  }

  const loadPosts = async (page: number = postsPage, status: PublishStatus = publishFilter) => {
    setPostsLoading(true)
    try {
      const perPage = 50
      const data = await getAllSocialFeedPosts({
        page,
        limit: perPage,
        status: status === 'all' ? undefined : status
      })
      if (!data?.success) return

      const postsData = Array.isArray(data?.data?.posts) ? data.data.posts : []
      setPosts(postsData)

      const counts = data?.data?.counts
      if (counts && typeof counts === 'object') {
        setPostCounts({
          total: Number(counts.total || 0),
          published: Number(counts.published || 0),
          draft: Number(counts.draft || 0)
        })
      }

      const pagination = data?.data?.pagination
      const nextTotalPages = Number(pagination?.total_pages ?? pagination?.totalPages ?? 1)
      setPostsTotalPages(Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1)
      setPostsPage(page)
    } catch (error) {
      console.error('加载动态列表失败', error)
    } finally {
      setPostsLoading(false)
    }
  }

  // 根据筛选条件过滤动态
  const filteredPosts = posts

  // 统计数量
  const publishedCount = postCounts.published || posts.filter(p => p.is_published).length
  const draftCount = postCounts.draft || posts.filter(p => !p.is_published).length
  const totalCount = postCounts.total || posts.length

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = await updateSocialFeedProfile(profile)
      if (data.success) {
        setToast({ show: true, type: 'success', message: '个人资料更新成功' })
      } else {
        setToast({ show: true, type: 'error', message: data.message || '更新失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '更新失败'
      setToast({ show: true, type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let data
      if (type === 'cover') {
        data = await uploadSocialFeedCover(file)
        if (data.success) {
          setProfile({ ...profile, cover_image: data.data.cover_image })
          setToast({ show: true, type: 'success', message: '上传成功' })
        } else {
          setToast({ show: true, type: 'error', message: data.message || '上传失败' })
        }
      } else {
        data = await uploadSocialFeedAvatar(file)
        if (data.success) {
          setProfile({ ...profile, avatar: data.data.avatar })
          setToast({ show: true, type: 'success', message: '上传成功' })
        } else {
          setToast({ show: true, type: 'error', message: data.message || '上传失败' })
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '上传失败'
      setToast({ show: true, type: 'error', message })
    }
  }

  // 处理动态图片上?
  const handlePostImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (postForm.images.length + files.length > 9) {
      setToast({ show: true, type: 'error', message: '最多只能上传9张图片' })
      return
    }

    setUploadingImages(true)
    try {
      const data = await uploadSocialFeedImages(files)
      if (data.success) {
        setPostForm({
          ...postForm,
          images: [...postForm.images, ...data.data.images]
        })
        setToast({ show: true, type: 'success', message: '图片上传成功' })
      } else {
        setToast({ show: true, type: 'error', message: data.message || '图片上传失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '图片上传失败'
      setToast({ show: true, type: 'error', message })
    } finally {
      setUploadingImages(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  // 删除动态图?
  const handleRemovePostImage = (index: number) => {
    const newImages = [...postForm.images]
    newImages.splice(index, 1)
    setPostForm({ ...postForm, images: newImages })
  }

  // 插入表情
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = postForm.content.substring(0, start) + emoji + postForm.content.substring(end)
      setPostForm({ ...postForm, content: newContent })
      // 设置光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setPostForm({ ...postForm, content: postForm.content + emoji })
    }
    setShowEmojiPicker(false)
  }

  const handlePostSubmit = async (e: React.FormEvent, publishStatus?: boolean) => {
    e.preventDefault()
    setSaving(true)

    // 分离图片和视频
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
    const images = postForm.images.filter(img =>
      !videoExtensions.some(ext => img.toLowerCase().endsWith(ext))
    )
    const videoFile = postForm.images.find(img =>
      videoExtensions.some(ext => img.toLowerCase().endsWith(ext))
    )

    // 如果明确指定了发布状态，使用指定的状?
    const submitData = {
      ...postForm,
      images,
      video: videoFile || null,
      is_published: publishStatus !== undefined ? publishStatus : postForm.is_published
    }

    try {
      let data
      if (editingPost) {
        data = await updateSocialFeedPost(editingPost.id, submitData)
      } else {
        data = await createSocialFeedPost(submitData)
      }

      if (data.success) {
        const message = submitData.is_published
          ? (editingPost ? '动态更新成功' : '动态发布成功')
          : '草稿保存成功'
        setToast({ show: true, type: 'success', message })
        setShowPostForm(false)
        setEditingPost(null)
        setPostForm({ content: '', images: [], is_pinned: false, is_published: true })
        setSelectedPosts([])
        loadPosts(1, publishFilter)
      } else {
        setToast({ show: true, type: 'error', message: data.message || '操作失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '操作失败'
      setToast({ show: true, type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const handlePostDelete = async (id: number) => {
    if (!confirm('确定要删除这条动态吗？')) return

    try {
      const data = await deleteSocialFeedPost(id)
      if (data.success) {
        setToast({ show: true, type: 'success', message: '删除成功' })
        setSelectedPosts([])
        loadPosts(postsPage, publishFilter)
      } else {
        setToast({ show: true, type: 'error', message: data.message || '删除失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '删除失败'
      setToast({ show: true, type: 'error', message })
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedPosts.length === 0) {
      setToast({ show: true, type: 'error', message: '请先选择要删除的动态' })
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedPosts.length} 条动态吗？`)) return

    try {
      const data = await batchDeleteSocialFeedPosts(selectedPosts)
      if (data.success) {
        setToast({ show: true, type: 'success', message: data.message })
        setSelectedPosts([])
        loadPosts(postsPage, publishFilter)
      } else {
        setToast({ show: true, type: 'error', message: data.message || '批量删除失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '批量删除失败'
      setToast({ show: true, type: 'error', message })
    }
  }

  // 切换选择状?
  const togglePostSelection = (id: number) => {
    if (selectedPosts.includes(id)) {
      setSelectedPosts(selectedPosts.filter(p => p !== id))
    } else {
      setSelectedPosts([...selectedPosts, id])
    }
  }

  // 全?取消全?
  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map(p => p.id))
    }
  }

  // 快速切换发布状?
  const togglePublishStatus = async (post: Post) => {
    try {
      const data = await updateSocialFeedPost(post.id, {
        content: post.content,
        images: post.images,
        is_pinned: post.is_pinned,
        is_published: !post.is_published
      })
      if (data.success) {
        setToast({
          show: true,
          type: 'success',
          message: post.is_published ? '已设为草稿' : '已发布'
        })
        loadPosts(postsPage, publishFilter)
      } else {
        setToast({ show: true, type: 'error', message: data.message || '操作失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '操作失败'
      setToast({ show: true, type: 'error', message })
    }
  }

  // 快速切换置顶状?
  const togglePinStatus = async (post: Post) => {
    try {
      const data = await updateSocialFeedPost(post.id, {
        content: post.content,
        images: post.images,
        is_pinned: !post.is_pinned,
        is_published: post.is_published
      })
      if (data.success) {
        setToast({
          show: true,
          type: 'success',
          message: post.is_pinned ? '已取消置顶' : '已置顶'
        })
        loadPosts(postsPage, publishFilter)
      } else {
        setToast({ show: true, type: 'error', message: data.message || '操作失败' })
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '操作失败'
      setToast({ show: true, type: 'error', message })
    }
  }

  return (
    <>
      <AdminToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
      <>
      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
        {/* 标签页切?*/}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-6 sm:flex-nowrap sm:gap-0 sm:space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              个人资料
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              动态管理({posts.length})
            </button>
          </nav>
        </div>

        {/* 个人资料标签页 */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* 封面图 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">封面图</label>
                {profile.cover_image && (
                  <img src={getImageUrl(profile.cover_image)} alt="封面" className="w-full max-w-full sm:max-w-xs h-32 object-cover rounded-lg mb-2" />
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={profile.cover_image}
                    onChange={(e) => setProfile({ ...profile, cover_image: e.target.value })}
                    placeholder="输入图片URL或上传图片"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                    onChange={(e) => handleImageUpload(e, 'cover')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* 头像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">头像</label>
                {profile.avatar && (
                  <img src={getImageUrl(profile.avatar)} alt="头像" className="w-20 h-20 rounded-lg object-cover mb-2" />
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={profile.avatar}
                    onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                    placeholder="输入图片URL或上传图片"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                    onChange={(e) => handleImageUpload(e, 'avatar')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* 昵称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={profile.nickname}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 个性签?*/}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">个性签名</label>
                <textarea
                  value={profile.signature}
                  onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 自定义版?*/}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自定义版权</label>
                <input
                  type="text"
                  value={profile.custom_copyright}
                  onChange={(e) => setProfile({ ...profile, custom_copyright: e.target.value })}
                  placeholder="显示在页面底部，如：© 2025 我的朋友圈"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </form>
          </div>
        )}

        {/* 动态管理标签页 */}
        {activeTab === 'posts' && (
          <div>
            {/* 操作?*/}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setShowPostForm(true)
                    setEditingPost(null)
                    setPostForm({ content: '', images: [], is_pinned: false, is_published: true })
                  }}
                  className="w-full sm:w-auto bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  发布新动态
                </button>

                {/* 状态筛选*/}
                <div className="flex flex-wrap items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPublishFilter('all')}
                    className={`px-3 py-1 rounded text-sm ${
                      publishFilter === 'all' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    全部 ({totalCount})
                  </button>
                  <button
                    onClick={() => setPublishFilter('published')}
                    className={`px-3 py-1 rounded text-sm ${
                      publishFilter === 'published' ? 'bg-white shadow text-green-600' : 'text-gray-600'
                    }`}
                  >
                    已发布({publishedCount})
                  </button>
                  <button
                    onClick={() => setPublishFilter('draft')}
                    className={`px-3 py-1 rounded text-sm ${
                      publishFilter === 'draft' ? 'bg-white shadow text-gray-600' : 'text-gray-600'
                    }`}
                  >
                    草稿 ({draftCount})
                  </button>
                </div>

                {filteredPosts.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-600 hover:text-gray-900 text-sm whitespace-nowrap"
                  >
                    {selectedPosts.length === filteredPosts.length ? '取消全选' : '全选'}
                  </button>
                )}
              </div>
              {selectedPosts.length > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="w-full sm:w-auto bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  删除选中 ({selectedPosts.length})
                </button>
              )}
            </div>

            {/* 动态列?- 紧凑卡片?*/}
            <div className="space-y-3">
              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  {publishFilter === 'all'
                    ? '暂无动态，点击"发布新动态"开始吧'
                    : publishFilter === 'published'
                      ? '暂无已发布的动态'
                      : '暂无草稿'
                  }
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* 复选框 */}
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* 缩略?*/}
                      <div className="flex-shrink-0">
                        {post.images && post.images.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => window.open(getImageUrl(post.images[0]), '_blank')}
                            className="relative w-12 h-12 rounded overflow-hidden cursor-pointer hover:opacity-80"
                          >
                            <img
                              src={getImageUrl(post.images[0])}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                            />
                            {post.video && (
                              <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-br">
                                视频
                              </span>
                            )}
                            {post.images.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-tl">
                                +{post.images.length - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          {/* 内容 */}
                          <div className="min-w-0">
                            <p className="text-gray-800 text-sm line-clamp-2 break-words">{post.content}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>{new Date(post.created_at).toLocaleString()}</span>
                              {post.is_pinned && (
                                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">置顶</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded ${
                                post.is_published
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-gray-500 bg-gray-100'
                              }`}>
                                {post.is_published ? '已发布' : '草稿'}
                              </span>
                              {post.images && post.images.length > 0 && (
                                <span className="text-gray-400">{post.images.length}张图</span>
                              )}
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end shrink-0">
                            <button
                              onClick={() => togglePinStatus(post)}
                              className={`p-1.5 rounded hover:bg-gray-100 ${post.is_pinned ? 'text-blue-600' : 'text-gray-400'}`}
                              title={post.is_pinned ? '取消置顶' : '置顶'}
                            >
                              <svg className="w-4 h-4" fill={post.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => togglePublishStatus(post)}
                              className={`p-1.5 rounded hover:bg-gray-100 ${post.is_published ? 'text-green-600' : 'text-gray-400'}`}
                              title={post.is_published ? '设为草稿' : '发布'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {post.is_published ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                )}
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingPost(post)
                                // 合并图片和视频到同一个数组显示
                                const allMedia = [...(post.images || [])]
                                if (post.video) {
                                  allMedia.push(post.video)
                                }
                                setPostForm({
                                  content: post.content,
                                  images: allMedia,
                                  is_pinned: post.is_pinned,
                                  is_published: post.is_published
                                })
                                setShowPostForm(true)
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 text-blue-600"
                              title="编辑"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePostDelete(post.id)}
                              className="p-1.5 rounded hover:bg-gray-100 text-red-600"
                              title="删除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {postsTotalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  第 {postsPage} 页 / 共 {postsTotalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = Math.max(1, postsPage - 1)
                      setSelectedPosts([])
                      loadPosts(next, publishFilter)
                    }}
                    disabled={postsPage <= 1 || postsLoading}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => {
                      const next = Math.min(postsTotalPages, postsPage + 1)
                      setSelectedPosts([])
                      loadPosts(next, publishFilter)
                    }}
                    disabled={postsPage >= postsTotalPages || postsLoading}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}

            {/* 动态表单弹?*/}
            {showPostForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
                <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                  <h2 className="text-xl font-bold mb-4">{editingPost ? '编辑动态' : '发布新动态'}</h2>
                  <form className="space-y-4">
                    {/* 内容输入?*/}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">内容（支持嵌入iframe代码）</label>
                      <textarea
                        ref={textareaRef}
                        value={postForm.content}
                        onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="分享你的生活...&#10;&#10;可直接粘贴iframe嵌入代码，如#10;<iframe src=&quot;https://music.163.com/...&quot;></iframe>"
                      />
                      {/* 表情按钮 */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute bottom-3 right-3 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      {/* 表情选择?*/}
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80 max-w-full z-10">
                          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                            {EMOJI_LIST.map((emoji, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* iframe 快捷添加提示 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium mb-1">嵌入代码说明</p>
                      <p className="text-xs text-blue-600">
                        支持网易云音乐、B站视频等平台的iframe嵌入代码，直接粘贴到内容框即可。<br />
                        例如：网易云音乐外链播放器、哔哩哔哩视频嵌入代码等。
                      </p>
                    </div>

                    {/* 图片/视频上传区域 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        图片/视频 ({postForm.images.length}/9)
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                        {postForm.images.map((img, idx) => {
                          const isVideo = img.endsWith('.mp4') || img.endsWith('.webm') || img.endsWith('.ogg') || img.endsWith('.mov') || img.endsWith('.avi')
                          const isExternal = img.startsWith('http://') || img.startsWith('https://')
                          const displayUrl = isExternal ? img : getImageUrl(img)
                          return (
                            <div key={idx} className="relative group aspect-square">
                              {isVideo ? (
                                <video
                                  src={displayUrl}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <img
                                  src={displayUrl}
                                  alt=""
                                  className="w-full h-full object-cover rounded"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    // 如果设置?crossOrigin 失败，尝试不设置
                                    if (target.crossOrigin) {
                                      target.crossOrigin = ''
                                      target.src = displayUrl
                                      return
                                    }
                                    target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">加载失败</text></svg>'
                                  }}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePostImage(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              {isVideo && (
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                                  视频
                                </div>
                              )}
                              {isExternal && (
                                <div className="absolute bottom-1 right-1 bg-blue-600 bg-opacity-80 text-white text-xs px-1 rounded">
                                  外链
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {postForm.images.length < 9 && (
                          <label className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico,video/mp4,video/webm,video/ogg"
                              multiple
                              onChange={handlePostImagesUpload}
                              className="hidden"
                              disabled={uploadingImages}
                            />
                            {uploadingImages ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">支持图片(jpg/jpeg/png/gif/webp/svg/ico，5MB)和视频(mp4/webm/ogg，10MB)</p>

                      {/* 外部URL输入区域 */}
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">或添加外部链接</p>

                        {/* 图片URL输入 */}
                        <div className="mb-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              id="imageUrlInput"
                              placeholder="输入图片URL地址 (最多9张)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const input = e.target as HTMLInputElement
                                  const url = input.value.trim()
                                  if (url) {
                                    // 检查是否是有效URL（支持相对路径）
                                    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('./') && !url.startsWith('../')) {
                                      setToast({ show: true, type: 'error', message: '请输入有效的URL地址（支持完整URL或相对路径）' })
                                      return
                                    }
                                    // 检查数量限制
                                    if (postForm.images.length >= 9) {
                                      setToast({ show: true, type: 'error', message: '最多只能添加9张图片' })
                                      return
                                    }
                                    // 检查是否已存在
                                    if (postForm.images.includes(url)) {
                                      setToast({ show: true, type: 'error', message: '该图片已添加' })
                                      return
                                    }
                                    setPostForm({ ...postForm, images: [...postForm.images, url] })
                                    input.value = ''
                                    setToast({ show: true, type: 'success', message: '图片链接已添加' })
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('imageUrlInput') as HTMLInputElement
                                const url = input?.value.trim()
                                if (url) {
                                  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('./') && !url.startsWith('../')) {
                                    setToast({ show: true, type: 'error', message: '请输入有效的URL地址（支持完整URL或相对路径）' })
                                    return
                                  }
                                  if (postForm.images.length >= 9) {
                                    setToast({ show: true, type: 'error', message: '最多只能添加9张图片' })
                                    return
                                  }
                                  if (postForm.images.includes(url)) {
                                    setToast({ show: true, type: 'error', message: '该图片已添加' })
                                    return
                                  }
                                  setPostForm({ ...postForm, images: [...postForm.images, url] })
                                  input.value = ''
                                  setToast({ show: true, type: 'success', message: '图片链接已添加' })
                                }
                              }}
                              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              添加图片
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">支持第三方图床链接或相对路径，按回车或点击按钮添加</p>
                        </div>

                        {/* 视频URL输入 */}
                        <div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              id="videoUrlInput"
                              placeholder="输入视频URL地址 (仅限1个)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const input = e.target as HTMLInputElement
                                  const url = input.value.trim()
                                  if (url) {
                                    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('./') && !url.startsWith('../')) {
                                      setToast({ show: true, type: 'error', message: '请输入有效的URL地址（支持完整URL或相对路径）' })
                                      return
                                    }
                                    // 检查是否已有视频
                                    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
                                    const hasVideo = postForm.images.some(img =>
                                      videoExtensions.some(ext => img.toLowerCase().endsWith(ext))
                                    )
                                    if (hasVideo) {
                                      setToast({ show: true, type: 'error', message: '只能添加1个视频' })
                                      return
                                    }
                                    if (postForm.images.includes(url)) {
                                      setToast({ show: true, type: 'error', message: '该视频已添加' })
                                      return
                                    }
                                    setPostForm({ ...postForm, images: [...postForm.images, url] })
                                    input.value = ''
                                    setToast({ show: true, type: 'success', message: '视频链接已添加' })
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('videoUrlInput') as HTMLInputElement
                                const url = input?.value.trim()
                                if (url) {
                                  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('./') && !url.startsWith('../')) {
                                    setToast({ show: true, type: 'error', message: '请输入有效的URL地址（支持完整URL或相对路径）' })
                                    return
                                  }
                                  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
                                  const hasVideo = postForm.images.some(img =>
                                    videoExtensions.some(ext => img.toLowerCase().endsWith(ext))
                                  )
                                  if (hasVideo) {
                                    setToast({ show: true, type: 'error', message: '只能添加1个视频' })
                                    return
                                  }
                                  if (postForm.images.includes(url)) {
                                    setToast({ show: true, type: 'error', message: '该视频已添加' })
                                    return
                                  }
                                  setPostForm({ ...postForm, images: [...postForm.images, url] })
                                  input.value = ''
                                  setToast({ show: true, type: 'success', message: '视频链接已添加' })
                                }
                              }}
                              className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              添加视频
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">支持mp4/webm/ogg/mov/avi格式的视频直链或相对路径</p>
                        </div>

                        {/* 抖音视频分享 */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setShowDouyinForm(!showDouyinForm)}
                            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                            分享抖音视频
                            <svg className={`w-4 h-4 transition-transform ${showDouyinForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {showDouyinForm && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">API接口</label>
                                <input
                                  type="text"
                                  value={douyinForm.apiUrl}
                                  onChange={(e) => setDouyinForm({ ...douyinForm, apiUrl: e.target.value })}
                                  placeholder="例：https://api.mmp.cc/api/Jiexi?url="
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">对象字段</label>
                                <input
                                  type="text"
                                  value={douyinForm.fieldPath}
                                  onChange={(e) => setDouyinForm({ ...douyinForm, fieldPath: e.target.value })}
                                  placeholder="例：data.video_url"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">填写返回JSON中视频URL所在的字段路径</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">抖音URL</label>
                                <input
                                  type="text"
                                  value={douyinForm.douyinUrl}
                                  onChange={(e) => setDouyinForm({ ...douyinForm, douyinUrl: e.target.value })}
                                  placeholder="例：https://v.douyin.com/xxxxx/"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={parsingDouyin || !douyinForm.apiUrl || !douyinForm.fieldPath || !douyinForm.douyinUrl}
                                onClick={async () => {
                                  setParsingDouyin(true)
                                  try {
                                    // 拼接完整的API URL
                                    const fullApiUrl = douyinForm.apiUrl + encodeURIComponent(douyinForm.douyinUrl)

                                    // 通过后端代理调用API（解决跨域问题）
                                    const token = localStorage.getItem('token')
                                    const response = await fetch(getApiUrl('/admin/proxy/fetch'), {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ url: fullApiUrl })
                                    })

                                    if (!response.ok) {
                                      throw new Error('API请求失败')
                                    }

                                    const result = await response.json()
                                    if (!result.success) {
                                      throw new Error(result.message || 'API请求失败')
                                    }

                                    const data = result.data

                                    // 根据字段路径获取视频URL
                                    const fieldPath = douyinForm.fieldPath.split('.')
                                    let videoUrl = data
                                    for (const field of fieldPath) {
                                      if (videoUrl && typeof videoUrl === 'object' && field in videoUrl) {
                                        videoUrl = videoUrl[field]
                                      } else {
                                        throw new Error(`字段路径 "${douyinForm.fieldPath}" 不存在`)
                                      }
                                    }

                                    if (typeof videoUrl !== 'string' || !videoUrl) {
                                      throw new Error('未能获取到有效的视频URL')
                                    }

                                    // 检查是否已有视频
                                    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
                                    const hasVideo = postForm.images.some(img =>
                                      videoExtensions.some(ext => img.toLowerCase().endsWith(ext))
                                    )
                                    if (hasVideo) {
                                      throw new Error('已有视频，只能添加1个视频')
                                    }

                                    // 调用后端下载API，将视频保存到本地
                                    setToast({ show: true, type: 'success', message: '正在下载视频到服务器...' })
                                    const downloadResponse = await fetch(getApiUrl('/admin/proxy/download-douyin-video'), {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ videoUrl })
                                    })

                                    if (!downloadResponse.ok) {
                                      throw new Error('视频下载失败')
                                    }

                                    const downloadResult = await downloadResponse.json()
                                    if (!downloadResult.success) {
                                      throw new Error(downloadResult.message || '视频下载失败')
                                    }

                                    // 使用本地路径
                                    const localVideoPath = downloadResult.data.localPath

                                    // 添加本地视频路径到列?
                                    setPostForm({ ...postForm, images: [...postForm.images, localVideoPath] })

                                    // 清空表单
                                    setDouyinForm({ apiUrl: douyinForm.apiUrl, fieldPath: douyinForm.fieldPath, douyinUrl: '' })
                                    setShowDouyinForm(false)
                                    setToast({ show: true, type: 'success', message: '抖音视频已下载并添加到内容中' })
                                  } catch (error) {
                                    console.error('解析抖音视频失败:', error)
                                    setToast({ show: true, type: 'error', message: error instanceof Error ? error.message : '解析失败，请检查API和URL是否正确' })
                                  } finally {
                                    setParsingDouyin(false)
                                  }
                                }}
                                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                              >
                                {parsingDouyin ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    解析下载中...
                                  </>
                                ) : (
                                  '解析并下载视频'
                                )}
                              </button>
                              <p className="text-xs text-gray-400">
                                说明：填写API接口和抖音分享链接后，系统会自动解析并将视频下载到本地服务器。
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 发布选项 */}
                    <div className="flex flex-wrap items-center gap-4 py-2 border-t border-gray-100">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={postForm.is_pinned}
                          onChange={(e) => setPostForm({ ...postForm, is_pinned: e.target.checked })}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">置顶</span>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <button
                        type="button"
                        disabled={saving || uploadingImages}
                        onClick={(e) => handlePostSubmit(e, true)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? '处理?..' : '发布'}
                      </button>
                      <button
                        type="button"
                        disabled={saving || uploadingImages}
                        onClick={(e) => handlePostSubmit(e, false)}
                        className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                      >
                        {saving ? '处理?..' : '保存草稿'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPostForm(false)
                          setEditingPost(null)
                          setShowEmojiPicker(false)
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      </>
      )}
    </>
  )
}


