'use client'

import { NavLink } from '../types'
import { getImageUrl } from '@/lib/api'

interface NavigationTabProps {
  navLinks: NavLink[]
  saving: boolean
  uploadingNavIcon: number | null
  handleSubmit: (e: React.FormEvent) => void
  handleAddNavLink: () => void
  handleNavLinkChange: (index: number, field: 'name' | 'url', value: string) => void
  handleRemoveNavLink: (index: number) => void
  handleMoveNavLink: (index: number, direction: 'up' | 'down') => void
  handleNavIconUpload: (index: number, file: File) => void
  handleRemoveNavIcon: (index: number) => void
  setNavLinks: React.Dispatch<React.SetStateAction<NavLink[]>>
  setSettings: React.Dispatch<React.SetStateAction<any>>
  settings: any
}

export default function NavigationTab({
  navLinks,
  saving,
  uploadingNavIcon,
  handleSubmit,
  handleAddNavLink,
  handleNavLinkChange,
  handleRemoveNavLink,
  handleMoveNavLink,
  handleNavIconUpload,
  handleRemoveNavIcon,
  setNavLinks,
  setSettings,
  settings
}: NavigationTabProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <span>导航链接</span>
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">注意：</span>默认模式下需要先在功能设置中开启【显示顶部导航栏】
                </p>
              </div>
              <div className="space-y-4">
                {navLinks.map((link, index) => (
                  <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* 排序按钮 */}
                    <div className="flex flex-row sm:flex-col gap-1 sm:pt-2">
                      <button
                        type="button"
                        onClick={() => handleMoveNavLink(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="上移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveNavLink(index, 'down')}
                        disabled={index === navLinks.length - 1}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="下移"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <input
                        type="text"
                        placeholder="链接名称"
                        value={link.name}
                        onChange={(e) => handleNavLinkChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="链接地址"
                        value={link.url}
                        onChange={(e) => handleNavLinkChange(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                      />
                      {/* 上传图标和图标URL在一排 */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-shrink-0 transition-colors">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">{uploadingNavIcon === index ? '上传中...' : '上传图标'}</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleNavIconUpload(index, e.target.files[0])}
                            disabled={uploadingNavIcon === index}
                          />
                        </label>
                        {link.icon && (
                          <img src={getImageUrl(link.icon)} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                        )}
                        <input
                          type="text"
                          placeholder="图标URL（可直接粘贴链接或上传）"
                          value={link.icon || ''}
                          onChange={(e) => {
                            const newLinks = [...navLinks]
                            newLinks[index].icon = e.target.value
                            setNavLinks(newLinks)
                            setSettings((s: any) => ({ ...s, blogNavLinks: JSON.stringify(newLinks) }))
                          }}
                          className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white placeholder-gray-400"
                        />
                        {link.icon && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNavIcon(index)}
                            className="text-red-500 hover:text-red-600 text-sm flex-shrink-0 px-2 self-end sm:self-auto"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNavLink(index)}
                      className="text-red-600 hover:text-red-700 p-2 flex-shrink-0 self-end sm:self-start"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {navLinks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无导航链接
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddNavLink}
                  disabled={navLinks.length >= 8}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + 添加导航链接
                </button>
                <p className="text-xs text-gray-500">最多可添加8个导航链接</p>
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
