'use client'

import { useEffect, useMemo, useState } from 'react'
import { bulkDeleteAdminOrders, cancelAdminOrder, completeAdminOrder, getAdminOrder, getAdminOrders, markAdminOrderPaid, shipAdminOrder } from '@/lib/api'

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

export default function OrdersManager() {
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
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteAction, setBulkDeleteAction] = useState('')
  const [cancelReason, setCancelReason] = useState('管理员取消')
  const [trackingNo, setTrackingNo] = useState('')

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

  const handleBulkDelete = async () => {
    if (bulkDeleting) return
    const action = bulkDeleteAction as '' | 'unpaid' | 'paid' | 'all'
    if (!action) return

    const msg =
      action === 'unpaid'
        ? '确定删除所有未支付订单（未支付+待付款、未支付+已取消）吗？删除后会回滚相关库存，此操作不可恢复。'
        : action === 'paid'
          ? '确定删除所有已支付订单（已支付+已付款、已支付+已完成）吗？会同时删除已发放的卡密记录，仅建议用于清理测试数据。'
          : '确定删除全部订单吗？此操作不可恢复，谨慎用于清理测试数据。'
    if (!confirm(msg)) {
      setBulkDeleteAction('')
      return
    }

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
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '删除失败'
      setError(msg)
    } finally {
      setBulkDeleting(false)
      setBulkDeleteAction('')
    }
  }

  return (
    <div className="mt-6">
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
              <option value="">全部支付状态</option>
              <option value="unpaid">{PAYMENT_STATUS_LABEL.unpaid}</option>
              <option value="paid">{PAYMENT_STATUS_LABEL.paid}</option>
              <option value="refunded">{PAYMENT_STATUS_LABEL.refunded}</option>
            </select>
            <select
              value={bulkDeleteAction}
              onChange={(e) => {
                setBulkDeleteAction(e.target.value)
              }}
              disabled={bulkDeleting}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
            >
              <option value="">批量删除订单</option>
              <option value="unpaid">删除未支付订单</option>
              <option value="paid">删除已支付订单</option>
              <option value="all">删除全部订单</option>
            </select>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || !bulkDeleteAction}
              className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm disabled:opacity-50"
            >
              执行删除
            </button>
          </div>

          <div className="flex items-center gap-2">
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
                      <td className="px-4 py-3 text-gray-600">{o.id}</td>
                      <td className="px-4 py-3 text-gray-900">{o.service?.name || o.service_id}</td>
                      <td className="px-4 py-3 text-gray-900">{o.amount}</td>
                      <td className="px-4 py-3 text-gray-700">{o.buyer_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{o.buyer_contact || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{ORDER_STATUS_LABEL[o.status] || o.status}</td>
                      <td className="px-4 py-3 text-gray-700">{PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openDetail(o.id)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white"
                        >
                          详情
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900">订单详情</div>
              <button
                onClick={() => setDetailOpen(false)}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                关闭
              </button>
            </div>
            {detailLoading ? (
              <div className="p-6 text-sm text-gray-500">加载中...</div>
            ) : detailError ? (
              <div className="p-6 text-sm text-red-600">{detailError}</div>
            ) : activeOrder ? (
              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="text-gray-700">订单号：<span className="text-gray-900 font-semibold break-all">{activeOrder.order_no || activeOrder.id}</span></div>
                  <div className="text-gray-700">服务：<span className="text-gray-900 break-all">{activeOrder.service?.name || activeOrder.service_id}</span></div>
                  <div className="text-gray-700">金额：<span className="text-gray-900 break-all">{activeOrder.amount}</span></div>
                  <div className="text-gray-700">支付配置：<span className="text-gray-900 break-all">{activeOrder.paymentConfig?.name || activeOrder.payment_config_id || '-'}</span></div>
                  <div className="text-gray-700">购买人：<span className="text-gray-900 break-all">{activeOrder.buyer_name || '-'}</span></div>
                  <div className="text-gray-700">邮箱：<span className="text-gray-900 break-all">{activeOrder.buyer_email || '-'}</span></div>
                  <div className="text-gray-700">手机号：<span className="text-gray-900 break-all">{activeOrder.buyer_phone || '-'}</span></div>
                  <div className="text-gray-700">地址：<span className="text-gray-900 break-all">{activeOrder.buyer_address || '-'}</span></div>
                  <div className="text-gray-700">备注/联系方式：<span className="text-gray-900 break-all">{activeOrder.buyer_contact || '-'}</span></div>
                  <div className="text-gray-700">状态：<span className="text-gray-900 break-all">{activeOrder.status}</span></div>
                  <div className="text-gray-700">支付状态：<span className="text-gray-900 break-all">{PAYMENT_STATUS_LABEL[activeOrder.payment_status] || activeOrder.payment_status}</span></div>
                </div>

                {activeOrder.service?.product_type === 'physical' && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-gray-700">发货信息</div>
                    <div className="text-gray-700">状态：<span className="text-gray-900">{activeOrder.shipping_status || '未发货'}</span></div>
                    <div className="text-gray-700">快递单号：<span className="text-gray-900">{activeOrder.tracking_no || '-'}</span></div>
                    {activeOrder.shipping_status !== 'shipped' && activeOrder.payment_status === 'paid' && activeOrder.status !== 'canceled' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={trackingNo}
                          onChange={(e) => setTrackingNo(e.target.value)}
                          placeholder="输入快递单号"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                          disabled={updating}
                          onClick={() => runAction(() => shipAdminOrder(activeOrder.id, trackingNo))}
                          className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-60"
                        >
                          标记已发货
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {activeOrder.payment_status !== 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                    <button
                      disabled={updating}
                      onClick={() => runAction(() => markAdminOrderPaid(activeOrder.id))}
                      className="px-3 py-2 text-xs rounded-lg bg-green-600 text-white disabled:opacity-60"
                    >
                      标记已支付
                    </button>
                  )}
                  {activeOrder.payment_status === 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                    <button
                      disabled={updating}
                      onClick={() => runAction(() => completeAdminOrder(activeOrder.id))}
                      className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-60"
                    >
                      完成订单
                    </button>
                  )}
                  {activeOrder.payment_status !== 'paid' && activeOrder.status !== 'canceled' && activeOrder.status !== 'completed' && (
                    <button
                      disabled={updating}
                      onClick={() => runAction(() => cancelAdminOrder(activeOrder.id, cancelReason))}
                      className="px-3 py-2 text-xs rounded-lg bg-gray-700 text-white disabled:opacity-60"
                    >
                      取消订单
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

                {activeOrder.cards && activeOrder.cards.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700">
                      关联卡密
                    </div>
                    <div className="p-3 space-y-2">
                      {activeOrder.cards.map(card => (
                        <div key={card.id} className="text-xs text-gray-700">
                          #{card.id} [{card.card_status}] <span className="font-mono break-all">{card.card_code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-500">暂无数据</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
