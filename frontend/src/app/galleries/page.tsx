/**
 * @file galleries/page.tsx
 * @description 图库列表页面 - 按分类展示图册,支持搜索和密码保护
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 */

'use client';

import { Search, X, Lock, Image as ImageIcon, FolderOpen, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { getFileUrl, getThumbnailUrl } from '@/lib/utils';
import SiteFooter from '@/components/SiteFooter'
import { getSettings, getGalleries, getGalleryCategories, getPageText } from '@/lib/api';
import SEOMeta from '@/components/SEOMeta';
import PageBackground from '@/components/PageBackground';

// 动态导入 GalleryViewer（仅在打开时加载）
const GalleryViewer = dynamic(() => import('@/components/GalleryViewer'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
  </div>
});

interface Gallery {
  id: number;
  title: string;
  description?: string;
  cover_image?: string;
  image_count: number;
  category_id?: number;
  created_at: string;
  hasPassword?: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<number | null>(null);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allGalleries, setAllGalleries] = useState<Gallery[]>([]); // 存储所有数据

  // 默认设置
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    showTopNavbar: 'true',
    showWapSidebar: 'true'
  };
  const [settings, setSettings] = useState<any>(defaultSettings);
  // 页面文本配置 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageText, setPageText] = useState({
    title: '',
    description: '',
    browserTitle: '',
    browserSubtitle: ''
  });
  const [pageTextLoaded, setPageTextLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 设置页面标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    if (!pageText.browserTitle) return;
    let title = pageText.browserTitle;
    if (pageText.browserSubtitle) {
      title = `${title} - ${pageText.browserSubtitle}`;
    }
    document.title = title;
  }, [pageText.browserTitle, pageText.browserSubtitle]);

  const loadData = async () => {
    setPage(1);
    try {
      await Promise.all([loadSettings(), fetchGalleries(1, true), fetchCategories()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // 并行加载设置和页面文本配置
      const [settingsResponse, pageTextResponse] = await Promise.all([
        getSettings(),
        getPageText('galleries')
      ]);

      if (settingsResponse.success && settingsResponse.data) {
        const settingsObj: any = {};
        settingsResponse.data.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value;
        });
        setSettings({
          themeType: settingsObj.themeType || 'default',
          footerCopyright: settingsObj.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
          showTopNavbar: settingsObj.showTopNavbar || 'true',
          showWapSidebar: settingsObj.showWapSidebar || 'true'
        });
      }

      // 从新的 page_texts 表加载页面文本配置
      if (pageTextResponse.success && pageTextResponse.data) {
        setPageText({
          title: pageTextResponse.data.title || '图库列表',
          description: pageTextResponse.data.description || '探索精彩的图片合集',
          browserTitle: pageTextResponse.data.browserTitle || '图库列表',
          browserSubtitle: pageTextResponse.data.browserSubtitle || ''
        });
        setPageTextLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setPageTextLoaded(true); // 即使失败也标记为已加载，使用默认值
    }
  };

  const fetchGalleries = async (pageNum: number = page, reset: boolean = false, params?: { category_id?: number; search?: string }) => {
    try {
      const response = await getGalleries(params);
      if (response.success && response.data) {
        const allData = response.data;

        if (reset) {
          setAllGalleries(allData);
        }

        // 客户端分页
        const startIndex = (pageNum - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = allData.slice(startIndex, endIndex);

        if (reset) {
          setGalleries(pageData);
        } else {
          setGalleries(prev => [...prev, ...pageData]);
        }

        setHasMore(endIndex < allData.length);
      }
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
      setGalleries([]);
    }
  };

  const loadMoreGalleries = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      // 使用已加载的所有数据进行分页
      const startIndex = (nextPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = allGalleries.slice(startIndex, endIndex);

      setGalleries(prev => [...prev, ...pageData]);
      setHasMore(endIndex < allGalleries.length);
    } catch (error) {
      console.error('Failed to load more galleries:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getGalleryCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  // 处理图册点击
  const handleGalleryClick = (gallery: Gallery) => {
    setSelectedGalleryId(gallery.id);
    setViewerOpen(true);
  };

  // 关闭查看器
  const handleCloseViewer = () => {
    setViewerOpen(false);
    setTimeout(() => {
      setSelectedGalleryId(null);
    }, 300);
  };

  // 处理搜索 - 前端过滤实现实时搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // 基于搜索查询过滤图册 - 使用 useMemo 优化
  const filteredGalleries = useMemo(() => {
    return galleries.filter((gallery) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const titleMatch = gallery.title?.toLowerCase().includes(query);
      const descMatch = gallery.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }, [galleries, searchQuery]);

  // 显示搜索结果的提示
  const showSearchResults = searchQuery.trim() && filteredGalleries.length > 0;
  const showNoResults = searchQuery.trim() && filteredGalleries.length === 0;

  // 处理分类筛选
  const handleCategoryFilter = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setPage(1);
    fetchGalleries(1, true, {
      search: searchQuery || undefined,
      category_id: categoryId || undefined
    });
  };

  // 渲染图册卡片
  const renderGalleryCard = (gallery: Gallery, index: number) => {
    const hasPassword = gallery.hasPassword;

    return (
      <button
        key={`gallery-${gallery.id}`}
        onClick={() => handleGalleryClick(gallery)}
        className="group block bg-bg-secondary rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-border-primary transition-all duration-300 cursor-pointer overflow-hidden w-full animate-fade-in"
      >
        {/* 1:1 正方形封面 */}
        <div className="relative w-full pt-[100%] bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
          {gallery.cover_image ? (
            <Image
              src={getThumbnailUrl(getFileUrl(gallery.cover_image))}
              alt={gallery.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className={`object-cover transition-transform duration-300 ${
                hasPassword ? 'blur-xl scale-110' : 'group-hover:scale-105'
              }`}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-primary-400" />
            </div>
          )}

          {/* 密码标识 */}
          {hasPassword && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
          )}

          {/* 图片数量 */}
          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-medium">
            {gallery.image_count} 张
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="p-3 text-left">
          <h3 className="font-medium text-sm text-text-primary group-hover:text-primary-500 transition-colors line-clamp-1 mb-1">
            {gallery.title}
          </h3>
          {gallery.description && (
            <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
              {gallery.description}
            </p>
          )}
        </div>
      </button>
    );
  };

  const isBlogTheme = settings?.themeType === 'blog';
  const showTopNavbar = settings?.showTopNavbar !== 'false';
  const showWapSidebar = settings?.showWapSidebar !== 'false';

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
            <div className="flex flex-col md:flex-row gap-3">
              {/* 分类筛选 */}
              {categories.length > 0 && (
                <div className="relative md:w-48 flex-shrink-0">
                  <button
                    onClick={() => setCategoryExpanded(!categoryExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border-primary hover:bg-bg-tertiary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {selectedCategory === null ? '全部分类' : categories.find(c => c.id === selectedCategory)?.name || '全部分类'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform flex-shrink-0 ${categoryExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {categoryExpanded && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary shadow-lg z-20">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { handleCategoryFilter(null); setCategoryExpanded(false); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedCategory === null
                              ? 'bg-primary-500 text-white shadow-md'
                              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                          }`}
                        >
                          全部
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => { handleCategoryFilter(category.id); setCategoryExpanded(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedCategory === category.id
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

              {/* 电脑端搜索按钮/搜索框 */}
              <div className="hidden md:flex items-center">
                {searchExpanded ? (
                  <div className="w-64">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 top-0 bottom-0 my-auto w-4 h-4 text-text-tertiary pointer-events-none" />
                      <input
                        type="text"
                        placeholder="搜索图册..."
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
              <div className="mt-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--info-text)' }}>
                    搜索结果: 找到 {filteredGalleries.length} 个相关图册
                    <span className="font-medium ml-1">"{searchQuery}"</span>
                  </span>
                </div>
              </div>
            )}

            {/* 无搜索结果提示 */}
            {showNoResults && (
              <div className="mt-3 p-4 bg-bg-tertiary rounded-xl border border-border-primary text-center">
                <span className="text-sm text-text-tertiary">
                  没有找到包含 "{searchQuery}" 的图册
                </span>
              </div>
            )}
          </div>

          {/* 图册列表 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, index) => (
                <div key={index}>
                  <div className="bg-bg-secondary rounded-lg shadow-sm border border-border-primary overflow-hidden animate-pulse">
                    <div className="w-full pt-[100%] bg-bg-tertiary"></div>
                    <div className="p-3">
                      <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-bg-tertiary rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGalleries.length === 0 && !searchQuery.trim() ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-tertiary">暂无图册</p>
            </div>
          ) : filteredGalleries.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredGalleries.map((gallery, index) => (
                  <div key={gallery.id}>
                    {renderGalleryCard(gallery, index)}
                  </div>
                ))}
              </div>

              {/* 加载更多按钮 */}
              {hasMore && !searchQuery.trim() && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMoreGalleries}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </span>
                    ) : (
                      '加载更多'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* 页脚版权 */}
        <SiteFooter className="mt-auto" />
      </div>

      {/* 图片查看器 */}
      {selectedGalleryId && (
        <GalleryViewer
          galleryId={selectedGalleryId}
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </main>
  );
}
