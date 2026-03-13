'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl, getImageUrl } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext'
import { useRouter } from 'next/navigation';
import './SocialFeed.css';

interface Profile {
  cover_image: string;
  avatar: string;
  nickname: string;
  signature: string;
  custom_copyright: string;
}

interface Post {
  id: number;
  content: string;
  images: string[];
  thumbnails?: string[];  // 缩略图路径数组
  video: string | null;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
}

// 判断是否是视频文件 - 移到组件外部
// 支持标准视频扩展名和带 #.mp4 标记的URL（用于抖音等第三方视频）
const isVideoFile = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  const lowerUrl = url.toLowerCase();
  // 检查标准扩展名或 #.mp4 标记
  return videoExtensions.some(ext => lowerUrl.endsWith(ext) || lowerUrl.endsWith('#' + ext.slice(1)));
};

// 懒加载图片组件 - 使用 IntersectionObserver
const LazyImage = ({
  src,
  alt,
  onClick,
  className = ''
}: {
  src: string,
  alt: string,
  onClick?: () => void,
  className?: string
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, []);

  // 处理图片加载错误 - 对于第三方图片，直接使用原图
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      data-src={src}
      alt={alt}
      onClick={onClick}
      className={`${className} ${isLoaded ? 'sf-img-loaded' : 'sf-img-loading'}`}
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
      style={{
        backgroundColor: isLoaded ? 'transparent' : undefined,
        display: hasError && !isLoaded ? 'none' : undefined
      }}
    />
  );
};

// 清理视频URL - 移除 #.mp4 等标记
const cleanVideoUrl = (url: string) => {
  // 移除 #.mp4, #.webm 等标记
  return url.replace(/#\.(mp4|webm|ogg|mov|avi)$/i, '');
};

// 判断是否是外部URL（第三方存储）
const isExternalUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://');
};

// 懒加载视频组件 - 只预加载 metadata，点击才加载完整视频，离开视口自动暂停
const LazyVideo = ({ video, images }: { video: string | null, images: string[] }) => {
  const rawVideoUrl = video || images.find(img => isVideoFile(img));
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);

  // 懒加载 - 进入视口时加载视频
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 离开视口时暂停视频
  useEffect(() => {
    const container = containerRef.current;
    const videoEl = videoRef.current;
    if (!container || !videoEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !videoEl.paused) {
            videoEl.pause();
          }
        });
      },
      { threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isInView]); // 只在视频加载后才启动这个 observer

  if (!rawVideoUrl) return null;

  // 清理URL并判断是否是外部链接
  const cleanedUrl = cleanVideoUrl(rawVideoUrl);
  const isExternal = isExternalUrl(cleanedUrl);
  // 外部视频通过后端代理播放（解决跨域和防盗链问题）
  const finalVideoUrl = isExternal
    ? getApiUrl(`/proxy/video?url=${encodeURIComponent(cleanedUrl)}`)
    : getImageUrl(cleanedUrl);

  const handlePlay = () => {
    setIsActivated(true);
    setShowPlayButton(false);
    setTimeout(() => {
      videoRef.current?.play();
    }, 100);
  };

  const handleVideoPlay = () => {
    setShowPlayButton(false);
  };

  const handleVideoPause = () => {
    setShowPlayButton(true);
  };

  return (
    <div className="sf-video" ref={containerRef}>
      {isInView && (
        <div className="sf-video-wrapper">
          <video
            ref={videoRef}
            src={finalVideoUrl}
            controls
            preload={isActivated ? 'auto' : 'metadata'}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            playsInline
          />
          {showPlayButton && (
            <div className="sf-video-play-btn" onClick={handlePlay}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 图片网格组件 - 使用懒加载和缩略图
const ImageGrid = ({
  images,
  thumbnails,
  isFourImages = false,
  onImageClick
}: {
  images: string[],
  thumbnails?: string[],
  isFourImages?: boolean,
  onImageClick: (images: string[], index: number) => void
}) => {
  const imageFiles = images.filter(img => !isVideoFile(img));
  if (imageFiles.length === 0) return null;

  // 获取对应的缩略图，如果没有则使用原图
  // 对于第三方存储的图片（外部URL），直接使用原图，不使用缩略图
  const getThumbnail = (index: number) => {
    const originalUrl = imageFiles[index];
    // 如果是外部URL，直接返回原图
    if (isExternalUrl(originalUrl)) {
      return originalUrl;
    }
    // 本地图片使用缩略图
    if (thumbnails && thumbnails[index]) {
      return getImageUrl(thumbnails[index]);
    }
    return getImageUrl(originalUrl);
  };

  if (imageFiles.length === 1) {
    return (
      <div className="sf-pic-grid sf-pic-1">
        <LazyImage
          src={getThumbnail(0)}
          onClick={() => onImageClick(imageFiles, 0)}
          alt="动态图片"
        />
      </div>
    );
  }

  return (
    <div className={`sf-pic-grid ${isFourImages ? 'sf-pic-4' : ''}`}>
      {imageFiles.map((img, index) => (
        <LazyImage
          key={index}
          src={getThumbnail(index)}
          onClick={() => onImageClick(imageFiles, index)}
          alt={`动态图片${index + 1}`}
        />
      ))}
    </div>
  );
};

// 可展开/收起的文本组件 - 使用 memo 防止不必要的重新渲染
const ExpandableText = React.memo(({ content, maxLines = 4 }: { content: string, maxLines?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const fullTextRef = useRef<HTMLDivElement>(null);
  const contentIdRef = useRef(0);

  // 检查内容是否包含 iframe
  const hasIframe = content && content.includes('<iframe');

  // 分离文字内容和 iframe 内容
  const separateContent = (text: string) => {
    if (!text) return { textPart: '', iframePart: '' };

    // 匹配 iframe 标签（支持自闭合 <iframe ... /> 和带结束标签 <iframe>...</iframe> 两种格式）
    const iframeRegex = /<iframe[^>]*(?:\/>|>[\s\S]*?<\/iframe>)/gi;
    const iframes = text.match(iframeRegex) || [];
    const textPart = text.replace(iframeRegex, '').trim();
    const iframePart = iframes.join('');

    return { textPart, iframePart };
  };

  const { textPart, iframePart } = separateContent(content);

  // 处理内容：换行符转 <br>，处理 iframe
  const processContent = (text: string) => {
    if (!text) return '';
    // 先将换行符转换为 <br>
    let processed = text.replace(/\n/g, '<br>');
    // 处理 iframe 禁止自动播放，并添加 loading="lazy" 和 referrerPolicy="no-referrer"
    // 网易云音乐 iframe 添加包裹容器（用于深色模式裁剪阴影）
    // 支持自闭合 <iframe ... /> 和带结束标签 <iframe>...</iframe> 两种格式
    // 支持 src 属性使用双引号或单引号
    processed = processed.replace(/<iframe([^>]*)src=["']([^"']*)["']([^>]*)(\/?>(?:[\s\S]*?<\/iframe>)?)/gi, (match, before, src, after, ending) => {
      let newSrc = src;
      if (!src.includes('autoplay=')) {
        newSrc = src + (src.includes('?') ? '&' : '?') + 'autoplay=0';
      } else {
        newSrc = src.replace(/autoplay=1/gi, 'autoplay=0');
      }
      // 添加 loading="lazy" 防止不必要的重新加载
      const hasLoading = before.includes('loading=') || after.includes('loading=');
      const loadingAttr = hasLoading ? '' : ' loading="lazy"';

      // 添加 referrerPolicy="no-referrer" 解决网易云音乐等第三方 iframe 302 重定向问题
      const hasReferrerPolicy = before.includes('referrerPolicy=') || after.includes('referrerPolicy=') || before.includes('referrerpolicy=') || after.includes('referrerpolicy=');
      const referrerAttr = hasReferrerPolicy ? '' : ' referrerPolicy="no-referrer"';

      // 统一转换为带结束标签的格式
      const iframeContent = ending.includes('</iframe>') ? ending.replace(/^\/?>/,'').replace(/<\/iframe>$/i, '') : '';
      const iframeHtml = `<iframe${before}src="${newSrc}"${after}${loadingAttr}${referrerAttr}>${iframeContent}</iframe>`;

      // 网易云音乐 iframe 用容器包裹（深色模式下用于裁剪阴影）
      if (src.includes('music.163.com')) {
        return `<div class="sf-music163-wrapper">${iframeHtml}</div>`;
      }
      return iframeHtml;
    });
    return processed;
  };

  const processedTextHtml = processContent(textPart);
  const processedIframeHtml = processContent(iframePart);

  // 只在 content 变化时更新 key
  useEffect(() => {
    contentIdRef.current += 1;
  }, [content]);

  // 检测文字部分是否需要展开按钮
  useEffect(() => {
    const checkHeight = () => {
      const textEl = textRef.current;
      const fullEl = fullTextRef.current;
      if (!textEl || !fullEl) return;

      // 只检测文字部分的高度
      const lineHeight = parseFloat(getComputedStyle(textEl).lineHeight) || 21;
      const maxHeight = lineHeight * maxLines;

      const actualHeight = fullEl.scrollHeight;
      if (actualHeight > maxHeight + 5) {
        setNeedsExpand(true);
      } else {
        setNeedsExpand(false);
      }
    };

    // 延迟检测，确保 DOM 渲染完成
    const timer = setTimeout(checkHeight, 100);
    return () => {
      clearTimeout(timer);
    };
  }, [textPart, maxLines]);

  // 使用 key 来控制 iframe 的重新渲染，只有 content 变化时才重新渲染
  const contentKey = `content-${contentIdRef.current}`;

  // 如果有 iframe，分开渲染文字和 iframe
  if (hasIframe) {
    return (
      <div className="sf-text-wrapper">
        {/* 文字部分 */}
        {textPart && (
          <>
            {/* 隐藏的完整文字内容，用于测量高度 */}
            <div
              ref={fullTextRef}
              className="sf-text sf-text-measure"
              dangerouslySetInnerHTML={{ __html: processedTextHtml }}
              style={{ position: 'absolute', visibility: 'hidden', width: '100%', pointerEvents: 'none' }}
            />

            {/* 显示的文字内容 */}
            <div
              ref={textRef}
              className={`sf-text ${!isExpanded && needsExpand ? 'sf-text-collapsed' : ''}`}
              style={!isExpanded && needsExpand ? {
                WebkitLineClamp: maxLines,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              } as React.CSSProperties : undefined}
              dangerouslySetInnerHTML={{ __html: processedTextHtml }}
            />

            {/* 展开/收起按钮 - 放在 iframe 上方 */}
            {needsExpand && (
              <span
                className="sf-text-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '收起' : '展开'}
              </span>
            )}
          </>
        )}

        {/* iframe 部分 - 始终完整显示 */}
        <div
          className="sf-text sf-iframe-container"
          dangerouslySetInnerHTML={{ __html: processedIframeHtml }}
        />
      </div>
    );
  }

  // 没有 iframe 的情况，保持原有逻辑
  const processedHtml = processContent(content);

  return (
    <div className="sf-text-wrapper">
      {/* 隐藏的完整内容，用于测量高度 */}
      <div
        ref={fullTextRef}
        className="sf-text sf-text-measure"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        style={{ position: 'absolute', visibility: 'hidden', width: '100%', pointerEvents: 'none' }}
      />

      {/* 显示的内容 */}
      <div
        key={contentKey}
        ref={textRef}
        className={`sf-text ${!isExpanded && needsExpand ? 'sf-text-collapsed' : ''}`}
        style={!isExpanded && needsExpand ? {
          WebkitLineClamp: maxLines,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        } as React.CSSProperties : undefined}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />

      {/* 展开/收起按钮 */}
      {needsExpand && (
        <span
          className="sf-text-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '展开'}
        </span>
      )}
    </div>
  );
});

export default function SocialFeedPage() {
  const router = useRouter();
  const { settings } = useSettings()
  const [profile, setProfile] = useState<Profile>({
    cover_image: '',
    avatar: '',
    nickname: '朋友圈',
    signature: '',
    custom_copyright: ''
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分页状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const POSTS_PER_PAGE = 10;

  // Lightbox 状态
  const [currentImageList, setCurrentImageList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // 触摸滑动状态
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 图片缩放和拖动状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 回到顶部悬浮球状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Lightbox 图片加载状态
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});

  // 页面独立主题状态 - 默认浅色
  const [isDark, setIsDark] = useState(false);

  // 朋友圈主题模式状态
  const [socialFeedThemeEnabled, setSocialFeedThemeEnabled] = useState(false);

  // 页面文本配置状态 - 初始值为空，避免覆盖 layout 中设置的标题
  const [pageTextConfig, setPageTextConfig] = useState({
    browserTitle: '',
    browserSubtitle: ''
  });

  // 设置浏览器标题（仅使用 browserTitle，不受网站标题、副标题影响）
  useEffect(() => {
    if (!pageTextConfig.browserTitle) return;
    let title = pageTextConfig.browserTitle;
    if (pageTextConfig.browserSubtitle) {
      title = `${title} - ${pageTextConfig.browserSubtitle}`;
    }
    document.title = title;
  }, [pageTextConfig.browserTitle, pageTextConfig.browserSubtitle]);

  // 获取系统设置和页面文本配置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // 并行获取设置和页面文本配置
        const [settingsRes, pageTextsRes] = await Promise.all([
          fetch(getApiUrl('/settings')),
          fetch(getApiUrl('/page-texts/socialFeed'))
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.success && data.data) {
            const settingsObj: Record<string, string> = {};
            data.data.forEach((item: { key: string; value: string }) => {
              settingsObj[item.key] = item.value;
            });
            setSocialFeedThemeEnabled(settingsObj.socialFeedThemeEnabled === 'true');
          }
        }

        if (pageTextsRes.ok) {
          const data = await pageTextsRes.json();
          if (data.success && data.data) {
            setPageTextConfig({
              browserTitle: data.data.browserTitle || '朋友圈',
              browserSubtitle: data.data.browserSubtitle || ''
            });
          }
        }
      } catch (err) {
        console.error('获取设置失败:', err);
      }
    };
    fetchSettings();
  }, []);

  // 触摸滑动处理 - 最小滑动距离
  const minSwipeDistance = 50;

  // 计算两指之间的距离
  const getPinchDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指触摸 - 开始缩放
      e.preventDefault();
      setLastPinchDistance(getPinchDistance(e.touches));
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        // 已缩放状态 - 开始拖动
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        });
      } else {
        // 未缩放状态 - 滑动切换图片
        setTouchEnd(null);
        setTouchStart(e.touches[0].clientX);
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      // 双指缩放
      e.preventDefault();
      const currentDistance = getPinchDistance(e.touches);
      const delta = currentDistance / lastPinchDistance;
      setLastPinchDistance(currentDistance);
      setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
    } else if (e.touches.length === 1) {
      if (isDragging && scale > 1) {
        // 拖动图片
        e.preventDefault();
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y
        });
      } else if (scale === 1) {
        // 滑动切换
        setTouchEnd(e.touches[0].clientX);
      }
    }
  };

  const onTouchEnd = () => {
    setLastPinchDistance(null);
    setIsDragging(false);

    // 只有在未缩放状态下才处理滑动切换
    if (scale === 1 && touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && currentIndex < currentImageList.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // 鼠标滚轮缩放（电脑端）
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const newScale = Math.min(Math.max(prev * delta, 1), 5);
      // 如果缩放回1，重置位置
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  // 鼠标拖动（电脑端）
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  // 双击重置缩放
  const onDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  // 切换图片时重置缩放状态
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // 加载更多帖子
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const res = await fetch(getApiUrl(`/social-feed/posts?page=${page + 1}&limit=${POSTS_PER_PAGE}`));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.posts) {
          const newPosts = data.data.posts;
          if (newPosts.length < POSTS_PER_PAGE) {
            setHasMore(false);
          }
          if (newPosts.length > 0) {
            setPosts(prev => [...prev, ...newPosts]);
            setPage(prev => prev + 1);
          } else {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore]);

  // 无限滚动 - IntersectionObserver
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(loadMoreElement);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMorePosts]);

  // 初始加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileRes, postsRes] = await Promise.all([
          fetch(getApiUrl('/social-feed/profile')),
          fetch(getApiUrl(`/social-feed/posts?page=1&limit=${POSTS_PER_PAGE}`))
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.success && profileData.data) {
            setProfile(profileData.data);
          }
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (postsData.success && postsData.data?.posts) {
            const fetchedPosts = postsData.data.posts;
            setPosts(fetchedPosts);
            // 判断是否还有更多
            if (fetchedPosts.length < POSTS_PER_PAGE) {
              setHasMore(false);
            }
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        setError('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 键盘事件监听 - 用于 Lightbox 左右切换和关闭
  useEffect(() => {
    if (!showLightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < currentImageList.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, currentIndex, currentImageList.length]);

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 切换主题
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

  // 打开图片预览
  const openGallery = useCallback((images: string[], index: number) => {
    // 处理图片URL，外部URL直接使用，本地图片使用getImageUrl
    const processedImages = images.map(img => {
      if (isExternalUrl(img)) {
        return img;
      }
      return getImageUrl(img);
    });
    setCurrentImageList(processedImages);
    setCurrentIndex(index);
    setImageLoadingStates({}); // 重置加载状态
    setShowLightbox(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // 关闭图片预览
  const closeLightbox = () => {
    setShowLightbox(false);
    document.body.style.overflow = '';
    setCurrentIndex(0);
    setCurrentImageList([]);
  };

  // 切换图片
  const changeImage = (direction: number) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < currentImageList.length) {
      setCurrentIndex(newIndex);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className={`sf-page ${isDark ? 'sf-dark' : 'sf-light'}`}>
        <div className="sf-loading">
          <div className="sf-loading-spinner"></div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`sf-page ${isDark ? 'sf-dark' : 'sf-light'}`}>
        <div className="sf-error">
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>😔</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`sf-page ${isDark ? 'sf-dark' : 'sf-light'}`}>
      <div className="sf-container">
        {/* 顶部封面 */}
        <div className="sf-header">
          {/* 返回按钮 - 朋友圈主题模式开启时隐藏 */}
          {!socialFeedThemeEnabled && (
            <div
              className="sf-back-home"
              onClick={() => router.back()}
              title="返回"
              style={{ cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </div>
          )}
          <img
            className="sf-cover"
            src={profile.cover_image ? getImageUrl(profile.cover_image) : '/pyqbj.png'}
            alt="封面"
          />
          <div className="sf-nickname">{profile.nickname || 'Arran'}</div>
          <div className="sf-signature">{profile.signature || '分享生活，记录美好时刻'}</div>
          <div className="sf-avatar">
            <img
              src={profile.avatar ? getImageUrl(profile.avatar) : '/pyqtx.png'}
              alt="头像"
            />
          </div>
        </div>

        {/* 动态列表 */}
        <div className="sf-feed-list">
          {posts.length === 0 ? (
            <div className="sf-empty">暂无动态</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="sf-feed-item">
                <div className="sf-avatar-col">
                  <img
                    src={profile.avatar ? getImageUrl(profile.avatar) : '/pyqtx.png'}
                    loading="lazy"
                    alt={profile.nickname}
                  />
                </div>
                <div className="sf-content-col">
                  <div className="sf-user-name">{profile.nickname || '朋友圈'}</div>
                  <ExpandableText content={post.content} maxLines={4} />

                  {/* 视频 - 兼容 video 字段和 images 中的视频，懒加载 */}
                  <LazyVideo video={post.video} images={post.images || []} />

                  {/* 图片网格 - 自动过滤视频文件，使用缩略图 */}
                  {post.images && post.images.length > 0 && (
                    <ImageGrid
                      images={post.images}
                      thumbnails={post.thumbnails}
                      isFourImages={post.images.filter(img => !isVideoFile(img)).length === 4}
                      onImageClick={openGallery}
                    />
                  )}

                  <div className="sf-footer">
                    <span className="sf-time">{formatTime(post.created_at)}</span>
                    {post.is_pinned && <span className="sf-pin">置顶</span>}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* 无限滚动触发器 */}
          {(hasMore || loadingMore) && (
            <div ref={loadMoreRef} className="sf-load-more">
              {loadingMore && <div className="sf-loading-more"><div className="sf-loading-spinner"></div></div>}
            </div>
          )}
        </div>

        {/* 版权信息 */}
        <div className="sf-copyright">
          <div
            className="sf-custom-copyright"
            dangerouslySetInnerHTML={{
              __html: profile.custom_copyright || settings.footerCopyright || `© ${new Date().getFullYear()} Xs-blog. All rights reserved.`
            }}
          />
        </div>

        {/* Lightbox */}
        {showLightbox && (
          <div
            className="sf-lightbox"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div className="sf-lb-close" onClick={closeLightbox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            {currentImageList.length > 1 && (
              <>
                <div
                  className={`sf-lb-prev ${currentIndex === 0 ? 'sf-lb-disabled' : ''}`}
                  onClick={() => changeImage(-1)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </div>
                <div
                  className={`sf-lb-next ${currentIndex === currentImageList.length - 1 ? 'sf-lb-disabled' : ''}`}
                  onClick={() => changeImage(1)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </>
            )}
            <div
              ref={imageContainerRef}
              className="sf-lb-img-container"
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onDoubleClick={onDoubleClick}
              style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {/* 加载中动画 */}
              {!imageLoadingStates[currentIndex] && (
                <div className="sf-lb-loading">
                  <div className="sf-lb-spinner"></div>
                </div>
              )}
              <img
                src={currentImageList[currentIndex]}
                alt="预览图片"
                className={`sf-lb-img ${imageLoadingStates[currentIndex] ? 'sf-lb-img-loaded' : 'sf-lb-img-loading'}`}
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                onLoad={() => setImageLoadingStates(prev => ({ ...prev, [currentIndex]: true }))}
                onError={() => setImageLoadingStates(prev => ({ ...prev, [currentIndex]: true }))}
                draggable={false}
              />
            </div>
            <div className="sf-lb-counter">
              {currentIndex + 1} / {currentImageList.length}
              {scale > 1 && <span className="sf-lb-zoom-indicator"> · {Math.round(scale * 100)}%</span>}
            </div>
          </div>
        )}
      </div>

      {/* 主题切换悬浮球 */}
      <div className="sf-theme-btn" onClick={toggleTheme} title={isDark ? '切换浅色' : '切换深色'}>
        {isDark ? (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>

      {/* 回到顶部悬浮球 */}
      <div
        className={`sf-back-top ${showBackToTop ? 'sf-visible' : ''}`}
        onClick={scrollToTop}
        title="回到顶部"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </div>
    </div>
  );
}
