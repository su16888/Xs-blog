'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Github, Mail, Send, MessageCircle, Phone, X } from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';
import { useSocialLinks, SocialLink } from '@/contexts/SocialLinksContext';

const platformIcons: Record<string, any> = {
  github: Github,
  telegram: Send,
  email: Mail,
  gmail: Mail,
  qq: MessageCircle,
  wechat: MessageCircle,
};

export default function SocialLinks({ className }: { className?: string }) {
  const { socialLinks: links, isLoading: loading } = useSocialLinks();
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<{ image: string; platform: string } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ account: string; platform: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<{ url: string; platform: string } | null>(null);

  const hasPreloadedQrCodesRef = useRef(false)

  useEffect(() => {
    if (hasPreloadedQrCodesRef.current) return
    if (!Array.isArray(links) || links.length === 0) return

    hasPreloadedQrCodesRef.current = true

    links.slice(0, 6).forEach((link) => {
      if (!link.qrcode || link.qrcode.trim() === '') return
      const img = new Image()
      img.src = getFileUrl(link.qrcode)
    })
  }, [links])

  const handleIconError = (platform: string) => {
    setIconErrors(prev => ({ ...prev, [platform]: true }));
  };

  const handleLinkClick = (e: React.MouseEvent, link: SocialLink) => {
    // 如果有二维码，显示二维码弹窗，不跳转
    if (link.qrcode && link.qrcode.trim() !== '') {
      e.preventDefault();
      setSelectedQRCode({
        image: link.qrcode,
        platform: link.platform
      });
      setShowQRModal(true);
    } else if (!link.link || link.link.trim() === '' || link.link === '#') {
      // 如果没有链接，显示账号弹窗
      e.preventDefault();
      setSelectedAccount({
        account: link.account,
        platform: link.platform
      });
      setShowAccountModal(true);
    } else {
      // 有链接时，显示跳转确认弹窗
      e.preventDefault();
      setSelectedLink({
        url: link.link,
        platform: link.platform
      });
      setShowLinkModal(true);
    }
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedQRCode(null);
  };

  const closeAccountModal = () => {
    setShowAccountModal(false);
    setCopySuccess(false);
    setSelectedAccount(null);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setSelectedLink(null);
  };

  const handleConfirmLink = () => {
    if (selectedLink) {
      window.open(selectedLink.url, '_blank', 'noopener,noreferrer');
    }
    closeLinkModal();
  };

  const handleCopyAccount = async () => {
    if (!selectedAccount) return;
    try {
      await navigator.clipboard.writeText(selectedAccount.account);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6 md:py-8">
        <div className="inline-block w-6 md:w-8 h-6 md:h-8 border-3 md:border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-500)' }}></div>
      </div>
    );
  }

  // 后端已经过滤了不可见的链接，前端无需再次过滤
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('flex flex-wrap justify-center gap-3 md:gap-6 max-w-4xl mx-auto', className)}>
        {links.slice(0, 6).map((link, index) => {
          // 优先使用上传的自定义图标，否则使用默认图标
          const Icon = platformIcons[link.platform.toLowerCase()] || Phone;
          const hasCustomIcon = link.icon && link.icon.trim() !== '' && !iconErrors[link.platform];

          return (
            <a
              key={`${link.platform}-${index}`}
              href={link.link || '#'}
              target={link.link ? '_blank' : '_self'}
              rel="noopener noreferrer"
              onClick={(e) => handleLinkClick(e, link)}
              className="card-glow rounded-lg md:rounded-xl p-3 md:p-4 items-center justify-center group aspect-square cursor-pointer animate-fade-in hover:scale-105 active:scale-[1.02] transition-transform"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              <div className="relative">
                {hasCustomIcon ? (
                  <div className="relative z-10 w-8 h-8">
                    <img
                      src={getFileUrl(link.icon)}
                      alt={link.platform}
                      className="w-8 h-8 object-contain transition-all icon-themed group-hover:opacity-90 group-active:opacity-80"
                      onError={() => handleIconError(link.platform)}
                      loading="eager"
                    />
                  </div>
                ) : (
                  <div className="relative z-10">
                    <Icon className="w-8 h-8 text-primary-600 group-hover:text-primary-500 group-active:text-primary-700 transition-colors" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm font-semibold text-text-secondary capitalize">
                  {link.platform}
                </p>
                <p className="text-[10px] md:text-xs text-text-tertiary mt-0.5 md:mt-1 truncate max-w-[80px] md:max-w-[120px]">
                  {link.account}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedQRCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeQRModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
              <button
                onClick={closeQRModal}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                  {selectedQRCode.platform}
                </h3>
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img
                    src={getFileUrl(selectedQRCode.image)}
                    alt={`${selectedQRCode.platform} QR Code`}
                    className="w-64 h-64 object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  截图或长按保存上方二维码
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Account Modal */}
      {showAccountModal && selectedAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeAccountModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeAccountModal}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                  {selectedAccount.platform}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl mb-4">
                  <p className="text-lg font-mono text-gray-900 dark:text-white break-all">
                    {selectedAccount.account}
                  </p>
                </div>
                <button
                  onClick={handleCopyAccount}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  {copySuccess ? '✓ 已复制' : '复制账号'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Link Confirm Modal */}
      {showLinkModal && selectedLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeLinkModal}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLinkModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
                  {selectedLink.platform}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  是否跳转到以下链接？
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl mb-4">
                  <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                    {selectedLink.url}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeLinkModal}
                    className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmLink}
                    className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    确认跳转
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
