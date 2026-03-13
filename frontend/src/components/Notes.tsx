'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getApiBaseUrl, safeFetch } from '@/lib/utils';
import { isAdminPage } from '@/lib/adminConfig';
import { stripMarkdown } from '@/lib/markdown';
import NoteCard, { Note } from '@/components/NoteCard';

const API_BASE_URL = getApiBaseUrl();

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

interface NotesProps {
  searchQuery?: string;
  limit?: number;
  showViewAll?: boolean;
  initialSettings?: {
    showNoteTags: boolean;
    showNoteCategories: boolean;
    noteLayoutColumns: string;
    showNoteCover: string;
    defaultNoteCover: string;
  };
}

export default function Notes({ searchQuery = '', limit, showViewAll, initialSettings }: NotesProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAdmin = pathname ? isAdminPage(pathname) : false;
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [urlMetadata, setUrlMetadata] = useState<Record<string, { title: string; description: string; favicon: string; image: string }>>({});
  const [settings, setSettings] = useState(initialSettings || {
    defaultNoteCover: '' // 默认封面
  });
  const [filter, setFilter] = useState<{
    type: 'tag' | 'category' | null;
    value: string | null;
  }>({
    type: null,
    value: null
  });


  // 判断当前是否在首页
  const isHomePage = pathname === '/';

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

  useEffect(() => {
    fetchNotes();
    fetchCategories();
    // 只有当没有传入 initialSettings 时才加载设置，或者始终加载以确保最新？
    // 考虑到首页已经传入了 rawSettings，这里可以优化：如果 initialSettings 存在，就不加载了
    // 但是为了保险起见，还是加载一下，或者依赖 initialSettings 的更新
    if (!initialSettings) {
      loadSettings();
    }
  }, [page, filter, limit]);

  // 监听 initialSettings 的变化
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // 处理 URL 参数中的 noteId，自动跳转到笔记页面
  useEffect(() => {
    const noteIdParam = searchParams.get('noteId');
    if (noteIdParam) {
      const noteId = parseInt(noteIdParam, 10);
      if (!isNaN(noteId)) {
        // 跳转到笔记页面
        window.location.href = `/note/${noteId}`;
      }
    }
  }, [searchParams]);

  const fetchNotes = async () => {
    try {
      const params: any = {
        is_published: true,
        page,
        limit: limit || 12,
      };

      // 添加筛选参数
      if (filter.type && filter.value) {
        if (filter.type === 'tag') {
          params.tag = filter.value;
        } else if (filter.type === 'category') {
          params.category = filter.value;
        }
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

  const handleNoteClick = useCallback((note: Note) => {
    window.location.href = `/note/${note.id}`;
  }, []);

  // 检查笔记内容是否为纯URL
  const isPureUrl = (content: string): boolean => {
    if (!content) return false;

    // 去除前后空格
    const trimmedContent = content.trim();

    // URL正则表达式
    const urlRegex = /^https?:\/\/[\w\-\.]+\.[a-z]{2,}(\/\S*)?$/i;

    return urlRegex.test(trimmedContent);
  };

  // 从URL中提取域名
  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return '';
    }
  };

  // 获取网站图标URL - 使用多个备选方案避免429错误
  const getFaviconUrl = (url: string): string => {
    const domain = extractDomain(url);
    // 使用多个备选方案，避免单一API的429错误
    const faviconUrls = [
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://favicon.yandex.net/favicon/${domain}`
    ];
    return faviconUrls[0]; // 使用第一个方案，如果失败会fallback
  };

  // 获取URL元数据
  const fetchUrlMetadata = async (url: string) => {
    if (urlMetadata[url]) {
      return urlMetadata[url];
    }

    try {
      // 使用后端API获取元数据，避免CORS问题
      const response = await safeFetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const metadata = await response.json();
        setUrlMetadata(prev => ({
          ...prev,
          [url]: {
            title: metadata.title || extractDomain(url),
            description: metadata.description || '点击卡片访问网站',
            favicon: metadata.favicon || getFaviconUrl(url),
            image: metadata.image || ''
          }
        }));
        return metadata;
      }
    } catch (error) {
      console.error('Failed to fetch URL metadata:', error);
    }

    // 如果API失败，使用默认值
    const defaultMetadata = {
      title: extractDomain(url),
      description: '点击卡片访问网站',
      favicon: getFaviconUrl(url),
      image: ''
    };

    setUrlMetadata(prev => ({
      ...prev,
      [url]: defaultMetadata
    }));

    return defaultMetadata;
  };

  // 处理标签点击筛选
  const handleTagClick = useCallback((tagName: string) => {
    if (isHomePage) {
      window.location.href = `/notes?tag=${encodeURIComponent(tagName)}`;
    } else {
      setFilter({
        type: 'tag',
        value: tagName
      });
      setPage(1);
    }
  }, [isHomePage]);

  // 处理分类点击筛选
  const handleCategoryClick = useCallback((categoryName: string) => {
    if (isHomePage) {
      window.location.href = `/notes?category=${encodeURIComponent(categoryName)}`;
    } else {
      setFilter({
        type: 'category',
        value: categoryName
      });
      setPage(1);
    }
  }, [isHomePage]);

  // 清除筛选
  const clearFilter = () => {
    setFilter({
      type: null,
      value: null
    });
    setPage(1); // 重置到第一页
  };

  // 加载设置
  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
        const settingsData = response.data.data;
        const showNoteTagsSetting = settingsData.find((setting: any) => setting.key === 'showNoteTags');
        const showNoteCategoriesSetting = settingsData.find((setting: any) => setting.key === 'showNoteCategories');
        const noteLayoutColumnsSetting = settingsData.find((setting: any) => setting.key === 'noteLayoutColumns');
        const showNoteCoverSetting = settingsData.find((setting: any) => setting.key === 'showNoteCover');
        const defaultNoteCoverSetting = settingsData.find((setting: any) => setting.key === 'defaultNoteCover');

        setSettings({
          defaultNoteCover: defaultNoteCoverSetting?.value || ''
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // 在组件挂载时预加载URL元数据
  useEffect(() => {
    const loadUrlMetadata = async () => {
      const urlNotes = notes.filter(note => isPureUrl(note.content));
      for (const note of urlNotes) {
        await fetchUrlMetadata(note.content.trim());
      }
    };

    if (notes.length > 0) {
      loadUrlMetadata();
    }
  }, [notes]);

  // 过滤笔记基于搜索查询
  const filteredNotes = useMemo(() => notes.filter(note => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const titleMatch = note.title?.toLowerCase().includes(query);
    const contentMatch = stripMarkdown(note.content).toLowerCase().includes(query);
    const categoryMatch = note.category?.toLowerCase().includes(query);

    const tagsMatch = note.Tags?.some(tag => tag.name.toLowerCase().includes(query)) ||
                     note.tags?.toLowerCase().includes(query);

    return titleMatch || contentMatch || categoryMatch || tagsMatch;
  }), [notes, searchQuery]);

  // 固定为2列布局
  const columns = 2;
  const showCover = true; // 始终显示封面（有封面显示图片，无封面显示占位符）

  // 是否使用横向布局（封面在左侧）
  const useHorizontalLayout = () => {
    if (isDesktop && columns === 2) return true; // 2列且桌面端：使用横向布局
    return false; // 3列及以上：网格模式，使用纵向布局
  };

  // 是否显示摘要
  const shouldShowSummary = () => {
    if (!isDesktop && columns >= 2) return false; // 手机端2列不显示
    // 2列桌面端横向布局时，应该显示摘要
    return true;
  };

  const isHorizontal = useHorizontalLayout();

  const showSummary = shouldShowSummary();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-bg-secondary/50 rounded-lg">
            <div className="h-5 w-3/4 bg-bg-tertiary/50 animate-pulse mb-3 rounded"></div>
            <div className="h-4 w-full bg-bg-tertiary/50 animate-pulse mb-2 rounded"></div>
            <div className="h-4 w-2/3 bg-bg-tertiary/50 animate-pulse mb-3 rounded"></div>
            <div className="flex items-center justify-between text-xs">
              <div className="h-3 w-24 bg-bg-tertiary/50 animate-pulse rounded"></div>
              <div className="h-3 w-16 bg-bg-tertiary/50 animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return null;
  }

  // 显示搜索结果的提示
  const showSearchResults = searchQuery.trim() && filteredNotes.length > 0;
  const showNoResults = searchQuery.trim() && filteredNotes.length === 0;

  return (
    <>
      {/* 搜索结果显示 */}
      {showSearchResults && (
        <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700">
              搜索结果: 找到 {filteredNotes.length} 条相关笔记
              <span className="font-medium ml-1">"{searchQuery}"</span>
            </span>
          </div>
        </div>
      )}

      {/* 无搜索结果提示 */}
      {showNoResults && (
        <div className="mb-4 p-3 bg-bg-tertiary/50 rounded-lg border border-border-primary/50 text-center">
          <span className="text-sm text-text-tertiary">
          没有找到包含 "{searchQuery}" 的笔记
          </span>
        </div>
      )}

      {/* 筛选状态指示器 */}
      {filter.type && filter.value && (
        <div className="mb-4 p-3 bg-bg-secondary/50 rounded-lg border border-border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              当前筛选:
              <span className="font-medium text-text-primary ml-1">
                {filter.type === 'tag' ? '标签' : '分类'}: {filter.value}
              </span>
            </span>
          </div>
          <button
            onClick={clearFilter}
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors px-2 py-1 hover:bg-bg-tertiary/50 rounded"
          >
            清除筛选
          </button>
        </div>
      )}

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
            defaultCover={settings.defaultNoteCover}
            showSummary={showSummary}
            showNoteTags={true}
            showNoteCategories={true}
            onOpen={handleNoteClick}
            onTagClick={handleTagClick}
            onCategoryClick={handleCategoryClick}
            isAdmin={isAdmin}
          />
        ))}
      </div>

    {showViewAll ? (
      <div className="flex justify-center pt-6 mt-4">
        <a href="/notes" className="px-6 py-2 bg-bg-secondary border border-border-primary rounded-full text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shadow-sm">
          查看全部
        </a>
      </div>
    ) : (totalPages > 1 && (
      <div className="flex justify-center gap-2 pt-6 mt-4">
        <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-bg-primary text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            上一页
          </button>

          <div className="flex items-center gap-1.5">
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
              const btnClass = 'w-8 h-8 rounded-lg transition-all text-sm ' + (isActive ? 'bg-primary-500 text-white' : 'bg-bg-primary text-text-secondary hover:bg-bg-secondary');

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
            className="px-3 py-1.5 rounded-lg bg-bg-primary text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            下一页
          </button>
        </div>
      ))}

    </>
  );
}