'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, ShoppingBag, XCircle, Clock, Copy, RefreshCw, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { createOrder, createOrderPayment, getService, getSettings, getImageUrl, getPublicPaymentConfigs, getOrderStatus } from '@/lib/api'
import PageBackground from '@/components/PageBackground'
import SEOMeta from '@/components/SEOMeta'
import SiteFooter from '@/components/SiteFooter'

interface ServiceSpec {
  id: number
  spec_name: string
  spec_value: string
  sort_order: number
}

interface Service {
  id: number
  name: string
  description?: string
  spec_title?: string
  content?: string
  content_format?: 'text' | 'markdown' | 'html'
  cover_image?: string
  price?: string
  product_type?: 'card' | 'virtual' | 'physical'
  stock_total?: number
  stock_sold?: number
  show_stock?: boolean
  show_sales?: boolean
  payment_config_id?: number | null
  order_page_slug?: string | null
  specifications?: ServiceSpec[]
  Category?: {
    id: number
    name: string
    icon?: string
  }
}

type ProductType = NonNullable<Service['product_type']>

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  card: '卡密商品',
  virtual: '虚拟商品',
  physical: '实物商品'
}

interface PaymentConfig {
  id: number
  name: string
  provider_key: string
  provider_type?: string | null
  display_logo?: string | null
}

export default function ServiceOrderPage() {
  const params = useParams()
  const router = useRouter()
  const serviceKey = String((params as any)?.id ?? (params as any)?.slug ?? '')
  const isSlugRoute = (params as any)?.slug !== undefined
  const usePLayout = true
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerContact, setBuyerContact] = useState('')
  const [selectedSpecId, setSelectedSpecId] = useState<number | ''>('')
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([])
  const [selectedPaymentConfigId, setSelectedPaymentConfigId] = useState<number | ''>('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<{
    id: number
    order_no?: string | null
    payment_url?: string | null
    payment_status?: string | null
    payment_gateway?: string | null
    cards?: Array<{ id: number; card_code: string; card_status: string }>
  } | null>(null)
  const [paymentGenerating, setPaymentGenerating] = useState(false)
  const [paymentLinkError, setPaymentLinkError] = useState('')
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false)
  const [pollingPayment, setPollingPayment] = useState(false)
  const [paymentCheckCount, setPaymentCheckCount] = useState(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const defaultSettings = {
    themeType: 'default',
    footerCopyright: `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
    showTopNavbar: 'true',
    showWapSidebar: 'true',
    siteTitle: 'Xs-Blog'
  }
  const [settings, setSettings] = useState<any>(defaultSettings)

  const selectedSpec = useMemo(() => {
    if (!service?.specifications || !selectedSpecId) return null
    return service.specifications.find(spec => spec.id === selectedSpecId) || null
  }, [service?.specifications, selectedSpecId])

  const isFreePrice = useMemo(() => {
    const raw = String(service?.price ?? '').trim()
    const normalized = raw.replace(/[^\d.]/g, '')
    const priceNum = normalized ? parseFloat(normalized) : 0
    return !Number.isNaN(priceNum) && priceNum === 0
  }, [service?.price])

  const boundPaymentConfig = useMemo(() => {
    if (!service?.payment_config_id) return null
    return paymentConfigs.find((c) => c.id === service.payment_config_id) || null
  }, [paymentConfigs, service?.payment_config_id])

  const getBackendMessage = (err: any): string => {
    return err?.response?.data?.message || ''
  }

  // 检查订单支付状态
  const checkPaymentStatus = useCallback(async () => {
    if (!orderResult?.id) return false
    try {
      const res = await getOrderStatus(orderResult.id)
      if (res?.success && res.data) {
        const { payment_status, cards } = res.data
        if (payment_status === 'paid') {
          setOrderResult(prev => prev ? {
            ...prev,
            payment_status: 'paid',
            cards: cards || []
          } : prev)
          return true
        }
      }
    } catch (e) {
      console.error('检查支付状态失败:', e)
    }
    return false
  }, [orderResult?.id])

  // 手动刷新支付状态
  const handleRefreshPaymentStatus = async () => {
    if (!orderResult?.id || pollingPayment) return
    setPollingPayment(true)
    const paid = await checkPaymentStatus()
    setPollingPayment(false)
    if (!paid) {
      setPaymentCheckCount(prev => prev + 1)
    }
  }

  // 开始轮询支付状态
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return
    setPollingPayment(true)
    let count = 0
    const maxCount = 60 // 最多轮询60次（5分钟）

    pollingIntervalRef.current = setInterval(async () => {
      count++
      const paid = await checkPaymentStatus()
      if (paid || count >= maxCount) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setPollingPayment(false)
      }
    }, 5000) // 每5秒检查一次
  }, [checkPaymentStatus])

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setPollingPayment(false)
  }, [])

  // 当有支付链接时开始轮询
  useEffect(() => {
    if (orderResult?.payment_url && orderResult.payment_status !== 'paid') {
      startPolling()
    }
    return () => stopPolling()
  }, [orderResult?.payment_url, orderResult?.payment_status, startPolling, stopPolling])

  // 页面获得焦点时立即检查支付状态（用户从支付页面返回时）
  useEffect(() => {
    if (!orderResult?.id || orderResult.payment_status === 'paid') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPaymentStatus()
      }
    }

    const handleFocus = () => {
      checkPaymentStatus()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [orderResult?.id, orderResult?.payment_status, checkPaymentStatus])

  useEffect(() => {
    if (!orderResult) return
    const paid = orderResult.payment_status === 'paid' || orderResult.payment_gateway === 'system'
    if (!paid) return
    setShowPurchaseSuccess(true)
  }, [orderResult])

  const specLabel = selectedSpec ? `${selectedSpec.spec_name}：${selectedSpec.spec_value}` : ''

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsResponse = await getSettings()
        if (settingsResponse.success && settingsResponse.data) {
          const settingsObj: any = {}
          settingsResponse.data.forEach((setting: any) => {
            settingsObj[setting.key] = setting.value
          })
          setSettings({
            themeType: settingsObj.themeType || 'default',
            footerCopyright: settingsObj.footerCopyright || `© ${new Date().getFullYear()} 个人主页. All rights reserved.`,
            showTopNavbar: settingsObj.showTopNavbar || 'true',
            showWapSidebar: settingsObj.showWapSidebar || 'true',
            siteTitle: settingsObj.siteTitle || 'Xs-Blog'
          })
        }
      } catch (err) {}
    }
    loadSettings()
  }, [])

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceKey || serviceKey === 'undefined' || serviceKey === 'null') {
        setError('服务标识无效')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const response = await getService(serviceKey)
        if (response?.success && response.data) {
          setService(response.data)
          setSelectedPaymentConfigId(response.data.payment_config_id ?? '')
          setError('')
        } else {
          setError(response?.message || '服务不存在或不可见')
        }
      } catch (err) {
        setError(getBackendMessage(err) || '服务加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchService()
  }, [serviceKey])

  useEffect(() => {
    const fetchPaymentConfigs = async () => {
      try {
        const response = await getPublicPaymentConfigs()
        if (response?.success && Array.isArray(response.data)) {
          setPaymentConfigs(response.data)
        } else {
          setPaymentConfigs([])
        }
      } catch (err) {
        setPaymentConfigs([])
      }
    }

    fetchPaymentConfigs()
  }, [isSlugRoute])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!service || submitting) return
    const productType = service.product_type || 'virtual'
    const emailValue = buyerEmail.trim()
    const phoneValue = buyerPhone.trim()
    const addressValue = buyerAddress.trim()
    const nameValue = buyerName.trim()
    const noteValue = buyerContact.trim()

    // if (productType === 'card' && !emailValue) {
    //   setFormError('请填写邮箱（用于卡密发货与提醒）')
    //   return
    // }
    if (productType === 'physical') {
      if (!nameValue) {
        setFormError('请填写称呼')
        return
      }
      if (!phoneValue) {
        setFormError('请填写手机号')
        return
      }
      if (!addressValue) {
        setFormError('请填写收货地址')
        return
      }
      if (!emailValue) {
        setFormError('请填写邮箱（用于快递单号通知）')
        return
      }
    }
    if (isSlugRoute && !service.payment_config_id && !isFreePrice) {
      setFormError('该商品未绑定支付方式，暂不支持在线购买')
      return
    }
    if (productType !== 'card' && (service.stock_total ?? 0) <= 0) {
      setFormError('库存不足，暂无法下单')
      return
    }
    if (productType === 'card' && (service.stock_total ?? 0) <= 0) {
      setFormError('库存不足，暂无法下单')
      return
    }
    setFormError('')
    setSubmitting(true)
    setPaymentLinkError('')
    try {
      const finalContact = !isSlugRoute && specLabel ? `${noteValue} | 规格: ${specLabel}` : noteValue
      const response = await createOrder({
        service_id: service.id,
        buyer_name: nameValue || undefined,
        buyer_contact: finalContact || undefined,
        buyer_email: emailValue || undefined,
        buyer_phone: phoneValue || undefined,
        buyer_address: addressValue || undefined,
        payment_config_id: isSlugRoute ? undefined : (selectedPaymentConfigId === '' ? null : selectedPaymentConfigId)
      })
      if (response?.success) {
        const created = response.data
        const orderId = Number(created?.id)
        const orderNo = created?.order_no ?? null
        const gateway = created?.payment_gateway ?? null
        const payStatus = created?.payment_status ?? null

        // 保存最近的订单ID到 localStorage，用于支付回调页面跳转
        if (orderId && typeof window !== 'undefined') {
          localStorage.setItem('lastOrderId', String(orderId))
          localStorage.setItem('lastOrderTime', String(Date.now()))
        }

        if (payStatus === 'paid' || gateway === 'system') {
          setOrderResult({ id: orderId, order_no: orderNo, payment_url: null, payment_status: payStatus, payment_gateway: gateway })
          setSubmitting(false)
          return
        }
        setOrderResult({ id: orderId, order_no: orderNo, payment_url: null, payment_status: payStatus, payment_gateway: gateway })

        const hasPayment = isSlugRoute
          ? !!service.payment_config_id
          : (selectedPaymentConfigId !== '' || !!service.payment_config_id)

        if (hasPayment) {
          try {
            setPaymentGenerating(true)
            const payRes = await createOrderPayment(orderId)
            if (payRes?.success) {
              setOrderResult({ id: orderId, order_no: orderNo, payment_url: payRes.data?.payment_url || null, payment_status: payStatus, payment_gateway: gateway })
              setPaymentGenerating(false)
            } else {
              setPaymentGenerating(false)
              setPaymentLinkError(payRes?.message || '支付链接生成失败')
            }
          } catch (e) {
            setPaymentGenerating(false)
            setPaymentLinkError(getBackendMessage(e) || '支付链接生成失败')
          }
        } else {
          setPaymentGenerating(false)
        }
      } else {
        setFormError(response?.message || '下单失败，请稍后重试')
      }
    } catch (err: any) {
      const message = err?.response?.data?.message
      setFormError(message || '下单失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const siteTitle = String(settings?.siteTitle || defaultSettings.siteTitle || '').trim()
  const pageTitle = service?.name ? `${service.name} - ${siteTitle}` : siteTitle
  const remainingStock = service?.stock_total ?? 0
  const isOutOfStock = remainingStock <= 0
  const hasServiceContent = (service?.content ?? '').trim().length > 0

  return (
    <main className={`min-h-screen relative flex flex-col hide-scrollbar ${usePLayout ? 'bg-bg-secondary sm:bg-bg-primary' : 'bg-bg-primary'}`}>
      <SEOMeta customTitle={pageTitle} />
      <PageBackground />
      <div
        className={`relative z-10 mx-auto w-full flex-1 ${
          usePLayout
            ? 'max-w-5xl px-0 sm:px-6 lg:px-8 py-0 sm:py-8 lg:h-[calc(100vh-4rem)] lg:flex lg:flex-col lg:overflow-hidden'
            : 'max-w-6xl px-4 sm:px-6 lg:px-8 py-8'
        }`}
      >
        {/* 返回按钮 - 手机端悬浮在图片上 */}
        <button
          onClick={() => router.back()}
          className={`inline-flex items-center gap-2 text-sm hover:text-text-primary ${
            usePLayout
              ? 'absolute top-4 left-4 z-20 bg-black/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-full sm:relative sm:top-0 sm:left-0 sm:bg-transparent sm:backdrop-blur-none sm:text-text-secondary sm:px-0 sm:py-0 sm:rounded-none sm:mb-6'
              : 'text-text-secondary mb-6'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        {loading && (
          <div className="bg-bg-secondary rounded-xl border border-border-primary p-10 flex items-center justify-center mx-4 sm:mx-0">
            <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-bg-secondary rounded-xl border border-border-primary p-10 text-center text-text-secondary mx-4 sm:mx-0">
            {error}
          </div>
        )}

        {!loading && !error && service && (
          <div className={usePLayout ? 'flex justify-center lg:flex-1 lg:items-center lg:justify-center' : 'grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]'}>
            <div
              className={`bg-bg-secondary w-full overflow-hidden flex flex-col lg:flex-row ${
                usePLayout
                  ? 'sm:rounded-2xl border border-border-primary shadow-2xl max-w-5xl lg:h-[calc(100vh-6rem)] lg:scale-90 lg:origin-center'
                  : 'sm:rounded-2xl border-0 sm:border border-border-primary max-w-5xl'
              }`}
            >
              {/* 商品信息区域 */}
              <div
                className={`flex-1 min-w-0 ${usePLayout ? 'lg:border-r border-border-primary lg:min-h-0 lg:overflow-y-auto thin-scrollbar' : 'lg:border-r border-border-primary'}`}
              >
                {/* 商品图片 - 统一 1:1 比例 */}
                <div
                  className={`relative aspect-square ${
                    usePLayout
                      ? 'sm:rounded-t-2xl lg:rounded-tr-none overflow-hidden bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10'
                      : 'bg-bg-tertiary'
                  }`}
                >
                  {service.cover_image ? (
                    <img
                      src={getImageUrl(service.cover_image)}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        usePLayout ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20' : 'bg-bg-tertiary'
                      }`}
                    >
                      <ShoppingBag className={`${usePLayout ? 'w-20 h-20 opacity-40' : 'w-16 h-16 opacity-50'} text-text-tertiary`} />
                    </div>
                  )}
                </div>

                {/* 商品详情 */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* 价格区域 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-rose-500 text-base sm:text-sm font-semibold">¥</span>
                      <span className="text-rose-500 text-3xl sm:text-2xl font-bold">{service.price || '0'}</span>
                      {service.product_type && (
                        <span className="text-[11px] text-text-secondary px-2 py-0.5 bg-bg-tertiary border border-border-primary rounded-md shrink-0">
                          {PRODUCT_TYPE_LABEL[service.product_type]}
                        </span>
                      )}
                    </div>
                    {(service.show_stock || service.show_sales) && (
                      <div className="flex items-center gap-2 text-xs text-text-tertiary shrink-0">
                        {service.show_sales && <span>已售 {service.stock_sold ?? 0}</span>}
                        {service.show_stock && <span>库存 {remainingStock}</span>}
                      </div>
                    )}
                  </div>

                  {/* 商品名称和描述 */}
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-text-primary mb-1 sm:mb-2">{service.name}</h1>
                    {service.description && (
                      <p className="text-sm text-text-secondary leading-relaxed">{service.description}</p>
                    )}
                  </div>

                  {/* 规格信息 */}
                  {service.specifications && service.specifications.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                          <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></span>
                          {service.spec_title || '服务规格'}
                        </h3>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {service.specifications
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map(spec => (
                            <div
                              key={spec.id}
                              className="flex items-center justify-between px-3 py-2 bg-bg-tertiary rounded-lg text-sm"
                            >
                              <span className="text-text-secondary">{spec.spec_name}</span>
                              <span className="text-text-primary font-medium">{spec.spec_value}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 商品详情内容 */}
                  <div className="pt-2 sm:pt-0">
                    {usePLayout ? (
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                          <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></span>
                          服务详情
                        </h3>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-text-primary mb-2 sm:hidden">商品详情</div>
                    )}
                    {hasServiceContent ? (
                      <div className="prose prose-sm max-w-none text-text-secondary prose-headings:text-text-primary prose-p:text-text-secondary prose-strong:text-text-primary prose-li:text-text-secondary prose-a:text-blue-500 prose-blockquote:text-text-secondary prose-code:text-text-primary">
                        {service.content_format === 'html' ? (
                          <div dangerouslySetInnerHTML={{ __html: service.content || '' }} />
                        ) : service.content_format === 'text' ? (
                          <div className="whitespace-pre-wrap">{service.content}</div>
                        ) : usePLayout ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              h1: ({ node, ...props }) => (
                                <h1 className="text-base font-bold mt-4 mb-2 text-text-primary" {...props} />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2 className="text-sm font-bold mt-3 mb-2 text-text-primary" {...props} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 className="text-sm font-semibold mt-3 mb-1.5 text-text-primary" {...props} />
                              ),
                              p: ({ node, children, ...props }: any) => {
                                const hasTextNodes = React.Children.toArray(children).some(
                                  (child) => typeof child === 'string' && child.includes('\n')
                                )
                                if (hasTextNodes) {
                                  return (
                                    <p className="mb-3 leading-relaxed text-sm text-text-secondary" {...props}>
                                      {React.Children.map(children, (child, index) => {
                                        if (typeof child === 'string') {
                                          const lines = child.split('\n')
                                          return (
                                            <React.Fragment key={index}>
                                              {lines.map((line, lineIndex) => (
                                                <React.Fragment key={lineIndex}>
                                                  {line}
                                                  {lineIndex < lines.length - 1 && <br />}
                                                </React.Fragment>
                                              ))}
                                            </React.Fragment>
                                          )
                                        }
                                        return child
                                      })}
                                    </p>
                                  )
                                }
                                return (
                                  <p className="mb-3 leading-relaxed text-sm text-text-secondary" {...props}>
                                    {children}
                                  </p>
                                )
                              },
                              ul: ({ node, ...props }) => (
                                <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5 text-sm text-text-secondary" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5 text-sm text-text-secondary" {...props} />
                              )
                            }}
                          >
                            {service.content}
                          </ReactMarkdown>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{service.content}</ReactMarkdown>
                        )}
                      </div>
                    ) : (
                      <div className="border border-border-primary bg-bg-tertiary px-4 py-10 sm:py-6 text-sm text-text-tertiary sm:rounded-lg min-h-[240px] sm:min-h-0 flex items-center justify-center text-center">
                        暂无详情
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 下单表单区域 - 桌面端显示 */}
              <div className="hidden sm:flex w-full lg:w-[360px] flex-shrink-0 p-4 sm:p-6 flex-col border-t sm:border-t-0 border-border-primary bg-bg-secondary">
                <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4">填写下单信息</h2>
                {orderResult ? (
                  <div className="space-y-4">
                    {/* 订单创建成功提示 */}
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      订单创建成功，订单号：{orderResult.order_no || orderResult.id}
                    </div>

                    {/* 支付状态展示 */}
                    {orderResult.payment_status === 'paid' ? (
                      <div className="space-y-4">
                        {/* 支付成功提示 */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-green-700 font-semibold">
                            <CheckCircle2 className="w-5 h-5" />
                            支付成功
                          </div>
                          <p className="mt-2 text-sm text-green-600">
                            {orderResult.payment_gateway === 'system' ? '0元订单已自动完成' : '订单已支付成功，感谢您的购买！'}
                          </p>
                        </div>

                        {/* 卡密展示 */}
                        {orderResult.cards && orderResult.cards.length > 0 && (
                          <div className="bg-bg-tertiary border border-border-primary rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-text-primary">卡密信息</div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const text = orderResult.cards?.map(c => c.card_code).join('\n') || ''
                                  try {
                                    await navigator.clipboard.writeText(text)
                                    alert('已复制到剪贴板')
                                  } catch (e) {
                                    alert('复制失败，请手动复制')
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border-primary hover:bg-bg-secondary"
                              >
                                <Copy className="w-3 h-3" />
                                复制全部
                              </button>
                            </div>
                            <div className="space-y-2">
                              {orderResult.cards.map((card, index) => (
                                <div key={card.id} className="bg-bg-secondary rounded-lg p-3 border border-border-primary">
                                  <div className="text-xs text-text-tertiary mb-1">卡密 {index + 1}</div>
                                  <div className="font-mono text-sm text-text-primary break-all select-all">
                                    {card.card_code}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-text-tertiary">
                              卡密信息已发送至您的邮箱，请注意查收。
                            </p>
                          </div>
                        )}
                      </div>
                    ) : orderResult.payment_url ? (
                      <div className="space-y-4">
                        {/* 待支付状态 */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-amber-700 font-semibold">
                            <Clock className="w-5 h-5" />
                            等待支付
                          </div>
                          <p className="mt-2 text-sm text-amber-600">
                            请点击下方按钮前往支付，支付完成后页面会自动更新。
                          </p>
                          {pollingPayment && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              正在检测支付状态...
                            </div>
                          )}
                        </div>

                        {/* 支付按钮 */}
                        <a
                          href={orderResult.payment_url}
                          target={orderResult.payment_url?.startsWith('http') ? '_blank' : undefined}
                          rel={orderResult.payment_url?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
                        >
                          前往支付
                        </a>

                        {/* 手动刷新按钮 */}
                        <button
                          type="button"
                          onClick={handleRefreshPaymentStatus}
                          disabled={pollingPayment}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border-primary bg-bg-tertiary text-text-primary font-medium hover:bg-bg-secondary transition-all disabled:opacity-60"
                        >
                          <RefreshCw className={`w-4 h-4 ${pollingPayment ? 'animate-spin' : ''}`} />
                          {pollingPayment ? '检测中...' : '我已支付，刷新状态'}
                        </button>

                        {paymentCheckCount > 0 && !pollingPayment && (
                          <p className="text-xs text-text-tertiary text-center">
                            已检测 {paymentCheckCount} 次，如已支付请稍等片刻后再试
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(isFreePrice || (orderResult.payment_gateway === 'system' && orderResult.payment_status === 'paid')) && (
                          <div className="text-sm text-green-600">系统支付成功（0元订单自动完成）</div>
                        )}
                        {paymentGenerating && (
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            支付链接生成中…
                          </div>
                        )}
                        {!paymentGenerating && paymentLinkError && (
                          <>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-red-700 font-semibold">
                                <XCircle className="w-5 h-5" />
                                支付链接生成失败
                              </div>
                              <p className="mt-2 text-sm text-red-600">{paymentLinkError}</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!orderResult?.id) return
                                setPaymentLinkError('')
                                setPaymentGenerating(true)
                                try {
                                  const payRes = await createOrderPayment(orderResult.id)
                                  if (payRes?.success) {
                                    setOrderResult(prev => prev ? { ...prev, payment_url: payRes.data?.payment_url || null } : prev)
                                  } else {
                                    setPaymentLinkError(payRes?.message || '支付链接生成失败')
                                  }
                                } catch (e) {
                                  setPaymentLinkError(getBackendMessage(e) || '支付链接生成失败')
                                } finally {
                                  setPaymentGenerating(false)
                                }
                              }}
                              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg border border-border-primary bg-bg-tertiary text-text-primary font-semibold hover:bg-bg-secondary transition-all"
                            >
                              重新生成支付链接
                            </button>
                          </>
                        )}
                        {!isFreePrice && !paymentGenerating && !paymentLinkError && orderResult.payment_status !== 'paid' && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <p className="text-sm text-gray-600">该订单未配置在线支付，请联系管理员处理。</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <div className="block text-sm font-medium text-text-secondary mb-2">支付方式</div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                        <div className="flex items-center gap-2 min-w-0">
                          {isFreePrice ? (
                            <div className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-primary flex items-center justify-center text-xs text-text-secondary">
                              0
                            </div>
                          ) : boundPaymentConfig?.display_logo ? (
                            <img
                              src={getImageUrl(boundPaymentConfig.display_logo)}
                              alt={boundPaymentConfig.name}
                              className="w-7 h-7 rounded-lg object-cover border border-border-primary bg-bg-secondary"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-primary" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm text-text-primary font-medium truncate">
                              {isFreePrice ? '系统支付' : (boundPaymentConfig?.name || '未绑定（不可下单）')}
                            </div>
                            {!isFreePrice && boundPaymentConfig?.provider_type && (
                              <div className="text-xs text-text-tertiary truncate">{boundPaymentConfig.provider_type}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                      {!usePLayout && service.specifications && service.specifications.length > 0 && (
                        <div>
                          <select
                            value={selectedSpecId}
                            onChange={(event) => setSelectedSpecId(event.target.value ? Number(event.target.value) : '')}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                          >
                            <option value="">请选择规格</option>
                            {service.specifications
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map(spec => (
                                <option key={spec.id} value={spec.id}>
                                  {spec.spec_name}：{spec.spec_value}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {service.product_type === 'physical' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">称呼</label>
                            <input
                              value={buyerName}
                              onChange={(event) => setBuyerName(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                              placeholder="必填"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">手机号</label>
                            <input
                              value={buyerPhone}
                              onChange={(event) => setBuyerPhone(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                              placeholder="必填"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">收货地址</label>
                            <textarea
                              value={buyerAddress}
                              onChange={(event) => setBuyerAddress(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[84px]"
                              placeholder="必填"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">邮箱</label>
                            <input
                              value={buyerEmail}
                              onChange={(event) => setBuyerEmail(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                              placeholder="必填（用于发送快递单号）"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">备注（可选）</label>
                            <textarea
                              value={buyerContact}
                              onChange={(event) => setBuyerContact(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[72px]"
                              placeholder="可选"
                            />
                          </div>
                        </>
                      )}

                      {service.product_type !== 'physical' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">称呼（可选）</label>
                            <input
                              value={buyerName}
                              onChange={(event) => setBuyerName(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                              placeholder="可选"
                            />
                          </div>
                          <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            邮箱（可选）
                          </label>
                          <input
                            value={buyerEmail}
                            onChange={(event) => setBuyerEmail(event.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                            placeholder="可选（用于接收卡密与通知）"
                          />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">备注（可选）</label>
                            <textarea
                              value={buyerContact}
                              onChange={(event) => setBuyerContact(event.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[96px]"
                              placeholder="可选"
                            />
                          </div>
                        </>
                      )}
                      {formError && <div className="text-sm text-red-500">{formError}</div>}
                      <button
                        type="submit"
                        disabled={submitting || isOutOfStock}
                        ref={submitButtonRef}
                        className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg font-semibold transition-all ${
                          isOutOfStock
                            ? 'bg-bg-tertiary text-text-tertiary border border-border-primary shadow-none cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40'
                        }`}
                      >
                        {isOutOfStock ? '暂无库存' : (submitting ? '提交中...' : '提交订单')}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>

      {/* 手机端底部固定下单按钮 */}
      {usePLayout && service && !orderResult && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border-primary bg-bg-secondary safe-area-bottom">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-baseline gap-1">
              <span className="text-rose-500 text-sm font-semibold">¥</span>
              <span className="text-rose-500 text-2xl font-bold">{service.price || '0'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOrderModal(true)}
              disabled={isOutOfStock}
              className={`px-8 py-2.5 rounded-full font-semibold ${
                isOutOfStock
                  ? 'bg-bg-tertiary text-text-tertiary border border-border-primary shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
              }`}
            >
              {isOutOfStock ? '暂无库存' : '立即下单'}
            </button>
          </div>
        </div>
      )}

      {/* 手机端下单弹窗 */}
      {showOrderModal && service && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div
            className="w-full max-h-[85vh] rounded-t-2xl border-t border-border-primary bg-bg-secondary overflow-hidden flex flex-col animate-slide-up"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
              <h2 className="text-base font-semibold text-text-primary">填写下单信息</h2>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-full hover:bg-bg-tertiary"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* 弹窗内容 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-4">
              {orderResult ? (
                <div className="space-y-4">
                  {/* 订单创建成功提示 */}
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    订单创建成功，订单号：{orderResult.order_no || orderResult.id}
                  </div>

                  {/* 支付状态展示 */}
                  {orderResult.payment_status === 'paid' ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-green-700 font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          支付成功
                        </div>
                        <p className="mt-2 text-sm text-green-600">
                          {orderResult.payment_gateway === 'system' ? '0元订单已自动完成' : '订单已支付成功，感谢您的购买！'}
                        </p>
                      </div>

                      {orderResult.cards && orderResult.cards.length > 0 && (
                        <div className="bg-bg-tertiary border border-border-primary rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-text-primary">卡密信息</div>
                            <button
                              type="button"
                              onClick={async () => {
                                const text = orderResult.cards?.map(c => c.card_code).join('\n') || ''
                                try {
                                  await navigator.clipboard.writeText(text)
                                  alert('已复制到剪贴板')
                                } catch (e) {
                                  alert('复制失败，请手动复制')
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border-primary hover:bg-bg-secondary"
                            >
                              <Copy className="w-3 h-3" />
                              复制全部
                            </button>
                          </div>
                          <div className="space-y-2">
                            {orderResult.cards.map((card, index) => (
                              <div key={card.id} className="bg-bg-secondary rounded-lg p-3 border border-border-primary">
                                <div className="text-xs text-text-tertiary mb-1">卡密 {index + 1}</div>
                                <div className="font-mono text-sm text-text-primary break-all select-all">
                                  {card.card_code}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-text-tertiary">
                            {buyerEmail ? '卡密信息已发送至您的邮箱，请注意查收。' : '请妥善保存卡密信息。'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : orderResult.payment_url ? (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-amber-700 font-semibold">
                          <Clock className="w-5 h-5" />
                          等待支付
                        </div>
                        <p className="mt-2 text-sm text-amber-600">
                          请点击下方按钮前往支付，支付完成后页面会自动更新。
                        </p>
                        {pollingPayment && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            正在检测支付状态...
                          </div>
                        )}
                      </div>

                      <a
                        href={orderResult.payment_url}
                        target={orderResult.payment_url?.startsWith('http') ? '_blank' : undefined}
                        rel={orderResult.payment_url?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/30"
                      >
                        前往支付
                      </a>

                      <button
                        type="button"
                        onClick={handleRefreshPaymentStatus}
                        disabled={pollingPayment}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border-primary bg-bg-tertiary text-text-primary font-medium disabled:opacity-60"
                      >
                        <RefreshCw className={`w-4 h-4 ${pollingPayment ? 'animate-spin' : ''}`} />
                        {pollingPayment ? '检测中...' : '我已支付，刷新状态'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentGenerating && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          支付链接生成中…
                        </div>
                      )}
                      {!paymentGenerating && paymentLinkError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-red-700 font-semibold">
                            <XCircle className="w-5 h-5" />
                            支付链接生成失败
                          </div>
                          <p className="mt-2 text-sm text-red-600">{paymentLinkError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 支付方式 */}
                  <div>
                    <div className="block text-sm font-medium text-text-secondary mb-2">支付方式</div>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                      <div className="flex items-center gap-2 min-w-0">
                        {isFreePrice ? (
                          <div className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-primary flex items-center justify-center text-xs text-text-secondary">
                            0
                          </div>
                        ) : boundPaymentConfig?.display_logo ? (
                          <img
                            src={getImageUrl(boundPaymentConfig.display_logo)}
                            alt={boundPaymentConfig.name}
                            className="w-7 h-7 rounded-lg object-cover border border-border-primary bg-bg-secondary"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-primary" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-text-primary font-medium truncate">
                            {isFreePrice ? '系统支付' : (boundPaymentConfig?.name || '未绑定（不可下单）')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 表单字段 */}
                  {service.product_type === 'physical' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">称呼</label>
                        <input
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                          placeholder="必填"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">手机号</label>
                        <input
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                          placeholder="必填"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">收货地址</label>
                        <textarea
                          value={buyerAddress}
                          onChange={(e) => setBuyerAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[72px]"
                          placeholder="必填"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">邮箱</label>
                        <input
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                          placeholder="必填（用于发送快递单号）"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">备注（可选）</label>
                        <textarea
                          value={buyerContact}
                          onChange={(e) => setBuyerContact(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[60px]"
                          placeholder="可选"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">称呼（可选）</label>
                        <input
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                          placeholder="可选"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                              邮箱（可选）
                            </label>
                            <input
                              value={buyerEmail}
                              onChange={(e) => setBuyerEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary"
                              placeholder="可选（用于接收卡密与通知）"
                            />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">备注（可选）</label>
                        <textarea
                          value={buyerContact}
                          onChange={(e) => setBuyerContact(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary min-h-[72px]"
                          placeholder="可选"
                        />
                      </div>
                    </>
                  )}

                  {formError && <div className="text-sm text-red-500">{formError}</div>}

                  {/* 隐藏的提交按钮，用于弹窗底部按钮触发 */}
                  <button type="submit" ref={submitButtonRef} className="hidden">提交</button>
                </form>
              )}
            </div>

            {/* 弹窗底部按钮 */}
            {!orderResult && (
              <div className="px-4 py-3 border-t border-border-primary bg-bg-secondary safe-area-bottom">
                <button
                  type="button"
                  disabled={submitting || isOutOfStock}
                  onClick={() => submitButtonRef.current?.click()}
                  className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg font-semibold ${
                    isOutOfStock
                      ? 'bg-bg-tertiary text-text-tertiary border border-border-primary shadow-none cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                  }`}
                >
                  {isOutOfStock ? '暂无库存' : (submitting ? '提交中...' : '提交订单')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 弹窗动画样式 */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      {showPurchaseSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-primary bg-bg-secondary p-6">
            <div className="flex items-center gap-2 text-text-primary font-semibold">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              购买成功
            </div>
            <div className="mt-3 text-sm text-text-secondary">
              订单号：{orderResult?.order_no || orderResult?.id}
            </div>

            {/* 卡密展示 */}
            {orderResult?.cards && orderResult.cards.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-text-primary">卡密信息</div>
                  <button
                    type="button"
                    onClick={async () => {
                      const text = orderResult.cards?.map(c => c.card_code).join('\n') || ''
                      try {
                        await navigator.clipboard.writeText(text)
                        alert('已复制到剪贴板')
                      } catch (e) {
                        alert('复制失败，请手动复制')
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border-primary hover:bg-bg-tertiary"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3 border border-border-primary max-h-32 overflow-y-auto">
                  {orderResult.cards.map((card, index) => (
                    <div key={card.id} className="font-mono text-sm text-text-primary break-all select-all">
                      {card.card_code}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-tertiary">
                  {buyerEmail ? '卡密已发送至您的邮箱，请注意查收。' : '请妥善保存卡密信息。'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPurchaseSuccess(false)}
              className="mt-5 w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
            >
              确定
            </button>
          </div>
        </div>
      )}

      <SiteFooter className={`mt-auto ${usePLayout && service && !orderResult ? 'pb-24 sm:pb-6' : ''}`} />
    </main>
  )
}
