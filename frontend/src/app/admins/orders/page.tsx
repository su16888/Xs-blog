'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { bulkDeleteAdminOrders, deleteAdminOrder, cancelAdminOrder, completeAdminOrder, getAdminOrder, getAdminOrders, markAdminOrderPaid, shipAdminOrder } from '@/lib/api'

interface AdminOrder {
  id: number
  order_no?: string
  service_id: number
  amount: string | number
  status: string
  buyer_name?: string | null
  buyer_contact?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  buyer_address?: string | null
  payment_config_id?: number | null
  payment_gateway?: string | null
  payment_status: string
  ip_address?: string | null
  user_agent?: string | null
  cancel_reason?: string | null
  shipping_status?: string | null
  tracking_no?: string | null
  shipped_at?: string | null
  expired_at?: string | null
  created_at?: string
  updated_at?: string
  service?: { id: number; name: string; product_type?: string }
  paymentConfig?: { id: number; name: string; provider_key: string; is_enabled: boolean }
  cards?: Array<{ id: number; card_status: string; card_code: string }>
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  canceled: '已取消',
  completed: '已完成'
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: '未支付',
  paid: '已支付',
  refunded: '已退款'
}

export default function OrdersPage() {
  usePageTitle('订单管理', true)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  const [status, setStatus] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('')
  const [search, setSearch] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [cancelReason, setCancelReason] = useState('管理员取消')
  const [trackingNo, setTrackingNo] = useState('')
  const [bulkDeleteAction, setBulkDeleteAction] = useState('')

  const params = useMemo(() => {
    const p: any = { page, limit }
    if (status) p.status = status
    if (paymentStatus) p.payment_status = paymentStatus
    if (search.trim()) p.search = search.trim()
    return p
  }, [page, limit, status, paymentStatus, search])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminOrders(params)
      if (res?.success) {
        setOrders(res.data?.orders || [])
        const pagination = res.data?.pagination
        setTotalPages(pagination?.totalPages || 1)
      } else {
        setError(res?.message || '加载失败')
      }
    } catch (e) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [params])

  const openDetail = async (orderId: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setActiveOrder(null)
    try {
      const res = await getAdminOrder(orderId)
      if (res?.success) {
        setActiveOrder(res.data)
      } else {
        setDetailError(res?.message || '加载失败')
      }
    } catch (e) {
      setDetailError('加载失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshActive = async () => {
    if (!activeOrder) return
    await openDetail(activeOrder.id)
    await load()
  }

  const runAction = async (action: () => Promise<any>) => {
    if (!activeOrder || updating) return
    setUpdating(true)
    setDetailError('')
    try {
      const res = await action()
      if (res?.success) {
        await refreshActive()
      } else {
        setDetailError(res?.message || '操作失败')
      }
    } catch (e) {
      setDetailError('操作失败')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (deletingId !== null) return
    if (!confirm(`确定删除订单 #${orderId} 吗？已支付订单删除后将同时删除已发放的卡密并扣减库存，此操作不可恢复。`)) return
    setDeletingId(orderId)
    setError('')
    try {
      const res = await deleteAdminOrder(orderId)
      if (!res?.success) {
        setError(res?.message || '删除失败')
      } else {
        await load()
      }
    } catch (e) {
      setError('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBulkDelete = async (action: 'unpaid' | 'paid' | 'all') => {
    if (bulkDeleting) return
    const msg =
      action === 'unpaid'
        ? '确定删除所有未支付订单（未支付+待付款、未支付+已取消）吗？删除后会回滚相关库存，此操作不可恢复。'
        : action === 'paid'
          ? '确定删除所有已支付订单（已支付+已付款、已支付+已完成）吗？会同时删除已发放的卡密记录，仅建议用于清理测试数据。'
          : '确定删除全部订单吗？此操作不可恢复，谨慎用于清理测试数据。'
    if (!confirm(msg)) return
    setBulkDeleting(true)
    setError('')
    try {
      const res = await bulkDeleteAdminOrders(action)
      if (!res?.success) {
        setError(res?.message || '删除失败')
      } else {
        setPage(1)
        await load()
      }
    } catch (e) {
      setError('删除失败')
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜索购买人/联系方式"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64"
            />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">订单状态</option>
              <option value="pending">{ORDER_STATUS_LABEL.pending}</option>
              <option value="paid">{ORDER_STATUS_LABEL.paid}</option>
              <option value="canceled">{ORDER_STATUS_LABEL.canceled}</option>
              <option value="completed">{ORDER_STATUS_LABEL.completed}</option>
            </select>
            <select
              value={paymentStatus}
              onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">支付状态（全部）</option>
              <option value="unpaid">{PAYMENT_STATUS_LABEL.unpaid}</option>
              <option value="paid">{PAYMENT_STATUS_LABEL.paid}</option>
              <option value="refunded">{PAYMENT_STATUS_LABEL.refunded}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkDeleteAction}
              onChange={async (e) => {
                const v = e.target.value
                setBulkDeleteAction('')
                if (v === 'unpaid') await handleBulkDelete('unpaid')
                if (v === 'paid') await handleBulkDelete('paid')
                if (v === 'all') await handleBulkDelete('all')
              }}
              disabled={bulkDeleting}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
            >
              <option value="">删除订单</option>
              <option value="unpaid">删除未支付</option>
              <option value="paid">删除已支付</option>
              <option value="all">删除全部</option>
            </select>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            订单列表
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">服务</th>
                    <th className="text-left px-4 py-3">金额</th>
                    <th className="text-left px-4 py-3">购买人</th>
                    <th className="text-left px-4 py-3">联系方式</th>
                    <th className="text-left px-4 py-3">状态</th>
                    <th className="text-left px-4 py-3">支付</th>
                    <th className="text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600" title={`ID: ${o.id}`}>{o.order_no || o.id}</td>
                      <td className="px-4 py-3 text-gray-900">{o.service?.name || o.service_id}</td>
                      <td className="px-4 py-3 text-gray-900">{o.amount}</td>
                      <td className="px-4 py-3 text-gray-700">{o.buyer_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{o.buyer_contact || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{ORDER_STATUS_LABEL[o.status] || o.status}</td>
                      <td className="px-4 py-3 text-gray-700">{PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openDetail(o.id)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(o.id)}
                            disabled={deletingId === o.id}
                            className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <div className="text-gray-600">第 {page} / {totalPages} 页</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-gray-900">订单详情</div>
              <button
                onClick={() => { setDetailOpen(false); setActiveOrder(null) }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                关闭
              </button>
            </div>

            <div className="p-5 space-y-4">
              {detailLoading ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : activeOrder ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">订单号</div>
                      <div className="text-sm text-gray-900">{activeOrder.order_no || activeOrder.id}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">服务</div>
                      <div className="text-sm text-gray-900">{activeOrder.service?.name || activeOrder.service_id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">订单状态</div>
                      <div className="text-sm text-gray-900">{ORDER_STATUS_LABEL[activeOrder.status] || activeOrder.status}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">支付状态</div>
                      <div className="text-sm text-gray-900">{PAYMENT_STATUS_LABEL[activeOrder.payment_status] || activeOrder.payment_status}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">支付方式</div>
                      <div className="text-sm text-gray-900">
                        {activeOrder.payment_gateway === 'system'
                          ? '系统支付'
                          : (activeOrder.paymentConfig?.name || activeOrder.payment_config_id || '-')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">买家信息</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="text-gray-700">称呼：<span className="text-gray-900">{activeOrder.buyer_name || '-'}</span></div>
                      <div className="text-gray-700">邮箱：<span className="text-gray-900">{activeOrder.buyer_email || '-'}</span></div>
                      <div className="text-gray-700">手机号：<span className="text-gray-900">{activeOrder.buyer_phone || '-'}</span></div>
                      <div className="text-gray-700">地址：<span className="text-gray-900">{activeOrder.buyer_address || '-'}</span></div>
                      <div className="text-gray-700 md:col-span-2">备注/联系方式：<span className="text-gray-900">{activeOrder.buyer_contact || '-'}</span></div>
                    </div>
                  </div>

                  {(activeOrder.cards?.length || 0) > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">卡密内容</div>
                        <button
                          onClick={async () => {
                            const text = (activeOrder.cards || []).map(c => c.card_code).join('\n')
                            try { await navigator.clipboard.writeText(text) } catch (e) {}
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white"
                        >
                          一键复制
                        </button>
                      </div>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono bg-white border border-gray-200 rounded-lg p-3">
                        {(activeOrder.cards || []).map(c => c.card_code).join('\n')}
                      </pre>
                    </div>
                  )}

                  {activeOrder.service?.product_type === 'physical' && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                      <div className="text-sm font-semibold text-gray-900">发货信息</div>
                      <div className="text-sm text-gray-700">状态：<span className="text-gray-900">{activeOrder.shipping_status || '未发货'}</span></div>
                      <div className="text-sm text-gray-700">快递单号：<span className="text-gray-900">{activeOrder.tracking_no || '-'}</span></div>
                      {activeOrder.shipping_status !== 'shipped' && activeOrder.payment_status === 'paid' && activeOrder.status !== 'canceled' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                            placeholder="输入快递单号"
                            className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => runAction(() => shipAdminOrder(activeOrder.id, trackingNo))}
                            disabled={updating}
                            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                          >
                            {updating ? '处理中...' : '标记已发货'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">订单操作</div>
                    <div className="flex flex-wrap gap-2">
                      {activeOrder.payment_status !== 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                        <button
                          onClick={() => runAction(() => markAdminOrderPaid(activeOrder.id))}
                          disabled={updating}
                          className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                        >
                          {updating ? '处理中...' : '标记已支付'}
                        </button>
                      )}

                      {activeOrder.payment_status === 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                        <button
                          onClick={() => runAction(() => completeAdminOrder(activeOrder.id))}
                          disabled={updating}
                          className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                          {updating ? '处理中...' : '完成订单'}
                        </button>
                      )}

                      {activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && activeOrder.payment_status !== 'paid' && (
                        <button
                          onClick={() => runAction(() => cancelAdminOrder(activeOrder.id, cancelReason))}
                          disabled={updating}
                          className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {updating ? '处理中...' : '取消订单'}
                        </button>
                      )}
                    </div>

                    {activeOrder.payment_status !== 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="取消原因（可选）"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    )}

                    {activeOrder.cancel_reason && (
                      <div className="text-sm text-gray-700">取消原因：<span className="text-gray-900">{activeOrder.cancel_reason}</span></div>
                    )}
                  </div>

                  <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <summary className="text-xs text-gray-600 cursor-pointer select-none">原始数据</summary>
                    <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
                      {JSON.stringify(activeOrder, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <div className="text-sm text-gray-500">暂无数据</div>
              )}

              {detailError && <div className="text-sm text-red-600">{detailError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
