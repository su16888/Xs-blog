'use client';

import React, { useState } from 'react';
import DiskCard from './DiskCard';

interface Disk {
  id: number;
  disk_name: string;
  title: string;
  file_size?: string;
  extract_code?: string;
  download_url?: string;
  created_at: string;
}

interface DiskCarouselProps {
  disks: Disk[];
}

export default function DiskCarousel({ disks }: DiskCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!disks || disks.length === 0) {
    return null;
  }

  // 单个网盘直接显示
  if (disks.length === 1) {
    return (
      <div className="w-full">
        <DiskCard disk={disks[0]} />
      </div>
    );
  }

  // 多个网盘显示选项卡式
  return (
    <div className="w-full">
      {/* 顶部选项卡 */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50">
          {disks.map((disk, index) => (
            <button
              key={disk.id}
              onClick={() => setCurrentIndex(index)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {disk.disk_name}
            </button>
          ))}
        </div>
      </div>

      {/* 卡片内容区域 */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {disks.map((disk) => (
            <div key={disk.id} className="w-full flex-shrink-0 px-1">
              <DiskCard disk={disk} />
            </div>
          ))}
        </div>
      </div>

      {/* 底部点指示器 */}
      {disks.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {disks.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full h-1.5 ${
                index === currentIndex
                  ? 'w-6 bg-blue-600 dark:bg-blue-500'
                  : 'w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              aria-label={`切换到第 ${index + 1} 个网盘`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
