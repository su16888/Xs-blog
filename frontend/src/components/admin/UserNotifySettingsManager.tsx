'use client'

import { useEffect, useState } from 'react'
import { getAdminSettings, updateAdminSettings } from '@/lib/api'

export default function UserNotifySettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedHint, setSavedHint] = useState('')

  const [notifyAdminOnPaid, setNotifyAdminOnPaid] = useState(false)
  const [notifyBuyerOnPaid, setNotifyBuyerOnPaid] = useState(false)
  const [notifyBuyerOnShipping, setNotifyBuyerOnShipping] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminSettings()
      if (res?.success && Array.isArray(res.data)) {
        const map: Record<string, any> = {}
        for (const s of res.data) {
          if (s?.key) map[s.key] = s.value
        }
        setNotifyAdminOnPaid(String(map.orderNotifyAdminOnPaid || 'false') === 'true')
        setNotifyBuyerOnPaid(String(map.orderNotifyBuyerOnPaid || 'false') === 'true')
        setNotifyBuyerOnShipping(String(map.orderNotifyBuyerOnShipping || 'false') === 'true')
      } else {
        setError(res?.message || '加载失败')
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSavedHint('')
    try {
      const settings = [
        { key: 'orderNotifyAdminOnPaid', value: notifyAdminOnPaid ? 'true' : 'false', type: 'string' },
        { key: 'orderNotifyBuyerOnPaid', value: notifyBuyerOnPaid ? 'true' : 'false', type: 'string' },
        { key: 'orderNotifyBuyerOnShipping', value: notifyBuyerOnShipping ? 'true' : 'false', type: 'string' }
      ]
      const res = await updateAdminSettings(settings)
      if (res?.success) {
        setSavedHint('已保存')
      } else {
        setError(res?.message || '保存失败')
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-gray-900">用户通知</div>
            </div>
            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              {savedHint && <div className="text-sm text-green-600">{savedHint}</div>}
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}

          {loading ? (
            <div className="mt-4 text-sm text-gray-500">加载中...</div>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={notifyAdminOnPaid}
                  onChange={(e) => setNotifyAdminOnPaid(e.target.checked)}
                  className="rounded mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">用户购买后系统邮箱提醒（系统提醒）</div>
                  <div className="text-xs text-gray-500">用户支付成功后，给系统邮箱发送订单提醒邮件。</div>
                </div>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={notifyBuyerOnPaid}
                  onChange={(e) => setNotifyBuyerOnPaid(e.target.checked)}
                  className="rounded mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">用户邮箱提醒（已发货/已购买）</div>
                  <div className="text-xs text-gray-500">
                    用户购买后会邮件通知；卡密商品会附带购买到的卡密内容；虚拟物品会提示已发货。
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={notifyBuyerOnShipping}
                  onChange={(e) => setNotifyBuyerOnShipping(e.target.checked)}
                  className="rounded mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">用户实物发货提醒（含快递单号）</div>
                  <div className="text-xs text-gray-500">
                    实物订单支付后后台显示未发货；后台填写快递单号并标记已发货后，发送含快递单号邮件。
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
