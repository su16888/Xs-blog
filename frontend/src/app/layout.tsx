/**
 * @file layout.tsx
 * @description Xs-Blog 应用根布局组件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

import type { Metadata } from 'next'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { SocialLinksProvider } from '@/contexts/SocialLinksContext'
import { AuthProvider } from '@/contexts/AuthContext'
import FloatingButtons from '@/components/FloatingButtons'
import PageVisitTracker from '@/components/PageVisitTracker'
import GrayscaleOverlay from '@/components/GrayscaleOverlay'
import GlobalNav from '@/components/GlobalNav'
import { cookies } from 'next/headers'
import './globals.css'

import { getApiBaseUrl, safeFetch } from '@/lib/utils'

// 缓存系统设置（避免重复请求）
let settingsCache: any = null
let cacheTime = 0
const CACHE_DURATION = 60 * 1000 // 缓存 60 秒

// 获取系统设置
async function getSiteSettings() {
  // 检查缓存是否有效
  const now = Date.now()
  if (settingsCache && (now - cacheTime) < CACHE_DURATION) {
    return settingsCache
  }

  try {
    const response = await safeFetch('/api/settings', {
      next: { revalidate: 60 } // 使用 Next.js 缓存，60秒重新验证
    })

    if (!response.ok) {
      throw new Error('Failed to fetch settings')
    }

    const data = await response.json()
    if (data.success && data.data) {
      const settings: any = {}
      data.data.forEach((setting: any) => {
        settings[setting.key] = setting.value
      })

      // 更新缓存
      settingsCache = settings
      cacheTime = now

      return settings
    }
  } catch (error) {
    // 静默失败，避免刷日志
    if (settingsCache) {
      return settingsCache
    }
  }

  return {}
}

// 在服务器端获取主题设置，确保主题颜色在页面渲染前确定
async function getServerSideTheme() {
  try {
    const settings = await getSiteSettings()
    return settings.themeColor || 'white'
  } catch (error) {
    return 'white'
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  // 构建标题：如果有副标题，格式为"标题 - 副标题"，否则只显示标题
  const fullTitle = settings.siteTitle || ''
  const titleWithSubtitle = settings.siteSubtitle
    ? `${fullTitle} - ${settings.siteSubtitle}`
    : fullTitle

  return {
    title: {
      default: titleWithSubtitle,
      template: fullTitle ? `%s - ${fullTitle}` : '%s'
    },
    description: settings.siteDescription || '',
    keywords: settings.siteKeywords ? settings.siteKeywords.split(',').map((k: string) => k.trim()) : [],
    authors: [{ name: 'Your Name' }],
    icons: {
      icon: '/favicon.ico',
    },
  }
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 复用 generateMetadata 中已经获取的设置（利用缓存）
  const settings = await getSiteSettings()
  const customFont = settings.customFont
  const apiBaseUrl = getApiBaseUrl()

  // 根据字体文件扩展名确定格式
  const getFontFormat = (fontUrl: string) => {
    const ext = fontUrl.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'woff2': return 'woff2'
      case 'woff': return 'woff'
      case 'otf': return 'opentype'
      case 'ttf': return 'truetype'
      case 'eot': return 'embedded-opentype'
      default: return 'truetype'
    }
  }

  // 根据是否有自定义字体决定body的className
  const bodyClassName = customFont ? '' : 'font-sans'

  // 从 Cookie 读取用户选择的主题（服务端）
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')
  const userTheme = themeCookie?.value || 'black'

  return (
    <html lang="zh-CN" data-theme={userTheme}>
      <head>
        {/* 预连接后端 API - 提前建立连接，加速资源加载 */}
        {apiBaseUrl && (
          <>
            <link rel="preconnect" href={apiBaseUrl} />
            <link rel="dns-prefetch" href={apiBaseUrl} />
          </>
        )}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // 立即设置主题
              try {
                var theme = document.cookie.split(';').find(function(c) {
                  return c.trim().startsWith('theme=');
                });
                if (theme) {
                  theme = theme.split('=')[1];
                  if (['white', 'gray', 'black'].includes(theme)) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                }
              } catch (e) {}
            })();

            // 过滤浏览器扩展的错误提示和开发日志
            (function() {
              // 捕获并过滤runtime.lastError错误
              var originalError = console.error;
              var originalWarn = console.warn;
              var originalLog = console.log;
              var originalInfo = console.info;

              console.error = function() {
                var args = Array.prototype.slice.call(arguments);
                var errorMsg = args.join(' ');

                // 过滤掉浏览器扩展相关的错误
                if (errorMsg.indexOf('runtime.lastError') > -1 ||
                    errorMsg.indexOf('message channel closed') > -1 ||
                    errorMsg.indexOf('Extension context invalidated') > -1 ||
                    errorMsg.indexOf('Fast Refresh') > -1) {
                  return;
                }

                // 其他错误正常输出
                originalError.apply(console, args);
              };

              console.warn = function() {
                var args = Array.prototype.slice.call(arguments);
                var msg = args.join(' ');

                // 过滤警告
                if (msg.indexOf('Fast Refresh') > -1 ||
                    msg.indexOf('runtime.lastError') > -1 ||
                    msg.indexOf('message channel closed') > -1 ||
                    msg.indexOf('Extension context invalidated') > -1 ||
                    msg.indexOf('was preloaded using link preload but not used') > -1) {
                  return;
                }

                originalWarn.apply(console, args);
              };

              console.log = function() {
                var args = Array.prototype.slice.call(arguments);
                var msg = args.join(' ');

                // 过滤日志
                if (msg.indexOf('Fast Refresh') > -1) {
                  return;
                }

                originalLog.apply(console, args);
              };

              console.info = function() {
                var args = Array.prototype.slice.call(arguments);
                var msg = args.join(' ');

                // 过滤信息
                if (msg.indexOf('Fast Refresh') > -1) {
                  return;
                }

                originalInfo.apply(console, args);
              };

              // 捕获全局错误事件
              window.addEventListener('error', function(e) {
                var msg = e.message || '';
                if (msg.indexOf('runtime.lastError') > -1 ||
                    msg.indexOf('message channel closed') > -1 ||
                    msg.indexOf('Extension context invalidated') > -1 ||
                    msg.indexOf('Fast Refresh') > -1) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                  return false;
                }
              }, true);
            })();
          `
        }} />
        {customFont ? (
          <>
            <style dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: 'CustomFont';
                  src: url('${customFont.startsWith('http') ? customFont : apiBaseUrl + customFont}') format('${getFontFormat(customFont)}');
                  font-weight: normal;
                  font-style: normal;
                  font-display: swap;
                }
                body {
                  font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                }
              `
            }} />
            <script dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // 监听字体加载
                  if (document.fonts) {
                    document.fonts.load('16px CustomFont').then(function() {
                      // 字体加载成功
                    }).catch(function(error) {
                      // 显示友好的错误提示
                      var notification = document.createElement('div');
                      notification.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #fee; color: #c33; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 90%; font-size: 14px; line-height: 1.6;';
                      notification.innerHTML = '<strong>⚠️ 字体加载失败</strong><br/>上传的字体文件无法在浏览器中使用。<br/>建议：<br/>1. 使用 <a href="https://transfonter.org/" target="_blank" style="color: #c33; text-decoration: underline;">transfonter.org</a> 转换为WOFF2格式<br/>2. 或使用开源中文字体（思源黑体、阿里普惠体等）';
                      document.body.appendChild(notification);
                      setTimeout(function() {
                        notification.style.transition = 'opacity 0.5s';
                        notification.style.opacity = '0';
                        setTimeout(function() { notification.remove(); }, 500);
                      }, 10000);
                    });
                  }
                })();
              `
            }} />
          </>
        ) : null}
        
        {/* 自定义脚本代码 - 从后台设置中读取，排除后台管理路径 */}
        {settings.customScript && (
          <script dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var adminPath = '${settings.admin_path || 'admins'}';
                if (window.location.pathname.startsWith('/' + adminPath)) return;
                ${settings.customScript.replace(/<\/?script[^>]*>/gi, '')}
              })();
            `
          }} />
        )}
      </head>
      <body className={bodyClassName}>
          <ThemeProvider>
            <SettingsProvider>
              <AuthProvider>
                <ProfileProvider>
                  <SocialLinksProvider>
                    <GlobalNav serverSettings={settings} />
                    {children}
                    <FloatingButtons />
                    <PageVisitTracker />
                    <GrayscaleOverlay />
                  </SocialLinksProvider>
                </ProfileProvider>
              </AuthProvider>
            </SettingsProvider>
          </ThemeProvider>
      </body>
    </html>
  )
}
