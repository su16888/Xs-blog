'use client'

import { UsernameForm, PasswordForm } from '../types'

interface AccountSecurityTabProps {
  user: any
  usernameForm: UsernameForm
  passwordForm: PasswordForm
  changingUsername: boolean
  changingPassword: boolean
  handleUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleUsernameSubmit: () => void
  handlePasswordSubmit: () => void
}

export default function AccountSecurityTab({
  user,
  usernameForm,
  passwordForm,
  changingUsername,
  changingPassword,
  handleUsernameChange,
  handlePasswordChange,
  handleUsernameSubmit,
  handlePasswordSubmit
}: AccountSecurityTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* 修改用户名 */}
          <div>
            <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span>修改用户名</span>
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleUsernameSubmit(); }} className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  当前用户名
                </label>
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {user?.username || '加载中...'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label htmlFor="currentPasswordForUsername" className="block text-sm font-semibold text-gray-800 mb-2">
                  当前密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="currentPasswordForUsername"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={usernameForm.currentPassword}
                  onChange={handleUsernameChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入当前密码"
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label htmlFor="newUsername" className="block text-sm font-semibold text-gray-800 mb-2">
                  新用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="newUsername"
                  name="newUsername"
                  type="text"
                  autoComplete="username"
                  value={usernameForm.newUsername}
                  onChange={handleUsernameChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入新用户名（至少3位）"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={changingUsername || !usernameForm.currentPassword || !usernameForm.newUsername}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    changingUsername ? 'cursor-wait' : ''
                  }`}
                >
                  {changingUsername ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      修改中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      修改用户名
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 修改密码 */}
          <div>
            <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span>修改密码</span>
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label htmlFor="currentPasswordForPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                  当前密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="currentPasswordForPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入当前密码"
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                  新密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入新密码（至少6位）"
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                  确认新密码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请再次输入新密码"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold transition-all duration-300 hover:from-red-700 hover:to-red-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    changingPassword ? 'cursor-wait' : ''
                  }`}
                >
                  {changingPassword ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      修改中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      修改密码
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
