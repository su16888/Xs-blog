'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import PageBackground from '@/components/PageBackground'
import SEOMeta from '@/components/SEOMeta'

export default function PaymentResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'no_order'>('loading')

  useEffect(() => {
    // 优先从 URL 参数获取订单号（标准易支付会传递）
    const outTradeNo = searchParams.get('out_trade_no')

    let orderId: string | null = null

    // 方式1：从 out_trade_no 提取订单ID（格式：XS{orderId}{timestamp}）
    if (outTradeNo && outTradeNo.startsWith('XS')) {
      const match = outTradeNo.match(/^XS(\d+)/)
      if (match) {
        orderId = match[1]
      }
    }

    // 方式2：从 localStorage 获取最近的订单ID（LDC等不传参数的平台）
    if (!orderId && typeof window !== 'undefined') {
      const lastOrderId = localStorage.getItem('lastOrderId')
      const lastOrderTime = localStorage.getItem('lastOrderTime')

      // 检查订单是否在30分钟内创建（避免跳转到很久之前的订单）
      if (lastOrderId && lastOrderTime) {
        const timeDiff = Date.now() - Number(lastOrderTime)
        const thirtyMinutes = 30 * 60 * 1000
        if (timeDiff < thirtyMinutes) {
          orderId = lastOrderId
        }
      }
    }

    if (orderId) {
      setStatus('redirecting')
      // 清除 localStorage 中的订单信息
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastOrderId')
        localStorage.removeItem('lastOrderTime')
      }
      // 跳转到订单详情页
      router.replace(`/order/${orderId}`)
    } else {
      setStatus('no_order')
    }
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-bg-primary relative flex flex-col">
      <SEOMeta customTitle="支付结果" />
      <PageBackground />

      <div className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 py-8 flex items-center justify-center">
        <div className="bg-bg-secondary rounded-xl border border-border-primary p-8 w-full text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <div className="text-lg font-medium text-text-primary mb-2">正在处理...</div>
              <div className="text-sm text-text-secondary">请稍候，正在查询订单信息</div>
            </>
          )}

          {status === 'redirecting' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <div className="text-lg font-medium text-text-primary mb-2">支付已提交</div>
              <div className="text-sm text-text-secondary">正在跳转到订单详情页...</div>
            </>
          )}

          {status === 'no_order' && (
            <>
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <div className="text-lg font-medium text-text-primary mb-2">支付已提交</div>
              <div className="text-sm text-text-secondary mb-6">
                您的支付请求已提交，订单状态会自动更新。
                <br />
                如果支付成功，您将通过预留的联系方式收到通知。
              </div>
              <button
                onClick={() => router.push('/services')}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                返回服务列表
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
