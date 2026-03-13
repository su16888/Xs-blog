'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabbedSectionProps {
  defaultTab?: 'notes' | 'sites';
  notesContent: React.ReactNode;
  sitesContent: React.ReactNode;
}

export default function TabbedSection({ defaultTab = 'notes', notesContent, sitesContent }: TabbedSectionProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'sites'>(defaultTab);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
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

  return (
    <div className="relative">
      {/* 标签页头部 */}
      <div className="flex items-center justify-center mb-6 gap-3">
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
