'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'

/**
 * 懒加载组件包装器
 *
 * 用于对非关键组件进行代码分割和懒加载
 *
 * 使用示例：
 * ```tsx
 * const LazyComponent = lazyLoad(() => import('./HeavyComponent'))
 *
 * function Page() {
 *   return <LazyComponent />
 * }
 * ```
 */

interface LazyLoadOptions {
  /** 加载中显示的组件 */
  loading?: ReactNode
  /** 是否在服务端渲染 */
  ssr?: boolean
}

/**
 * 懒加载函数
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const { loading, ssr = false } = options

  return dynamic(importFunc, {
    loading: () => (loading as React.ReactElement) || (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-border-primary border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    ),
    ssr
  })
}

/**
 * 预定义的加载组件
 */
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
  </div>
)

export const LoadingSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
    <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
  </div>
)

/**
 * 使用示例文件
 *
 * 在需要懒加载的地方：
 *
 * ```tsx
 * // pages/example.tsx
 * import { lazyLoad, LoadingSpinner } from '@/components/LazyLoad'
 *
 * // 懒加载重型组件
 * const HeavyChart = lazyLoad(
 *   () => import('@/components/HeavyChart'),
 *   { loading: <LoadingSpinner /> }
 * )
 *
 * const ImageGallery = lazyLoad(
 *   () => import('@/components/ImageGallery'),
 *   { loading: <LoadingSkeleton />, ssr: false }
 * )
 *
 * export default function Page() {
 *   return (
 *     <div>
 *       <h1>页面标题</h1>
 *       {/\* 只在需要时加载这些组件 *\/}
 *       <HeavyChart />
 *       <ImageGallery />
 *     </div>
 *   )
 * }
 * ```
 */
