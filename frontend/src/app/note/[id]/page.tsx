'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Clock, ArrowLeft, Tag, FolderOpen, Download, ExternalLink, Menu, X, BookOpen, Vote, FileText, Gift, Copy, Check } from 'lucide-react';
import api, { getSettings, getPageText, getNotePolls, getNoteSurveys, getNoteLotteries } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import { visit, SKIP } from 'unist-util-visit';
import type { Root, Element as HastElement } from 'hast';
import { getApiBaseUrl } from '@/lib/utils';
import DiskModal from '@/components/DiskModal';
import SiteFooter from '@/components/SiteFooter'
import CopyButton from '@/components/CopyButton';
import NotePoll from '@/components/NotePoll';
import NoteSurvey from '@/components/NoteSurvey';
import NoteLottery from '@/components/NoteLottery';
import SEOMeta from '@/components/SEOMeta';
import PageBackground from '@/components/PageBackground';
import ImageViewer from '@/components/ImageViewer';
import '@/app/docs/docs.css';

// 动态导入 MermaidRenderer（仅在需要时加载）
const MermaidRenderer = dynamic(() => import('@/components/MermaidRenderer'), {
  ssr: false,
  loading: () => <div className="p-4 bg-bg-secondary rounded-lg animate-pulse">加载图表中...</div>
});

const API_BASE_URL = getApiBaseUrl();

interface Note {
  id: number;
  title: string;
  content: string;
  is_published: boolean;
  is_pinned?: boolean;
  published_at?: string;
  created_at: string;
  media_type?: 'none' | 'image' | 'video' | 'music';
  media_urls?: string[];
  external_link?: string;
  category?: string;
  category_id?: number;
  tags?: string;
  password?: string;
  requiresPassword?: boolean;
  Tags?: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
  source_type?: 'none' | 'original' | 'reprint';
  source_url?: string;
  source_text?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const getTextContent = (node: HastElement): string => {
  let text = '';
  for (const child of node.children) {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'element') {
      text += getTextContent(child);
    }
  }
  return text;
};

const slugifyHeading = (text: string) => text
  .toLowerCase()
  .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();

const rehypeUniqueSlug = () => {
  return (tree: Root) => {
    const idCountMap: Record<string, number> = {};

    visit(tree, 'element', (node: HastElement) => {
      // 遇到代码块，跳过其所有子节点
      if (node.tagName === 'pre') {
        return SKIP;
      }

      // 只处理 1-5 级标题
      if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(node.tagName)) {
        const text = getTextContent(node);
        let baseId = slugifyHeading(text);
        let id = baseId;
        if (idCountMap[baseId] !== undefined) {
          idCountMap[baseId] += 1;
          id = `${baseId}-${idCountMap[baseId]}`;
        } else {
          idCountMap[baseId] = 0;
        }
        node.properties = node.properties || {};
        node.properties.id = id;
      }
    });
  };
};

const extractToc = (md: string): TocItem[] => {
  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const items: TocItem[] = [];
  let codeBlockDelimiter: string | null = null; // 记录当前代码块的分隔符
  const idCountMap: Record<string, number> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检测代码块开始/结束（支持 ```、````、~~~~~ 等任意长度）
    const codeBlockMatch = trimmedLine.match(/^(`{3,}|~{3,})/);
    if (codeBlockMatch) {
      const delimiter = codeBlockMatch[1];
      if (codeBlockDelimiter === null) {
        // 进入代码块
        codeBlockDelimiter = delimiter;
      } else if (trimmedLine.startsWith(codeBlockDelimiter) && trimmedLine === delimiter) {
        // 退出代码块（分隔符必须匹配且是单独一行）
        codeBlockDelimiter = null;
      }
      continue;
    }

    // 在代码块内，跳过
    if (codeBlockDelimiter !== null) continue;

    // 标题必须在行首（不能有前导空格），只匹配1-5级标题
    const headingMatch = line.match(/^(#{1,5})\s+(.+)/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();
    let baseId = slugifyHeading(text);
    let id = baseId;
    if (idCountMap[baseId] !== undefined) {
      idCountMap[baseId] += 1;
      id = `${baseId}-${idCountMap[baseId]}`;
    } else {
      idCountMap[baseId] = 0;
    }
    items.push({ id, text, level });
  }

  return items;
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export default function NotePage({ initialData }: { initialData?: any } = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 支持 /note/[id] 和 /[slug] 两种路由
  const noteId = (params.id || params.slug) as string;
  const [note, setNote] = useState<Note | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [remaining, setRemaining] = useState(3);
  const [showDiskModal, setShowDiskModal] = useState(false);
  const [hasDisks, setHasDisks] = useState(false);
  const [tocOpen, setTocOpen] = useState(false); // 手机端目录抽屉
  const [tocVisible, setTocVisible] = useState(false); // 电脑端目录显示状态，默认隐藏
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [tocPosition, setTocPosition] = useState({ x: 0, y: 80 }); // 目录卡片位置
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const tocRef = useRef<HTMLDivElement>(null);
  const [verifiedPassword, setVerifiedPassword] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const isClickScrollingRef = useRef(false);
  // 图片预览相关状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageList, setImageList] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // 页面文本配置和网站标题
  const [pageTextConfig, setPageTextConfig] = useState({
    browserTitle: '笔记详情',
    browserSubtitle: ''
  });
  const [siteTitle, setSiteTitle] = useState('');
  // KaTeX 动态加载状态
  const [rehypeKatex, setRehypeKatex] = useState<any>(null);
  const [katexLoaded, setKatexLoaded] = useState(false);
  // 投票相关状态
  const [polls, setPolls] = useState<any[]>([]);
  // 问卷相关状态
  const [surveys, setSurveys] = useState<any[]>([]);
  // 抽奖相关状态
  const [lotteries, setLotteries] = useState<any[]>([]);

  const handleCopyMarkdown = useCallback(async () => {
    if (!note?.content) return;
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [note?.content]);

  // 检测内容是否包含数学公式
  const hasMath = useMemo(() => {
    if (!note?.content) return false;
    // 检测 $...$ 或 $$...$$ 或 \[...\] 或 \(...\) 格式的数学公式
    return /\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(note.content);
  }, [note?.content]);

  // 动态加载 KaTeX（仅在需要时）
  useEffect(() => {
    if (hasMath && !katexLoaded) {
      import('rehype-katex').then((katexModule) => {
        // 动态加载 KaTeX CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);

        setRehypeKatex(() => katexModule.default);
        setKatexLoaded(true);
      }).catch(err => {
        console.error('Failed to load KaTeX:', err);
      });
    }
  }, [hasMath, katexLoaded]);

  useEffect(() => {
    // 如果有 initialData，跳过查询
    if (initialData) return;

    const fetchNote = async () => {
      // 验证 noteId 是否有效
      if (!noteId || noteId === 'undefined' || noteId === 'null') {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const urlPassword = searchParams.get('password');

        if (urlPassword) {
          const response = await api.get(`/notes/${noteId}?password=${encodeURIComponent(urlPassword)}`);
          if (response.data?.success && response.data?.data) {
            const noteData = response.data.data;
            setNote(noteData);

            if (!noteData.requiresPassword) {
              setShowPasswordModal(false);
              setVerifiedPassword(urlPassword);
            } else {
              setShowPasswordModal(true);
              setPasswordError('URL中的密码不正确，请重新输入');
            }
          } else {
            setError(true);
          }
        } else {
          const response = await api.get(`/notes/${noteId}`);
          if (response.data?.success && response.data?.data) {
            const noteData = response.data.data;
            setNote(noteData);

            if (noteData.requiresPassword) {
              setShowPasswordModal(true);
            }
          } else {
            setError(true);
          }
        }
      } catch (error: any) {
        // 如果是 404 错误，说明笔记不存在，属于正常情况，不需要打印错误日志
        if (error.response?.status === 404) {
          setError(true);
        } else {
          console.error('Failed to fetch note:', error);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (noteId) {
      fetchNote();
    }
  }, [noteId, searchParams, initialData]);

  // 加载页面文本配置和网站标题
  useEffect(() => {
    const loadPageConfig = async () => {
      try {
        const [settingsResponse, pageTextResponse] = await Promise.all([
          getSettings(),
          getPageText('note')
        ]);

        if (settingsResponse.success && settingsResponse.data) {
          const settingsObj: Record<string, string> = {};
          settingsResponse.data.forEach((setting: { key: string; value: string }) => {
            settingsObj[setting.key] = setting.value;
          });
          setSiteTitle(settingsObj.siteTitle || '');
        }

        if (pageTextResponse.success && pageTextResponse.data) {
          setPageTextConfig({
            browserTitle: pageTextResponse.data.browserTitle || '笔记详情',
            browserSubtitle: pageTextResponse.data.browserSubtitle || ''
          });
        }
      } catch (err) {
        console.error('加载页面配置失败:', err);
      }
    };
    loadPageConfig();
  }, []);

  useEffect(() => {
    if (note && !note.requiresPassword) {
      checkNoteDisks();
      loadPolls();
      loadSurveys();
      loadLotteries();
    }
  }, [note, verifiedPassword]);

  // 加载投票
  const loadPolls = async () => {
    if (!note?.id) return;
    try {
      const response = await getNotePolls(note.id, verifiedPassword || undefined);
      if (response.success) {
        setPolls(response.data);
      }
    } catch (error) {
      console.error('加载投票失败:', error);
    }
  };

  // 加载问卷
  const loadSurveys = async () => {
    if (!note?.id) return;
    try {
      const response = await getNoteSurveys(note.id, verifiedPassword || undefined);
      if (response.success) {
        setSurveys(response.data);
      }
    } catch (error) {
      console.error('加载问卷失败:', error);
    }
  };

  // 加载抽奖
  const loadLotteries = async () => {
    if (!note?.id) return;
    try {
      const response = await getNoteLotteries(note.id);
      if (response.success) {
        setLotteries(response.data);
      }
    } catch (error) {
      console.error('加载抽奖失败:', error);
    }
  };

  useEffect(() => {
    if (note?.content) {
      setTocItems(extractToc(note.content));
    } else {
      setTocItems([]);
    }
  }, [note?.content]);

  // 监听滚动，更新当前高亮的标题（参考 docs 页面实现）
  useEffect(() => {
    if (tocItems.length === 0) return;

    let ticking = false;
    let lastActiveId = '';

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        // 如果是点击触发的滚动，不更新高亮
        if (isClickScrollingRef.current) {
          ticking = false;
          return;
        }

        const scrollTop = window.scrollY;
        const navHeight = window.innerWidth >= 640 ? 64 : 56;

        let newActiveId = tocItems[0]?.id || '';

        // 检查是否已滚动到底部
        const isAtBottom = window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 50;

        if (isAtBottom) {
          newActiveId = tocItems[tocItems.length - 1]?.id || '';
        } else {
          for (let i = tocItems.length - 1; i >= 0; i--) {
            const heading = document.getElementById(tocItems[i].id);
            if (heading) {
              const rect = heading.getBoundingClientRect();
              if (rect.top <= navHeight + 50) {
                newActiveId = tocItems[i].id;
                break;
              }
            }
          }
        }

        // 只在高亮变化时更新 DOM
        if (newActiveId !== lastActiveId) {
          lastActiveId = newActiveId;
          document.querySelectorAll('.toc-active').forEach(item => {
            item.classList.remove('toc-active');
            item.classList.add('toc-inactive');
          });
          document.querySelectorAll(`[data-toc-id="${newActiveId}"]`).forEach(item => {
            item.classList.remove('toc-inactive');
            item.classList.add('toc-active');
          });
          const active = document.querySelector(`[data-toc-id="${newActiveId}"]`) as HTMLElement | null;
          active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        ticking = false;
      });
    };

    // 初始化时执行一次
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  // 手机端目录打开时同步高亮状态
  useEffect(() => {
    if (tocOpen && tocItems.length > 0) {
      // 延迟执行，等待 DOM 渲染完成
      setTimeout(() => {
        const scrollTop = window.scrollY;
        const navHeight = window.innerWidth >= 640 ? 64 : 56;

        let activeId = tocItems[0]?.id || '';

        const isAtBottom = window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 50;

        if (isAtBottom) {
          activeId = tocItems[tocItems.length - 1]?.id || '';
        } else {
          for (let i = tocItems.length - 1; i >= 0; i--) {
            const heading = document.getElementById(tocItems[i].id);
            if (heading) {
              const rect = heading.getBoundingClientRect();
              if (rect.top <= navHeight + 50) {
                activeId = tocItems[i].id;
                break;
              }
            }
          }
        }

        // 更新高亮
        document.querySelectorAll('.toc-active').forEach(item => {
          item.classList.remove('toc-active');
          item.classList.add('toc-inactive');
        });
        document.querySelectorAll(`[data-toc-id="${activeId}"]`).forEach(item => {
          item.classList.remove('toc-inactive');
          item.classList.add('toc-active');
        });
        const active = document.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null;
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }, 50);
    }
  }, [tocOpen, tocItems]);

  // 获取密码尝试状态
  useEffect(() => {
    const fetchPasswordStatus = async () => {
      try {
        const response = await api.get('/notes/password-status');
        if (response.data?.success) {
          setErrorCount(response.data.errorCount || 0);
          setRemaining(response.data.remaining ?? 3);
        }
      } catch {
        // 静默处理，密码状态获取失败不影响主要功能
      }
    };
    if (showPasswordModal) {
      fetchPasswordStatus();
    }
  }, [showPasswordModal]);

  const checkNoteDisks = async () => {
    if (!note?.id) return;
    try {
      const passwordParam = verifiedPassword ? `?password=${encodeURIComponent(verifiedPassword)}` : '';
      const response = await api.get(`/notes/${note.id}/disks${passwordParam}`);
      if (response.data?.success && response.data?.data) {
        setHasDisks(response.data.data.length > 0);
      }
    } catch (error) {
      setHasDisks(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setVerifying(true);

    try {
      const response = await api.post(`/notes/${noteId}/verify`, { password });
      if (response.data?.success && response.data?.data) {
        setNote(response.data.data);
        setShowPasswordModal(false);
        setVerifiedPassword(password);
        setPassword('');
        setErrorCount(0);
        setRemaining(3);
      }
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.errorCount !== undefined) {
        setErrorCount(data.errorCount);
        setRemaining(data.remaining);
      }
      if (error.response?.status === 429) {
        setPasswordError('密码错误次数过多，请1小时后重试！');
      } else if (error.response?.status === 401) {
        setPasswordError(data?.remaining > 0 ? '密码错误' : '密码错误次数过多，请1小时后重试！');
      } else {
        setPasswordError('验证失败，请稍后重试');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  // 滚动到指定标题
  const scrollToHeading = useCallback((id: string) => {
    // 关闭移动端目录
    setTocOpen(false);

    // 延迟执行，确保目录关闭后再滚动
    setTimeout(() => {
      const element = document.getElementById(id);

      if (element) {
        // 暂停滚动高亮更新
        isClickScrollingRef.current = true;

        // 计算目标滚动位置，考虑导航栏高度
        const navHeight = window.innerWidth >= 640 ? 64 : 56;
        const elementRect = element.getBoundingClientRect();
        const scrollTop = window.scrollY + elementRect.top - navHeight - 20;

        // 执行滚动
        window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });

        // 滚动完成后再更新高亮状态
        setTimeout(() => {
          // 更新高亮
          document.querySelectorAll('.toc-active').forEach(item => {
            item.classList.remove('toc-active');
            item.classList.add('toc-inactive');
          });
          document.querySelectorAll(`[data-toc-id="${id}"]`).forEach(item => {
            item.classList.remove('toc-inactive');
            item.classList.add('toc-active');
          });

          // 恢复滚动高亮更新
          isClickScrollingRef.current = false;
        }, 500);
      }
    }, 100);
  }, []);

  // 目录卡片拖动处理
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: tocPosition.x,
      posY: tocPosition.y
    };
  }, [tocPosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // 计算新位置（从右侧计算）
      const newX = dragStartRef.current.posX - deltaX;
      const newY = dragStartRef.current.posY + deltaY;

      // 限制在视口内
      const maxX = window.innerWidth - 220; // 目录宽度约 208px
      const maxY = window.innerHeight - 200;

      setTocPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(20, Math.min(maxY, newY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 初始化目录位置（右侧）
  useEffect(() => {
    if (tocVisible && tocPosition.x === 0) {
      setTocPosition({ x: 24, y: 80 });
    }
  }, [tocVisible]);

  const handleCategoryClick = () => {
    if (note?.category) {
      router.push(`/notes?category=${encodeURIComponent(note.category)}`);
    }
  };

  const handleTagClick = (tagName: string) => {
    router.push(`/notes?tag=${encodeURIComponent(tagName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <SEOMeta customTitle="加载中..." />
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-primary hide-scrollbar relative flex flex-col">
      <SEOMeta customTitle={note?.title ? `${note.title} - ${siteTitle || 'XsBlog'}` : (siteTitle || 'XsBlog')} />
      {/* 背景图片 */}
      <PageBackground />
      {/* 顶部导航栏 - 固定在顶部 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary border-b border-border-primary shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* 左侧：返回按钮 + 标题 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 sm:gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">返回</span>
              </button>
              <span className="text-text-tertiary hidden sm:inline">|</span>
              <h1 className="text-sm sm:text-base font-semibold text-text-primary truncate flex-1 min-w-0">
                {note.title || '无标题'}
              </h1>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {polls.length > 0 && (
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors font-medium"
                >
                  <Vote className="w-4 h-4" />
                  <span className="hidden sm:inline">投票</span>
                </button>
              )}
              {surveys.length > 0 && (
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg transition-colors font-medium"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">问卷</span>
                </button>
              )}
              {lotteries.length > 0 && (
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 rounded-lg transition-colors font-medium"
                >
                  <Gift className="w-4 h-4" />
                  <span className="hidden sm:inline">抽奖</span>
                </button>
              )}
              {hasDisks && (
                <button
                  onClick={() => setShowDiskModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20 rounded-lg transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">下载资源</span>
                </button>
              )}
              {note?.content && (
                <button
                  onClick={handleCopyMarkdown}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                >
                  {copiedMarkdown ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedMarkdown ? '已复制' : '复制markdown'}</span>
                </button>
              )}
              {/* 目录按钮 - 手机端打开抽屉，电脑端切换显示/隐藏 */}
              {tocItems.length > 0 && (
                <>
                  {/* 手机端目录按钮 */}
                  <button
                    onClick={() => setTocOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                    title="目录"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  {/* 电脑端目录按钮 */}
                  <button
                    onClick={() => setTocVisible(!tocVisible)}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                    title={tocVisible ? '隐藏目录' : '显示目录'}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{tocVisible ? '隐藏目录' : '显示目录'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 导航栏占位 */}
      <div className="h-14 sm:h-16 flex-shrink-0"></div>

      {/* 主内容区 - 电脑端两栏布局 */}
      <main className="flex-1 flex">
        <div className="max-w-6xl w-full mx-auto px-0 sm:px-4 flex gap-6 flex-1">
          {/* 左侧：文章内容 */}
          <div className="flex-1 min-w-0 flex flex-col">
            <article
              ref={contentRef}
              className="sm:rounded-xl sm:border sm:border-border-primary sm:shadow-sm bg-bg-secondary animate-fade-in flex-1 flex flex-col sm:my-6"
            >
              {/* 文章内容区 */}
              <div className="px-4 sm:px-6 py-5 flex-1">
                <div className="note-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={hasMath && rehypeKatex ? [rehypeRaw, rehypeUniqueSlug, rehypeKatex] : [rehypeRaw, rehypeUniqueSlug]}
                    components={{
                      img: ({ src, alt, className, style, ...props }) => {
                      let imageSrc = src;
                      if (typeof src === 'string' && src.startsWith('/uploads/')) {
                        imageSrc = `${API_BASE_URL}${src}`;
                      }
                      // 检查是否是模糊图片
                      const isBlurImage = className?.includes('blur-image') || (props as any)['data-blur'] === 'true';
                      const [revealed, setRevealed] = React.useState(false);

                      // 检查对齐方式
                      const hasAlignClass = className?.includes('img-align-');
                      const alignClass = hasAlignClass ? '' : 'img-align-center';

                      // 获取容器的对齐样式
                      const getContainerAlign = () => {
                        if (className?.includes('img-align-right')) return 'text-right';
                        if (className?.includes('img-align-left')) return 'text-left';
                        return 'text-center'; // 默认居中
                      };

                      const handleClick = () => {
                        if (isBlurImage && !revealed) {
                          setRevealed(true);
                        } else {
                          // 打开图片预览
                          if (imageSrc) {
                            setImageList([imageSrc as string]);
                            setCurrentImageIndex(0);
                            setShowImageViewer(true);
                          }
                        }
                      };

                      // 解析 style 字符串或对象
                      let styleObj: React.CSSProperties = {};
                      if (typeof style === 'string') {
                        (style as string).split(';').forEach(item => {
                          const [key, value] = item.split(':').map(s => s.trim());
                          if (key && value) {
                            (styleObj as any)[key] = value;
                          }
                        });
                      } else if (style) {
                        styleObj = style;
                      }

                      return (
                        <div className={`my-4 ${getContainerAlign()} ${isBlurImage ? 'blur-image-container' : ''} ${revealed ? 'revealed' : ''}`}>
                          <img
                            src={imageSrc}
                            alt={alt || ''}
                            className={`max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow ${className || ''} ${alignClass} ${
                              isBlurImage && !revealed
                                ? 'blur-image'
                                : ''
                            } ${revealed ? 'revealed' : ''}`}
                            style={{ maxHeight: '360px', objectFit: 'contain', ...styleObj }}
                            loading="lazy"
                            onClick={handleClick}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            {...props}
                          />
                        </div>
                      );
                    },
                    iframe: ({ node, ...props }) => (
                      <div className="iframe-container my-4">
                        <iframe {...props} />
                      </div>
                    ),
                    pre: ({ node, children, ...props }: any) => {
                      // 提取代码文本用于复制
                      const getCodeText = (children: React.ReactNode): string => {
                        if (typeof children === 'string') return children;
                        if (Array.isArray(children)) {
                          return children.map(getCodeText).join('');
                        }
                        if (React.isValidElement(children)) {
                          const childProps = children.props as { children?: React.ReactNode };
                          return getCodeText(childProps.children || '');
                        }
                        return '';
                      };
                      const codeText = getCodeText(children);

                      // 提取语言类型
                      const getLanguage = (children: React.ReactNode): string => {
                        if (React.isValidElement(children)) {
                          const childProps = children.props as { className?: string };
                          const className = childProps?.className || '';
                          const match = /language-(\w+)/.exec(className);
                          return match ? match[1] : '';
                        }
                        return '';
                      };
                      const language = getLanguage(children);

                      // 如果是 Mermaid 图表，使用 MermaidRenderer
                      if (language === 'mermaid') {
                        return <MermaidRenderer chart={codeText} />;
                      }

                      return (
                        <div className="relative my-4 group code-block-wrapper">
                          {language && (
                            <span className="code-language-label">{language}</span>
                          )}
                          <CopyButton text={codeText} />
                          <pre className="code-block" {...props}>
                            {children}
                          </pre>
                        </div>
                      );
                    },
                    code: ({ node, className, children, ...props }: any) => {
                      // 检查是否是行内代码：没有 className 或者不在 pre 标签内
                      const isInline = !className || !className.includes('language-');
                      if (isInline) {
                        return (
                          <code className="inline-code" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className={`block-code ${className || ''}`} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table: ({ node, children, ...props }: any) => (
                      <div className="overflow-x-auto my-4">
                        <table {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    blockquote: ({ node, children, ...props }: any) => (
                      <blockquote className="note-blockquote" {...props}>
                        {children}
                      </blockquote>
                    ),
                    a: ({ node, href, children, ...props }: any) => (
                      <a
                        href={href}
                        className="text-primary-600 hover:text-primary-700 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    p: ({ node, children, ...props }: any) => {
                      const hasTextNodes = React.Children.toArray(children).some(child =>
                        typeof child === 'string' && child.includes('\n')
                      );

                      if (hasTextNodes) {
                        return (
                          <p {...props}>
                            {React.Children.map(children, (child, index) => {
                              if (typeof child === 'string') {
                                const lines = child.split('\n');
                                return (
                                  <React.Fragment key={index}>
                                    {lines.map((line, lineIndex) => (
                                      <React.Fragment key={lineIndex}>
                                        {line}
                                        {lineIndex < lines.length - 1 && <br />}
                                      </React.Fragment>
                                    ))}
                                  </React.Fragment>
                                );
                              }
                              return child;
                            })}
                          </p>
                        );
                      }

                      return <p {...props}>{children}</p>;
                    },
                    h1: ({ node, children, id, ...props }: any) => (
                      <h1 id={id} {...props}>{children}</h1>
                    ),
                    h2: ({ node, children, id, ...props }: any) => (
                      <h2 id={id} {...props}>{children}</h2>
                    ),
                    h3: ({ node, children, id, ...props }: any) => (
                      <h3 id={id} {...props}>{children}</h3>
                    ),
                    h4: ({ node, children, id, ...props }: any) => (
                      <h4 id={id} {...props}>{children}</h4>
                    ),
                    h5: ({ node, children, id, ...props }: any) => (
                      <h5 id={id} {...props}>{children}</h5>
                    ),
                    h6: ({ node, children, id, ...props }: any) => (
                      <h6 id={id} {...props}>{children}</h6>
                    ),
                    ul: ({ node, children, ...props }: any) => (
                      <ul {...props}>{children}</ul>
                    ),
                    ol: ({ node, children, ...props }: any) => (
                      <ol {...props}>{children}</ol>
                    ),
                    li: ({ node, children, ...props }: any) => (
                      <li {...props}>{children}</li>
                    ),
                    hr: ({ node, ...props }: any) => <hr {...props} />,
                    strong: ({ node, children, ...props }: any) => (
                      <strong {...props}>{children}</strong>
                    ),
                    em: ({ node, children, ...props }: any) => (
                      <em {...props}>{children}</em>
                    ),
                    del: ({ node, children, ...props }: any) => (
                      <del {...props}>{children}</del>
                    ),
                  }}
                >
                  {note.content}
                </ReactMarkdown>
              </div>

              {/* 投票区域 */}
              {polls.length > 0 && (
                <div className="px-4 sm:px-6 pb-5">
                  {polls.map(poll => (
                    <NotePoll
                      key={poll.id}
                      poll={poll}
                      notePassword={verifiedPassword || undefined}
                      onVoteSuccess={() => {
                        // 重新加载投票数据以更新结果
                        loadPolls();
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 问卷区域 */}
              {surveys.length > 0 && (
                <div className="px-4 sm:px-6 pb-5">
                  {surveys.map(survey => (
                    <NoteSurvey
                      key={survey.id}
                      survey={survey}
                      noteId={note?.id}
                      notePassword={verifiedPassword || undefined}
                      onSubmitSuccess={() => {
                        // 重新加载问卷数据以更新状态
                        loadSurveys();
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 抽奖区域 */}
              {lotteries.length > 0 && (
                <div className="px-4 sm:px-6 pb-5">
                  {lotteries.map(lottery => (
                    <NoteLottery
                      key={lottery.id}
                      lottery={lottery}
                      onEnterSuccess={() => {
                        // 重新加载抽奖数据以更新状态
                        loadLotteries();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 底部信息区 - 固定在article底部 */}
            <footer className="bg-bg-tertiary px-4 sm:px-6 py-4 border-t border-border-primary sm:rounded-b-xl mt-auto">
              {/* 文章来源 */}
              {note.source_type === 'reprint' && note.source_text && (
                <div className="flex items-start gap-2 text-xs text-text-tertiary mb-3 pb-3 border-b border-border-primary">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-text-tertiary">来源：</span>
                    <span>{note.source_text}</span>
                  </div>
                </div>
              )}

              {/* 元信息和操作按钮 */}
              <div className="flex flex-wrap items-center justify-between gap-y-3">
                {/* 左侧：元信息 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-tertiary">
                  {/* 时间 */}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <time dateTime={note.published_at || note.created_at}>
                      {formatDateTime(note.published_at || note.created_at)}
                    </time>
                  </div>

                  {/* 分类 */}
                  {note.category && (
                    <button
                      onClick={handleCategoryClick}
                      className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>{note.category}</span>
                    </button>
                  )}

                  {/* 标签 */}
                  {note.Tags && note.Tags.length > 0 && note.Tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.name)}
                      className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                      style={{ color: tag.color || 'var(--text-tertiary)' }}
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag.name}</span>
                    </button>
                  ))}

                  {/* 旧格式标签 */}
                  {(!note.Tags || note.Tags.length === 0) && note.tags && note.tags.split(',').map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => handleTagClick(tag.trim())}
                      className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag.trim()}</span>
                    </button>
                  ))}

                  {/* 原创/转载标签 */}
                  {note.source_type === 'original' && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-medium rounded">
                      原创
                    </span>
                  )}
                  {note.source_type === 'reprint' && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 text-primary-600 text-[10px] font-medium rounded">
                      转载
                    </span>
                  )}
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex items-center gap-2">
                  {hasDisks && (
                    <button
                      onClick={() => setShowDiskModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-100 text-primary-600 rounded-md hover:bg-primary-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载资源</span>
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </article>

          {/* 页脚版权 */}
          <SiteFooter showBorder={false} className="py-4 sm:py-6" />
          </div>
        </div>
      </main>

      {/* 电脑端右侧固定目录卡片 - 支持拖动 */}
      {tocItems.length > 0 && tocVisible && (
        <aside
          ref={tocRef}
          className="hidden lg:block fixed w-52 z-30 animate-fade-in select-none"
          style={{
            top: `${tocPosition.y}px`,
            right: `${tocPosition.x}px`,
          }}
        >
          <div className={`rounded-xl border border-border-primary shadow-lg bg-bg-secondary overflow-hidden ${isDragging ? 'opacity-90' : ''}`}>
            {/* 可拖动的标题栏 */}
            <div
              className="flex items-center justify-between px-3 py-2.5 border-b border-border-primary bg-bg-tertiary cursor-move"
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <BookOpen className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-text-primary">目录</span>
              </div>
              <button
                onClick={() => setTocVisible(false)}
                className="p-1 rounded hover:bg-bg-secondary text-text-tertiary pointer-events-auto"
                title="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-2 scrollbar-hide">
              <nav className="space-y-0.5">
                {tocItems.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    data-toc-id={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`toc-item w-full text-left text-[13px] py-1.5 px-2.5 rounded-lg truncate block ${index === 0 ? 'toc-active' : 'toc-inactive'}`}
                    style={{ paddingLeft: `${(item.level - 1) * 10 + 10}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>
      )}

      {/* 移动端目录遮罩 */}
      {tocOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setTocOpen(false)}
        />
      )}

      {/* 移动端右侧目录侧边栏 */}
      {tocOpen && (
        <aside className="fixed top-14 sm:top-16 right-0 z-50 w-72 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-bg-primary border-l border-border-primary lg:hidden flex flex-col animate-slide-in-right shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-text-primary">目录</span>
            </div>
            <button
              onClick={() => setTocOpen(false)}
              className="p-1 rounded hover:bg-bg-secondary text-text-tertiary"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {tocItems.length > 0 ? (
              <nav className="space-y-0.5">
                {tocItems.map((item, index) => (
                  <button
                    key={`mobile-${item.id}-${index}`}
                    data-toc-id={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`toc-item w-full text-left text-[13px] py-1.5 px-3 rounded-lg truncate block ${index === 0 ? 'toc-active' : 'toc-inactive'}`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">暂无目录</p>
            )}
          </div>
        </aside>
      )}

      {/* 密码验证弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div
            className="bg-bg-secondary rounded-xl max-w-sm w-full p-5 shadow-xl border border-border-primary"
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">需要密码访问</h3>
              <p className="text-xs text-text-tertiary">请输入密码查看笔记内容</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  name="note-access-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-3 py-2.5 text-sm border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                  autoComplete="off"
                  disabled={verifying}
                />
                {passwordError && (
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--error-text)' }}>{passwordError}</p>
                )}
                {errorCount > 0 && remaining > 0 && (
                  <p className="mt-1.5 text-xs text-text-tertiary">当前已输入错误{errorCount}次，还可以重试{remaining}次</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/notes')}
                  className="flex-1 px-3 py-2 text-sm bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-colors"
                  disabled={verifying}
                >
                  返回
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${remaining === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 disabled:opacity-50'} text-white`}
                  disabled={verifying || !password || remaining === 0}
                >
                  {verifying ? '验证中...' : remaining === 0 ? '暂不可用' : '确认'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 网盘弹窗 */}
      {note && (
        <DiskModal
          isOpen={showDiskModal}
          onClose={() => setShowDiskModal(false)}
          noteId={note.id}
          isAdmin={false}
          password={verifiedPassword}
        />
      )}

      {/* 图片预览 */}
      <ImageViewer
        images={imageList}
        currentIndex={currentImageIndex}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        onIndexChange={setCurrentImageIndex}
      />
    </div>
  );
}
