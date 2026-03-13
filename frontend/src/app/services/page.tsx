/**
 * @file services/page.tsx
 * @description 服务业务列表页面 - 显示所有可见的服务
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 */

'use client';

import { Search, X, ShoppingBag, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getServices, getServiceCategories, getSettings, getImageUrl, getPageText } from '@/lib/api';
import { getThumbnailUrl } from '@/lib/utils';
import SEOMeta from '@/components/SEOMeta';
import PageBackground from '@/components/PageBackground';
import SiteFooter from '@/components/SiteFooter'

type ProductType = 'card' | 'virtual' | 'physical'

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  card: '卡密商品',
  virtual: '虚拟商品',
  physical: '实物商品'
}

interface Service {
  id: number;
  name: string;
  description: string;
  content: string;
  cover_image: string;
  price: string;
  product_type?: ProductType;
  category_id?: number;
  is_visible: boolean;
  is_recommended: boolean;
  sort_order: number;
  show_order_button: boolean;
  order_button_text?: string;
  order_button_url?: string;
  order_page_slug?: string | null;
  created_at: string;
  updated_at: string;
  Category?: {
    id: number;
    name: string;
    icon?: string;
  };
  specifications?: Array<{
    id: number;
    spec_name: string;
    spec_value: string;
    sort_order: number;
  }>;
}

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_visible: boolean;
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(20);
  // 监听全局搜索事件（来自手机端导航栏）
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent).detail || '');
    };

    window.addEventListener('globalSearch', handleGlobalSearch);
    return () => window.removeEventListener('globalSearch', handleGlobalSearch);
  }, []);
  // 页面文本配置 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageText, setPageText] = useState({
    title: '',
    description: '',
    browserTitle: '',
    browserSubtitle: ''
  });
  const [pageTextLoaded, setPageTextLoaded] = useState(false);

  // 默认设置
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    showTopNavbar: 'true',
    showWapSidebar: 'true',
    siteTitle: 'Xs-Blog'
  };
  const [settings, setSettings] = useState<any>(defaultSettings);

  useEffect(() => {
    fetchCategories();
    loadSettings();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, page]);

  // 设置页面标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    if (!pageText.browserTitle) return;

    let title = pageText.browserTitle;

    if (selectedCategory && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategory);
      if (category) {
        title = `${category.name} - ${pageText.browserTitle}`;
      }
    }

    // 添加副标题
    if (pageText.browserSubtitle) {
      title = `${title} - ${pageText.browserSubtitle}`;
    }

    document.title = title;
  }, [selectedCategory, categories, pageText.browserTitle, pageText.browserSubtitle]);

  const loadSettings = async () => {
    try {
      // 并行加载设置和页面文本配置
      const [settingsResponse, pageTextResponse] = await Promise.all([
        getSettings(),
        getPageText('services')
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
          showWapSidebar: settingsObj.showWapSidebar || 'true',
          siteTitle: settingsObj.siteTitle || 'Xs-Blog'
        });
      }

      // 从新的 page_texts 表加载页面文本配置
      if (pageTextResponse.success && pageTextResponse.data) {
        setPageText({
          title: pageTextResponse.data.title || '服务业务',
          description: pageTextResponse.data.description || '为您提供专业的服务解决方案',
          browserTitle: pageTextResponse.data.browserTitle || '服务业务',
          browserSubtitle: pageTextResponse.data.browserSubtitle || ''
        });
        setPageTextLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setPageTextLoaded(true); // 即使失败也标记为已加载，使用默认值
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: perPage
      };
      if (selectedCategory) {
        params.category_id = selectedCategory;
      }

      const response = await getServices(params);
      const data = response.data;

      // API返回格式: { success: true, data: { services: [], pagination: {} } }
      if (data && data.services && Array.isArray(data.services)) {
        setServices(data.services);
        setTotalPages(Number(data.pagination?.total_pages || 1));
      } else if (Array.isArray(data)) {
        // 兼容直接返回数组的情况
        setServices(data);
        setTotalPages(1);
      } else {
        setServices([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getServiceCategories();
      const data = response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const getServiceDetailUrl = (service: Service) => {
    if (service.order_page_slug) {
      return service.order_page_slug.startsWith('/') ? service.order_page_slug : `/p/${service.order_page_slug}`
    }
    return `/service-order/${service.id}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 基于搜索查询过滤服务 - 使用 useMemo 优化
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const nameMatch = service.name?.toLowerCase().includes(query);
      const descMatch = service.description?.toLowerCase().includes(query);
      const priceMatch = service.price?.toLowerCase().includes(query);

      return nameMatch || descMatch || priceMatch;
    });
  }, [services, searchQuery]);

  const isBlogTheme = settings?.themeType === 'blog';
  const showTopNavbar = settings?.showTopNavbar !== 'false';
  const showWapSidebar = settings?.showWapSidebar !== 'false';

  // 显示搜索结果的提示
  const showSearchResults = searchQuery.trim() && filteredServices.length > 0;
  const showNoResults = searchQuery.trim() && filteredServices.length === 0;

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
              {categories.length > 0 && (
                <div className="relative md:w-48 flex-shrink-0">
                  <button
                    onClick={() => setCategoryExpanded(!categoryExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-lg border border-border-primary hover:bg-bg-tertiary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-4 h-4 text-text-secondary" />
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
                          onClick={() => { setSelectedCategory(null); setCategoryExpanded(false); }}
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
                            onClick={() => { setSelectedCategory(category.id); setCategoryExpanded(false); }}
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
                        placeholder="搜索服务..."
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
                    搜索结果: 找到 {filteredServices.length} 个相关服务
                    <span className="font-medium ml-1">"{searchQuery}"</span>
                  </span>
                </div>
              </div>
            )}

            {/* 无搜索结果提示 */}
            {showNoResults && (
              <div className="p-4 bg-bg-tertiary rounded-xl border border-border-primary text-center">
                <span className="text-sm text-text-tertiary">
                  没有找到包含 "{searchQuery}" 的服务
                </span>
              </div>
            )}
          </div>

          {/* 服务列表 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="bg-bg-secondary rounded-xl shadow-sm border border-border-primary overflow-hidden animate-pulse">
                  <div className="aspect-square bg-bg-tertiary"></div>
                  <div className="p-3 md:p-4">
                    <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2"></div>
                    <div className="flex items-baseline justify-between">
                      <div className="h-5 bg-bg-tertiary rounded w-16"></div>
                      <div className="h-4 bg-bg-tertiary rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
              {filteredServices.map((service, index) => (
                <div
                  key={service.id}
                  onClick={() => router.push(getServiceDetailUrl(service))}
                  className="group bg-bg-secondary rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-border-primary transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
                >
                  {/* 服务封面图 - 1:1 正方形 */}
                  <div className="relative aspect-square bg-bg-tertiary overflow-hidden">
                    {service.cover_image ? (
                      <img
                        src={getThumbnailUrl(getImageUrl(service.cover_image))}
                        alt={service.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-16 h-16 text-text-tertiary opacity-30" />
                      </div>
                    )}

                    {/* 推荐标签 */}
                    {service.is_recommended && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'linear-gradient(to right, var(--accent-gradient-from), var(--accent-gradient-to))', color: 'var(--accent-text)' }}>
                        推荐
                      </div>
                    )}
                  </div>

                  {/* 服务信息 */}
                  <div className="p-3 md:p-4">
                    <h3 className="text-[16.47px] font-semibold text-text-primary group-hover:text-primary-500 transition-colors mb-1 leading-snug truncate">
                      {service.name}
                    </h3>

                    {/* 价格 */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-xl font-bold text-primary-600 shrink-0">
                          <span className="text-base font-normal mr-0.5">¥</span>{service.price}
                        </span>
                        {service.product_type && (
                          <span className="text-[11px] text-text-secondary px-2 py-0.5 bg-bg-tertiary border border-border-primary rounded-md shrink-0">
                            {PRODUCT_TYPE_LABEL[service.product_type]}
                          </span>
                        )}
                      </div>
                      {service.Category && (
                        <span className="text-xs text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded min-w-0 truncate">
                          {service.Category.icon && <span className="mr-1">{service.Category.icon}</span>}
                          {service.Category.name}
                        </span>
                      )}
                    </div>

                    {service.show_order_button && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(getServiceDetailUrl(service))
                        }}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                      >
                        {service.order_button_text || '立即下单'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-text-tertiary opacity-30 mx-auto mb-4" />
              <p className="text-text-secondary">暂无服务</p>
            </div>
          )}

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
      </div>

      {/* 页脚版权 */}
      <SiteFooter className="mt-auto" />
    </main>
  );
}
