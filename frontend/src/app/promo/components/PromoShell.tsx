'use client'

import { useEffect, useLayoutEffect, useState, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, useScroll, useSpring } from 'framer-motion'
import { getPromoData, getImageUrl } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import SEOMeta from '@/components/SEOMeta'
import { Sun, Moon, ArrowRight } from 'lucide-react'
import { PromoContext } from '../context/PromoContext'
import { FluidBackground } from './ui'
import PromoNavbar from './PromoNavbar'

export default function PromoShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings: rawSettings, pageTexts } = useSettings()

  const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // 滚动进度
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  // Theme Persistence
  const setCookie = (name: string, value: string, days: number = 365) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
  }

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  useEffect(() => {
    const globalTheme = getCookie('theme')
    if (globalTheme) {
      const mappedTheme = globalTheme === 'black' ? 'dark' : 'light'
      setTheme(mappedTheme)
      localStorage.setItem('promo-theme', mappedTheme)
      return
    }

    const saved = localStorage.getItem('promo-theme') as 'dark' | 'light'
    if (saved) {
      setTheme(saved)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useIsoLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('promo-lang')
      if (saved === 'zh' || saved === 'en') {
        setLang(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('promo-lang', lang)
    } catch {}
  }, [lang])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'promo-lang') return
      if (e.newValue === 'zh' || e.newValue === 'en') {
        setLang(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setLangForNavbar = (nextOrUpdater: any) => {
    setLang((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater
      if (next === 'zh' || next === 'en') {
        try {
          localStorage.setItem('promo-lang', next)
        } catch {}
        return next
      }
      return prev
    })
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('promo-theme', next)
    const globalTheme = next === 'dark' ? 'black' : 'white'
    setCookie('theme', globalTheme, 365)
  }

  // Init Data
  useEffect(() => {
    getPromoData().then(res => {
      if(res.success) setData(res.data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  // Isolation
  useEffect(() => {
    document.querySelectorAll('nav:not(.promo-nav), [class*="FloatingButtons"]').forEach((el: any) => el.style.display = 'none')
    return () => {
      document.querySelectorAll('nav:not(.promo-nav), [class*="FloatingButtons"]').forEach((el: any) => el.style.display = '')
    }
  }, [])

  // Background Sync
  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#0c0a09' : '#fafaf9'
    document.body.style.color = theme === 'dark' ? '#fafaf9' : '#1c1917'
  }, [theme])

  // Scroll Handler
  const scrollToSection = (link: string) => {
    if (!link) return
    setIsMenuOpen(false)

    // 绝对路径
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank')
      return
    }

    // 相对路径 (非锚点) - 页面跳转
    if (link.startsWith('/') && !link.startsWith('/#')) {
      router.push(link)
      return
    }

    // 锚点处理
    const targetId = link.replace(/^\/?#?/, '')
    
    // 如果不在首页且是锚点，先跳转到首页
    if (pathname !== '/promo') {
      router.push(`/promo#${targetId}`)
      return
    }

    const element = document.getElementById(targetId)
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100
      window.scrollTo({
        top: top,
        behavior: 'smooth'
      })
    }
  }

  const isZh = lang === 'zh'
  const cfg = data?.config || {}
  const ui = cfg.uiTexts || {}
  const navs = (data?.navItems || [])
    .filter((i: any) => i?.is_visible)
    .map((item: any, idx: number) => {
      const raw = item?.sort_order
      const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
      const sortOrder = Number.isFinite(parsed) ? parsed : idx
      return { item, idx, sortOrder }
    })
    .sort((a: any, b: any) => (a.sortOrder - b.sortOrder) || (a.idx - b.idx))
    .map((x: any) => x.item)

  const promoTitleSuffix = pathname === '/promo/price' ? (isZh ? '价格' : 'Pricing') : ''
  const zhBrowserTitle = pageTexts?.promo?.browserTitle?.trim() || ''
  const zhBrowserSubtitle = pageTexts?.promo?.browserSubtitle?.trim() || ''
  const getConfigText = (node: any, preferEn: boolean) => {
    const zh = node?.value
    const en = node?.valueEn
    const raw = preferEn ? (en || zh) : (zh || en)
    return raw ? String(raw).trim() : ''
  }

  const logoTitle = (() => {
    const main = getConfigText(cfg?.logoText, !isZh)
    const sub = getConfigText(cfg?.logoSubText, !isZh)
    const combined = [main, sub].filter(Boolean).join(' - ')
    return combined.trim()
  })()

  const cfgBrowserTitle = getConfigText(cfg?.browserTitle, !isZh)
  const cfgBrowserSubtitle = getConfigText(cfg?.browserSubtitle, !isZh)

  const promoBaseTitle = cfgBrowserTitle || logoTitle || zhBrowserTitle || rawSettings.siteTitle || 'XsBlog'

  const promoCustomTitle = `${promoBaseTitle}${promoTitleSuffix ? ` - ${promoTitleSuffix}` : ''}${cfgBrowserSubtitle ? ` - ${cfgBrowserSubtitle}` : (isZh && zhBrowserSubtitle ? ` - ${zhBrowserSubtitle}` : '')}`

  // Dynamic Texts
  const T = {
    heroTag: isZh ? (cfg.heroTag?.value || 'OFFICIAL 2026') : (cfg.heroTag?.valueEn || 'OFFICIAL 2026'),
    learnMore: isZh ? (ui.learnMoreButton || '了解更多') : (ui.learnMoreButtonEn || 'Learn More'),
    partners: isZh ? (cfg.partnersTag?.value || '合作伙伴') : (cfg.partnersTag?.valueEn || 'Partners'),
    team: isZh ? (cfg.teamTag?.value || '核心团队') : (cfg.teamTag?.valueEn || 'Our Team'),
    services: isZh ? (cfg.servicesTag?.value || '服务能力') : (cfg.servicesTag?.valueEn || 'Services'),
    features: isZh ? (cfg.aboutTag?.value || '核心特性') : (cfg.aboutTag?.valueEn || 'Features'),
    contact: isZh ? (ui.contactButton || '开始对话') : (ui.contactButtonEn || 'Contact Us'),
    copyright: (() => {
      const configured = isZh ? cfg.footerCopyright?.value : (cfg.footerCopyright?.valueEn || cfg.footerCopyright?.value)
      return configured?.trim() ? configured : ''
    })(),
    featuresLearnMore: isZh ? (cfg.featuresLearnMoreText?.value || '了解详情') : (cfg.featuresLearnMoreText?.valueEn || 'Learn more'),
    form: {
      name: isZh ? (ui.formName || '您的姓名') : (ui.formNameEn || 'Name'),
      contact: isZh ? (ui.formContact || '联系方式') : (ui.formContactEn || 'Contact'),
      content: isZh ? (ui.formContent || '项目描述或留言...') : (ui.formContentEn || 'Message...'),
      submit: isZh ? (ui.formSubmit || '发送留言') : (ui.formSubmitEn || 'Send Message'),
      sending: isZh ? (ui.formSending || '提交中...') : (ui.formSendingEn || 'Sending...'),
      verify: isZh ? '安全验证' : 'Verification',
      placeholder: isZh ? '输入验证码' : 'Captcha',
      confirm: isZh ? '确认提交' : 'Confirm',
      cancel: isZh ? '取消' : 'Cancel'
    }
  }

  if (isLoading) return (
    <div className={`h-screen w-screen flex items-center justify-center ${theme === 'dark' ? 'bg-neutral-950' : 'bg-white'}`}>
      <div className="relative">
        <div className={`w-10 h-10 border-2 rounded-full animate-spin ${theme === 'dark' ? 'border-amber-500/20 border-t-amber-500' : 'border-blue-200 border-t-blue-600'}`}/>
        <div className={`absolute inset-0 w-10 h-10 border-2 border-transparent rounded-full animate-spin ${theme === 'dark' ? 'border-b-rose-500/50' : 'border-b-purple-500/50'}`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}/>
      </div>
    </div>
  )

  // Styles
  const bg = theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'
  const text = theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'
  const textSub = theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
  const textMuted = theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
  const border = theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'

  return (
    <PromoContext.Provider value={{ theme, toggleTheme, lang, setLang, data, isLoading, isZh, T, scrollToSection }}>
      <div className={`promo-page-root relative min-h-screen w-full z-[9999] antialiased transition-colors duration-500 ${bg} ${text} ${theme === 'dark' ? 'dark' : ''}`}>
        <SEOMeta customTitle={promoCustomTitle} />
        <FluidBackground theme={theme} />
        <motion.div className="fixed top-0 left-0 right-0 h-[2px] bg-amber-600 z-[100] origin-left" style={{ scaleX }} />

        {/* --- Navbar --- */}
        <PromoNavbar
          theme={theme}
          toggleTheme={toggleTheme}
          lang={lang}
          setLang={setLangForNavbar}
          data={data}
          isZh={isZh}
          T={T}
          scrollToSection={scrollToSection}
          navs={navs}
          cfg={cfg}
        />

        {/* --- Main Content --- */}
        <main>
          {children}
        </main>

        {/* --- Footer --- */}
        <footer className={`py-12 border-t ${theme === 'dark' ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className={`text-sm ${textSub}`}>{rawSettings.footerCopyright || T.copyright}</div>
          </div>
        </footer>
      </div>
    </PromoContext.Provider>
  )
}
