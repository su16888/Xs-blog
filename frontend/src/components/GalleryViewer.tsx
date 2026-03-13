/**
 * @file GalleryViewer.tsx
 * @description 图册查看器组件 - 支持密码验证、图片预览、放大缩小、左右切换、下载等功能
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { getGallery, verifyGalleryPassword, getGalleryPasswordStatus } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';

interface GalleryImage {
  id: number;
  filename: string;
  path: string;
  sort_order: number;
  size?: number;
}

interface Gallery {
  id: number;
  title: string;
  description?: string;
  images: GalleryImage[];
  password?: string;
}

interface GalleryViewerProps {
  galleryId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function GalleryViewer({ galleryId, isOpen, onClose }: GalleryViewerProps) {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [remaining, setRemaining] = useState(3);

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);

  // 图片拖动相关状态
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });

  // 双指缩放相关状态
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

  // 触摸滑动相关状态（用于切换图片）
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // 缩略图容器引用
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 滑动最小距离（像素）
  const minSwipeDistance = 50;

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && galleryId) {
      loadGallery();
    }
  }, [isOpen, galleryId]);

  // 获取密码尝试状态
  useEffect(() => {
    const fetchPasswordStatus = async () => {
      try {
        const response = await getGalleryPasswordStatus();
        if (response?.success) {
          setErrorCount(response.errorCount || 0);
          setRemaining(response.remaining ?? 3);
        }
      } catch {
        // 静默处理，密码状态获取失败不影响主要功能
      }
    };
    if (requirePassword) {
      fetchPasswordStatus();
    }
  }, [requirePassword]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 当图片切换时，滚动缩略图到可见位置
  useEffect(() => {
    if (thumbnailContainerRef.current && thumbnailRefs.current[currentImageIndex]) {
      const container = thumbnailContainerRef.current;
      const thumbnail = thumbnailRefs.current[currentImageIndex];
      if (thumbnail) {
        const containerRect = container.getBoundingClientRect();
        const thumbnailRect = thumbnail.getBoundingClientRect();

        // 计算缩略图相对于容器的位置
        const thumbnailLeft = thumbnailRect.left - containerRect.left + container.scrollLeft;
        const thumbnailRight = thumbnailLeft + thumbnailRect.width;
        const containerWidth = containerRect.width;

        // 如果缩略图不在可见区域内，滚动到中间位置
        if (thumbnailLeft < container.scrollLeft || thumbnailRight > container.scrollLeft + containerWidth) {
          const scrollTo = thumbnailLeft - containerWidth / 2 + thumbnailRect.width / 2;
          container.scrollTo({
            left: Math.max(0, scrollTo),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentImageIndex]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex, zoom, gallery]);

  // 电脑端鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isMobile) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => {
      const newZoom = Math.min(Math.max(prev + delta, 0.5), 3);
      // 如果缩放回到1，重置位置
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, [isMobile]);

  // 电脑端鼠标拖动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile || zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [isMobile, zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || isMobile) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging, isMobile]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 计算两指之间的距离
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 处理触摸开始
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指缩放开始
      setInitialPinchDistance(getDistance(e.touches));
      setInitialZoom(zoom);
      setIsSwiping(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (zoom > 1) {
        // 放大状态下拖动
        setIsDragging(true);
        dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      } else {
        // 正常状态下滑动切换
        setTouchStart({ x: touch.clientX, y: touch.clientY });
        setTouchEnd(null);
        setIsSwiping(true);
      }
    }
  };

  // 处理触摸移动
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      // 双指缩放
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.min(Math.max(initialZoom * scale, 0.5), 3);
      setZoom(newZoom);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isDragging && zoom > 1) {
        // 放大状态下拖动
        const newX = touch.clientX - dragStart.current.x;
        const newY = touch.clientY - dragStart.current.y;
        setPosition({ x: newX, y: newY });
      } else if (isSwiping && zoom <= 1) {
        // 正常状态下记录滑动位置
        setTouchEnd({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  // 处理触摸结束
  const onTouchEnd = () => {
    setInitialPinchDistance(null);
    setIsDragging(false);

    // 处理滑动切换
    if (isSwiping && touchStart && touchEnd && zoom <= 1) {
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = Math.abs(touchStart.y - touchEnd.y);

      // 确保是水平滑动（水平距离大于垂直距离）
      if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
        if (distanceX > 0) {
          handleNext();
        } else {
          handlePrevious();
        }
      }
    }

    setIsSwiping(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const loadGallery = async (pwd?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getGallery(galleryId, pwd);

      if (response.success) {
        setGallery(response.data);
        setRequirePassword(false);
        setPasswordError('');
      } else if (response.requirePassword) {
        setRequirePassword(true);
      } else {
        setError(response.message || '加载图册失败');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (err.response?.data?.requirePassword) {
          setRequirePassword(true);
        } else {
          setRequirePassword(true);
          setPasswordError('密码错误');
        }
      } else {
        setError('加载图册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setPasswordError('请输入密码');
      return;
    }

    setVerifyingPassword(true);
    setPasswordError('');

    try {
      const response = await verifyGalleryPassword(galleryId, password);
      if (response.success) {
        // 密码验证成功，加载图册
        await loadGallery(password);
        setErrorCount(0);
        setRemaining(3);
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errorCount !== undefined) {
        setErrorCount(data.errorCount);
        setRemaining(data.remaining);
      }
      if (err.response?.status === 429) {
        setPasswordError('密码错误次数过多，请1小时后重试！');
      } else if (err.response?.status === 401) {
        setPasswordError(data?.remaining > 0 ? '密码错误' : '密码错误次数过多，请1小时后重试！');
      } else {
        setPasswordError('验证失败，请稍后重试');
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleNext = () => {
    if (!gallery || gallery.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % gallery.images.length);
    resetZoomAndPosition();
  };

  const handlePrevious = () => {
    if (!gallery || gallery.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + gallery.images.length) % gallery.images.length);
    resetZoomAndPosition();
  };

  const resetZoomAndPosition = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 0.5);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleDownloadCurrent = () => {
    if (!gallery || gallery.images.length === 0) return;

    const currentImage = gallery.images[currentImageIndex];
    const imageUrl = getFileUrl(currentImage.path);

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = currentImage.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setCurrentImageIndex(0);
    setGallery(null);
    setRequirePassword(false);
    setPassword('');
    setPasswordError('');
    onClose();
  };

  if (!isOpen) return null;

  // 计算移动端各区域高度
  const mobileTopBarHeight = 44; // 顶部操作栏高度
  const mobileBottomBarHeight = gallery && gallery.images.length > 1 ? 100 : 0; // 底部缩略图高度
  const mobileImagePadding = 16; // 图片与顶部/底部的间距

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black animate-fade-in"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        height: '100dvh'
      }}
      onClick={handleClose}
    >
        <div
          className="gallery-viewer-container relative w-full overflow-hidden flex flex-col"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'none',
            height: '100dvh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* WAP端布局 */}
          {isMobile ? (
            <>
              {/* 顶部工具栏 - 固定在顶部 */}
              <div
                className="flex-shrink-0 z-20 bg-black/80 px-2 flex items-center justify-end"
                style={{ height: `${mobileTopBarHeight}px` }}
              >
                <div className="flex items-center gap-2">
                  {!loading && !requirePassword && gallery && gallery.images.length > 0 && (
                    <button
                      onClick={handleDownloadCurrent}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="下载当前图片"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  )}
                  {!requirePassword && (
                    <button
                      onClick={handleClose}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="关闭"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* 中间图片区域 - 垂直居中 */}
              <div
                className="flex-1 flex items-center justify-center overflow-hidden"
                style={{ touchAction: 'none', overscrollBehavior: 'none', minHeight: 0 }}
              >
                {loading && (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white">加载中...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center">
                    <p className="text-red-400 text-lg mb-4">{error}</p>
                    <button onClick={handleClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">关闭</button>
                  </div>
                )}

                {requirePassword && (
                  <div
                    className="w-full max-w-sm bg-bg-secondary rounded-xl p-5 shadow-xl border border-border-primary relative mx-4"
                  >
                    <div className="text-center mb-5">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6 text-primary-600" />
                      </div>
                      <h3 className="text-base font-bold text-text-primary mb-1">需要密码访问</h3>
                      <p className="text-xs text-text-tertiary">请输入密码查看图册内容</p>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="space-y-3">
                      <div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="gallery-access-password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                            placeholder="请输入密码"
                            className={`w-full px-3 py-2.5 pr-10 text-sm border ${passwordError ? 'border-red-500' : 'border-border-primary'} rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                            autoFocus
                            autoComplete="off"
                            disabled={verifyingPassword}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordError && <p className="mt-1.5 text-xs" style={{ color: 'var(--error-text)' }}>{passwordError}</p>}
                        {errorCount > 0 && remaining > 0 && (
                          <p className="mt-1.5 text-xs text-text-tertiary">当前已输入错误{errorCount}次，还可以重试{remaining}次</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex-1 px-3 py-2 text-sm bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-colors"
                          disabled={verifyingPassword}
                        >
                          返回
                        </button>
                        <button
                          type="submit"
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${remaining === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 disabled:opacity-50'} text-white`}
                          disabled={verifyingPassword || !password || remaining === 0}
                        >
                          {verifyingPassword ? '验证中...' : remaining === 0 ? '暂不可用' : '确认'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {!loading && !error && !requirePassword && gallery && gallery.images.length > 0 && (
                  <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none', overscrollBehavior: 'none' }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <img
                      key={currentImageIndex}
                      src={getFileUrl(gallery.images[currentImageIndex].path)}
                      alt={gallery.images[currentImageIndex].filename}
                      className="select-none"
                      draggable={false}
                      style={{
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        width: '100%',
                        objectFit: 'contain',
                        touchAction: 'none'
                      }}
                    />
                    {gallery.images.length > 1 && (
                      <>
                        <button onClick={handlePrevious} className="absolute top-1/2 -translate-y-1/2 left-1 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm z-10" title="上一张">
                          <ChevronLeft className="w-5 h-5 text-white/80" />
                        </button>
                        <button onClick={handleNext} className="absolute top-1/2 -translate-y-1/2 right-1 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm z-10" title="下一张">
                          <ChevronRight className="w-5 h-5 text-white/80" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!loading && !error && !requirePassword && gallery && gallery.images.length === 0 && (
                  <div className="text-center text-white">
                    <p className="text-lg mb-4">该图册暂无图片</p>
                    <button onClick={handleClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">关闭</button>
                  </div>
                )}
              </div>

              {/* 底部区域 - 计数器 + 缩略图 */}
              {!loading && !error && !requirePassword && gallery && gallery.images.length > 1 && (
                <div className="flex-shrink-0 z-20 bg-black/80 px-2 py-2">
                  {/* 图片计数器 */}
                  <div className="flex justify-center mb-2">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-white text-sm font-medium">
                        {currentImageIndex + 1} / {gallery.images.length}
                      </span>
                    </div>
                  </div>
                  {/* 缩略图 */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={thumbnailContainerRef}
                      className="flex gap-2 overflow-x-auto hide-scrollbar"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      {gallery.images.map((image, index) => (
                        <button
                          key={image.id}
                          ref={(el) => { thumbnailRefs.current[index] = el; }}
                          onClick={() => { setCurrentImageIndex(index); resetZoomAndPosition(); }}
                          className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex ? 'border-primary-500 opacity-100' : 'border-white/20 opacity-50 hover:opacity-75'}`}
                          style={{ width: '56px', height: '56px' }}
                        >
                          <img src={getFileUrl(image.path)} alt={image.filename} className="w-full h-full object-cover" draggable={false} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* PC端布局 */
            <>
              {/* 顶部工具栏 */}
              <div className="flex-shrink-0 z-20 bg-black/80 px-2 flex items-center" style={{ height: '56px' }}>
                <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
                  <div className="w-10"></div>
                  <div className="flex-1 flex justify-center">
                    {!loading && !requirePassword && gallery && gallery.images.length > 1 && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                        <span className="text-white text-sm font-medium">
                          {currentImageIndex + 1} / {gallery.images.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!loading && !requirePassword && gallery && gallery.images.length > 0 && (
                      <button
                        onClick={handleDownloadCurrent}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="下载当前图片"
                      >
                        <Download className="w-5 h-5 text-white" />
                      </button>
                    )}
                    {!requirePassword && (
                      <button
                        onClick={handleClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="关闭"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 中间内容区域 - 自适应剩余高度 */}
              <div
                className="flex-1 flex flex-col items-center justify-center overflow-hidden"
                style={{
                  touchAction: 'none',
                  overscrollBehavior: 'none'
                }}
              >
                {loading && (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white">加载中...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center">
                    <p className="text-red-400 text-lg mb-4">{error}</p>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                )}

                {requirePassword && (
                  <div
                    className="w-full max-w-sm bg-bg-secondary rounded-xl p-5 shadow-xl border border-border-primary relative mx-4"
                  >
                    <div className="text-center mb-5">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6 text-primary-600" />
                      </div>
                      <h3 className="text-base font-bold text-text-primary mb-1">需要密码访问</h3>
                      <p className="text-xs text-text-tertiary">请输入密码查看图册内容</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-3">
                      <div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="gallery-access-password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPasswordError('');
                            }}
                            placeholder="请输入密码"
                            className={`w-full px-3 py-2.5 pr-10 text-sm border ${
                              passwordError ? 'border-red-500' : 'border-border-primary'
                            } rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                            autoFocus
                            autoComplete="off"
                            disabled={verifyingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordError && <p className="mt-1.5 text-xs" style={{ color: 'var(--error-text)' }}>{passwordError}</p>}
                        {errorCount > 0 && remaining > 0 && (
                          <p className="mt-1.5 text-xs text-text-tertiary">当前已输入错误{errorCount}次，还可以重试{remaining}次</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex-1 px-3 py-2 text-sm bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary transition-colors"
                          disabled={verifyingPassword}
                        >
                          返回
                        </button>
                        <button
                          type="submit"
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${remaining === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 disabled:opacity-50'} text-white`}
                          disabled={verifyingPassword || !password || remaining === 0}
                        >
                          {verifyingPassword ? '验证中...' : remaining === 0 ? '暂不可用' : '确认'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {!loading && !error && !requirePassword && gallery && gallery.images.length > 0 && (
                  <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                      cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      touchAction: 'none',
                      overscrollBehavior: 'none',
                      padding: '20px 80px'
                    }}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      key={currentImageIndex}
                      src={getFileUrl(gallery.images[currentImageIndex].path)}
                      alt={gallery.images[currentImageIndex].filename}
                      className="select-none"
                      draggable={false}
                      style={{
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.3s ease-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        touchAction: 'none'
                      }}
                    />

                    {gallery.images.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevious}
                          className="absolute top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm z-10 left-4 lg:left-8"
                          title="上一张 (←)"
                        >
                          <ChevronLeft className="w-6 h-6 text-white/80" />
                        </button>

                        <button
                          onClick={handleNext}
                          className="absolute top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm z-10 right-4 lg:right-8"
                          title="下一张 (→)"
                        >
                          <ChevronRight className="w-6 h-6 text-white/80" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!loading && !error && !requirePassword && gallery && gallery.images.length === 0 && (
                  <div className="text-center text-white">
                    <p className="text-lg mb-4">该图册暂无图片</p>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                )}
              </div>

              {/* 底部区域：放大缩小控制器 + 缩略图 */}
              {!loading && !error && !requirePassword && gallery && gallery.images.length > 0 && (
                <div className="flex-shrink-0 z-20 bg-black/80">
                  <div className="flex justify-center py-2">
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <button
                        onClick={handleZoomOut}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="缩小"
                      >
                        <ZoomOut className="w-4 h-4 text-white" />
                      </button>

                      <span className="text-white text-xs min-w-[50px] text-center font-medium">
                        {Math.round(zoom * 100)}%
                      </span>

                      <button
                        onClick={handleZoomIn}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="放大"
                      >
                        <ZoomIn className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {gallery.images.length > 1 && (
                    <div className="px-2 pb-2 pt-1">
                      <div className="flex justify-center max-w-7xl mx-auto h-full items-center">
                        <div
                          ref={thumbnailContainerRef}
                          className="flex gap-2 overflow-x-auto hide-scrollbar"
                          style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch'
                          }}
                        >
                          {gallery.images.map((image, index) => (
                            <button
                              key={image.id}
                              ref={(el) => { thumbnailRefs.current[index] = el; }}
                              onClick={() => {
                                setCurrentImageIndex(index);
                                resetZoomAndPosition();
                              }}
                              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                index === currentImageIndex
                                  ? 'border-primary-500 opacity-100'
                                  : 'border-white/20 opacity-50 hover:opacity-75'
                              }`}
                              style={{ width: '64px', height: '64px' }}
                            >
                              <img
                                src={getFileUrl(image.path)}
                                alt={image.filename}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

