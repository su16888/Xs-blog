'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export default function ImageViewer({ images, currentIndex, isOpen, onClose, onIndexChange }: ImageViewerProps) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const minSwipeDistance = 50;

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // 锁定背景滚动
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      // 存储滚动位置以便恢复
      document.body.dataset.scrollY = String(scrollY);
      document.body.dataset.scrollX = String(scrollX);
    } else {
      // 恢复滚动
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
      const scrollX = parseInt(document.body.dataset.scrollX || '0', 10);

      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.height = '';

      window.scrollTo(scrollX, scrollY);
    }
    return () => {
      // 清理时恢复滚动
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
      const scrollX = parseInt(document.body.dataset.scrollX || '0', 10);

      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.height = '';

      window.scrollTo(scrollX, scrollY);
    };
  }, [isOpen]);

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
  }, [isOpen, index, zoom, images]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isMobile) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => {
      const newZoom = Math.min(Math.max(prev + delta, 0.5), 3);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, [isMobile]);

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

  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setInitialPinchDistance(getDistance(e.touches));
      setInitialZoom(zoom);
      setIsSwiping(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (zoom > 1) {
        setIsDragging(true);
        dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      } else {
        setTouchStart({ x: touch.clientX, y: touch.clientY });
        setTouchEnd(null);
        setIsSwiping(true);
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
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
        const newX = touch.clientX - dragStart.current.x;
        const newY = touch.clientY - dragStart.current.y;
        setPosition({ x: newX, y: newY });
      } else if (isSwiping && zoom <= 1) {
        setTouchEnd({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  const onTouchEnd = () => {
    setInitialPinchDistance(null);
    setIsDragging(false);

    if (isSwiping && touchStart && touchEnd && zoom <= 1) {
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = Math.abs(touchStart.y - touchEnd.y);

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

  const handleNext = () => {
    if (images.length <= 1) return;
    const newIndex = (index + 1) % images.length;
    setIndex(newIndex);
    onIndexChange?.(newIndex);
    resetZoomAndPosition();
  };

  const handlePrevious = () => {
    if (images.length <= 1) return;
    const newIndex = (index - 1 + images.length) % images.length;
    setIndex(newIndex);
    onIndexChange?.(newIndex);
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

  const handleDownload = () => {
    const imageUrl = images[index];
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image-${index + 1}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
        <div
          className="relative w-full h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部工具栏 */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="w-10"></div>

              <div className="flex-1 flex justify-center">
                {images.length > 1 && (
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-sm font-medium">
                      {index + 1} / {images.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="下载图片"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="关闭"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* 中间内容区域 */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-20"></div>

            <div
              className="relative flex-shrink-0 px-4 lg:px-24"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <img
                key={index}
                src={images[index]}
                alt={`图片 ${index + 1}`}
                className="max-w-full object-contain mx-auto select-none"
                draggable={false}
                style={{
                  transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  maxHeight: 'calc(100vh - 200px)',
                  maxWidth: '100%',
                  touchAction: 'none'
                }}
              />

              {/* 左右切换按钮 - 仅电脑端显示 */}
              {images.length > 1 && !isMobile && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
                    title="上一张 (←)"
                  >
                    <ChevronLeft className="w-6 h-6 text-white/60" />
                  </button>

                  <button
                    onClick={handleNext}
                    className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
                    title="下一张 (→)"
                  >
                    <ChevronRight className="w-6 h-6 text-white/60" />
                  </button>
                </>
              )}
            </div>

            <div className="h-20"></div>
          </div>

          {/* 底部区域：放大缩小控制器 */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {!isMobile && (
              <div className="flex justify-center pb-6">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
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
            )}

            {/* 底部缩略图 */}
            {images.length > 1 && (
              <div className="bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex justify-center max-w-7xl mx-auto">
                  <div
                    className="flex gap-2 overflow-x-auto hide-scrollbar"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    {images.map((image, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setIndex(i);
                          onIndexChange?.(i);
                          resetZoomAndPosition();
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          i === index
                            ? 'border-primary-500 opacity-100'
                            : 'border-white/20 opacity-50 hover:opacity-75'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`缩略图 ${i + 1}`}
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
        </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

