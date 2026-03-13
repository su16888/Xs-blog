'use client'

import React, { useRef, useState } from 'react'
import { SettingsState } from '../types'
import { uploadAdminImage, getImageUrl } from '@/lib/api'

interface FunctionSettingsTabProps {
  settings: SettingsState
  saving: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>
  showToast: (type: 'success' | 'error', message: string) => void
}

// 开关组件
function ToggleSwitch({ name, checked, onChange, disabled = false }: {
  name: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
        checked ? 'bg-blue-500 shadow-inner' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className={`absolute top-1 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-all duration-300 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}></div>
      </div>
    </label>
  )
}

// 设置项组件
function SettingItem({ title, description, icon, children }: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label className="block text-sm font-semibold text-gray-800 mb-1 flex items-center gap-3">
            {icon}
            {title}
          </label>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex-shrink-0 self-start sm:self-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function FunctionSettingsTab({
  settings,
  saving,
  handleChange,
  handleSubmit,
  setSettings,
  showToast
}: FunctionSettingsTabProps) {
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // 处理默认封面图上传
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showToast('error', '请选择图片文件')
      return
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', '图片大小不能超过 5MB')
      return
    }

    setUploadingCover(true)
    try {
      const response = await uploadAdminImage(file)
      if (response.success && response.data?.url) {
        setSettings((prev: SettingsState) => ({
          ...prev,
          defaultNoteCover: response.data.url
        }))
        showToast('success', '封面图上传成功')
      } else {
        showToast('error', response.message || '上传失败')
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '上传失败')
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <span>功能配置</span>
              </h2>
              <div className="space-y-4">

                {/* 官网主题开关 */}
                <SettingItem
                  title="官网主题模式"
                  description="开启后，访问首页将自动显示官网页面内容，且浏览器地址栏不显示 /promo 路径。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
                >
                  <ToggleSwitch
                    name="promoThemeEnabled"
                    checked={settings.promoThemeEnabled === 'true'}
                    onChange={handleChange}
                    disabled={settings.socialFeedThemeEnabled === 'true' || settings.docsThemeEnabled === 'true'}
                  />
                </SettingItem>

                {/* 朋友圈主题模式开关 */}
                <SettingItem
                  title="朋友圈主题模式"
                  description="开启后，访问首页将自动显示朋友圈页面内容，且浏览器地址栏不显示 /social-feed 路径。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
                >
                  <ToggleSwitch
                    name="socialFeedThemeEnabled"
                    checked={settings.socialFeedThemeEnabled === 'true'}
                    onChange={handleChange}
                    disabled={settings.promoThemeEnabled === 'true' || settings.docsThemeEnabled === 'true'}
                  />
                </SettingItem>

                {/* 文档主题模式开关 */}
                <SettingItem
                  title="文档主题模式"
                  description="开启后，访问首页将自动显示文档中心页面内容，且浏览器地址栏不显示 /docs 路径。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                >
                  <ToggleSwitch
                    name="docsThemeEnabled"
                    checked={settings.docsThemeEnabled === 'true'}
                    onChange={handleChange}
                    disabled={settings.promoThemeEnabled === 'true' || settings.socialFeedThemeEnabled === 'true'}
                  />
                </SettingItem>

                {/* 启用 /user 页面访问 */}
                <SettingItem
                  title="启用 /user 页面访问"
                  description="开启后，可通过 /user 路径访问个人主页模式（默认主题）。关闭后访问将跳转到404页面。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                >
                  <ToggleSwitch
                    name="enableUserPage"
                    checked={settings.enableUserPage === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 启用 /blog 页面访问 */}
                <SettingItem
                  title="启用 /blog 页面访问"
                  description="开启后，可通过 /blog 路径访问博客模式（博客主题）。关闭后访问将跳转到404页面。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
                >
                  <ToggleSwitch
                    name="enableBlogPage"
                    checked={settings.enableBlogPage === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 启用 /promo 页面访问 - 仅当官网主题模式未开启时显示 */}
                {settings.promoThemeEnabled !== 'true' && (
                  <SettingItem
                    title="启用 /promo 页面访问"
                    description="开启后，可通过 /promo 路径访问官网主题页面。关闭后访问将跳转到404页面。"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                  >
                    <ToggleSwitch
                      name="enablePromoPage"
                      checked={settings.enablePromoPage === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 启用 /docs 页面访问 - 仅当文档主题模式未开启时显示 */}
                {settings.docsThemeEnabled !== 'true' && (
                  <SettingItem
                    title="启用 /docs 页面访问"
                    description="开启后，可通过 /docs 路径访问文档中心页面。关闭后访问将跳转到404页面。"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                  >
                    <ToggleSwitch
                      name="enableDocsPage"
                      checked={settings.enableDocsPage === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 启用朋友圈页面访问 - 仅当朋友圈主题模式未开启时显示 */}
                {settings.socialFeedThemeEnabled !== 'true' && (
                  <SettingItem
                    title="启用朋友圈页面访问"
                    description="开启后，通过 /social-feed 访问朋友圈页面。关闭后访问将跳转到404页面。"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  >
                    <ToggleSwitch
                      name="enableSocialFeedPage"
                      checked={settings.enableSocialFeedPage === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 允许 SEO 搜索引擎抓取 */}
                <SettingItem
                  title="允许 SEO 搜索引擎抓取"
                  description="开启后，允许搜索引擎抓取前台页面内容。关闭后，所有页面将禁止搜索引擎索引。后台 /admins 路径始终禁止抓取。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                >
                  <ToggleSwitch
                    name="allowSEO"
                    checked={settings.allowSEO === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 博客公告栏开关 */}
                <SettingItem
                  title="显示博客公告栏"
                  description="开启后，在博客模式的轮播图下方显示公告栏。公告内容在基本信息中设置。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
                >
                  <ToggleSwitch
                    name="blogAnnouncementEnabled"
                    checked={settings.blogAnnouncementEnabled === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 隐藏博客模式个人资料卡 */}
                <SettingItem
                  title="隐藏博客模式个人资料卡"
                  description="开启后，博客模式首页将隐藏轮播图右侧的个人资料卡，轮播图将等比放大占满整个区域。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>}
                >
                  <ToggleSwitch
                    name="hideBlogProfileCard"
                    checked={settings.hideBlogProfileCard === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 留言邮箱通知开关 */}
                <SettingItem
                  title="留言邮箱通知"
                  description="开启后，收到新留言时会发送邮件通知到管理员邮箱。关闭后留言仅在后台显示，不发送邮件。"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                >
                  <ToggleSwitch
                    name="enableMessageEmailNotification"
                    checked={settings.enableMessageEmailNotification === 'true'}
                    onChange={handleChange}
                  />
                </SettingItem>

                {/* 显示社交链接 - 仅当默认主题时显示 */}
                {settings.themeType === 'default' && (
                  <SettingItem
                    title="显示社交链接"
                    description="控制是否在前台显示社交链接区域（仅默认主题生效）"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" /></svg>}
                  >
                    <ToggleSwitch
                      name="showSocialLinks"
                      checked={settings.showSocialLinks === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 是否显示顶部导航栏 - 仅当默认主题或文档主题模式时显示 */}
                {(settings.themeType === 'default' || settings.docsThemeEnabled === 'true') && (
                  <SettingItem
                    title="显示顶部导航栏"
                    description="控制是否在前台显示顶部导航栏（默认主题/文档主题生效）"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
                  >
                    <ToggleSwitch
                      name="showTopNavbar"
                      checked={settings.showTopNavbar === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 是否显示WAP侧边栏及搜索框 - 仅当默认主题或文档主题模式且顶部导航栏开启时显示 */}
                {(settings.themeType === 'default' || settings.docsThemeEnabled === 'true') && settings.showTopNavbar === 'true' && (
                  <SettingItem
                    title="显示WAP侧边栏及搜索框"
                    description="控制是否在移动端显示侧边栏及搜索框（默认主题/文档主题生效）"
                    icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                  >
                    <ToggleSwitch
                      name="showWapSidebar"
                      checked={settings.showWapSidebar === 'true'}
                      onChange={handleChange}
                    />
                  </SettingItem>
                )}

                {/* 头像形状设置 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    头像形状
                  </label>
                  <select
                    name="avatarShape"
                    value={settings.avatarShape}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="circle">圆形</option>
                    <option value="rounded">圆角矩形</option>
                  </select>
                   <p className="text-sm text-gray-500 mt-3">
                    设置个人资料中头像的形状，圆角矩形建议在本站为APP下载页面时使用。
                  </p>
                </div>

                {/* 待办事项检查频率设置 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="todoReminderCheckInterval" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    待办事项提醒检查频率（分钟）
                  </label>
                  <input
                    id="todoReminderCheckInterval"
                    name="todoReminderCheckInterval"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.todoReminderCheckInterval}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="5"
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    设置后台仪表板检查待办事项提醒的频率（1-60分钟）
                  </p>
                </div>

                {/* 留言IP提交频率限制设置 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="messageIpLimitDays" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    留言IP提交频率限制（天）
                  </label>
                  <input
                    id="messageIpLimitDays"
                    name="messageIpLimitDays"
                    type="number"
                    min="0"
                    max="365"
                    value={settings.messageIpLimitDays}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="1"
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    设置同一IP地址提交留言的时间间隔（0表示不限制，1表示24小时内只能提交一次）
                  </p>
                </div>

                {/* 默认封面图设置 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    默认封面图
                  </label>

                  {/* 图片预览 */}
                  {settings.defaultNoteCover && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={getImageUrl(settings.defaultNoteCover)}
                        alt="默认封面图预览"
                        className="w-32 h-20 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSettings((prev: SettingsState) => ({
                          ...prev,
                          defaultNoteCover: ''
                        }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="删除图片"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* URL 输入框和上传按钮 */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={settings.defaultNoteCover || ''}
                      onChange={(e) => setSettings((prev: SettingsState) => ({
                        ...prev,
                        defaultNoteCover: e.target.value
                      }))}
                      className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="输入图片URL或点击上传本地图片"
                    />
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 flex-shrink-0 ${
                        uploadingCover
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {uploadingCover ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          上传中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          上传图片
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    笔记未设置封面图时，将自动使用此默认封面图（支持URL或本地上传，最大5MB）
                  </p>
                </div>

                {/* 自定义脚本代码 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <label htmlFor="customScript" className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    自定义脚本代码
                  </label>
                  <textarea
                    id="customScript"
                    name="customScript"
                    value={settings.customScript}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400 font-mono"
                    placeholder="<script>&#10;// 在此输入自定义脚本代码&#10;// 例如：网站统计、客服系统等&#10;</script>"
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    输入自定义的 &lt;script&gt; 代码，如网站统计（百度统计、Google Analytics）、在线客服等。代码将插入到页面 &lt;head&gt; 标签中。
                  </p>
                </div>

              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end pt-4 border-t border-gray-200 mt-4">
            <button
              type="submit"
              disabled={saving}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 disabled:hover:shadow-none text-sm ${
                saving ? 'cursor-wait' : ''
              }`}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
