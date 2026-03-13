'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

export default function BlogSearch() {
  const [noteSearch, setNoteSearch] = useState('')
  const [navSearch, setNavSearch] = useState('')

  const handleNoteSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 这里可以添加笔记搜索逻辑
    console.log('搜索笔记:', noteSearch)
    // 实际实现时，这里会调用笔记搜索API
  }

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 这里可以添加导航搜索逻辑
    console.log('搜索导航:', navSearch)
    // 实际实现时，这里会调用导航搜索API
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 笔记搜索 */}
        <div className="flex-1">
          <form onSubmit={handleNoteSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-300 transition-colors"
            />
          </form>
        </div>

        {/* 导航搜索 */}
        <div className="flex-1">
          <form onSubmit={handleNavSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="搜索导航..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-300 transition-colors"
            />
          </form>
        </div>
      </div>

      {/* 搜索提示 */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="bg-gray-100 px-2 py-1 rounded">按标题搜索</span>
        <span className="bg-gray-100 px-2 py-1 rounded">按内容搜索</span>
        <span className="bg-gray-100 px-2 py-1 rounded">按标签搜索</span>
      </div>
    </div>
  )
}