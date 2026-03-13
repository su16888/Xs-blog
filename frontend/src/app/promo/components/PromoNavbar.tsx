'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react'
import { getImageUrl } from '@/lib/api'
import { MagneticButton } from './ui'
import { useState } from 'react'

export default function PromoNavbar({
  theme,
  toggleTheme,
  lang,
  setLang,
  data,
  isZh,
  T,
  scrollToSection,
  navs,
  cfg
}: any) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const text = theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'
  const textSub = theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'

  const getConfigText = (node: any, preferEn: boolean) => {
    const zh = node?.value
    const en = node?.valueEn
    const raw = preferEn ? (en || zh) : (zh || en)
    return raw ? String(raw).trim() : ''
  }

  const logoText = getConfigText(data?.config?.logoText, !isZh) || 'XsBlog'
  const logoSubText = getConfigText(data?.config?.logoSubText, !isZh)

  return (
    <>
      <motion.header
        initial={{ y: -100 }} animate={{ y: 0 }}
        className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 promo-motion-fade"
      >
        <div className={`flex items-center justify-between w-full md:w-full md:max-w-[calc(100vw-2rem)] lg:max-w-6xl px-5 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-300 promo-motion-card
          ${theme === 'dark'
            ? 'bg-stone-900/[0.98] border-stone-800'
            : 'bg-white/[0.98] border-stone-200 shadow-sm'}`}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
             {data?.config?.logoDarkImage?.value && theme === 'dark' ? <img src={getImageUrl(data.config.logoDarkImage.value)} className="h-6 w-auto object-contain" /> :
              data?.config?.logoLightImage?.value && theme === 'light' ? <img src={getImageUrl(data.config.logoLightImage.value)} className="h-6 w-auto object-contain" /> :
              <div className="flex flex-col leading-none">
                <span className={`font-bold text-lg tracking-tight ${text}`}>{logoText}</span>
                {logoSubText ? <span className={`text-[11px] font-medium tracking-wide ${textSub}`}>{logoSubText}</span> : null}
              </div>}
          </div>

          <nav className="hidden md:grid flex-1 grid-flow-col auto-cols-fr items-center gap-3 px-8">
            {navs.map((item: any) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.link)}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap promo-motion-link ${theme === 'dark' ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-800' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'}`}
              >
                {isZh ? item.name : (item.name_en || item.name)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors promo-motion-btn ${theme === 'dark' ? 'border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800' : 'border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {data?.bilingualEnabled && (
              <button
                onClick={() => setLang((l: string) => l === 'zh' ? 'en' : 'zh')}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors promo-motion-btn ${theme === 'dark' ? 'border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800' : 'border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
              >
                {lang.toUpperCase()}
              </button>
            )}
            {cfg.showContactButton !== false && (
              <MagneticButton theme={theme} className="hidden md:flex h-8 items-center !py-0 !px-4 !text-xs" onClick={() => {
                const url = cfg.contactButtonUrl
                if (url) {
                  if (url.startsWith('http://') || url.startsWith('https://')) {
                    window.open(url, '_blank')
                  } else {
                    scrollToSection(url) // Delegate to scrollToSection which handles external/internal links
                  }
                } else {
                  scrollToSection('contact')
                }
              }}>
                {T.contact}
              </MagneticButton>
            )}
            <button className={`md:hidden p-2 ${text}`} onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* --- Mobile Menu --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
            />
            {/* 菜单内容 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className={`fixed top-0 right-0 bottom-0 z-[150] w-[280px] p-6 flex flex-col shadow-2xl
                ${theme === 'dark' ? 'bg-stone-900 border-l border-stone-800' : 'bg-white border-l border-stone-200'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <span className={`text-lg font-bold ${text}`}>Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className={`p-2 rounded-full hover:bg-black/5 ${theme === 'dark' ? 'text-stone-400' : 'text-stone-600'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {navs.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToSection(item.link)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors
                      ${theme === 'dark'
                        ? 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
                  >
                    {isZh ? item.name : (item.name_en || item.name)}
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-8 border-t border-stone-200/10">
                <MagneticButton theme={theme} className="w-full justify-center" onClick={() => {
                   const url = cfg.contactButtonUrl
                   if (url) {
                      if (url.startsWith('http://') || url.startsWith('https://')) {
                        window.open(url, '_blank')
                      } else {
                        scrollToSection(url)
                      }
                   } else {
                     scrollToSection('contact')
                     setIsMenuOpen(false)
                   }
                }}>
                  {T.contact} <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
