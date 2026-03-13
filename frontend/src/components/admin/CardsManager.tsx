'use client'

import { useEffect, useMemo, useState } from 'react'
import { deleteAdminCard, getAdminCards, getAdminServices, importAdminCards, updateAdminCard } from '@/lib/api'

interface ServiceLite {
  id: number
  name: string
}

interface AdminCard {
  id: number
  service_id: number
  card_code: string
  card_status: string
  bind_order_id?: number | null
  created_at?: string
  updated_at?: string
  service?: { id: number; name: string }
  order?: { id: number; status: string; payment_status: string }
}

const CARD_STATUS_LABEL: Record<string, string> = {
  unused: '未使用',
  used: '已使用',
  disabled: '已禁用'
}

export default function CardsManager() {
  const [services, setServices] = useState<ServiceLite[]>([])
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [serviceSearch, setServiceSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cards, setCards] = useState<AdminCard[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  const [cardStatus, setCardStatus] = useState<string>('')
  const [search, setSearch] = useState('')

  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [bindOpen, setBindOpen] = useState(false)
  const [bindCard, setBindCard] = useState<AdminCard | null>(null)
  const [bindQuery, setBindQuery] = useState('')
  const [bindServiceId, setBindServiceId] = useState<number | ''>('')

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    if (!q) return services
    return services.filter(s => String(s.id).includes(q) || s.name.toLowerCase().includes(q))
  }, [services, serviceSearch])

  const filteredBindServices = useMemo(() => {
    const q = bindQuery.trim().toLowerCase()
    if (!q) return services
    return services.filter(s => String(s.id).includes(q) || s.name.toLowerCase().includes(q))
  }, [services, bindQuery])

  const params = useMemo(() => {
    const p: any = { page, limit }
    if (serviceId) p.service_id = serviceId
    if (cardStatus) p.card_status = cardStatus
    if (search.trim()) p.search = search.trim()
    return p
  }, [page, limit, serviceId, cardStatus, search])

  const loadServices = async () => {
    try {
      const res = await getAdminServices()
      if (res?.success) {
        const data = res.data || []
        setServices(data.map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch (e) {}
  }

  const loadCards = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminCards(params)
      if (res?.success) {
        setCards(res.data?.cards || [])
        setTotalPages(res.data?.pagination?.totalPages || 1)
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
    loadServices()
  }, [])

  useEffect(() => {
    loadCards()
  }, [params])

  const handleImport = async () => {
    if (importing) return
    const sid = Number(serviceId)
    if (!sid || Number.isNaN(sid)) {
      setError('请选择要导入到的服务')
      return
    }
    if (!importText.trim()) {
      setError('请输入卡密内容（每行一个）')
      return
    }

    setImporting(true)
    setError('')
    try {
      const res = await importAdminCards({ service_id: sid, cards_text: importText })
      if (res?.success) {
        setImportText('')
        await loadCards()
      } else {
        setError(res?.message || '导入失败')
      }
    } catch (e) {
      setError('导入失败')
    } finally {
      setImporting(false)
    }
  }

  const handleToggleDisable = async (card: AdminCard) => {
    if (updatingId) return
    const nextStatus = card.card_status === 'disabled' ? 'unused' : 'disabled'
    setUpdatingId(card.id)
    setError('')
    try {
      const res = await updateAdminCard(card.id, { card_status: nextStatus })
      if (res?.success) {
        await loadCards()
      } else {
        setError(res?.message || '更新失败')
      }
    } catch (e) {
      setError('更新失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (card: AdminCard) => {
    if (!confirm(`确定删除卡密 #${card.id} 吗？`)) return
    setError('')
    try {
      const res = await deleteAdminCard(card.id)
      if (res?.success) {
        await loadCards()
      } else {
        setError(res?.message || '删除失败')
      }
    } catch (e) {
      setError('删除失败')
    }
  }

  const openBindModal = (card: AdminCard) => {
    setBindCard(card)
    setBindServiceId(card.service_id)
    setBindQuery('')
    setBindOpen(true)
  }

  const handleBindService = async () => {
    if (!bindCard) return
    if (updatingId) return
    const sid = Number(bindServiceId)
    if (!sid || Number.isNaN(sid)) {
      setError('请选择要绑定的服务')
      return
    }
    setUpdatingId(bindCard.id)
    setError('')
    try {
      const res = await updateAdminCard(bindCard.id, { service_id: sid })
      if (res?.success) {
        setBindOpen(false)
        setBindCard(null)
        await loadCards()
      } else {
        setError(res?.message || '绑定失败')
      }
    } catch (e) {
      setError('绑定失败')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mt-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="搜索服务名称/ID"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64"
            />
            <select
              value={serviceId}
              onChange={(e) => { setServiceId(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-80"
            >
              <option value="">选择服务（用于筛选/导入）</option>
              {filteredServices.map(s => (
                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
              ))}
            </select>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {importing ? '导入中...' : '导入卡密'}
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="每行一个卡密，例如：XXXX-YYYY-ZZZZ"
            className="w-full min-h-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜索卡密内容"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64"
            />
            <select
              value={cardStatus}
              onChange={(e) => { setCardStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">全部状态</option>
              <option value="unused">{CARD_STATUS_LABEL.unused}</option>
              <option value="used">{CARD_STATUS_LABEL.used}</option>
              <option value="disabled">{CARD_STATUS_LABEL.disabled}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            卡密列表
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
                    <th className="text-left px-4 py-3">卡密</th>
                    <th className="text-left px-4 py-3">状态</th>
                    <th className="text-left px-4 py-3">绑定订单</th>
                    <th className="text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cards.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{c.id}</td>
                      <td className="px-4 py-3 text-gray-900">{c.service?.name || c.service_id}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono break-all max-w-[360px]">{c.card_code}</td>
                      <td className="px-4 py-3 text-gray-700">{CARD_STATUS_LABEL[c.card_status] || c.card_status}</td>
                      <td className="px-4 py-3 text-gray-700">{c.bind_order_id || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => openBindModal(c)}
                          disabled={updatingId === c.id}
                          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white disabled:opacity-60"
                        >
                          绑定服务
                        </button>
                          <button
                            onClick={() => handleToggleDisable(c)}
                            disabled={updatingId === c.id}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white disabled:opacity-60"
                          >
                            {c.card_status === 'disabled' ? '启用' : '禁用'}
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cards.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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

      {bindOpen && bindCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900">绑定服务（卡密 #{bindCard.id}）</div>
              <button
                onClick={() => { setBindOpen(false); setBindCard(null) }}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={bindQuery}
                  onChange={(e) => setBindQuery(e.target.value)}
                  placeholder="搜索服务名称/ID"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <select
                  value={bindServiceId}
                  onChange={(e) => setBindServiceId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">选择要绑定的服务</option>
                  {filteredBindServices.map(s => (
                    <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleBindService}
                disabled={updatingId === bindCard.id}
                className="w-full px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {updatingId === bindCard.id ? '绑定中...' : '确认绑定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
