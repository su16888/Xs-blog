'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface TabConfig {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface DynamicTabbedSectionProps {
  tabs: TabConfig[]; // 支持1-2个标签
  defaultTab?: string;
  onSearch?: (query: string, activeTab?: string) => void;
  searchPlaceholder?: string;
  onTabChange?: (tabKey: string) => void; // 新增：通知父组件标签页切换
  externalSearchQuery?: string; // 新增：外部搜索词（来自BlogNav）
  themeTypeOverride?: string;
}

export default function DynamicTabbedSection({ tabs, defaultTab, onSearch, searchPlaceholder = '搜索内容...', onTabChange, externalSearchQuery = '', themeTypeOverride }: DynamicTabbedSectionProps) {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.key || '');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const tab1 = tabs[0];
  const tab2 = tabs[1];
  const hasTwoTabs = tabs.length === 2;

  // 判断当前主题类型
  const sessionThemeType = typeof window !== 'undefined' ? sessionStorage.getItem('userThemeType') : null;
  const backendThemeType = settings.themeType || 'default';
  const enableAvatarThemeSwitch = settings.enableAvatarThemeSwitch === 'true';
  const resolvedThemeType = themeTypeOverride
    || (backendThemeType === 'default' && enableAvatarThemeSwitch && sessionThemeType ? sessionThemeType : backendThemeType);
  const isDefaultTheme = resolvedThemeType === 'default';

  // 当 defaultTab 改变时，更新 activeTab
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // 当 activeTab 改变时，通知父组件（但不清空搜索）
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab]);

  // 同步外部搜索词到内部状态
  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  // 搜索处理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query, activeTab);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('', activeTab);
    }
  };

  // 切换到上一个标签
  const gotoPrev = () => {
    if (hasTwoTabs && activeTab === tab2?.key) {
      setActiveTab(tab1.key);
    }
  };

  // 切换到下一个标签
  const gotoNext = () => {
    if (hasTwoTabs && activeTab === tab1.key && tab2) {
      setActiveTab(tab2.key);
    }
  };

  return (
    <div className="relative">
      {/* 标签页头部 - PC端：左侧滑块，右侧搜索框；手机端：只显示滑块 */}
      <div className={`flex flex-col md:flex-row items-center md:items-center md:justify-between gap-4 ${isDefaultTheme ? 'mb-0 md:mb-6' : 'mb-6'}`}>
        {/* 标签切换控件 - 居中或左侧 */}
        {/* 单内容区时隐藏滑块，只在PC端移动搜索框到此处 */}
        {!hasTwoTabs && onSearch ? (
          // 单内容区：PC端显示搜索框WAP端不显示
          <div className="relative w-72 flex-shrink-0 hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 bg-bg-secondary border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
        ) : (
          <div className="flex items-center gap-3 mx-auto md:mx-0 md:flex-shrink-0">
            {/* 左箭头 - 只在有两个标签时显示 */}
            {hasTwoTabs && (
              <button
                onClick={gotoPrev}
                disabled={activeTab === tab1.key}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTab === tab1.key
                    ? 'opacity-20 cursor-not-allowed'
                    : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
                }`}
                aria-label="上一页"
              >
                <ChevronLeft className="w-5 h-5 text-text-primary" />
              </button>
            )}

            {/* 标签按钮 */}
            <div className="flex gap-2 bg-bg-secondary rounded-full p-1 border border-border-primary">
              <button
                onClick={() => setActiveTab(tab1.key)}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  activeTab === tab1.key
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab1.label}
              </button>
              {tab2 && (
                <button
                  onClick={() => setActiveTab(tab2.key)}
                  className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                    activeTab === tab2.key
                      ? 'bg-primary-500 text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab2.label}
                </button>
              )}
            </div>

            {/* 右箭头 - 只在有两个标签时显示 */}
            {hasTwoTabs && (
              <button
                onClick={gotoNext}
                disabled={activeTab === tab2?.key}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTab === tab2?.key
                    ? 'opacity-20 cursor-not-allowed'
                    : 'hover:bg-bg-secondary opacity-60 hover:opacity-100'
                }`}
                aria-label="下一页"
              >
                <ChevronRight className="w-5 h-5 text-text-primary" />
              </button>
            )}
          </div>
        )}

        {/* 搜索框 - 只在PC端显示，放在右侧；只在双内容区时显示 */}
        {hasTwoTabs && onSearch && (
          <div className="relative w-72 flex-shrink-0 hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 bg-bg-secondary border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
        )}
      </div>

      {/* 内容区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
      >
        {activeTab === tab1.key ? (
          <div key={tab1.key} className="animate-fade-in">
            {tab1.content}
          </div>
        ) : tab2 && activeTab === tab2.key ? (
          <div key={tab2.key} className="animate-fade-in">
            {tab2.content}
          </div>
        ) : null}
      </div>

      {/* 指示器 - 只在有两个标签时显示 */}
      {hasTwoTabs && (
        <div className="flex justify-center gap-1.5 mt-5">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              activeTab === tab1.key ? 'bg-primary-500 w-6' : 'bg-border-secondary'
            }`}
          />
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              activeTab === tab2?.key ? 'bg-primary-500 w-6' : 'bg-border-secondary'
            }`}
          />
        </div>
      )}
    </div>
  );
}
