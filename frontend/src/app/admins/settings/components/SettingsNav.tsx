'use client'

import React from 'react'
import { ActiveTab } from '../types'

interface SettingsNavProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
}

const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'basic',
    label: '基本信息',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    key: 'functions',
    label: '功能设置',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    )
  },
  {
    key: 'navigation',
    label: '博客导航栏',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    )
  },
  {
    key: 'text-settings',
    label: '内容配置',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    key: 'account',
    label: '账户安全',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  }
]

export default function SettingsNav({ activeTab, setActiveTab }: SettingsNavProps) {
  return (
    <div className="w-full flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 overflow-x-auto sm:overflow-visible scrollbar-hide">
          <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={activeTab === tab.key ? 'text-white' : 'text-gray-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
