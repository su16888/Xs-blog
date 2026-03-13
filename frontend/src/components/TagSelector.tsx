'use client'

import { useState, useEffect, useRef } from 'react'
import { getTags, createTag } from '@/lib/api'

interface Tag {
  id: number
  name: string
  color: string
  description?: string
  category?: string
}

interface TagSelectorProps {
  selectedTags: number[]
  onChange: (tagIds: number[]) => void
  className?: string
}

export default function TagSelector({ selectedTags, onChange, className = '' }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    // 点击外部关闭下拉框
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await getTags()
      setAllTags(response.data)
    } catch (error) {
      console.error('获取标签失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId))
    } else {
      onChange([...selectedTags, tagId])
    }
  }

  const handleRemoveTag = (tagId: number) => {
    onChange(selectedTags.filter(id => id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!searchTerm.trim()) return

    // 检查是否已存在
    const existingTag = allTags.find(tag =>
      tag.name.toLowerCase() === searchTerm.trim().toLowerCase()
    )

    if (existingTag) {
      // 如果已存在，直接添加
      if (!selectedTags.includes(existingTag.id)) {
        onChange([...selectedTags, existingTag.id])
      }
      setSearchTerm('')
      setShowDropdown(false)
      return
    }

    // 创建新标签
    try {
      const response = await createTag({
        name: searchTerm.trim(),
        color: '#3b82f6',
        sort_order: 0
      })

      const newTag = response.data
      setAllTags([...allTags, newTag])
      onChange([...selectedTags, newTag.id])
      setSearchTerm('')
      setShowDropdown(false)
    } catch (error) {
      console.error('创建标签失败:', error)
      alert('创建标签失败')
    }
  }

  const getSelectedTagsData = () => {
    return allTags.filter(tag => selectedTags.includes(tag.id))
  }

  const getFilteredTags = () => {
    if (!searchTerm) return allTags

    return allTags.filter(tag =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  const filteredTags = getFilteredTags()
  const selectedTagsData = getSelectedTagsData()
  const showCreateOption = searchTerm && !filteredTags.find(tag =>
    tag.name.toLowerCase() === searchTerm.toLowerCase()
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 已选择的标签 */}
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedTagsData.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-2 hover:text-gray-200"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* 搜索输入框 */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="搜索或创建标签..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-300 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 下拉列表 */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* 创建新标签选项 */}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                >
                  <span className="text-blue-600 dark:text-blue-400">
                    + 创建标签 "{searchTerm}"
                  </span>
                </button>
              )}

              {/* 标签列表 */}
              {filteredTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? '未找到匹配的标签' : '暂无标签'}
                </div>
              ) : (
                filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-gray-900 dark:text-gray-100">{tag.name}</span>
                      {tag.category && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({tag.category})
                        </span>
                      )}
                    </div>
                    {selectedTags.includes(tag.id) && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* 帮助文本 */}
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {selectedTags.length} 个标签已选择
      </p>
    </div>
  )
}
