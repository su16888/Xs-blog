'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  motion, 
  useScroll, 
  useSpring, 
  AnimatePresence
} from 'framer-motion'
import { getPromoData, submitMessage, getCaptcha, getImageUrl } from '@/lib/api'
import { getApiBaseUrl } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import SEOMeta from '@/components/SEOMeta'
import PromoNavbar from './components/PromoNavbar'
import {
  ArrowRight, Sparkles, Zap, Shield, Layers,
  Box, Mail, ArrowDown, Sun, Moon,
  Terminal, X
} from 'lucide-react'


// --- 高级组件 ---

// 1. 背景
const FluidBackground = ({ theme }: { theme: 'dark' | 'light' }) => (
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
const SpotlightCard = ({ children, className = "", theme, delay = 0 }: any) => {
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
const MagneticButton = ({ children, onClick, variant = 'primary', theme, className = "" }: any) => (
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
const SectionTitle = ({ children, subtitle, theme, align = 'left', color = 'amber', label = 'Section' }: { children: React.ReactNode, subtitle?: string, theme: 'dark' | 'light', align?: 'left' | 'center', color?: 'amber' | 'rose' | 'sky' | 'emerald' | 'violet', label?: string }) => {
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

export default function PromoPage() {
  const router = useRouter()
  const { settings: rawSettings, isLoading: settingsLoading, pageTexts } = useSettings()

  const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [activePartnerIndex, setActivePartnerIndex] = useState<number | null>(null)

  const serviceTabsScrollerRef = useRef<HTMLDivElement | null>(null)
  const serviceTabButtonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const services = data?.serviceCategories || []
  
  const [form, setForm] = useState({ name: '', contact: '', content: '', captcha: '' })
  const [status, setStatus] = useState({ show: false, type: '', msg: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [captchaData, setCaptchaData] = useState<{ id: string; image: string } | null>(null)

  // 滚动进度 (默认监听 Window)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    const scroller = serviceTabsScrollerRef.current
    const btn = serviceTabButtonRefs.current[activeTab]
    if (!scroller || !btn) return

    const scrollerRect = scroller.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const btnCenter = (btnRect.left - scrollerRect.left) + scroller.scrollLeft + (btnRect.width / 2)
    const nextLeft = btnCenter - (scroller.clientWidth / 2)
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const clampedLeft = Math.max(0, Math.min(nextLeft, maxLeft))

    scroller.scrollTo({ left: clampedLeft, behavior: 'smooth' })
  }, [activeTab, services.length])

  // 自定义滚动跳转函数 (支持锚点、相对路径、绝对路径)
  const scrollToSection = (link: string) => {
    if (!link) return
    setIsMenuOpen(false)

    // 绝对路径 URL - 新标签页打开
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank')
      return
    }

    const hashIndex = link.indexOf('#')
    if (hashIndex >= 0) {
      const targetId = link.slice(hashIndex + 1).trim()
      if (targetId) {
        router.push(`/promo#${targetId}`)

        const tryScroll = (attempt: number) => {
          const el = document.getElementById(targetId)
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 100
            window.scrollTo({ top, behavior: 'smooth' })
            return
          }
          if (attempt >= 20) return
          setTimeout(() => tryScroll(attempt + 1), 50)
        }

        tryScroll(0)
        return
      }
    }

    // 相对路径（以 / 开头但不是 /#）- 使用 Next.js 路由跳转
    if (link.startsWith('/') && !link.startsWith('/#')) {
      router.push(link)
      return
    }

    // 锚点滚动（#xxx 或 /#xxx 或纯文本）
    const targetId = link.replace(/^\/?#?/, '')
    const element = document.getElementById(targetId)

    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100
      window.scrollTo({
        top: top,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isLoading) return
    const hash = window.location.hash
    if (hash) scrollToSection(hash)
  }, [isLoading])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      const hash = window.location.hash
      if (hash) scrollToSection(hash)
    }
    window.addEventListener('hashchange', handler)
    window.addEventListener('popstate', handler)
    return () => {
      window.removeEventListener('hashchange', handler)
      window.removeEventListener('popstate', handler)
    }
  }, [])

  useEffect(() => {
    setActivePartnerIndex(null)
  }, [lang])

  // Cookie 操作函数（用于同步到全局主题）
  const setCookie = (name: string, value: string, days: number = 365) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
  }

  const getCookie = (name: string): string | null => {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  // Theme Persistence - 优先从全局主题 Cookie 读取
  useEffect(() => {
    // 优先从全局主题 Cookie 读取
    const globalTheme = getCookie('theme')
    if (globalTheme) {
      // 映射：black -> dark, white/gray -> light
      const mappedTheme = globalTheme === 'black' ? 'dark' : 'light'
      setTheme(mappedTheme)
      localStorage.setItem('promo-theme', mappedTheme)
      return
    }

    // 其次从 localStorage 读取
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
    // 同步到全局主题 Cookie
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

  // Handlers
  const refreshCaptcha = async () => {
    const res = await getCaptcha()
    if (res.success && res.data) {
      setCaptchaData({ 
        id: res.data.id, 
        image: res.data.image.startsWith('data:') ? res.data.image : `data:image/svg+xml;utf8,${encodeURIComponent(res.data.image)}`
      })
    }
  }

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.contact || !form.content) {
      const msg = lang === 'zh' ? '请填写完整信息。' : 'Please complete all fields.'
      setStatus({ show: true, type: 'error', msg })
      return
    }
    await refreshCaptcha()
    setShowModal(true)
  }

  const doSubmit = async () => {
    if (!form.captcha) return
    setSubmitting(true)
    try {
      const res = await submitMessage({ ...form, category_id: data?.messageCategoryId, captcha_id: captchaData?.id, captcha_text: form.captcha })
      if (res.success) {
        const msg = lang === 'zh' ? '提交成功！' : 'Message sent!'
        setStatus({ show: true, type: 'success', msg })
        setShowModal(false)
        setForm({ ...form, content: '', captcha: '' })
      } else {
        const msg = lang === 'zh' ? '提交失败，请重试。' : 'Failed, try again.'
        setStatus({ show: true, type: 'error', msg: res.message || msg })
        refreshCaptcha()
      }
    } catch {
      setStatus({ show: true, type: 'error', msg: 'Network Error' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setStatus(prev => ({ ...prev, show: false })), 3000)
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

  const isZh = lang === 'zh'
  const cfg = data?.config || {}
  const ui = cfg.uiTexts || {}

  // 动态文本（从后台配置读取）
  const T = {
    heroTag: isZh ? (cfg.heroTag?.value || 'OFFICIAL 2026') : (cfg.heroTag?.valueEn || 'OFFICIAL 2026'),
    learnMore: isZh ? (ui.learnMoreButton || '了解更多') : (ui.learnMoreButtonEn || 'Learn More'),
    partners: isZh ? (cfg.partnersTag?.value || '合作伙伴') : (cfg.partnersTag?.valueEn || 'Partners'),
    team: isZh ? (cfg.teamTag?.value || '核心团队') : (cfg.teamTag?.valueEn || 'Our Team'),
    services: isZh ? (cfg.servicesTag?.value || '服务能力') : (cfg.servicesTag?.valueEn || 'Services'),
    features: isZh ? (cfg.aboutTag?.value || '核心特性') : (cfg.aboutTag?.valueEn || 'Features'),
    contact: isZh ? (ui.contactButton || '开始对话') : (ui.contactButtonEn || 'Contact Us'),
    copyright: isZh ? (cfg.footerCopyright?.value || 'All Rights Reserved.') : (cfg.footerCopyright?.valueEn || 'All Rights Reserved.'),
    featuresLearnMore: isZh ? (cfg.featuresLearnMoreText?.value || '了解详情') : (cfg.featuresLearnMoreText?.valueEn || 'Learn more'),
    form: {
      name: isZh ? (ui.formName || '您的姓名') : (ui.formNameEn || 'Name'),
      contact: isZh ? (ui.formContact || '联系方式') : (ui.formContactEn || 'Contact'),
      content: isZh ? (ui.formContent || '项目描述或留言...') : (ui.formContentEn || 'Message...'),
      submit: isZh ? (ui.formSubmit || '发送留言') : (ui.formSubmitEn || 'Send Message'),
      sending: isZh ? (ui.formSending || '提交中...') : (ui.formSendingEn || 'Sending...'),
      // 验证码弹窗文本改为硬编码
      verify: isZh ? '安全验证' : 'Verification',
      placeholder: isZh ? '输入验证码' : 'Captcha',
      confirm: isZh ? '确认提交' : 'Confirm',
      cancel: isZh ? '取消' : 'Cancel'
    }
  }

  // Data
  const team = data?.teamMembers?.filter((i: any) => i.is_visible) || []
  const partners = data?.partners || []
  const features = data?.config?.aboutFeatures || []
  const contacts = data?.contactMethods || []
  const navs = data?.navItems?.filter((i: any) => i.is_visible) || []
  const isFourFeatures = features.length === 4

  // Helper to process titles
  const getHeroTitle = () => {
    const raw = isZh ? (data?.config?.heroTitle?.value || 'XsBlog') : (data?.config?.heroTitle?.valueEn || 'XsBlog')
    // Split by newline and render
    return raw.split('\n').map((line: string, i: number) => (
      <span key={i} className="block">{line}</span>
    ))
  }

  const zhBrowserTitle = pageTexts?.promo?.browserTitle?.trim() || ''
  const zhBrowserSubtitle = pageTexts?.promo?.browserSubtitle?.trim() || ''
  const getConfigText = (node: any, preferEn: boolean) => {
    const zh = node?.value
    const en = node?.valueEn
    const raw = preferEn ? (en || zh) : (zh || en)
    return raw ? String(raw).trim() : ''
  }

  const logoTitle = (() => {
    const main = getConfigText(data?.config?.logoText, !isZh)
    const sub = getConfigText(data?.config?.logoSubText, !isZh)
    const combined = [main, sub].filter(Boolean).join(' - ')
    return combined.trim()
  })()

  const cfgBrowserTitle = getConfigText(data?.config?.browserTitle, !isZh)
  const cfgBrowserSubtitle = getConfigText(data?.config?.browserSubtitle, !isZh)

  const promoBaseTitle = cfgBrowserTitle || logoTitle || zhBrowserTitle || rawSettings.siteTitle || 'XsBlog'
  const promoCustomTitle = `${promoBaseTitle}${cfgBrowserSubtitle ? ` - ${cfgBrowserSubtitle}` : (isZh && zhBrowserSubtitle ? ` - ${zhBrowserSubtitle}` : '')}`

  // Styles (Independent) - 更丰富的文字层次
  const bg = theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'
  const text = theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'
  const textSecondary = theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
  const textSub = theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
  const textMuted = theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'

  // Isolation Wrapper: Relative, Z-Index 9999, covers everything but allows window scroll
  return (
    <div
      className={`promo-page-root relative min-h-screen w-full z-[9999] antialiased transition-colors duration-500 ${bg} ${text} ${theme === 'dark' ? 'dark' : ''}`}
    >
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
              className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
            />
            {/* 菜单面板 */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`fixed top-4 left-4 right-4 z-[151] rounded-2xl p-6 shadow-2xl
                ${theme === 'dark' ? 'bg-stone-900 border border-stone-800' : 'bg-white border border-stone-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <span className={`font-semibold text-lg ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'}`}>
                  Menu
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-stone-800 hover:bg-stone-700' : 'bg-stone-100 hover:bg-stone-200'}`}
                >
                  <X className={`w-5 h-5 ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600'}`} />
                </button>
              </div>
              <div className="flex flex-col gap-1 mb-6">
                {navs.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.link)}
                    className={`text-left text-lg font-medium py-3 px-4 rounded-xl transition-colors
                      ${theme === 'dark' ? 'text-stone-200 hover:bg-stone-800' : 'text-stone-800 hover:bg-stone-100'}`}
                  >
                    {isZh ? item.name : (item.name_en || item.name)}
                  </button>
                ))}
              </div>
              {cfg.showContactButton !== false && (
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
                  }
                }}>
                  {T.contact}
                </MagneticButton>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Hero (Full Height) --- */}
      <section id="home" className="relative min-h-screen flex flex-col justify-center items-center px-6 pt-16 overflow-hidden">
        {/* Hero 专属装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl
              ${theme === 'dark' ? 'bg-amber-500/5' : 'bg-amber-300/20'}`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
            className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl
              ${theme === 'dark' ? 'bg-rose-500/5' : 'bg-rose-300/15'}`}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-6xl mx-auto z-10 flex flex-col items-center"
        >
          {/* 标签 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border text-xs font-medium tracking-wide uppercase backdrop-blur-sm
              ${theme === 'dark'
                ? 'bg-neutral-900/80 border-neutral-800 text-amber-400'
                : 'bg-white/80 border-neutral-200 text-amber-600 shadow-sm'}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> {T.heroTag}
          </motion.div>

          {/* 主标题 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-center ${text}`}
          >
            {getHeroTitle()}
          </motion.h1>

          {/* 副标题 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`text-base md:text-xl max-w-2xl mb-10 leading-relaxed text-center ${textSecondary}`}
          >
            {(() => {
              // 如果数据还在加载中，显示占位符
              if (isLoading || settingsLoading) {
                return '\u00A0' // 不可见的空格，保持布局
              }
              
              // 优先使用页面文本配置的描述
              const pageTextDesc = pageTexts?.promo?.description?.trim()
              if (pageTextDesc) return pageTextDesc
              
              const cfgDesc = isZh ? cfg.heroDescription?.value : (cfg.heroDescription?.valueEn || cfg.heroDescription?.value)
              if (cfgDesc?.trim()) return cfgDesc

              // 如果没有配置，显示空格（不显示任何内容）
              return '\u00A0'
            })()}
          </motion.p>

          {/* 特性标签 */}
          {cfg.showHeroFeatureTags !== false && (cfg.heroFeatureTags || []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3 mb-10"
            >
              {(cfg.heroFeatureTags || []).map((tag: any, i: number) => {
              const colorMap: Record<string, { border: string; bg: string; icon: string }> = {
                amber: { border: 'hover:border-amber-500/50', bg: 'hover:bg-amber-500/5', icon: 'text-amber-500' },
                emerald: { border: 'hover:border-emerald-500/50', bg: 'hover:bg-emerald-500/5', icon: 'text-emerald-500' },
                sky: { border: 'hover:border-sky-500/50', bg: 'hover:bg-sky-500/5', icon: 'text-sky-500' },
                rose: { border: 'hover:border-rose-500/50', bg: 'hover:bg-rose-500/5', icon: 'text-rose-500' },
                violet: { border: 'hover:border-violet-500/50', bg: 'hover:bg-violet-500/5', icon: 'text-violet-500' }
              }
              const c = colorMap[tag.color] || colorMap.amber
              return (
                <div key={i} className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-300 hover:scale-105
                  ${theme === 'dark'
                    ? `bg-neutral-900/50 border-neutral-800 text-neutral-300 ${c.border} ${c.bg}`
                    : `bg-white/80 border-neutral-200 text-neutral-600 ${c.border} hover:bg-${tag.color}-50 shadow-sm`}`}
                >
                  {tag.icon ? (
                    tag.icon.startsWith('<') ? (
                      <div className={`w-4 h-4 ${c.icon} [&>svg]:w-full [&>svg]:h-full`} dangerouslySetInnerHTML={{ __html: tag.icon }} />
                    ) : (
                      <img src={getImageUrl(tag.icon)} alt="" className={`w-4 h-4 ${c.icon}`} />
                    )
                  ) : (
                    <Terminal className={`w-4 h-4 ${c.icon}`} />
                  )}
                  {isZh ? tag.text : (tag.textEn || tag.text)}
                </div>
              )
            })}
          </motion.div>
          )}

          {/* 按钮组 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {cfg.showHeroMainButton !== false && (
              <MagneticButton
                theme={theme}
                onClick={() => {
                  const url = cfg.heroButtonUrl
                  if (url) {
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      window.open(url, '_blank')
                    } else {
                      scrollToSection(url)
                    }
                  } else {
                    scrollToSection('features')
                  }
                }}
              >
                {isZh ? (data?.config?.heroButtonText?.value || '立即开始') : (data?.config?.heroButtonText?.valueEn || 'Get Started')} <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            )}
            {cfg.showHeroSecondButton !== false && cfg.heroSecondButtonText && (
              <MagneticButton
              variant="outline"
              theme={theme}
              onClick={() => {
                const url = cfg.heroSecondButtonUrl
                if (url) {
                  if (url.startsWith('http://') || url.startsWith('https://')) {
                    window.open(url, '_blank')
                  } else {
                    scrollToSection(url)
                  }
                } else {
                  scrollToSection('features')
                }
              }}
            >
              {isZh ? (cfg.heroSecondButtonText?.value || T.learnMore) : (cfg.heroSecondButtonText?.valueEn || T.learnMore)}
            </MagneticButton>
            )}
          </motion.div>
        </motion.div>

        {/* 向下滚动提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer transition-opacity hover:opacity-100 ${textMuted}`}
          onClick={() => scrollToSection('features')}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* --- Features --- */}
      <section id="features" className={`py-24 relative overflow-hidden ${theme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
        {/* about 别名，用于导航兼容 */}
        <div id="about" className="absolute -mt-24" />

        {/* 背景装饰 */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none
          ${theme === 'dark' ? 'bg-amber-500/[0.03]' : 'bg-amber-200/20'}`}
        />

        <div className="max-w-6xl mx-auto px-6 relative">
          <SectionTitle theme={theme} color="amber" subtitle={isZh ? (cfg.aboutDescription?.value || '') : (cfg.aboutDescription?.valueEn || '')} label={isZh ? (cfg.aboutSectionLabel || 'Section') : (cfg.aboutSectionLabelEn || 'Section')}>
            {isZh ? (cfg.aboutTitle?.value || T.features) : (cfg.aboutTitle?.valueEn || T.features)}
          </SectionTitle>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${isFourFeatures ? 'lg:grid-cols-2 gap-4 md:gap-5' : 'lg:grid-cols-3 gap-6'}`}>
            {features.map((f: any, i: number) => {
              const colors = [
                { icon: 'text-amber-500', hover: 'hover:border-amber-500/30', bg: theme === 'dark' ? 'group-hover:bg-amber-500/10' : 'group-hover:bg-amber-50' },
                { icon: 'text-rose-500', hover: 'hover:border-rose-500/30', bg: theme === 'dark' ? 'group-hover:bg-rose-500/10' : 'group-hover:bg-rose-50' },
                { icon: 'text-sky-500', hover: 'hover:border-sky-500/30', bg: theme === 'dark' ? 'group-hover:bg-sky-500/10' : 'group-hover:bg-sky-50' },
                { icon: 'text-emerald-500', hover: 'hover:border-emerald-500/30', bg: theme === 'dark' ? 'group-hover:bg-emerald-500/10' : 'group-hover:bg-emerald-50' },
                { icon: 'text-violet-500', hover: 'hover:border-violet-500/30', bg: theme === 'dark' ? 'group-hover:bg-violet-500/10' : 'group-hover:bg-violet-50' },
              ]
              const color = colors[i % colors.length]
              const accentHexes = ['#f59e0b', '#fb7185', '#38bdf8', '#34d399', '#a78bfa']
              const accentHex = accentHexes[i % accentHexes.length]

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                  viewport={{ once: true, margin: "-50px" }}
                  className={`promo-feature-card promo-border-gradient group relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${f.url ? 'cursor-pointer' : ''}
                    ${i === 0 && !isFourFeatures ? 'md:col-span-2 lg:col-span-2' : ''}
                    ${theme === 'dark'
                      ? `bg-neutral-900/35 border-neutral-800/80 backdrop-blur-sm hover:bg-neutral-900/55 ${color.hover}`
                      : `bg-white/70 border-neutral-200/70 backdrop-blur-sm ${color.hover} hover:shadow-2xl hover:shadow-black/5`
                    }`}
                  style={{ ['--promo-card-accent' as any]: accentHex }}
                  onPointerMove={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    const rect = el.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    el.style.setProperty('--promo-mx', `${x}px`)
                    el.style.setProperty('--promo-my', `${y}px`)
                  }}
                  onPointerLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.setProperty('--promo-mx', '50%')
                    el.style.setProperty('--promo-my', '45%')
                  }}
                  onClick={() => {
                    if (f.url) {
                      if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
                        window.open(f.url, '_blank')
                      } else {
                        scrollToSection(f.url)
                      }
                    }
                  }}
                >
                  {/* 悬停时的顶部装饰线 */}
                  <div className={`absolute top-0 left-0 right-0 h-1 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 bg-gradient-to-r
                    ${i % 5 === 0 ? 'from-amber-500 to-orange-500' :
                      i % 5 === 1 ? 'from-rose-500 to-pink-500' :
                      i % 5 === 2 ? 'from-sky-500 to-cyan-500' :
                      i % 5 === 3 ? 'from-emerald-500 to-teal-500' :
                      'from-violet-500 to-purple-500'}`}
                  />

                  {/* 序号标识 */}
                  <div className={`absolute top-4 right-4 text-xs font-mono transition-colors duration-300
                    ${theme === 'dark' ? 'text-neutral-700 group-hover:text-neutral-500' : 'text-neutral-300 group-hover:text-neutral-400'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  <div className="flex flex-col h-full">
                    {/* 图标 */}
                    <div className={`promo-feature-icon w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${color.icon}
                      ${theme === 'dark' ? `bg-neutral-800 ${color.bg}` : `bg-neutral-100 ${color.bg}`}`}
                    >
                      {f.icon ? (
                        <img src={getImageUrl(f.icon)} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <Zap className="w-6 h-6" />
                      )}
                    </div>

                    {/* 内容 */}
                    <h3 className={`text-base font-semibold mb-1.5 transition-colors duration-300 ${text}`}>
                      {isZh ? f.title : (f.titleEn || f.title)}
                    </h3>
                    <p className={`promo-line-clamp-2 text-sm leading-relaxed flex-grow ${textSub}`}>
                      {isZh ? f.desc : (f.descEn || f.desc)}
                    </p>

                    {/* 底部箭头 - 只在有URL时显示 */}
                    {f.url && (
                      <div className={`mt-5 pt-4 border-t flex items-center justify-between transition-colors duration-300
                        ${theme === 'dark' ? 'border-neutral-800 group-hover:border-neutral-700' : 'border-neutral-100 group-hover:border-neutral-200'}`}
                      >
                        <span className={`text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${textMuted} group-hover:${textSub}`}>
                          {T.featuresLearnMore}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 ${color.icon}
                          ${theme === 'dark'
                            ? `bg-neutral-800 group-hover:bg-neutral-700`
                            : `bg-neutral-100 group-hover:bg-neutral-200`
                          }`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {/* Fallback */}
            {features.length === 0 && (
              <>
                {[
                  { icon: <Zap className="w-6 h-6" />, title: 'High Performance', desc: 'Optimized for speed and efficiency.', span: true },
                  { icon: <Shield className="w-6 h-6" />, title: 'Secure', desc: 'Enterprise-grade security built-in.' },
                  { icon: <Layers className="w-6 h-6" />, title: 'Scalable', desc: 'Grows with your business needs.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className={`promo-feature-card promo-border-gradient group relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 overflow-hidden
                      ${item.span ? 'md:col-span-2 lg:col-span-2' : ''}
                      ${theme === 'dark'
                        ? 'bg-neutral-900/35 border-neutral-800/80 backdrop-blur-sm hover:bg-neutral-900/55 hover:border-neutral-700'
                        : 'bg-white/70 border-neutral-200/70 backdrop-blur-sm hover:border-neutral-300 hover:shadow-2xl hover:shadow-black/5'
                      }`}
                    style={{ ['--promo-card-accent' as any]: ['#f59e0b', '#38bdf8', '#34d399'][i % 3] }}
                    onPointerMove={(e) => {
                      const el = e.currentTarget as HTMLDivElement
                      const rect = el.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const y = e.clientY - rect.top
                      el.style.setProperty('--promo-mx', `${x}px`)
                      el.style.setProperty('--promo-my', `${y}px`)
                    }}
                    onPointerLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.setProperty('--promo-mx', '50%')
                      el.style.setProperty('--promo-my', '45%')
                    }}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-0.5 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ${theme === 'dark' ? 'bg-amber-500' : 'bg-amber-600'}`} />
                    <div className={`absolute top-4 right-4 text-xs font-mono ${theme === 'dark' ? 'text-stone-700' : 'text-stone-300'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex flex-col h-full">
                      <div className={`promo-feature-icon w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center mb-3 transition-colors duration-300
                        ${theme === 'dark' ? 'bg-stone-800 text-amber-500 group-hover:bg-amber-500/10' : 'bg-stone-100 text-amber-600 group-hover:bg-amber-50'}`}
                      >
                        {item.icon}
                      </div>
                      <h3 className={`text-base font-semibold mb-1.5 ${text}`}>{item.title}</h3>
                      <p className={`promo-line-clamp-2 text-sm leading-relaxed flex-grow ${textSub}`}>{item.desc}</p>
                      <div className={`mt-5 pt-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-stone-800' : 'border-stone-100'}`}>
                        <span className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>{T.featuresLearnMore}</span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1
                          ${theme === 'dark' ? 'bg-stone-800 text-stone-400 group-hover:bg-amber-500/20 group-hover:text-amber-500' : 'bg-stone-100 text-stone-500 group-hover:bg-amber-50 group-hover:text-amber-600'}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* --- Services --- */}
      <section id="services" className={`py-24 relative overflow-hidden ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-white'}`}>
        {/* 背景装饰 */}
        <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none
          ${theme === 'dark' ? 'bg-sky-500/[0.05]' : 'bg-sky-200/30'}`}
        />

        <div className="max-w-6xl mx-auto px-6 relative">
          <SectionTitle theme={theme} color="sky" subtitle={isZh ? (cfg.servicesTitle?.value || '') : (cfg.servicesTitle?.valueEn || '')} label={isZh ? (cfg.servicesSectionLabel || 'Section') : (cfg.servicesSectionLabelEn || 'Section')}>{T.services}</SectionTitle>

          {/* 分类标签 */}
          <div className="mb-10 flex justify-center">
            <div className={`relative inline-flex rounded-2xl p-1.5 max-w-full ${theme === 'dark' ? 'bg-neutral-800/80' : 'bg-neutral-100'}`}>
              <div ref={serviceTabsScrollerRef} className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 w-max max-w-full">
                  {services.map((cat: any, i: number) => (
                    <button
                      key={i}
                      ref={(el) => { serviceTabButtonRefs.current[i] = el }}
                      onClick={() => setActiveTab(i)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        activeTab === i
                          ? (theme === 'dark'
                              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25'
                              : 'bg-white text-neutral-900 shadow-md')
                          : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-700')
                      }`}
                    >
                      {isZh ? cat.name : (cat.name_en || cat.name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 服务卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {services[activeTab]?.services.map((s: any, i: number) => (
                <motion.div
                  key={`${activeTab}-${i}`}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${s.url ? 'cursor-pointer' : ''}
                    ${theme === 'dark'
                      ? 'bg-neutral-900 border-neutral-800 hover:border-sky-500/30'
                      : 'bg-white border-neutral-200 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10'
                    }`}
                  onClick={() => {
                    if (s.url) {
                      if (s.url.startsWith('http://') || s.url.startsWith('https://')) {
                        window.open(s.url, '_blank')
                      } else {
                        scrollToSection(s.url)
                      }
                    }
                  }}
                >
                  {/* 顶部装饰线 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                  {/* 大图展示区 */}
                  <div className={`relative h-40 overflow-hidden ${theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    {s.image ? (
                      <img
                        src={getImageUrl(s.image)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className={`w-12 h-12 ${theme === 'dark' ? 'text-neutral-700' : 'text-neutral-300'}`} />
                      </div>
                    )}
                    {/* 渐变遮罩 */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  </div>

                  {/* 内容区 */}
                  <div className="p-5">
                    <h3 className={`text-base font-semibold mb-2 transition-colors duration-300 ${text} group-hover:${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
                      {isZh ? s.title : (s.title_en || s.title)}
                    </h3>
                    <p className={`text-sm leading-relaxed line-clamp-2 ${textSub}`}>
                      {isZh ? s.description : (s.description_en || s.description)}
                    </p>
                    <div className={`mt-4 flex items-center text-xs font-medium transition-all duration-300
                      ${theme === 'dark' ? 'text-sky-400 group-hover:text-sky-300' : 'text-sky-600 group-hover:text-sky-500'}`}
                    >
                      {T.learnMore}
                      <ArrowRight className="w-3 h-3 ml-1 transition-transform duration-300 group-hover:translate-x-2" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* --- Team --- */}
      <section id="team" className={`py-24 relative overflow-hidden ${theme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
        {/* 背景装饰 */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none
          ${theme === 'dark' ? 'bg-violet-500/[0.05]' : 'bg-violet-200/30'}`}
        />

        <div className="max-w-6xl mx-auto px-6 relative">
          <SectionTitle theme={theme} align="center" color="violet" subtitle={isZh ? (cfg.teamTitle?.value || '') : (cfg.teamTitle?.valueEn || '')} label={isZh ? (cfg.teamSectionLabel || 'Section') : (cfg.teamSectionLabelEn || 'Section')}>{T.team}</SectionTitle>

          <div className="flex flex-wrap justify-center gap-5">
            {team.map((m: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                viewport={{ once: true }}
                className={`group w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] p-5 rounded-2xl border text-center transition-all duration-300
                  ${theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-800 hover:border-violet-500/30'
                    : 'bg-white border-neutral-200 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10'
                  }`}
              >
                {/* 圆形头像 */}
                <div className={`relative w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 ring-2 ring-offset-2 transition-all duration-300
                  ${theme === 'dark'
                    ? 'ring-neutral-700 ring-offset-neutral-900 group-hover:ring-violet-500/50'
                    : 'ring-neutral-200 ring-offset-white group-hover:ring-violet-400'
                  }`}
                >
                  <div className={`w-full h-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    {m.avatar_image ? (
                      <img
                        src={getImageUrl(m.avatar_image)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-xl font-bold
                        ${theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'}`}
                      >
                        {m.name[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* 信息 */}
                <h3 className={`text-sm font-semibold transition-colors duration-300 ${text}`}>
                  {isZh ? m.name : (m.name_en || m.name)}
                </h3>
                <p className={`text-xs mt-1 transition-colors duration-300 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                  {isZh ? m.role : (m.role_en || m.role)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Partners --- */}
      <section id="partners" className={`py-20 relative overflow-hidden ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-white'}`}>
        {/* 背景装饰 */}
        <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none
          ${theme === 'dark' ? 'bg-emerald-500/[0.05]' : 'bg-emerald-200/30'}`}
        />
        <div className="max-w-6xl mx-auto px-6 relative">
          <SectionTitle theme={theme} align="center" color="emerald" subtitle={isZh ? (cfg.partnersDescription?.value || '') : (cfg.partnersDescription?.valueEn || '')} label={isZh ? (cfg.partnersSectionLabel || 'Section') : (cfg.partnersSectionLabelEn || 'Section')}>{T.partners}</SectionTitle>

          <div className="flex flex-wrap justify-center gap-4">
            {partners.map((p: any, i: number) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                type="button"
                onClick={() => setActivePartnerIndex(prev => (prev === i ? null : i))}
                className={`group relative flex items-center justify-center h-20 w-[calc(50%-0.5rem)] sm:w-[200px] px-5 rounded-xl border transition-all duration-300 select-none
                  ${theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-800 hover:border-emerald-500/30'
                    : 'bg-neutral-50 border-neutral-200 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-500/10'
                  }`}
              >
                {(() => {
                  const displayName = isZh ? p.name : (p.name_en || p.name)
                  const isActive = activePartnerIndex === i
                  const abbrev = (displayName ? String(displayName) : '?').slice(0, isZh ? 2 : 1)

                  const iconWrapClass = `flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:-translate-x-[0.7rem] ${isActive ? '-translate-x-[0.7rem]' : ''}`
                  const labelClass = `overflow-hidden whitespace-nowrap text-ellipsis text-[0.7rem] sm:text-sm font-semibold transition-[max-width,opacity,transform,margin,color] duration-300 ease-out max-w-0 opacity-0 translate-x-[0.7rem] group-hover:max-w-[140px] group-hover:opacity-100 group-hover:translate-x-0 group-hover:ml-[0.525rem] ${isActive ? 'max-w-[140px] opacity-100 translate-x-0 ml-[0.525rem]' : ''} ${
                    theme === 'dark'
                      ? `text-neutral-300 group-hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`
                      : `text-neutral-700 group-hover:text-emerald-700 ${isActive ? 'text-emerald-700' : ''}`
                  }`

                  return (
                    <div className="flex items-center justify-center w-full">
                      <div className={iconWrapClass}>
                        {p.image ? (
                          <img
                            src={getImageUrl(p.image)}
                            alt={displayName}
                            className={`h-6 w-auto object-contain transition-[opacity,filter] duration-300 ${isActive ? 'opacity-100' : 'opacity-40'} group-hover:opacity-100 ${
                              theme === 'dark'
                                ? 'invert grayscale group-hover:grayscale-0'
                                : 'grayscale group-hover:grayscale-0'
                            }`}
                          />
                        ) : (
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                            theme === 'dark'
                              ? `bg-neutral-800 ${isActive ? 'text-emerald-400' : 'text-neutral-400'} group-hover:text-emerald-400`
                              : `bg-white ${isActive ? 'text-emerald-700' : 'text-neutral-500'} group-hover:text-emerald-700`
                          }`}>
                            {abbrev}
                          </div>
                        )}
                      </div>
                      <span className={labelClass}>{displayName}</span>
                    </div>
                  )
                })()}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* --- Contact --- */}
      <section id="contact" className={`py-24 ${theme === 'dark' ? 'bg-stone-950' : 'bg-stone-50'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`rounded-2xl p-8 md:p-12 border overflow-hidden relative promo-motion-card ${theme === 'dark' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200 shadow-sm'}`}>

            <div className="relative z-10">
              <div className="text-center mb-10">
                <SectionTitle theme={theme} align="center" color="rose" subtitle={isZh ? (cfg.contactDescription?.value || '') : (cfg.contactDescription?.valueEn || '')}>{isZh ? (cfg.contactTitle?.value || T.contact) : (cfg.contactTitle?.valueEn || T.contact)}</SectionTitle>
                <div className="flex flex-wrap justify-center gap-6 -mt-6">
                  {contacts.map((c: any, i: number) => (
                    <div key={i} className={`flex items-center gap-[0.475rem] text-[0.7875rem] ${textSub}`}>
                      {c.icon ? (
                        c.icon.startsWith('<') ? (
                          <div className={`w-4 h-4 [&>svg]:w-full [&>svg]:h-full ${theme === 'dark' ? 'invert' : ''}`} dangerouslySetInnerHTML={{ __html: c.icon }} />
                        ) : (
                          <img src={getImageUrl(c.icon)} alt="" className={`w-4 h-4 ${theme === 'dark' ? 'invert' : ''}`} />
                        )
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {c.value}
                    </div>
                  ))}
                </div>
              </div>

              <form className="max-w-md mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={T.form.name} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ring-0 shadow-none transition-all text-sm promo-motion-input focus:ring-0 focus:shadow-none ${theme === 'dark' ? 'bg-stone-800 border-stone-700 focus:border-stone-600 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-200 focus:border-stone-400 text-stone-900 placeholder:text-stone-400'}`} />
                  <input type="text" placeholder={T.form.contact} value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ring-0 shadow-none transition-all text-sm promo-motion-input focus:ring-0 focus:shadow-none ${theme === 'dark' ? 'bg-stone-800 border-stone-700 focus:border-stone-600 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-200 focus:border-stone-400 text-stone-900 placeholder:text-stone-400'}`} />
                </div>
                <textarea rows={4} placeholder={T.form.content} value={form.content} onChange={e => setForm({...form, content: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ring-0 shadow-none transition-all resize-none text-sm promo-motion-input focus:ring-0 focus:shadow-none ${theme === 'dark' ? 'bg-stone-800 border-stone-700 focus:border-stone-600 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-200 focus:border-stone-400 text-stone-900 placeholder:text-stone-400'}`} />

                <div className="pt-2">
                  <div className={`text-center text-xs font-medium ${status.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{status.show && status.msg}</div>
                  <div className="mt-3 flex justify-center">
                    <MagneticButton theme={theme} onClick={handlePreSubmit} className="!px-6">{submitting ? T.form.sending : T.form.submit}</MagneticButton>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className={`py-12 border-t ${theme === 'dark' ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className={`text-sm ${textSub}`}>{rawSettings.footerCopyright || T.copyright}</div>
        </div>
      </footer>

      {/* --- Modal --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm promo-motion-fade">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl promo-motion-pop ${theme === 'dark' ? 'bg-stone-900 border border-stone-800' : 'bg-white border border-stone-200'}`}>
              <h3 className={`text-base font-semibold text-center mb-5 ${text}`}>{T.form.verify}</h3>
              <div className="flex justify-center mb-5 cursor-pointer" onClick={refreshCaptcha}>
                {captchaData ? <img src={captchaData.image} className={`h-9 rounded ${theme === 'dark' ? 'bg-stone-100' : 'bg-stone-100'}`} /> : <div className="h-9 w-24 animate-pulse bg-stone-200 rounded"/>}
              </div>
              <input autoFocus type="text" placeholder={T.form.placeholder} value={form.captcha} onChange={e => setForm({...form, captcha: e.target.value})} className={`w-full text-center text-lg font-mono tracking-widest py-2 bg-transparent border-b-2 outline-none ring-0 shadow-none mb-6 promo-motion-input focus:ring-0 focus:shadow-none ${theme === 'dark' ? 'border-stone-700 focus:border-stone-500 text-stone-100' : 'border-stone-200 focus:border-stone-900 text-stone-900'}`} />
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors promo-motion-btn ${theme === 'dark' ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>{T.form.cancel}</button>
                <button onClick={doSubmit} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold promo-motion-btn ${theme === 'dark' ? 'bg-stone-100 text-stone-900 hover:bg-white' : 'bg-stone-900 text-stone-50 hover:bg-stone-800'}`}>{T.form.confirm}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
