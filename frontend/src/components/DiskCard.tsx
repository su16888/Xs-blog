'use client';

import React, { useState } from 'react';

interface DiskCardProps {
  disk: {
    id: number;
    disk_name: string;
    title: string;
    file_size?: string;
    extract_code?: string;
    download_url?: string;
    created_at: string;
  };
}

export default function DiskCard({ disk }: DiskCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (disk.download_url) {
      window.open(disk.download_url, '_blank');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors group">
      {/* 标题 */}
      <div className="text-center mb-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {disk.title}
        </h3>
        {disk.file_size && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 py-1 px-3 rounded-full inline-flex">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{disk.file_size}</span>
          </div>
        )}
      </div>

      {/* 提取码 */}
      {disk.extract_code && (
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            访问密码
          </div>
          <div className="relative flex items-center">
            <div className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 pl-3 pr-20 text-sm font-mono font-bold text-gray-900 dark:text-white">
              {disk.extract_code}
            </div>
            <button
              onClick={() => handleCopy(disk.extract_code!)}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">已复制</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 下载按钮 */}
      <button
        onClick={handleDownload}
        disabled={!disk.download_url}
        className="w-full group/btn relative flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
      >
        <span className="text-sm font-bold tracking-wide">前往下载</span>
        <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
  );
}
