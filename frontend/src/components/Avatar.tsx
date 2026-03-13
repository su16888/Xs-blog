'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getFileUrl } from '@/lib/utils'

export default function Avatar() {
  const pathname = usePathname()
  const { profile, isLoading: loading } = useProfile()
  const { settings } = useSettings()
  const [showTooltip, setShowTooltip] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinDurationMs, setSpinDurationMs] = useState(1400)
  const avatarRef = useRef<HTMLDivElement>(null)
  const spinStopTimerRef = useRef<number | null>(null)
  const spinAccelTimerRef = useRef<number | null>(null)
  const isHoveringRef = useRef(false)
  const isPressingRef = useRef(false)

  const avatarShape = settings.avatarShape || 'circle'
  const themeColor = settings.themeColor || 'white'
  const defaultThemeType = settings.themeType || 'default'
  const enableAvatarThemeSwitch = settings.enableAvatarThemeSwitch === 'true'

  const isPersonalHomeRoute = pathname === '/user' || pathname === '/'

  // 当前主题类型：
  // - 在 /user 页面时，强制为 default（因为 /user 页面使用 forceThemeType="default"）
  // - 其他页面仅在启用了头像切换、且后台主题为 default 时，才读取 sessionStorage
  const sessionThemeType = typeof window !== 'undefined' ? sessionStorage.getItem('userThemeType') : null
  const currentThemeType =
    pathname === '/user'
      ? 'default'
      : (defaultThemeType === 'default' && enableAvatarThemeSwitch && sessionThemeType === 'blog'
        ? 'blog'
        : defaultThemeType)
  const isPersonalHomeMode = isPersonalHomeRoute && currentThemeType === 'default'

  const stopSpinTimers = () => {
    if (spinStopTimerRef.current) {
      window.clearTimeout(spinStopTimerRef.current)
      spinStopTimerRef.current = null
    }
    if (spinAccelTimerRef.current) {
      window.clearInterval(spinAccelTimerRef.current)
      spinAccelTimerRef.current = null
    }
  }

  const scheduleSpinStop = (delayMs: number) => {
    if (!isPersonalHomeMode) return
    if (spinStopTimerRef.current) {
      window.clearTimeout(spinStopTimerRef.current)
    }
    spinStopTimerRef.current = window.setTimeout(() => {
      if (isHoveringRef.current || isPressingRef.current) return
      setIsSpinning(false)
      setSpinDurationMs(1400)
    }, delayMs)
  }

  const startSpinAcceleration = () => {
    if (!isPersonalHomeMode) return
    if (spinAccelTimerRef.current) {
      window.clearInterval(spinAccelTimerRef.current)
    }
    spinAccelTimerRef.current = window.setInterval(() => {
      setSpinDurationMs((d) => Math.max(380, d - 120))
    }, 220)
  }

  const stopSpinAcceleration = () => {
    if (spinAccelTimerRef.current) {
      window.clearInterval(spinAccelTimerRef.current)
      spinAccelTimerRef.current = null
    }
    setSpinDurationMs(1400)
  }

  // 每次页面加载时显示泡泡提示（只在非loading状态下执行）
  useEffect(() => {
    if (loading) return

    if (enableAvatarThemeSwitch && currentThemeType === 'default') {
      const showTimer = setTimeout(() => {
        setShowTooltip(true)

        const hideTimer = setTimeout(() => {
          setShowTooltip(false)
        }, 2000)

        return () => clearTimeout(hideTimer)
      }, 500)

      return () => clearTimeout(showTimer)
    }
  }, [enableAvatarThemeSwitch, currentThemeType, loading])

  useEffect(() => {
    return () => stopSpinTimers()
  }, [])

  const getAvatarClass = () => {
    return avatarShape === 'rounded' ? 'rounded-xl' : 'rounded-full'
  }

  const getAvatarShadow = () => {
    if (themeColor === 'black') {
      return '0 0 0 3px rgba(255, 255, 255, 0.15), 0 4px 14px 0 rgba(255, 255, 255, 0.1)'
    }
    return '0 0 0 3px rgba(0, 0, 0, 0.08), 0 4px 14px 0 rgba(0, 0, 0, 0.15)'
  }

  // 处理头像点击事件
  const handleAvatarClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPersonalHomeMode) {
      stopSpinTimers()
      setIsSpinning(true)
      setSpinDurationMs(1400)
      scheduleSpinStop(900)
    }

    if (!enableAvatarThemeSwitch || currentThemeType !== 'default' || isTransitioning) {
      return
    }

    setIsTransitioning(true)

    // 等待头像旋转动画
    await new Promise(resolve => setTimeout(resolve, 500))

    // 将用户选择的主题存储到 sessionStorage（仅当前会话有效）
    sessionStorage.setItem('userThemeType', 'blog')
    sessionStorage.setItem('userShowSiteNav', 'true')
    sessionStorage.setItem('userShowNotes', 'true')

    // 等待模糊渐变动画
    await new Promise(resolve => setTimeout(resolve, 500))

    // 如果在 /user 页面，跳转到 /blog；否则刷新当前页面
    if (pathname === '/user') {
      window.location.href = '/blog'
    } else {
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center">
        <div className={`w-20 md:w-32 h-20 md:h-32 ${getAvatarClass()} bg-gray-200 animate-pulse mb-3 md:mb-4`}></div>
        <div className="h-6 md:h-8 w-36 md:w-48 bg-gray-200 animate-pulse mb-1 md:mb-2"></div>
        <div className="h-4 w-48 md:w-64 bg-gray-200 animate-pulse"></div>
      </div>
    )
  }

  return (
    <>
      {isTransitioning && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            backdropFilter: 'blur(0px)',
            animation: 'blur-fade 0.5s ease-out forwards'
          }}
        />
      )}

      <div className="flex flex-col items-center">
        <div
          ref={avatarRef}
          className={`relative mb-5 md:mb-6 ${enableAvatarThemeSwitch && currentThemeType === 'default' ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''}`}
          onClick={handleAvatarClick}
          onPointerEnter={() => {
            if (!isPersonalHomeMode) return
            isHoveringRef.current = true
            stopSpinTimers()
            setIsSpinning(true)
            setSpinDurationMs(1400)
            startSpinAcceleration()
          }}
          onPointerLeave={() => {
            if (!isPersonalHomeMode) return
            isHoveringRef.current = false
            stopSpinAcceleration()
            scheduleSpinStop(250)
          }}
          onPointerDown={() => {
            if (!isPersonalHomeMode) return
            isPressingRef.current = true
            stopSpinTimers()
            setIsSpinning(true)
            setSpinDurationMs(1400)
            startSpinAcceleration()
          }}
          onPointerUp={() => {
            if (!isPersonalHomeMode) return
            isPressingRef.current = false
            if (!isHoveringRef.current) {
              stopSpinAcceleration()
              scheduleSpinStop(700)
            }
          }}
          onPointerCancel={() => {
            if (!isPersonalHomeMode) return
            isPressingRef.current = false
            isHoveringRef.current = false
            stopSpinAcceleration()
            scheduleSpinStop(250)
          }}
          style={isPersonalHomeMode ? ({ ['--avatar-spin-duration' as any]: `${spinDurationMs}ms` } as any) : undefined}
        >
          {showTooltip && enableAvatarThemeSwitch && currentThemeType === 'default' && (
            <div
              className="absolute -top-16 left-1/2 transform -translate-x-1/2 animate-fade-in"
              style={{
                animation: 'tooltip-fade 2s ease-in-out forwards'
              }}
            >
              <div className="bg-bg-secondary/70 backdrop-blur-sm text-text-secondary px-4 py-2 rounded-2xl relative whitespace-nowrap text-sm border border-border-primary shadow-sm">
                点我开启博客世界！
                <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-bg-secondary/70 border border-border-primary rotate-45" />
              </div>
            </div>
          )}

          <div className={`${isPersonalHomeMode && (isSpinning || isTransitioning) ? 'avatar-media-spinning' : ''}`}>
            {profile?.avatar ? (
              <img
                src={getFileUrl(profile.avatar)}
                alt={profile.name || '头像'}
                className={`w-16 md:w-24 h-16 md:h-24 ${getAvatarClass()} object-cover`}
                style={{ boxShadow: getAvatarShadow() }}
              />
            ) : (
              <div
                className={`w-16 md:w-24 h-16 md:h-24 ${getAvatarClass()} bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl md:text-4xl font-bold`}
                style={{ boxShadow: getAvatarShadow() }}
              >
                {profile?.name?.[0] || 'U'}
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-1.5 md:mb-2">
          {profile?.name || ''}
        </h1>
        {profile?.title && (
          <p className="text-base md:text-xl text-text-secondary mb-2.5 md:mb-4">
            {profile.title}
          </p>
        )}

        {profile?.bio && (
          <p className="text-sm md:text-lg text-text-secondary max-w-md md:max-w-2xl text-center mb-2.5 md:mb-4">
            {profile.bio}
          </p>
        )}

        <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-text-tertiary">
          {profile?.location && (
            <div className="flex items-center gap-1">
              <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{profile.location}</span>
            </div>
          )}

          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
              <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>{profile.website_title || '个人网站'}</span>
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        .avatar-media-spinning :global(img),
        .avatar-media-spinning :global(div) {
          animation: avatar-spin var(--avatar-spin-duration, 1400ms) linear infinite;
        }

        @keyframes avatar-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes blur-fade {
          0% {
            backdrop-filter: blur(0px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            backdrop-filter: blur(30px);
            opacity: 1;
          }
        }

        @keyframes tooltip-fade {
          0% {
            opacity: 0;
            transform: translateY(10px) translateX(-50%);
          }
          10% {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
          90% {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) translateX(-50%);
          }
        }
      `}</style>
    </>
  )
}
