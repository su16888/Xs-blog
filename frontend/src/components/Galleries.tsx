'use client';

import { Image as ImageIcon, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getGalleries } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import GalleryViewer from './GalleryViewer';

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

interface GalleriesProps {
  searchQuery?: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function Galleries({ searchQuery = '', limit, showViewAll }: GalleriesProps) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<number | null>(null);

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const response = await getGalleries({});

      // 后端返回格式: { success: true, data: [...] }
      if (response.success && response.data) {
        // 如果提供了 limit，则显示 limit 个，否则显示全部（或者保持原有的12个限制，如果需要的话。这里改为显示全部，由 render 时的 limit 控制）
        // 原逻辑是 slice(0, 12)。如果传入 limit，则使用 limit。
        // 为了支持“查看全部”页面显示更多，如果 limit 未定义，则显示更多（比如50或全部）。
        // 但为了保持兼容性，如果 limit 未定义，保持 12？或者如果 limit 未定义，显示全部？
        // Services 组件是显示全部。Galleries 组件之前限制 12。
        // 既然全站统一，建议 Galleries 也显示全部（或者分页）。
        // 这里我改为：如果有 limit，切片；如果没有，显示前 50 (防止过多)。
        const maxCount = limit || 50;
        const limitedGalleries = response.data.slice(0, maxCount);
        setGalleries(limitedGalleries);
      } else {
        console.warn('Unexpected galleries response format:', response);
        setGalleries([]);
      }
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
      setGalleries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryClick = (galleryId: number) => {
    setSelectedGalleryId(galleryId);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setTimeout(() => {
      setSelectedGalleryId(null);
    }, 300);
  };

  // 搜索过滤
  const filteredGalleries = galleries.filter((gallery) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const titleMatch = gallery.title?.toLowerCase().includes(query);
    const descMatch = gallery.description?.toLowerCase().includes(query);

    return titleMatch || descMatch;
  });

  if (loading) {
    return (
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i}>
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
        {showViewAll && (
          <div className="flex justify-center pt-6 mt-4">
            <a href="/galleries" className="px-6 py-2 bg-bg-secondary border border-border-primary rounded-full text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shadow-sm">
              查看全部
            </a>
          </div>
        )}
      </div>
    );
  }

  if (filteredGalleries.length === 0) {
    return (
      <div className="bg-bg-secondary/40 rounded-2xl p-8 text-center">
        <ImageIcon className="w-12 h-12 text-text-tertiary opacity-30 mx-auto mb-3" />
        <p className="text-text-secondary">暂无图册</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredGalleries.map((gallery, index) => (
            <div
              key={gallery.id}
              onClick={() => handleGalleryClick(gallery.id)}
              className="group block bg-bg-secondary rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-border-primary transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
            >
              {/* 1:1 正方形封面 */}
              <div className="relative w-full pt-[100%] bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                {gallery.cover_image ? (
                  <img
                    src={getFileUrl(gallery.cover_image)}
                    alt={gallery.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                      gallery.hasPassword ? 'blur-xl scale-110' : 'group-hover:scale-105'
                    }`}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-primary-400" />
                  </div>
                )}

                {/* 密码标识 */}
                {gallery.hasPassword && (
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
            </div>
          ))}
        </div>
      </div>

      {/* 图册查看器 */}
      {viewerOpen && selectedGalleryId && (
        <GalleryViewer
          galleryId={selectedGalleryId}
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
}

