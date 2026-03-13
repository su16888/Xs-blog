'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, Copy, RefreshCw, Package, X } from 'lucide-react'
import { getOrderStatus, getSettings } from '@/lib/api'
import PageBackground from '@/components/PageBackground'
import SEOMeta from '@/components/SEOMeta'
import SiteFooter from '@/components/SiteFooter'

interface OrderData {
  id: number
  order_no: string
  status: string
  payment_status: string
  payment_gateway?: string | null
  paid_at?: string | null
  service_name?: string | null
  product_type?: string | null
  service_slug?: string | null
  cards?: Array<{ id: number; card_code: string; card_status: string }>
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'text-amber-600' },
  paid: { label: '已付款', color: 'text-green-600' },
  completed: { label: '已完成', color: 'text-blue-600' },
  canceled: { label: '已取消', color: 'text-gray-500' }
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  unpaid: { label: '未支付', color: 'text-amber-600' },
  paid: { label: '已支付', color: 'text-green-600' }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = String((params as any)?.id ?? '')

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState<any>({
    footerCopyright: `© ${new Date().getFullYear()} All rights reserved.`
  })

  const loadOrder = useCallback(async () => {
    if (!orderId || orderId === 'undefined') {
      setError('订单号无效')
      setLoading(false)
      return
    }

    try {
      const res = await getOrderStatus(Number(orderId))
      if (res?.success && res.data) {
        setOrder(res.data)
        setError('')
      } else {
        setError(res?.message || '订单不存在')
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || '加载订单失败')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await loadOrder()
    setRefreshing(false)
  }

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getSettings()
        if (res?.success && res.data) {
          const obj: any = {}
          res.data.forEach((s: any) => { obj[s.key] = s.value })
          setSettings({
            footerCopyright: obj.footerCopyright || `© ${new Date().getFullYear()} All rights reserved.`
          })
        }
      } catch (e) {}
    }
    loadSettings()
  }, [])

  // 如果订单未支付，自动轮询
  useEffect(() => {
    if (!order || order.payment_status === 'paid') return

    const interval = setInterval(async () => {
      try {
        const res = await getOrderStatus(Number(orderId))
        if (res?.success && res.data) {
          setOrder(res.data)
        }
      } catch (e) {}
    }, 5000)

    return () => clearInterval(interval)
  }, [order?.payment_status, orderId])

  const isPaid = order?.payment_status === 'paid'
  const statusInfo = order ? STATUS_MAP[order.status] || { label: order.status, color: 'text-gray-600' } : null
  const paymentStatusInfo = order ? PAYMENT_STATUS_MAP[order.payment_status] || { label: order.payment_status, color: 'text-gray-600' } : null

  return (
    <main className="min-h-screen bg-bg-primary relative flex flex-col">
      <SEOMeta customTitle="订单详情" />
      <PageBackground />

      <div className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <button
          onClick={() => {
            // 尝试关闭页面，如果无法关闭则返回上一页
            if (window.history.length > 1) {
              router.back()
            } else {
              window.close()
            }
          }}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <X className="w-4 h-4" />
          关闭
        </button>

        {loading && (
          <div className="bg-bg-secondary rounded-xl border border-border-primary p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-bg-secondary rounded-xl border border-border-primary p-10 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <div className="text-text-primary font-medium mb-2">订单查询失败</div>
            <div className="text-sm text-text-secondary">{error}</div>
          </div>
        )}

        {!loading && !error && order && (
          <div className="space-y-4">
            {/* 订单状态卡片 */}
            <div className={`rounded-xl border p-6 ${
              isPaid
                ? 'bg-green-50 border-green-200'
                : order.status === 'canceled'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPaid ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : order.status === 'canceled' ? (
                    <XCircle className="w-8 h-8 text-gray-500" />
                  ) : (
                    <Clock className="w-8 h-8 text-amber-600" />
                  )}
                  <div>
                    <div className={`text-lg font-semibold ${paymentStatusInfo?.color}`}>
                      {paymentStatusInfo?.label}
                    </div>
                    <div className="text-sm text-text-secondary">
                      订单状态：{statusInfo?.label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-50"
                  title="刷新状态"
                >
                  <RefreshCw className={`w-5 h-5 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {!isPaid && order.status !== 'canceled' && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在等待支付，页面会自动刷新...
                </div>
              )}
            </div>

            {/* 订单信息 */}
            <div className="bg-bg-secondary rounded-xl border border-border-primary overflow-hidden">
              <div className="px-4 py-3 border-b border-border-primary bg-bg-tertiary">
                <div className="text-sm font-semibold text-text-primary">订单信息</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border-primary">
                  <span className="text-sm text-text-secondary">订单号</span>
                  <span className="text-sm font-mono text-text-primary">{order.order_no || order.id}</span>
                </div>
                {order.service_name && (
                  <div className="flex justify-between items-center py-2 border-b border-border-primary">
                    <span className="text-sm text-text-secondary">商品</span>
                    <span className="text-sm text-text-primary">{order.service_name}</span>
                  </div>
                )}
                {order.payment_gateway && (
                  <div className="flex justify-between items-center py-2 border-b border-border-primary">
                    <span className="text-sm text-text-secondary">支付方式</span>
                    <span className="text-sm text-text-primary">{order.payment_gateway}</span>
                  </div>
                )}
                {order.paid_at && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-text-secondary">支付时间</span>
                    <span className="text-sm text-text-primary">
                      {new Date(order.paid_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 卡密信息 */}
            {isPaid && order.cards && order.cards.length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border-primary overflow-hidden">
                <div className="px-4 py-3 border-b border-border-primary bg-bg-tertiary flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-semibold text-text-primary">卡密信息</span>
                  </div>
                  <button
                    onClick={async () => {
                      const text = order.cards?.map(c => c.card_code).join('\n') || ''
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
                <div className="p-4 space-y-2">
                  {order.cards.map((card, index) => (
                    <div key={card.id} className="bg-bg-tertiary rounded-lg p-3 border border-border-primary">
                      <div className="text-xs text-text-tertiary mb-1">卡密 {index + 1}</div>
                      <div className="font-mono text-sm text-text-primary break-all select-all">
                        {card.card_code}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-text-tertiary mt-3">
                    卡密信息已发送至您的邮箱，请注意查收。
                  </p>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            {!isPaid && order.status !== 'canceled' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-blue-700">
                  <strong>温馨提示：</strong>如果您已完成支付，请稍等片刻，系统会自动更新订单状态。
                  如长时间未更新，请联系客服处理。
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter className="mt-auto" />
    </main>
  )
}
