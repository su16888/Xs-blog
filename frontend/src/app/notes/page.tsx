/**
 * @file notes/page.tsx
 * @description 全部笔记列表页面 - 显示所有已发布的笔记
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-09
 */

'use client';

import React from 'react';
import { Search, X, Tag, FolderOpen, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getSettings, getPageText } from '@/lib/api';
import { stripMarkdown } from '@/lib/markdown';
import SEOMeta from '@/components/SEOMeta';
import PageBackground from '@/components/PageBackground';
import SiteFooter from '@/components/SiteFooter';
import NoteCard, { Note } from '@/components/NoteCard';

interface NoteCategory {
  id: number;
  name: string;
  type?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  parent_id?: number;
  created_at?: string;
  updated_at?: string;
}

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [tagExpanded, setTagExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  // 监听全局搜索事件（来自手机端导航栏）
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent).detail || '');
    };

    window.addEventListener('globalSearch', handleGlobalSearch);
    return () => window.removeEventListener('globalSearch', handleGlobalSearch);
  }, []);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  // 检测屏幕尺寸
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 默认设置（避免加载动画）
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    defaultNoteCover: '',
    avatarShape: 'circle',
    showTopNavbar: 'true',
    showWapSidebar: 'true'
  }
  const [settings, setSettings] = useState<any>(defaultSettings);
  // 页面文本配置 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageText, setPageText] = useState({
    title: '',
    description: '',
    browserTitle: '',
    browserSubtitle: ''
  });
  const [pageTextLoaded, setPageTextLoaded] = useState(false);

  // 从 URL 参数初始化筛选条件
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const tagParam = searchParams.get('tag');

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (tagParam) {
      setSelectedTag(tagParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotes();
    fetchCategories();
    fetchTags();
    loadSettings();
  }, [page, selectedCategory, selectedTag]);

  // 设置页面标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    // 只有在 browserTitle 有值时才设置标题，避免覆盖 layout 中设置的标题
    if (!pageText.browserTitle) return;

    let title = pageText.browserTitle;

    if (selectedCategory !== 'all') {
      title = `${selectedCategory} - ${pageText.browserTitle}`;
    } else if (selectedTag !== 'all') {
      title = `${selectedTag} - ${pageText.browserTitle}`;
    }

    // 添加副标题
    if (pageText.browserSubtitle) {
      title = `${title} - ${pageText.browserSubtitle}`;
    }

    document.title = title;
  }, [selectedCategory, selectedTag, pageText.browserTitle, pageText.browserSubtitle]);

  const loadSettings = async () => {
    try {
      // 并行加载设置和页面文本配置
      const [settingsResponse, pageTextResponse] = await Promise.all([
        getSettings(),
        getPageText('notes')
      ]);

      if (settingsResponse.success && settingsResponse.data) {
        const settingsObj: any = {};
        settingsResponse.data.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value;
        });
        setSettings({
          themeType: settingsObj.themeType || 'default',
          footerCopyright: settingsObj.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
          defaultNoteCover: settingsObj.defaultNoteCover || '',
          avatarShape: settingsObj.avatarShape || 'circle',
          showTopNavbar: settingsObj.showTopNavbar || 'true',
          showWapSidebar: settingsObj.showWapSidebar || 'true'
        });
      }

      // 从新的 page_texts 表加载页面文本配置
      if (pageTextResponse.success && pageTextResponse.data) {
        setPageText({
          title: pageTextResponse.data.title || '全部笔记',
          description: pageTextResponse.data.description || '探索所有已发布的笔记内容',
          browserTitle: pageTextResponse.data.browserTitle || '全部笔记',
          browserSubtitle: pageTextResponse.data.browserSubtitle || ''
        });
        setPageTextLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setPageTextLoaded(true); // 即使失败也标记为已加载，使用默认值
    }
  };

  const fetchNotes = async () => {
    try {
      const params: any = {
        is_published: true,
        page,
        limit: 12,
      };

      // 添加筛选参数
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (selectedTag !== 'all') {
        params.tag = selectedTag;
      }

      const response = await api.get('/notes', { params });
      const data = response.data?.data;
      const notesArray = Array.isArray(data?.notes) ? data.notes : [];
      setNotes(notesArray);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/notes/categories/list');
      const data = response.data?.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get('/notes/tags/stats');
      const data = response.data?.data;
      setTags(Array.isArray(data) ? data.map((tag: any) => tag.name) : []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]);
    }
  };

  const handleNoteClick = useCallback((note: Note) => {
    router.push(`/note/${note.id}`);
  }, [router]);

  const handleTagClick = useCallback((tagName: string) => {
    setSelectedTag(tagName);
    setPage(1);
  }, []);

  const handleCategoryClick = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
    setPage(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 基于搜索查询过滤笔记 - 使用 useMemo 优化
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const contentMatch = stripMarkdown(note.content).toLowerCase().includes(query);
      const categoryMatch = note.category?.toLowerCase().includes(query);
      const tagsMatch = note.Tags?.some(tag => tag.name.toLowerCase().includes(query)) ||
                       note.tags?.toLowerCase().includes(query);

      return titleMatch || contentMatch || categoryMatch || tagsMatch;
    });
  }, [notes, searchQuery]);

  // 固定为2列布局
  const showCover = true; // 始终显示封面（有封面显示图片，无封面显示占位符）
  const columns = 2;

  // 是否使用横向布局（封面在左侧）
  const useHorizontalLayout = () => {
    if (isDesktop && columns === 2) return true; // 2列且桌面端：使用横向布局
    return false; // 其他情况：网格模式，使用纵向布局
  };

  // 是否显示摘要
  const shouldShowSummary = () => {
    if (!isDesktop && columns >= 2) return false; // 手机端2列不显示
    // 电脑端2列横向布局显示摘要
    return true;
  };

  const isHorizontal = useHorizontalLayout();
  // 固定显示标签和分类（电脑端显示，手机端不显示，由 NoteCard 内部控制）
  const showNoteTags = true;
  const showNoteCategories = true;

  const showSummary = shouldShowSummary();

  const isBlogTheme = settings?.themeType === 'blog';
  const showTopNavbar = settings?.showTopNavbar !== 'false';
  const showWapSidebar = settings?.showWapSidebar !== 'false';

  // 显示搜索结果的提示
  const showSearchResults = searchQuery.trim() && filteredNotes.length > 0;
  const showNoResults = searchQuery.trim() && filteredNotes.length === 0;

  return (
    <main className="min-h-screen bg-bg-primary relative flex flex-col hide-scrollbar">
      <SEOMeta />
      {/* 背景图片 */}
      <PageBackground />

      {/* 内容区域 */}
      <div className="relative z-0 flex-1 flex flex-col">
        {/* 给导航栏留出空间 */}
        <div className="h-16"></div>

        <div className="container mx-auto px-4 max-w-6xl py-8">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">{pageText.title}</h1>
            <p className="text-text-secondary">{pageText.description}</p>
          </div>

          {/* 筛选器和搜索框 */}
          <div className="mb-6">
            {/* 电脑端：分类、标签、搜索框在一排 */}
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              {/* 分类筛选 */}
              {categories.length > 0 && (
                <div className="relative md:w-48 flex-shrink-0">
                  <button
                    onClick={() => { setCategoryExpanded(!categoryExpanded); setTagExpanded(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border-primary hover:bg-bg-tertiary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {selectedCategory === 'all' ? '全部分类' : selectedCategory}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform flex-shrink-0 ${categoryExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {categoryExpanded && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary shadow-lg z-20">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setSelectedCategory('all'); setPage(1); setCategoryExpanded(false); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedCategory === 'all'
                              ? 'bg-primary-500 text-white shadow-md'
                              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                          }`}
                        >
                          全部
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id || category.name}
                            onClick={() => { setSelectedCategory(category.name); setPage(1); setCategoryExpanded(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedCategory === category.name
                                ? 'bg-primary-500 text-white shadow-md'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                            }`}
                          >
                            {category.icon && <span className="mr-1.5">{category.icon}</span>}
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 标签筛选 */}
              {tags.length > 0 && (
                <div className="relative md:w-48 flex-shrink-0">
                  <button
                    onClick={() => { setTagExpanded(!tagExpanded); setCategoryExpanded(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border-primary hover:bg-bg-tertiary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {selectedTag === 'all' ? '全部标签' : selectedTag}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform flex-shrink-0 ${tagExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {tagExpanded && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary shadow-lg z-20">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setSelectedTag('all'); setPage(1); setTagExpanded(false); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTag === 'all'
                              ? 'bg-primary-500 text-white shadow-md'
                              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                          }`}
                        >
                          全部
                        </button>
                        {tags.slice(0, 10).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => { setSelectedTag(tag); setPage(1); setTagExpanded(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedTag === tag
                                ? 'bg-primary-500 text-white shadow-md'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 电脑端搜索按钮/搜索框 */}
              <div className="hidden md:flex items-center">
                {searchExpanded ? (
                  <div className="w-64">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 top-0 bottom-0 my-auto w-4 h-4 text-text-tertiary pointer-events-none" />
                      <input
                        type="text"
                        placeholder="搜索笔记..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-[46px] pl-9 pr-9 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSearchExpanded(false); }}
                        className="absolute right-3 top-0 bottom-0 my-auto w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                        aria-label="关闭搜索"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearchExpanded(true)}
                    className="flex items-center justify-center w-[46px] h-[46px] bg-bg-secondary border border-border-primary rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
                    aria-label="搜索"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* 搜索结果显示 */}
            {showSearchResults && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--info-text)' }}>
                    搜索结果: 找到 {filteredNotes.length} 条相关笔记
                    <span className="font-medium ml-1">"{searchQuery}"</span>
                  </span>
                </div>
              </div>
            )}

            {/* 无搜索结果提示 */}
            {showNoResults && (
              <div className="p-4 bg-bg-tertiary rounded-xl border border-border-primary text-center">
                <span className="text-sm text-text-tertiary">
                  没有找到包含 "{searchQuery}" 的笔记
                </span>
              </div>
            )}
          </div>

          {/* 笔记列表 */}
          {filteredNotes.length > 0 ? (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
              }}
            >
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isHorizontal={isHorizontal}
                  imagePosition="left"
                  isDesktop={isDesktop}
                  columns={columns}
                  showCover={showCover}
                  defaultCover={settings?.defaultNoteCover || ''}
                  showSummary={showSummary}
                  showNoteTags={showNoteTags}
                  showNoteCategories={showNoteCategories}
                  onOpen={handleNoteClick}
                  onTagClick={handleTagClick}
                  onCategoryClick={handleCategoryClick}
                  isAdmin={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-text-tertiary">
              <p className="text-lg">暂无笔记</p>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-8 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border border-border-primary"
              >
                上一页
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  const isActive = pageNum === page;
                  const btnClass = 'w-10 h-10 rounded-lg transition-all text-sm border ' + (isActive ? 'bg-primary-500 text-white border-primary-500' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-primary');

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={btnClass}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border border-border-primary"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        {/* 页脚版权 */}
        <SiteFooter className="mt-auto" />
      </div>

    </main>
  );
}
