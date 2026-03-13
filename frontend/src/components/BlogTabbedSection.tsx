'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

interface BlogTabbedSectionProps {
  defaultTab?: 'notes' | 'sites';
  notesContent: React.ReactNode;
  sitesContent: React.ReactNode;
  onSearch?: (query: string, activeTab: 'notes' | 'sites') => void;
}

export default function BlogTabbedSection({ defaultTab = 'notes', notesContent, sitesContent, onSearch }: BlogTabbedSectionProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'sites'>(defaultTab);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && activeTab === 'notes') {
      setActiveTab('sites');
    }
    if (isRightSwipe && activeTab === 'sites') {
      setActiveTab('notes');
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // 切换到上一个标签
  const gotoPrev = () => {
    if (activeTab === 'sites') {
      setActiveTab('notes');
    }
  };

  // 切换到下一个标签
  const gotoNext = () => {
    if (activeTab === 'notes') {
      setActiveTab('sites');
    }
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 调用搜索回调
    if (onSearch) {
      onSearch(searchQuery, activeTab);
    }
  };

  // 清空搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('', activeTab);
    }
  };

  return (
    <div className="relative">
      {/* 标签页头部 */}
      <div className="mb-6">
        {/* 手机端：标签按钮和箭头居中 */}
        <div className="flex md:hidden items-center justify-center gap-3 mb-4">
          {/* 左箭头 */}
          <button
            onClick={gotoPrev}
            disabled={activeTab === 'notes'}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === 'notes'
                ? 'opacity-20 cursor-not-allowed'
                : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
            }`}
            aria-label="上一页"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" />
          </button>

          {/* 标签按钮 */}
          <div className="flex gap-2 bg-bg-secondary rounded-full p-1 border border-border-primary">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'notes'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              文字碎片
            </button>
            <button
              onClick={() => setActiveTab('sites')}
              className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'sites'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              常用导航
            </button>
          </div>

          {/* 右箭头 */}
          <button
            onClick={gotoNext}
            disabled={activeTab === 'sites'}
            className={`p-1.5 rounded-lg transition-all ${
              activeTab === 'sites'
                ? 'opacity-20 cursor-not-allowed'
                : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
            }`}
            aria-label="下一页"
          >
            <ChevronRight className="w-5 h-5 text-text-primary" />
          </button>
        </div>

        {/* 桌面端：标签按钮和箭头在左侧，搜索框在右侧 */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* 左侧：标签按钮和箭头 */}
          <div className="flex items-center gap-3">
            {/* 左箭头 */}
            <button
              onClick={gotoPrev}
              disabled={activeTab === 'notes'}
              className={`p-1.5 rounded-lg transition-all ${
                activeTab === 'notes'
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
              }`}
              aria-label="上一页"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary" />
            </button>

            {/* 标签按钮 */}
            <div className="flex gap-2 bg-bg-secondary rounded-full p-1 border border-border-primary">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  activeTab === 'notes'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                文字碎片
              </button>
              <button
                onClick={() => setActiveTab('sites')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  activeTab === 'sites'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                常用导航
              </button>
            </div>

            {/* 右箭头 */}
            <button
              onClick={gotoNext}
              disabled={activeTab === 'sites'}
              className={`p-1.5 rounded-lg transition-all ${
                activeTab === 'sites'
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
              }`}
              aria-label="下一页"
            >
              <ChevronRight className="w-5 h-5 text-text-primary" />
            </button>
          </div>

          {/* 右侧：搜索框 */}
          <div className="flex items-center gap-2">
            {/* 桌面端搜索框 */}
            <form onSubmit={handleSearch} className="w-72">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  id="desktop-tabbed-search"
                  name="search"
                  placeholder={`搜索${activeTab === 'notes' ? '文字碎片' : '常用导航'}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    const newQuery = e.target.value
                    setSearchQuery(newQuery)
                    // 实时触发搜索
                    if (onSearch) {
                      onSearch(newQuery, activeTab)
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-0 focus:border-border-primary"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label="清空搜索"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'notes' ? (
          <div key="notes" className="animate-fade-in">
            {notesContent}
          </div>
        ) : (
          <div key="sites" className="animate-fade-in">
            {sitesContent}
          </div>
        )}
      </div>

      {/* 指示器 */}
      <div className="flex justify-center gap-1.5 mt-5">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            activeTab === 'notes' ? 'bg-primary-500 w-6' : 'bg-border-secondary'
          }`}
        />
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            activeTab === 'sites' ? 'bg-primary-500 w-6' : 'bg-border-secondary'
          }`}
        />
      </div>
    </div>
  );
}