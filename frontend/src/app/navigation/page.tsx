/**
 * @file navigation/page.tsx
 * @description 导航列表页面 - 按分类展示导航站点，支持推荐区块
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-09
 * @updated 2025-11-10
 */

'use client';

import dynamic from 'next/dynamic';
import { ExternalLink, Search, X, Star, FolderOpen, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { getFileUrl } from '@/lib/utils';
import LazyImage from '@/components/LazyImage';
import { getSettings, getSitesGroupedByCategory, getPageText } from '@/lib/api';
import Masonry from 'react-masonry-css';
import SEOMeta from '@/components/SEOMeta';
import PageBackground from '@/components/PageBackground';
import SiteFooter from '@/components/SiteFooter'

// 动态导入弹窗组件（仅在点击时加载）
const SiteModal = dynamic(() => import('@/components/SiteModal'), { ssr: false });

interface Site {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  link: string;
}

interface Category {
  id: number | null;
  name: string;
  description?: string;
  icon?: string;
}

interface CategoryGroup {
  category: Category;
  sites: Site[];
}

interface NavigationData {
  showRecommended: boolean;
  recommended: Site[];
  categories: CategoryGroup[];
}

export default function NavigationPage() {
  const [navigationData, setNavigationData] = useState<NavigationData | null>({
    showRecommended: false,
    recommended: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // 页面文本配置 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageText, setPageText] = useState({
    title: '',
    description: '',
    browserTitle: '',
    browserSubtitle: ''
  });
  const [pageTextLoaded, setPageTextLoaded] = useState(false);
  // 默认设置（避免加载动画）
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    showTopNavbar: 'true',
    showWapSidebar: 'true'
  }
  const [settings, setSettings] = useState<any>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    fetchNavigationData(1, false);
  }, [selectedCategory, searchQuery]);

  // 设置页面标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    if (!pageText.browserTitle) return;
    const subtitle = pageText.browserSubtitle ? ` - ${pageText.browserSubtitle}` : '';
    document.title = `${pageText.browserTitle}${subtitle}`;
  }, [pageText.browserTitle, pageText.browserSubtitle]);

  const loadSettings = async () => {
    try {
      // 并行加载设置和页面文本配置
      const [settingsResponse, pageTextResponse] = await Promise.all([
        getSettings(),
        getPageText('navigation')
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
          title: pageTextResponse.data.title || '导航列表',
          description: pageTextResponse.data.description || '探索精选的网站导航',
          browserTitle: pageTextResponse.data.browserTitle || '导航列表',
          browserSubtitle: pageTextResponse.data.browserSubtitle || ''
        });
        setPageTextLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setPageTextLoaded(true); // 即使失败也标记为已加载，使用默认值
    }
  };

  const mergeNavigationData = (prev: NavigationData, next: NavigationData) => {
    const recommendedMap = new Map<number, Site>();
    prev.recommended.forEach(site => recommendedMap.set(site.id, site));
    next.recommended.forEach(site => recommendedMap.set(site.id, site));

    const categoryMap = new Map<number | null, CategoryGroup>();
    prev.categories.forEach(group => {
      categoryMap.set(group.category.id, {
        category: group.category,
        sites: [...group.sites]
      });
    });
    next.categories.forEach(group => {
      if (!categoryMap.has(group.category.id)) {
        categoryMap.set(group.category.id, {
          category: group.category,
          sites: []
        });
      }
      const existing = categoryMap.get(group.category.id)!;
      const siteMap = new Map<number, Site>();
      existing.sites.forEach(site => siteMap.set(site.id, site));
      group.sites.forEach(site => siteMap.set(site.id, site));
      existing.sites = Array.from(siteMap.values());
    });

    return {
      showRecommended: next.showRecommended,
      recommended: Array.from(recommendedMap.values()),
      categories: Array.from(categoryMap.values())
    };
  };

  const fetchNavigationData = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const params: { page?: number; limit?: number; search?: string; category_id?: number } = {
        page: pageNum,
        limit: 30
      };
      if (selectedCategory !== null) {
        params.category_id = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await getSitesGroupedByCategory(params);
      if (response.success && response.data) {
        setNavigationData(prev => {
          if (!prev || !append) return response.data;
          return mergeNavigationData(prev, response.data);
        });
        setTotalPages(response.data.pagination?.total_pages || 1);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to fetch navigation data:', error);
      setNavigationData({
        showRecommended: false,
        recommended: [],
        categories: []
      });
      setTotalPages(1);
      setPage(1);
    }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 处理网站点击
  const handleSiteClick = (site: Site) => {
    setSelectedSite(site);
    setModalOpen(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setSelectedSite(null);
    }, 300);
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 搜索过滤 - 使用 useMemo 优化
  const filterSites = useMemo(() => {
    return (sites: Site[]) => {
      if (!searchQuery.trim()) return sites;

      const query = searchQuery.toLowerCase();
      return sites.filter(site => {
        const nameMatch = site.name.toLowerCase().includes(query);
        const descriptionMatch = site.description?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    };
  }, [searchQuery]);

  // 渲染站点卡片
  const renderSiteCard = (site: Site, index: number, groupIndex?: number) => (
    <button
      key={`site-${groupIndex !== undefined ? `${groupIndex}-` : ''}${index}`}
      onClick={() => handleSiteClick(site)}
      className="group block p-3 bg-bg-secondary rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-border-primary transition-all duration-300 cursor-pointer text-left w-full animate-fade-in"
    >
      <div className="flex flex-col items-center text-center">
        {site.logo ? (
          <div className="w-10 h-10 mb-2 rounded-md overflow-hidden flex items-center justify-center">
            <LazyImage
              src={getFileUrl(site.logo)}
              alt={site.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 mb-2 rounded-md bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-base shadow-sm">
            {site.name[0]}
          </div>
        )}

        <div className="relative flex flex-col items-center mb-1">
          <h3 className="font-medium text-xs text-text-primary group-hover:text-primary-500 transition-colors">
            {site.name}
          </h3>
          <ExternalLink className="w-3 h-3 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-4 top-1/2 transform -translate-y-1/2" />
        </div>

        {site.description && (
          <p className="text-[10px] text-text-tertiary line-clamp-2 text-center leading-relaxed">
            {site.description}
          </p>
        )}
      </div>
    </button>
  );

  const isBlogTheme = settings?.themeType === 'blog';
  const showTopNavbar = settings?.showTopNavbar !== 'false';
  const showWapSidebar = settings?.showWapSidebar !== 'false';

  // 应用搜索和分类过滤 - 使用 useMemo 优化
  const filteredRecommended = useMemo(() => {
    return selectedCategory === null ? filterSites(navigationData?.recommended || []) : [];
  }, [selectedCategory, filterSites, navigationData?.recommended]);

  const filteredCategories = useMemo(() => {
    return (navigationData?.categories || [])
      .filter(group => selectedCategory === null || group.category.id === selectedCategory)
      .map(group => ({
        ...group,
        sites: filterSites(group.sites)
      })).filter(group => group.sites.length > 0);
  }, [navigationData?.categories, selectedCategory, filterSites]);

  const hasResults = filteredRecommended.length > 0 || filteredCategories.length > 0;
  const showSearchResults = searchQuery.trim() && hasResults;
  const showNoResults = searchQuery.trim() && !hasResults;

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
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              {/* 分类筛选 */}
              {!loading && navigationData && navigationData.categories.length > 0 && (
                <div className="relative md:w-48 flex-shrink-0">
                  <button
                    onClick={() => setCategoryExpanded(!categoryExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border-primary hover:bg-bg-tertiary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {selectedCategory === null ? '全部分类' : navigationData?.categories?.find(g => g.category.id === selectedCategory)?.category.name || '全部分类'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform flex-shrink-0 ${categoryExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {categoryExpanded && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary shadow-lg z-20">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setSelectedCategory(null); setCategoryExpanded(false); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedCategory === null
                              ? 'bg-primary-500 text-white shadow-md'
                              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                          }`}
                        >
                          全部
                        </button>
                        {navigationData.categories.map((group) => (
                          <button
                            key={group.category.id ?? group.category.name}
                            onClick={() => { setSelectedCategory(group.category.id); setCategoryExpanded(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedCategory === group.category.id
                                ? 'bg-primary-500 text-white shadow-md'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary border border-border-primary'
                            }`}
                          >
                            {group.category.icon && <span className="mr-1.5">{group.category.icon}</span>}
                            {group.category.name}
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
                        placeholder="搜索导航站点..."
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
                    搜索结果: 找到 {filteredRecommended.length + filteredCategories.reduce((sum, g) => sum + g.sites.length, 0)} 个相关网站
                    <span className="font-medium ml-1">"{searchQuery}"</span>
                  </span>
                </div>
              </div>
            )}

            {/* 无搜索结果提示 */}
            {showNoResults && (
              <div className="p-4 bg-bg-tertiary/50 rounded-xl border border-border-primary/50 text-center">
                <span className="text-sm text-text-secondary">
                  没有找到包含 "{searchQuery}" 的网站
                </span>
              </div>
            )}
          </div>

          {/* 加载骨架屏 */}
          {loading && (
            <Masonry
              breakpointCols={{
                default: 5,
                1024: 4,
                768: 3,
                640: 2
              }}
              className="flex -ml-3 w-auto"
              columnClassName="pl-3 bg-clip-padding"
            >
              {[...Array(15)].map((_, index) => (
                <div key={index} className="mb-3">
                  <div className="p-3 bg-bg-secondary rounded-lg shadow-sm border border-border-primary animate-pulse">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 mb-2 rounded-md bg-bg-tertiary"></div>
                      <div className="h-3 bg-bg-tertiary rounded w-16 mb-1"></div>
                      <div className="h-2 bg-bg-tertiary rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </Masonry>
          )}

          {/* 导航推荐区块 */}
          {!loading && navigationData?.showRecommended && filteredRecommended.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-1.5 mb-4">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <h2 className="text-lg font-bold text-text-primary">导航推荐</h2>
              </div>
              <Masonry
                breakpointCols={{
                  default: 5,
                  1024: 4,
                  768: 3,
                  640: 2
                }}
                className="flex -ml-3 w-auto"
                columnClassName="pl-3 bg-clip-padding"
              >
                {filteredRecommended.map((site, index) => (
                  <div key={`recommended-${site.id ?? index}`} className="mb-3">
                    {renderSiteCard(site, index)}
                  </div>
                ))}
              </Masonry>
            </section>
          )}

          {/* 分类区块 */}
          {!loading && filteredCategories.map((group, groupIndex) => (
            <section key={`category-${group.category.id ?? groupIndex}`} className="mb-8">
              <div className="mb-4">
                <div className="flex items-center gap-1.5">
                  {group.category.icon && (
                    <span className="text-lg">{group.category.icon}</span>
                  )}
                  <h2 className="text-lg font-bold text-text-primary">
                    {group.category.name}
                  </h2>
                </div>
                {group.category.description && (
                  <p className="text-xs text-text-secondary mt-1">
                    {group.category.description}
                  </p>
                )}
              </div>
              <Masonry
                breakpointCols={{
                  default: 5,
                  1024: 4,
                  768: 3,
                  640: 2
                }}
                className="flex -ml-3 w-auto"
                columnClassName="pl-3 bg-clip-padding"
              >
                {group.sites.map((site, index) => (
                  <div key={`site-${group.category.id ?? groupIndex}-${site.id ?? index}`} className="mb-3">
                    {renderSiteCard(site, index, groupIndex)}
                  </div>
                ))}
              </Masonry>
            </section>
          ))}

          {!loading && totalPages > page && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNavigationData(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-2 rounded-full bg-bg-secondary border border-border-primary text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}

          {/* 空状态 */}
          {!loading && !navigationData?.showRecommended && (navigationData?.categories?.length || 0) === 0 && (
            <div className="text-center py-16 text-text-tertiary">
              <p className="text-lg">暂无导航数据</p>
              <p className="text-sm mt-2">请在后台添加导航分类和站点</p>
            </div>
          )}
        </div>

        {/* 页脚版权 */}
        <SiteFooter className="mt-auto" />
      </div>

      {/* 网站信息弹窗 */}
      <SiteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        site={selectedSite}
        logoUrl={selectedSite?.logo ? getFileUrl(selectedSite.logo) : undefined}
      />
    </main>
  );
}
