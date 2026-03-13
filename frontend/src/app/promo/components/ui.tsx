'use client'

import { motion } from 'framer-motion'
import React from 'react'

// 1. 背景
export const FluidBackground = ({ theme }: { theme: 'dark' | 'light' }) => (
  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none">
    {/* 基础背景色 */}
    <div className={`absolute inset-0 transition-colors duration-700 ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-[#fafafa]'}`} />

    {/* 噪点纹理 */}
    <div className="promo-noise" />

    {/* 主光晕 - 顶部中央 - 琥珀/橙色 */}
    <div className={`absolute -top-[200px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full transition-all duration-1000
      ${theme === 'dark'
        ? 'bg-gradient-to-b from-amber-500/[0.14] via-orange-500/[0.07] to-transparent'
        : 'bg-gradient-to-b from-amber-300/[0.21] via-orange-200/[0.1] to-transparent'
      }`}
      style={{ filter: 'blur(100px)' }}
    />

    {/* 次光晕 - 右上 - 玫瑰/粉色 */}
    <div className={`absolute -top-10 -right-10 w-[600px] h-[600px] rounded-full transition-all duration-1000
      ${theme === 'dark'
        ? 'bg-gradient-to-bl from-rose-500/[0.1] via-pink-500/[0.07] to-transparent'
        : 'bg-gradient-to-bl from-rose-300/[0.17] via-pink-200/[0.1] to-transparent'
      }`}
      style={{ filter: 'blur(80px)' }}
    />

    {/* 次光晕 - 左下 - 蓝色/青色 */}
    <div className={`absolute -bottom-20 -left-20 w-[700px] h-[700px] rounded-full transition-all duration-1000
      ${theme === 'dark'
        ? 'bg-gradient-to-tr from-blue-500/[0.1] via-cyan-500/[0.07] to-transparent'
        : 'bg-gradient-to-tr from-blue-300/[0.14] via-cyan-200/[0.1] to-transparent'
      }`}
      style={{ filter: 'blur(100px)' }}
    />

    {/* 点缀光晕 - 中右 - 紫色 */}
    <div className={`absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full transition-all duration-1000
      ${theme === 'dark'
        ? 'bg-violet-500/[0.07]'
        : 'bg-violet-300/[0.1]'
      }`}
      style={{ filter: 'blur(80px)' }}
    />

    {/* 点缀光晕 - 中左 - 翠绿色 */}
    <div className={`absolute top-2/3 left-1/4 w-[350px] h-[350px] rounded-full transition-all duration-1000
      ${theme === 'dark'
        ? 'bg-emerald-500/[0.07]'
        : 'bg-emerald-300/[0.1]'
      }`}
      style={{ filter: 'blur(70px)' }}
    />
  </div>
)

// 2. 卡片组件
export const SpotlightCard = ({ children, className = "", theme, delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      viewport={{ once: true }}
      className={`group relative h-full overflow-hidden rounded-2xl border transition-all duration-300 promo-motion-card
        ${theme === 'dark'
          ? 'bg-stone-900 border-stone-800 hover:border-stone-700 hover:shadow-lg hover:shadow-black/20'
          : 'bg-white border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300'
        } ${className}`}
    >
      <div className="relative h-full z-10 flex flex-col">{children}</div>
    </motion.div>
  )
}

// 3. 按钮组件
export const MagneticButton = ({ children, onClick, variant = 'primary', theme, className = "" }: any) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group active:scale-[0.97] promo-motion-btn
      ${variant === 'primary'
        ? theme === 'dark'
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
          : 'bg-gradient-to-r from-neutral-900 to-neutral-800 text-white hover:from-neutral-800 hover:to-neutral-700 shadow-lg shadow-neutral-900/25 hover:shadow-neutral-900/40'
        : theme === 'dark'
          ? 'border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white hover:bg-neutral-800/50'
          : 'border border-neutral-300 hover:border-neutral-400 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
      } ${className}`}
  >
    {children}
  </button>
)

// 4. 区域标题组件
export const SectionTitle = ({ children, subtitle, theme, align = 'left', color = 'amber', label = 'Section' }: { children: React.ReactNode, subtitle?: string, theme: 'dark' | 'light', align?: 'left' | 'center', color?: 'amber' | 'rose' | 'sky' | 'emerald' | 'violet', label?: string }) => {
  const text = theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'
  const textSub = theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'

  const colorMap = {
    amber: { line: theme === 'dark' ? 'bg-amber-500' : 'bg-amber-500', label: theme === 'dark' ? 'text-amber-400' : 'text-amber-600' },
    rose: { line: theme === 'dark' ? 'bg-rose-500' : 'bg-rose-500', label: theme === 'dark' ? 'text-rose-400' : 'text-rose-600' },
    sky: { line: theme === 'dark' ? 'bg-sky-500' : 'bg-sky-500', label: theme === 'dark' ? 'text-sky-400' : 'text-sky-600' },
    emerald: { line: theme === 'dark' ? 'bg-emerald-500' : 'bg-emerald-500', label: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600' },
    violet: { line: theme === 'dark' ? 'bg-violet-500' : 'bg-violet-500', label: theme === 'dark' ? 'text-violet-400' : 'text-violet-600' },
  }
  const c = colorMap[color]

  return (
    <div className={`mb-12 ${align === 'center' ? 'text-center' : ''}`}>
      <div className={`inline-flex items-center gap-3 mb-4 ${align === 'center' ? 'justify-center' : ''}`}>
        <div className={`h-1 w-8 rounded-full ${c.line}`} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${c.label}`}>{label}</span>
      </div>
      <h2 className={`text-2xl md:text-4xl font-bold tracking-tight ${text}`}>
        {children}
      </h2>
      {subtitle && (
        <p className={`mt-3 text-base md:text-lg ${textSub}`}>{subtitle}</p>
      )}
    </div>
  )
}
