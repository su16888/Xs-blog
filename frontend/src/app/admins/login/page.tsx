'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, getSettings } from '@/lib/api'
import { getAdminRoute } from '@/lib/adminConfig'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 设置页面标题
  useEffect(() => {
    const loadTitle = async () => {
      try {
        const response = await getSettings()
        if (response.success && response.data) {
          const title = response.data.find((s: any) => s.key === 'siteTitle')?.value || ''
          document.title = title ? `${title} - 管理后台登录` : '管理后台登录'
        }
      } catch (error) {
        document.title = '管理后台登录'
      }
    }
    loadTitle()
  }, [])

  // 已登录用户自动跳转到后台
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(getAdminRoute('dashboard'))
    }
  }, [authLoading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(formData.username, formData.password)

      // 保存 token
      try {
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
      } catch (storageError) {
        // localStorage 不可用，但登录仍然成功
        console.warn('无法保存登录信息到 localStorage:', storageError)
      }

      // 更新 AuthContext 的用户状态
      setUser(response.user)

      // 跳转到管理后台
      const dashboardRoute = getAdminRoute('dashboard')
      router.push(dashboardRoute)
    } catch (err: any) {
      // 后端返回的错误信息在 err.response?.data?.message
      const errorMessage = err.response?.data?.message || err.message || '登录失败，请重试'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // 认证检查中或已登录，显示加载状态
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-md w-full mx-4 flex flex-col">
        <div className="bg-white rounded-lg shadow-xl p-8 animate-fade-in">
          {/* Logo/标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              管理员登录
            </h1>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="input"
                placeholder="请输入用户名"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="请输入密码"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 返回首页 */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← 返回首页
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
