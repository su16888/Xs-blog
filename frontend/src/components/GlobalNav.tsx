/**
 * @file GlobalNav.tsx
 * @description 全局导航栏组件 - 针对特定页面和首页显示
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-19
 */

'use client';

import { usePathname } from 'next/navigation';
import { useSettings } from '@/contexts/SettingsContext';
import BlogNav from '@/components/BlogNav';
import { useState, useEffect, useMemo } from 'react';

interface GlobalNavProps {
  serverSettings?: Record<string, any>;
}

export default function GlobalNav({ serverSettings = {} }: GlobalNavProps) {
  const pathname = usePathname();
  const { settings: contextSettings, isLoading } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionThemeType, setSessionThemeType] = useState<string | null>(null);

  // 合并设置：优先使用 Context 的设置，其次使用服务端传入的设置
  const settings = useMemo(() => {
    if (!isLoading && Object.keys(contextSettings).length > 0) {
      return contextSettings;
    }
    return { ...serverSettings, ...contextSettings };
  }, [contextSettings, serverSettings, isLoading]);

  // 这些页面始终显示导航栏（优先加载）
  const navPages = ['/notes', '/navigation', '/galleries', '/services', '/messages', '/blog'];
  const isNavPage = navPages.some(page => pathname?.startsWith(page));

  // /docs 页面：列表页和详情页都显示导航栏（详情页电脑端显示，手机端有自己的导航栏）
  const isDocsPage = pathname?.startsWith('/docs');

  // 首页逻辑
  const isHomePage = pathname === '/';

  // 在客户端读取 sessionStorage，避免 hydration 不匹配
  useEffect(() => {
    setSessionThemeType(sessionStorage.getItem('userThemeType'));
  }, []);

  // 首页特殊主题检查
  const isPromoTheme = settings.promoThemeEnabled === 'true';
  const isSocialFeedTheme = settings.socialFeedThemeEnabled === 'true';
  const isDocsTheme = settings.docsThemeEnabled === 'true';
  const hideNavOnHome = isHomePage && (isPromoTheme || isSocialFeedTheme);

  // 首页主题类型判断
  const enableAvatarThemeSwitch = settings.enableAvatarThemeSwitch === 'true';
  const backendThemeType = settings.themeType || 'default';
  let finalThemeType = backendThemeType;
  if (backendThemeType === 'default' && enableAvatarThemeSwitch && sessionThemeType === 'blog') {
    finalThemeType = 'blog';
  }
  const isBlogTheme = finalThemeType === 'blog';
  const showTopNavbar = settings.showTopNavbar !== 'false';
  const showWapSidebar = settings.showWapSidebar !== 'false';

  // 首页是否显示导航栏
  const shouldShowNavOnHome = isHomePage && !hideNavOnHome && (isBlogTheme || showTopNavbar);

  // 判断是否显示导航栏
  // 1. 特定页面：始终显示（不等待加载）
  // 2. /docs 页面：显示导航栏（详情页手机端隐藏，有自己的导航栏）
  // 3. 首页：根据设置决定
  // 4. 其他页面：不显示（由各页面自己控制）

  // /docs/xxx 详情页判断
  const isDocsDetailPage = isDocsPage && pathname !== '/docs';

  // docs 详情页不显示全局导航栏（有自己的导航栏）
  if (isDocsDetailPage) {
    return null;
  }

  // 文档主题模式：允许通过开关全局控制导航栏显示
  if (isDocsTheme && !showTopNavbar) {
    return null;
  }

  if (isNavPage) {
    // 特定页面始终显示，不等待加载
  } else if (isDocsPage) {
  } else if (isHomePage) {
    // 首页：如果有服务端设置，立即判断；否则等待加载
    const hasServerSettings = Object.keys(serverSettings).length > 0;
    if (!hasServerSettings && isLoading) {
      return null;
    }
    if (hideNavOnHome || !shouldShowNavOnHome) {
      return null;
    }
  } else {
    // 其他页面不显示
    return null;
  }

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalSearch', { detail: query }));
    }
  };

  return (
    <BlogNav
      onSearch={handleSearch}
      isBlogMode={isDocsTheme ? false : isNavPage ? true : isDocsPage ? !isDocsTheme : isBlogTheme}
      showWapSidebar={showWapSidebar}
      initialSettings={settings}
      hideOnMobile={isDocsDetailPage}
    />
  );
}
