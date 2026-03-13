'use client';

import { X, ExternalLink, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: {
    name: string;
    description?: string;
    logo?: string;
    link: string;
  } | null;
  logoUrl?: string;
}

export default function SiteModal({ isOpen, onClose, site, logoUrl }: SiteModalProps) {
  // 按ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 阻止页面滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!site) return null;

  const handleVisitSite = () => {
    window.open(site.link, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            {/* 弹窗内容 */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative"
            >
              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors z-10"
                aria-label="关闭"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>

              {/* 内容区域 */}
              <div className="p-6 text-center">
                {/* Logo */}
                <div className="mb-5 flex justify-center">
                  {logoUrl ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md">
                      <img
                        src={logoUrl}
                        alt={site.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl flex items-center justify-center text-primary-500 font-bold text-3xl">
                      {site.name[0]}
                    </div>
                  )}
                </div>

                {/* 网站标题 */}
                <h2 className="text-xl font-bold text-text-primary mb-2.5">
                  {site.name}
                </h2>

                {/* 网站简介 */}
                {site.description && (
                  <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                    {site.description}
                  </p>
                )}

                {/* 按钮组 */}
                <div className="flex gap-2.5">
                  {/* 返回按钮 */}
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回
                  </button>

                  {/* 进入网站按钮 */}
                  <button
                    onClick={handleVisitSite}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    进入网站
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

