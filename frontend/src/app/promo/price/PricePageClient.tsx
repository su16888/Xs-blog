'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ArrowRight, ArrowLeft, Zap, Users, Globe, Building, Mail } from 'lucide-react'
import SEOMeta from '@/components/SEOMeta'
import { getPromoData } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { FluidBackground, MagneticButton, SpotlightCard } from '../components/ui'

type FeatureItem = {
  label: string
  included: boolean
  value?: string
}

type PricingPlan = {
  id: string
  title: string
  price: string
  period?: string
  description: string
  authType: string
  features: FeatureItem[]
  highlight?: boolean
  icon: any
  buttonText?: string
}

export default function PricePageClient({
  initialTheme,
  initialLang = 'zh'
}: {
  initialTheme: 'dark' | 'light'
  initialLang?: 'zh' | 'en'
}) {
  const router = useRouter()
  const { settings: rawSettings } = useSettings()

  const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

  const [lang, setLang] = useState<'zh' | 'en'>(initialLang)
  const isZh = lang === 'zh'
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme)
  const [promoData, setPromoData] = useState<any>(null)
  const promoConfig = promoData?.config || null

  const pageTitle = useMemo(() => {
    return isZh ? 'Xs-Blog - 授权价格' : 'Xs-Blog - Software Licensing Price'
  }, [isZh])

  useIsoLayoutEffect(() => {
    const syncTheme = () => {
      try {
        const saved = localStorage.getItem('promo-theme')
        if (saved === 'dark' || saved === 'light') {
          setTheme(saved)
          return
        }
      } catch {}

      try {
        const cookieTheme = document.cookie
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('theme='))
          ?.split('=')[1]

        setTheme(cookieTheme === 'black' ? 'dark' : 'light')
      } catch {
        setTheme('light')
      }
    }

    syncTheme()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'promo-theme') syncTheme()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useIsoLayoutEffect(() => {
    const syncLang = () => {
      try {
        const saved = localStorage.getItem('promo-lang')
        if (saved === 'zh' || saved === 'en') {
          setLang(saved)
          return
        }
      } catch {}
      setLang('zh')
    }

    syncLang()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'promo-lang') syncLang()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    getPromoData()
      .then((res: any) => {
        if (res?.success) setPromoData(res?.data || null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('[class*="FloatingButtons"]')
    els.forEach((el) => ((el as HTMLElement).style.display = 'none'))
    return () => {
      els.forEach((el) => ((el as HTMLElement).style.display = ''))
    }
  }, [])

  const feature = (labelZh: string, labelEn: string, status: boolean | string): FeatureItem => {
    const isIncluded = status === true || (typeof status === 'string' && status !== '')
    const value = typeof status === 'string' ? status : undefined
    return {
      label: isZh ? labelZh : labelEn,
      included: isIncluded,
      value: value
    }
  }

  const plans: PricingPlan[] = [
    {
      id: 'community',
      title: isZh ? '社区版' : 'Community Edition',
      price: isZh ? '免费' : 'Free',
      description: isZh ? '联系作者获取授权码' : 'Contact the author to get a license code',
      authType: isZh ? '在线授权' : 'Online License',
      icon: Users,
      features: [
        feature('完整功能', 'Full Features', true),
        feature('多部署模式', 'Multi-deployment Mode', true),
        feature('多数据库', 'Multi-database Support', true),
        feature('永久免费更新', 'Lifetime Free Updates', true),
        feature('代码开源', 'Open Source Code', false),
        feature('隐藏版权', 'Hide Copyright', false),
        feature('协助安装', 'Installation Assistance', false),
        feature('配置指导', 'Configuration Guidance', false),
        feature('访问优化', 'Access Optimization', false),
        feature('二次开发', 'Secondary Development', false),
        feature('二次销售', 'Resale Rights', false)
      ]
    },
    {
      id: 'laoyou',
      title: isZh ? '佬友版' : 'Laoyou Edition',
      price: isZh ? '免费' : 'Free',
      description: isZh ? 'LINUX DO 二级以上用户' : 'Free for LINUX DO members (Level 2+)',
      authType: isZh ? '在线授权' : 'Online License',
      icon: Zap,
      features: [
        feature('完整功能', 'Full Features', true),
        feature('多部署模式', 'Multi-deployment Mode', true),
        feature('多数据库', 'Multi-database Support', true),
        feature('永久免费更新', 'Lifetime Free Updates', true),
        feature('代码开源', 'Open Source Code', isZh ? '仅前端' : 'Frontend'),
        feature('隐藏版权', 'Hide Copyright', false),
        feature('协助安装', 'Installation Assistance', false),
        feature('配置指导', 'Configuration Guidance', false),
        feature('访问优化', 'Access Optimization', false),
        feature('二次开发', 'Secondary Development', true),
        feature('二次销售', 'Resale Rights', false)
      ]
    },
    {
      id: 'operation',
      title: isZh ? '运营版' : 'Operations Edition',
      price: isZh ? '议价' : 'Negotiable',
      description: isZh ? '适合有基础的开发者' : 'Suitable for developers with basic knowledge',
      authType: isZh ? '在线授权' : 'Online License',
      highlight: true,
      icon: Globe,
      features: [
        feature('完整功能', 'Full Features', true),
        feature('多部署模式', 'Multi-deployment Mode', true),
        feature('多数据库', 'Multi-database Support', true),
        feature('永久免费更新', 'Lifetime Free Updates', true),
        feature('代码开源', 'Open Source Code', false),
        feature('隐藏版权', 'Hide Copyright', true),
        feature('协助安装', 'Installation Assistance', true),
        feature('配置指导', 'Configuration Guidance', true),
        feature('访问优化', 'Access Optimization', true),
        feature('二次开发', 'Secondary Development', true),
        feature('二次销售', 'Resale Rights', false)
      ]
    },
    {
      id: 'commercial',
      title: isZh ? '商业版' : 'Commercial Edition',
      price: isZh ? '议价' : 'Negotiable',
      description: isZh ? '面向专业团队或个人正式运营' : 'For formal operation by professional teams or individuals',
      authType: isZh ? '商业授权' : 'Commercial License',
      icon: Building,
      features: [
        feature('完整功能', 'Full Features', true),
        feature('多部署模式', 'Multi-deployment Mode', true),
        feature('多数据库', 'Multi-database Support', true),
        feature('永久免费更新', 'Lifetime Free Updates', true),
        feature('代码开源', 'Open Source Code', true),
        feature('隐藏版权', 'Hide Copyright', true),
        feature('协助安装', 'Installation Assistance', true),
        feature('配置指导', 'Configuration Guidance', true),
        feature('访问优化', 'Access Optimization', true),
        feature('二次开发', 'Secondary Development', true),
        feature('二次销售', 'Resale Rights', true)
      ]
    }
  ]

  const text = theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'
  const textSub = theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'

  const getConfigText = (node: any, preferEn: boolean) => {
    const zh = node?.value
    const en = node?.valueEn
    const raw = preferEn ? (en || zh) : (zh || en)
    return raw ? String(raw).trim() : ''
  }

  const footerCopyright = (() => {
    const fromSettings = rawSettings?.footerCopyright
    if (fromSettings?.trim()) return fromSettings
    const cfg = promoConfig || {}
    const configured = isZh ? cfg?.footerCopyright?.value : (cfg?.footerCopyright?.valueEn || cfg?.footerCopyright?.value)
    return configured?.trim() ? configured : ''
  })()

  const goToContact = () => {
    router.push('/promo#contact')
  }

  return (
    <div className={`promo-page-root relative min-h-screen w-full z-[9999] antialiased transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] text-neutral-50 dark' : 'bg-[#fafafa] text-neutral-900'}`}>
      <SEOMeta customTitle={pageTitle} />
      <FluidBackground theme={theme} />
      <div className="relative z-10">
        <header
          className={`fixed top-0 left-0 right-0 z-30 border-b backdrop-blur ${
            theme === 'dark' ? 'bg-[#0a0a0a]/70 border-neutral-800' : 'bg-[#fafafa]/70 border-neutral-200'
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border transition-colors ${
                theme === 'dark'
                  ? 'bg-neutral-950/60 text-neutral-100 border-neutral-800 hover:bg-neutral-900/60'
                  : 'bg-white/70 text-neutral-900 border-neutral-200 hover:bg-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {isZh ? '返回' : 'Back'}
            </button>
            <a
              href="mailto:86886@88.com"
              className={`inline-flex items-center gap-2 text-sm transition-colors ${textSub} ${
                theme === 'dark' ? 'hover:text-neutral-200' : 'hover:text-neutral-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>86886@88.com</span>
            </a>
          </div>
        </header>

        <main className="pt-16 pb-16 px-6">
          <div className="max-w-7xl mx-auto pt-5 md:pt-7">
            <div className="text-center mb-7 md:mb-8">
              <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tight promo-text-balance ${text}`}>
                <span className="promo-text-gradient-amber">Xs-Blog</span>
                <span className="ml-2">{isZh ? '授权定价' : 'Licensing Pricing'}</span>
              </h1>
              <p className={`mt-3 max-w-2xl mx-auto text-sm md:text-base ${textSub}`}>
                {isZh ? '对比授权范围与权益，选择最适合你的版本。' : 'Compare license scope and benefits, then choose the plan that fits.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {plans.map((plan, i) => {
                const tone = (() => {
                  if (plan.id === 'community' || plan.id === 'laoyou') return 'free'
                  if (plan.id === 'commercial') return 'business'
                  return 'quote'
                })()

                const priceStyle = (() => {
                  if (tone === 'free') {
                    return {
                      label: theme === 'dark' ? 'text-emerald-300/80' : 'text-emerald-700/80',
                      price: theme === 'dark'
                        ? 'bg-gradient-to-r from-emerald-200 to-emerald-400 text-transparent bg-clip-text'
                        : 'bg-gradient-to-r from-emerald-800 to-emerald-600 text-transparent bg-clip-text'
                    }
                  }
                  if (tone === 'business') {
                    return {
                      label: theme === 'dark' ? 'text-violet-300/80' : 'text-violet-700/80',
                      price: theme === 'dark'
                        ? 'bg-gradient-to-r from-violet-200 to-violet-400 text-transparent bg-clip-text'
                        : 'bg-gradient-to-r from-violet-800 to-violet-600 text-transparent bg-clip-text'
                    }
                  }
                  return {
                    label: theme === 'dark' ? 'text-amber-300/80' : 'text-amber-700/80',
                    price: theme === 'dark'
                      ? 'bg-gradient-to-r from-amber-200 to-amber-400 text-transparent bg-clip-text'
                      : 'bg-gradient-to-r from-amber-800 to-amber-600 text-transparent bg-clip-text'
                  }
                })()

                return (
                  <SpotlightCard key={plan.id} theme={theme} delay={i * 0.1} className={plan.highlight ? `ring-2 ${theme === 'dark' ? 'ring-amber-500/50' : 'ring-amber-500/30'}` : ''}>
                    <div className="p-5 md:p-7 h-full flex flex-col">
                      <div className="mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300
                          ${theme === 'dark' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}
                          ${plan.highlight && (theme === 'dark' ? '!bg-amber-500/20 !text-amber-500' : '!bg-amber-100 !text-amber-600')}
                        `}>
                          <plan.icon className="w-6 h-6" />
                        </div>
                        <h3 className={`text-xl font-bold mb-1.5 ${text}`}>{plan.title}</h3>
                        <p className={`text-sm min-h-[28px] ${textSub}`}>{plan.description}</p>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <div className={`text-xl md:text-2xl font-extrabold tracking-tight ${priceStyle.price}`}>
                                {plan.price}
                              </div>
                              {plan.id === 'operation' && isZh && (
                                <span className={`text-xs font-medium ${textSub} whitespace-nowrap`}>(支持等价LDC流通)</span>
                              )}
                            </div>
                          </div>
                          {plan.period && <div className={`text-xs font-semibold ${textSub}`}>{plan.period}</div>}
                        </div>
                      </div>

                      <div className={`mb-4 p-2 rounded-lg text-sm font-medium text-center
                        ${theme === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                        {isZh ? '授权类型：' : 'License: '}{plan.authType}
                      </div>

                      <div className="flex-grow space-y-2.5 mb-5">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3 justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                                ${feature.included
                                  ? (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-emerald-100 text-emerald-600')
                                  : (theme === 'dark' ? 'bg-neutral-800 text-neutral-600' : 'bg-neutral-100 text-neutral-400')
                                }`}
                              >
                                {feature.included ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                              </div>
                              <span className={`text-sm ${feature.included ? (theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700') : (theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400')}`}>
                                {feature.label}
                              </span>
                            </div>
                            {feature.value && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-500'}`}>
                                {feature.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <MagneticButton
                        theme={theme}
                        variant={plan.highlight ? 'primary' : 'secondary'}
                        className={`w-full justify-center !px-0 transition-colors duration-300 !font-bold
                          ${!plan.highlight
                            ? (theme === 'dark'
                                ? '!bg-neutral-800/70 !shadow-none !border !border-neutral-700 !text-neutral-100 hover:!bg-neutral-700/70'
                                : '!bg-neutral-100 !shadow-none !border !border-neutral-200 !text-neutral-900 hover:!bg-neutral-200')
                            : '!text-white'
                          }`}
                        onClick={goToContact}
                      >
                        {plan.buttonText || (isZh ? '立即咨询' : 'Contact Us')}
                        <ArrowRight className="w-4 h-4" />
                      </MagneticButton>
                    </div>
                  </SpotlightCard>
                )
              })}
            </div>
          </div>
        </main>
        <footer className={`py-12 border-t ${theme === 'dark' ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'}`}>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className={`text-sm ${textSub}`}>{footerCopyright}</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

