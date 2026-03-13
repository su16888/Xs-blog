'use client'

import { useState, useEffect } from 'react'
import { ActiveTab } from './types'
import { useSettings } from './hooks/useSettings'
import {
  SettingsNav,
  BasicSettingsTab,
  FunctionSettingsTab,
  NavigationTab,
  TextSettingsTab,
  AccountSecurityTab
} from './components'
import { usePageTitle } from '@/hooks/usePageTitle'
import AdminToast from '@/components/AdminToast'

export default function SettingsPage() {
  usePageTitle('系统设置', true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('basic')
  const settingsHook = useSettings()

  // Toast自动隐藏
  useEffect(() => {
    if (settingsHook.toast.show) {
      const timer = setTimeout(() => {
        settingsHook.hideToast()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [settingsHook.toast.show, settingsHook.hideToast])

  return (
    <>
      {settingsHook.loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
      <div className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主内容区 */}
        <div className="flex flex-col gap-6">
          {/* 顶部导航标签 */}
          <SettingsNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 基本信息 */}
            {activeTab === 'basic' && (
              <BasicSettingsTab
                settings={settingsHook.settings}
                saving={settingsHook.saving}
                uploadingBackground={settingsHook.uploadingBackground}
                deletingBackground={settingsHook.deletingBackground}
                uploadingFont={settingsHook.uploadingFont}
                deletingFont={settingsHook.deletingFont}
                handleChange={settingsHook.handleChange}
                handleSubmit={settingsHook.handleSubmit}
                handleBackgroundUpload={settingsHook.handleBackgroundUpload}
                handleBackgroundDelete={settingsHook.handleBackgroundDelete}
                handleFontUpload={settingsHook.handleFontUpload}
                handleFontDelete={settingsHook.handleFontDelete}
              />
            )}

            {/* 功能设置 */}
            {activeTab === 'functions' && (
              <FunctionSettingsTab
                settings={settingsHook.settings}
                saving={settingsHook.saving}
                handleChange={settingsHook.handleChange}
                handleSubmit={settingsHook.handleSubmit}
                setSettings={settingsHook.setSettings}
                showToast={settingsHook.showToast}
              />
            )}

            {/* 导航栏 */}
            {activeTab === 'navigation' && (
              <NavigationTab
                navLinks={settingsHook.navLinks}
                saving={settingsHook.saving}
                uploadingNavIcon={settingsHook.uploadingNavIcon}
                handleSubmit={settingsHook.handleSubmit}
                handleAddNavLink={settingsHook.handleAddNavLink}
                handleNavLinkChange={settingsHook.handleNavLinkChange}
                handleRemoveNavLink={settingsHook.handleRemoveNavLink}
                handleMoveNavLink={settingsHook.handleMoveNavLink}
                handleNavIconUpload={settingsHook.handleNavIconUpload}
                handleRemoveNavIcon={settingsHook.handleRemoveNavIcon}
                setNavLinks={settingsHook.setNavLinks}
                setSettings={settingsHook.setSettings}
                settings={settingsHook.settings}
              />
            )}

            {/* 内容配置 */}
            {activeTab === 'text-settings' && (
              <TextSettingsTab
                settings={settingsHook.settings}
                setSettings={settingsHook.setSettings}
                pageTexts={settingsHook.pageTexts}
                setPageTexts={settingsHook.setPageTexts}
                homeContentSections={settingsHook.homeContentSections}
                setHomeContentSections={settingsHook.setHomeContentSections}
                savingTextSettings={settingsHook.savingTextSettings}
                s3Config={settingsHook.s3Config}
                setS3Config={settingsHook.setS3Config}
                loadingS3Config={settingsHook.loadingS3Config}
                savingS3Config={settingsHook.savingS3Config}
                testingS3={settingsHook.testingS3}
                handleSaveTextSettings={settingsHook.handleSaveTextSettings}
                loadS3Config={settingsHook.loadS3Config}
                handleSaveS3Config={settingsHook.handleSaveS3Config}
                handleTestS3Connection={settingsHook.handleTestS3Connection}
                showToast={settingsHook.showToast}
                docsConfig={settingsHook.docsConfig}
                setDocsConfig={settingsHook.setDocsConfig}
                loadingDocsOrder={settingsHook.loadingDocsOrder}
                savingDocsOrder={settingsHook.savingDocsOrder}
                loadDocsOrder={settingsHook.loadDocsOrder}
                handleSaveDocsOrder={settingsHook.handleSaveDocsOrder}
                handleMoveDoc={settingsHook.handleMoveDoc}
                handleToggleDocVisibility={settingsHook.handleToggleDocVisibility}
              />
            )}

            {/* 账户安全 */}
            {activeTab === 'account' && (
              <AccountSecurityTab
                user={settingsHook.user}
                usernameForm={settingsHook.usernameForm}
                passwordForm={settingsHook.passwordForm}
                changingUsername={settingsHook.changingUsername}
                changingPassword={settingsHook.changingPassword}
                handleUsernameChange={settingsHook.handleUsernameChange}
                handlePasswordChange={settingsHook.handlePasswordChange}
                handleUsernameSubmit={settingsHook.handleUsernameSubmit}
                handlePasswordSubmit={settingsHook.handlePasswordSubmit}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toast提示 */}
      <AdminToast
        show={settingsHook.toast.show}
        message={settingsHook.toast.message}
        type={settingsHook.toast.type}
        onClose={() => settingsHook.hideToast()}
      />
      </div>
      )}
    </>
  )
}
