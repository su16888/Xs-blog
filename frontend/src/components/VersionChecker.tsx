/**
 * @file VersionChecker.tsx
 * @description 版本检测组件 - 登录后自动检测版本更新
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 3.0.0
 * @created 2025-11-07
 * @updated 2025-11-07
 */

'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { checkVersionUpdate, dismissVersionUpdate, getDismissedVersion } from '@/lib/api'

interface VersionInfo {
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  message: string
  updateUrl: string | null
  releaseNotes: string | null
}

export default function VersionChecker() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 组件挂载时自动检测版本
    checkVersion()
  }, [])

  const checkVersion = async () => {
    // 防止重复检测
    if (isChecking) return

    setIsChecking(true)
    setError(null)

    try {
      // 检查是否已登录
      let token: string | null = null
      try {
        token = localStorage.getItem('token')
      } catch (storageError) {
        // localStorage 不可用，视为未登录
      }

      if (!token) {
        setIsChecking(false)
        return
      }

      // 使用统一的 API 调用方式
      const response = await checkVersionUpdate()

      if (response.success && response.data) {
        setVersionInfo(response.data)

        // 只有当有更新时才显示弹窗
        if (response.data.hasUpdate) {
          // 检查是否已经提示过这个版本
          const dismissedVersion = getDismissedVersion()
          // 修复：使用 currentVersion 来判断（因为 latestVersion 可能为 null）
          if (dismissedVersion !== response.data.currentVersion) {
            setShowModal(true)
          }
        }
      } else {
        setError(response.data?.message || '版本检测失败')
      }
    } catch (error) {
      console.error('版本检测失败:', error)
      setError('版本检测失败，请稍后重试')
    } finally {
      setIsChecking(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
  }

  const handleDismiss = async () => {
    // 记住已经关闭的版本，避免重复提示
    try {
      if (versionInfo?.currentVersion) {
        await dismissVersionUpdate(versionInfo.currentVersion)
      }
    } catch (error) {
      console.error('保存忽略版本失败:', error)
    } finally {
      setShowModal(false)
    }
  }


  if (!showModal || !versionInfo) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slideUp">
        {/* 头部 - 橙红色警告风格 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">发现新版本</h3>
                <p className="text-white/80 text-sm">建议尽快更新</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {/* 提示信息 - 醒目显示 */}
          <div className="text-center py-2">
            <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 leading-relaxed">
              {versionInfo.message}
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-center">
          <button
            onClick={handleDismiss}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}
