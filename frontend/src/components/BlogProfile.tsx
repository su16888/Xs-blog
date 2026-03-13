'use client'

import { useState } from 'react'
import { getImageUrl } from '@/lib/api'
import { useProfile } from '@/contexts/ProfileContext'
import { useSocialLinks } from '@/contexts/SocialLinksContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getFileUrl } from '@/lib/utils'
import { X, MapPin, Mail, Globe } from 'lucide-react'

export default function BlogProfile() {
  const { profile, isLoading: profileLoading } = useProfile()
  const { profileSocialLinks: socialLinks } = useSocialLinks()
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedQRCode, setSelectedQRCode] = useState<{ image: string; platform: string } | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<{ account: string; platform: string } | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedLink, setSelectedLink] = useState<{ url: string; platform: string } | null>(null)
  const { settings } = useSettings()

  const avatarShape = settings.avatarShape || 'circle'
  const loading = profileLoading
  const hasContactInfo = Boolean(profile?.location || profile?.email || profile?.website)
  const hasSocialLinks = socialLinks.length > 0

  const getAvatarClass = () => {
    return avatarShape === 'rounded' ? 'rounded-xl' : 'rounded-full'
  }

  const handleSocialLinkClick = (e: React.MouseEvent, link: any) => {
    // 如果有二维码，显示二维码弹窗，不跳转
    if (link.qrcode && link.qrcode.trim() !== '') {
      e.preventDefault()
      setSelectedQRCode({
        image: link.qrcode,
        platform: link.platform
      })
      setShowQRModal(true)
    } else if (!link.link || link.link.trim() === '' || link.link === '#') {
      // 如果没有链接，显示账号弹窗
      e.preventDefault()
      setSelectedAccount({
        account: link.account,
        platform: link.platform
      })
      setShowAccountModal(true)
    } else {
      // 有链接时，显示跳转确认弹窗
      e.preventDefault()
      setSelectedLink({
        url: link.link,
        platform: link.platform
      })
      setShowLinkModal(true)
    }
  }

  const closeQRModal = () => {
    setShowQRModal(false)
    setTimeout(() => setSelectedQRCode(null), 300)
  }

  const closeAccountModal = () => {
    setShowAccountModal(false)
    setCopySuccess(false)
    setTimeout(() => setSelectedAccount(null), 300)
  }

  const closeLinkModal = () => {
    setShowLinkModal(false)
    setTimeout(() => setSelectedLink(null), 300)
  }

  const handleConfirmLink = () => {
    if (selectedLink) {
      window.open(selectedLink.url, '_blank', 'noopener,noreferrer')
    }
    closeLinkModal()
  }

  const handleCopyAccount = async () => {
    if (!selectedAccount) return
    try {
      await navigator.clipboard.writeText(selectedAccount.account)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-lg shadow-sm p-6 border border-border-primary h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-bg-tertiary rounded-full animate-pulse"></div>
          <div className="w-full space-y-2">
            <div className="h-6 w-32 bg-bg-tertiary animate-pulse mx-auto"></div>
            <div className="h-4 w-48 bg-bg-tertiary animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <>
      <div className="relative h-full overflow-hidden rounded-xl border border-border-primary bg-gradient-to-b from-bg-secondary/40 to-bg-primary shadow-md transition-all duration-300 hover:shadow-xl dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />

        <div className={`relative z-10 h-full ${hasSocialLinks ? 'grid grid-rows-[3fr_1fr]' : 'flex flex-col'}`}>
          <div
            className={`relative flex flex-col items-center justify-center text-center px-6 pt-6 pb-6 ${hasSocialLinks ? '' : 'flex-1'}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-secondary/55 to-transparent dark:from-bg-secondary/20" />
            <div className="relative flex w-full flex-col items-center justify-center">
              <div className="flex justify-center mb-5">
                {profile.avatar ? (
                  <div className="p-1.5 rounded-full bg-bg-primary/50 backdrop-blur-sm shadow-lg ring-1 ring-white/20 dark:ring-black/20">
                    <img
                      src={getImageUrl(profile.avatar)}
                      alt={profile.name || '头像'}
                      className={`w-24 h-24 ${getAvatarClass()} object-cover bg-bg-tertiary`}
                    />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-full bg-bg-primary/50 backdrop-blur-sm shadow-lg ring-1 ring-white/20 dark:ring-black/20">
                    <div
                      className={`w-24 h-24 ${getAvatarClass()} bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold`}
                    >
                      {profile.name?.[0] || 'X'}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold tracking-tight text-text-primary">
                  {profile.name || ''}
                </h3>

                {profile.title && (
                  <p className="text-sm font-medium text-primary-600/80 dark:text-primary-400/80 mt-2">
                    {profile.title}
                  </p>
                )}

                {profile.bio && (
                  <p className="mt-3 text-sm text-text-tertiary line-clamp-3 leading-relaxed px-2">
                    {profile.bio}
                  </p>
                )}
              </div>

              {hasContactInfo && (
                <div className="mt-6 flex flex-col items-center gap-2.5 w-full">
                  {profile.location && (
                    <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                      <span className="max-w-[220px] truncate">{profile.location}</span>
                    </div>
                  )}

                  {profile.email && (
                    <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                      <span className="max-w-[220px] truncate">{profile.email}</span>
                    </div>
                  )}

                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-bg-secondary/60 px-4 py-1.5 text-xs font-medium text-primary-600 shadow-sm hover:text-primary-700 hover:bg-bg-secondary hover:shadow-md transition-all dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="max-w-[220px] truncate">{profile.website_title || '个人网站'}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 社交链接 - 最多显示4个，均匀分布，自适应大小 */}
          {hasSocialLinks && (
            <div className="relative flex items-center justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-secondary/80 to-bg-secondary/30 dark:from-bg-secondary/20 dark:to-bg-secondary/10" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-primary to-transparent opacity-70 dark:opacity-30" />

              <div className="relative flex h-full w-full items-center justify-center px-6">
                <div
                  className={`flex w-full max-w-[176px] items-center ${
                    socialLinks.length === 1 ? 'justify-center' : 'justify-between'
                  }`}
                >
                  {socialLinks.map((link, index) => (
                    <a
                      key={`social-link-${link.id}-${index}`}
                      href={link.link || '#'}
                      target={link.link ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      onClick={(e) => handleSocialLinkClick(e, link)}
                      className="group relative flex items-center justify-center transition-all hover:scale-110 hover:opacity-100 opacity-80 active:scale-95 cursor-pointer"
                      title={`${link.platform}: ${link.account}`}
                    >
                      {link.icon && link.icon.trim() !== '' ? (
                        <div className="relative flex items-center justify-center w-6 h-6">
                          <img
                            src={getFileUrl(link.icon)}
                            alt={link.platform}
                            className="relative z-10 w-full h-full object-contain transition-all icon-themed drop-shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-bold group-hover:bg-primary-500/20 transition-colors w-6 h-6 text-xs ring-1 ring-inset ring-primary-500/20">
                          {link.platform[0].toUpperCase()}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedQRCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
  )
}
