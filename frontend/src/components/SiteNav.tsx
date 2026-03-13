'use client';

import { ExternalLink, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSitesGroupedByCategory } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import SiteModal from './SiteModal';
import { useSettings } from '@/contexts/SettingsContext';

interface Site {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  link: string;
  sort_order: number;
  is_recommended?: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
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

interface SiteNavProps {
  searchQuery?: string;
  limit?: number;
  hideCategoryHeaders?: boolean;
  showViewAll?: boolean;
}

// 网站卡片组件
function SiteCard({ site, index, onSiteClick }: { site: Site; index: number; onSiteClick: (site: Site) => void }) {
  return (
    <button
      onClick={() => onSiteClick(site)}
      className="group block p-3 bg-bg-secondary rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-border-primary transition-all duration-300 cursor-pointer text-left w-full animate-fade-in"
    >
      <div className="flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-10 h-10 mb-2 rounded-md overflow-hidden flex items-center justify-center">
          {site.logo ? (
            <img
              src={getFileUrl(site.logo)}
              alt={site.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-base shadow-sm">
              {site.name[0]}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="relative flex flex-col items-center mb-1">
          <h3 className="font-medium text-xs text-text-primary group-hover:text-primary-500 transition-colors">
            {site.name}
          </h3>
          <ExternalLink className="w-3 h-3 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-4 top-1/2 transform -translate-y-1/2" />
        </div>

        {/* Description */}
        {site.description && (
          <p className="text-[10px] text-text-tertiary line-clamp-2 text-center leading-relaxed">
            {site.description}
          </p>
        )}
      </div>
    </button>
  );
}

export default function SiteNav({ searchQuery = '', limit, hideCategoryHeaders, showViewAll }: SiteNavProps) {
  const { settings } = useSettings();
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // 判断当前主题类型
  const sessionThemeType = typeof window !== 'undefined' ? sessionStorage.getItem('userThemeType') : null;
  const themeType = sessionThemeType || settings.themeType || 'default';
  const isDefaultTheme = themeType === 'default';

  useEffect(() => {
    fetchNavigationData();
  }, [searchQuery, limit]);

  const fetchNavigationData = async () => {
    try {
      const params: { page?: number; limit?: number; search?: string } = {
        page: 1,
        limit: limit || 10
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await getSitesGroupedByCategory(params);
      if (response.success && response.data) {
        setNavigationData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch navigation data:', error);
      setNavigationData({
        showRecommended: false,
        recommended: [],
        categories: []
      });
    } finally {
      setLoading(false);
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

  // 搜索过滤
  const filterSites = (sites: Site[]) => {
    if (!searchQuery.trim()) return sites;

    const query = searchQuery.toLowerCase();
    return sites.filter(site => {
      const nameMatch = site.name.toLowerCase().includes(query);
      const descriptionMatch = site.description?.toLowerCase().includes(query);
      return nameMatch || descriptionMatch;
    });
  };

  if (loading) {
    return (
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(limit || 10)].map((_, i) => (
            <div key={i}>
              <div className="p-3 bg-bg-secondary rounded-lg shadow-sm border border-border-primary animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 mb-2 rounded-md bg-bg-tertiary"></div>
                  <div className="h-3 bg-bg-tertiary rounded w-16 mb-1"></div>
                  <div className="h-2 bg-bg-tertiary rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!navigationData) {
    return null;
  }

  // 构建要渲染的内容数组
  const contentSections = [];

  if (hideCategoryHeaders) {
    // 扁平化展示逻辑
    const allSitesMap = new Map<number, Site>();
    
    // 收集所有站点（去重）
    if (navigationData.showRecommended) {
      navigationData.recommended.forEach(s => allSitesMap.set(s.id, s));
    }
    navigationData.categories.forEach(g => g.sites.forEach(s => allSitesMap.set(s.id, s)));
    
    let allSites = Array.from(allSitesMap.values());
    
    // 按ID倒序（最新）
    allSites.sort((a, b) => b.id - a.id);
    
    // 过滤
    allSites = filterSites(allSites);
    
    // 限制数量
    if (limit) {
      allSites = allSites.slice(0, limit);
    }

    if (allSites.length > 0) {
      contentSections.push(
        <div key="flat-list" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {allSites.map((site, index) => (
            <div key={`site-${site.id}`}>
              <SiteCard
                site={site}
                index={index}
                onSiteClick={handleSiteClick}
              />
            </div>
          ))}
        </div>
      );
    } else {
       // 无结果
       contentSections.push(
        <div key="no-results" className="mb-4 p-3 bg-gray-50/50 rounded-lg border border-gray-200/50 text-center">
          <span className="text-sm text-gray-600">
            {searchQuery.trim() ? `没有找到包含 "${searchQuery}" 的网站` : '暂无导航数据'}
          </span>
        </div>
      );
    }

  } else {
    // 原有分组展示逻辑
    // 应用搜索过滤
    const filteredRecommended = filterSites(navigationData.recommended);
    const filteredCategories = navigationData.categories.map(group => ({
      ...group,
      sites: filterSites(group.sites)
    })).filter(group => group.sites.length > 0);

    const hasResults = filteredRecommended.length > 0 || filteredCategories.length > 0;
    const showSearchResults = searchQuery.trim() && hasResults;
    const showNoResults = searchQuery.trim() && !hasResults;

    // 搜索结果提示
    if (showSearchResults) {
      contentSections.push(
        <div key="search-results" className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
          <span className="text-sm text-blue-700">
            搜索结果: 找到 {filteredRecommended.length + filteredCategories.reduce((sum, g) => sum + g.sites.length, 0)} 个相关网站
            <span className="font-medium ml-1">"{searchQuery}"</span>
          </span>
        </div>
      );
    }

    // 无搜索结果提示
    if (showNoResults) {
      contentSections.push(
        <div key="no-results" className="mb-4 p-3 bg-gray-50/50 rounded-lg border border-gray-200/50 text-center">
          <span className="text-sm text-gray-600">
            没有找到包含 "{searchQuery}" 的网站
          </span>
        </div>
      );
    }

    // 导航推荐区块
    if (navigationData.showRecommended && filteredRecommended.length > 0) {
      contentSections.push(
        <div key="recommended-section" className="mb-8">
          <div className={`flex items-center gap-1.5 mb-4 ${isDefaultTheme ? 'hidden md:hidden' : ''}`}>
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <h2 className="text-lg font-bold text-text-primary">导航推荐</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredRecommended.map((site, index) => (
              <div key={`recommended-${site.id}`}>
                <SiteCard
                  site={site}
                  index={index}
                  onSiteClick={handleSiteClick}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 分类区块
    filteredCategories.forEach((group) => {
      contentSections.push(
        <div key={`category-${group.category.id}`} className="mb-8 last:mb-0">
          <div className={`flex items-center gap-1.5 mb-4 ${isDefaultTheme ? 'hidden md:hidden' : ''}`}>
            {group.category.icon && (
              <span className="text-lg">{group.category.icon}</span>
            )}
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {group.category.name}
              </h2>
              {group.category.description && (
                <p className="text-xs text-text-secondary mt-0.5">
                  {group.category.description}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {group.sites.map((site, index) => (
              <div key={`site-${group.category.id}-${site.id}`}>
                <SiteCard
                  site={site}
                  index={index}
                  onSiteClick={handleSiteClick}
                />
              </div>
            ))}
          </div>
        </div>
      );
    });

    // 空状态
    if (!navigationData.showRecommended && navigationData.categories.length === 0) {
      contentSections.push(
        <div key="empty-state" className="text-center py-12 text-text-tertiary">
          暂无导航数据
        </div>
      );
    }
  }

  return (
    <>
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        {contentSections}
        {showViewAll && (
          <div className="flex justify-center pt-6 mt-4">
            <a href="/navigation" className="px-6 py-2 bg-bg-secondary border border-border-primary rounded-full text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shadow-sm">
              查看全部
            </a>
          </div>
        )}
      </div>

      {/* 网站信息弹窗 */}
      <SiteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        site={selectedSite}
        logoUrl={selectedSite?.logo ? getFileUrl(selectedSite.logo) : undefined}
      />
    </>
  );
}
