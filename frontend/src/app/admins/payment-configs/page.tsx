'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  createAdminPaymentConfig,
  deleteAdminPaymentConfig,
  getAdminPaymentConfigs,
  getAdminSettings,
  updateAdminPaymentConfig,
  updateAdminSettings
} from '@/lib/api'

interface PaymentConfig {
  id: number
  name: string
  provider_key: string
  provider_type?: string | null
  is_enabled: boolean
  sort_order: number
  remark?: string | null
  config_json?: any
  display_logo?: string | null
  created_at?: string
  updated_at?: string
}

export default function PaymentConfigsPage() {
  usePageTitle('支付配置', true)

  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [editing, setEditing] = useState<PaymentConfig | null>(null)
  const [form, setForm] = useState({
    name: '',
    provider_key: '',
    provider_type: 'yipay',
    is_enabled: true,
    sort_order: 0,
    remark: '',
    display_logo: '',
    config_json: {} as any
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [notifyAdminOnPaid, setNotifyAdminOnPaid] = useState(false)
  const [notifyBuyerOnPaid, setNotifyBuyerOnPaid] = useState(false)
  const [notifyBuyerOnShipping, setNotifyBuyerOnShipping] = useState(false)
  const [notifySaving, setNotifySaving] = useState(false)
  const [notifyLoaded, setNotifyLoaded] = useState(false)

  const queryParams = useMemo(() => {
    const params: any = {}
    if (search.trim()) params.search = search.trim()
    if (filterEnabled !== 'all') params.is_enabled = filterEnabled === 'enabled'
    return params
  }, [search, filterEnabled])

  const loadPaymentConfigs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminPaymentConfigs(queryParams)
      if (res?.success) {
        setConfigs(res.data || [])
      } else {
        setError(res?.message || '加载失败')
      }
    } catch (e) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadNotifySettings = async () => {
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
        setNotifyLoaded(true)
      }
    } catch (e) {}
  }

  useEffect(() => {
    loadPaymentConfigs()
  }, [queryParams])

  useEffect(() => {
    if (!notifyLoaded) loadNotifySettings()
  }, [notifyLoaded])

  const resetForm = () => {
    setEditing(null)
    setForm({
      name: '',
      provider_key: '',
      provider_type: 'yipay',
      is_enabled: true,
      sort_order: 0,
      remark: '',
      display_logo: '',
      config_json: {}
    })
  }

  const startEdit = (config: PaymentConfig) => {
    setEditing(config)
    setForm({
      name: config.name || '',
      provider_key: config.provider_key || '',
      provider_type: (config.provider_type || config.provider_key || 'yipay') as any,
      is_enabled: !!config.is_enabled,
      sort_order: Number(config.sort_order || 0),
      remark: config.remark || '',
      display_logo: (config.display_logo || '') as any,
      config_json: (config.config_json || {}) as any
    })
  }

  const updateConfig = (patch: Record<string, any>) => {
    setForm(prev => ({ ...prev, config_json: { ...(prev.config_json || {}), ...patch } }))
  }

  const effectiveBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  const handleSave = async () => {
    if (saving) return
    const name = form.name.trim()
    const providerKey = form.provider_key.trim()
    const providerType = String((form as any).provider_type || '').trim()
    if (!name) {
      setError('请输入支付配置名称')
      return
    }
    if (!providerKey) {
      setError('请输入支付渠道标识')
      return
    }
    if (!providerType) {
      setError('请选择支付渠道类型')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name,
        provider_key: providerKey,
        provider_type: providerType,
        is_enabled: form.is_enabled,
        sort_order: Number(form.sort_order || 0),
        remark: form.remark.trim() || null,
        display_logo: String((form as any).display_logo || '').trim() || null,
        config_json: (form as any).config_json && typeof (form as any).config_json === 'object' ? (form as any).config_json : null
      }
      const res = editing
        ? await updateAdminPaymentConfig(editing.id, payload)
        : await createAdminPaymentConfig(payload)

      if (res?.success) {
        resetForm()
        await loadPaymentConfigs()
      } else {
        setError(res?.message || '保存失败')
      }
    } catch (e) {
      setError('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (config: PaymentConfig) => {
    if (!confirm(`确定删除支付配置「${config.name}」吗？`)) return
    setError('')
    try {
      const res = await deleteAdminPaymentConfig(config.id)
      if (res?.success) {
        if (editing?.id === config.id) resetForm()
        await loadPaymentConfigs()
      } else {
        setError(res?.message || '删除失败')
      }
    } catch (e) {
      setError('删除失败')
    }
  }

  const saveNotifySettings = async () => {
    if (notifySaving) return
    setNotifySaving(true)
    setError('')
    try {
      const settings = [
        { key: 'orderNotifyAdminOnPaid', value: notifyAdminOnPaid ? 'true' : 'false', type: 'string' },
        { key: 'orderNotifyBuyerOnPaid', value: notifyBuyerOnPaid ? 'true' : 'false', type: 'string' },
        { key: 'orderNotifyBuyerOnShipping', value: notifyBuyerOnShipping ? 'true' : 'false', type: 'string' }
      ]
      const res = await updateAdminSettings(settings)
      if (!res?.success) {
        setError(res?.message || '保存失败')
      }
    } catch (e) {
      setError('保存失败')
    } finally {
      setNotifySaving(false)
    }
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索名称/渠道标识"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-72"
            />
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-28"
            >
              <option value="all">全部</option>
              <option value="enabled">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetForm}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              新增
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? '保存中...' : editing ? '保存修改' : '保存新增'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
              支付配置
            </div>
            {loading ? (
              <div className="p-6 text-sm text-gray-500">加载中...</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {configs.map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => startEdit(cfg)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${editing?.id === cfg.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{cfg.name}</div>
                        <div className="text-xs text-gray-500 font-mono truncate">{cfg.provider_key}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full border ${cfg.is_enabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {cfg.is_enabled ? '启用' : '禁用'}
                        </span>
                        <span className="text-xs text-gray-500">#{cfg.sort_order}</span>
                      </div>
                    </div>
                    {cfg.remark && <div className="mt-1 text-xs text-gray-600 truncate">{cfg.remark}</div>}
                  </button>
                ))}
                {configs.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">暂无数据</div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{editing ? `编辑配置 #${editing.id}` : '新增配置'}</div>
                {editing && (
                  <button
                    onClick={() => handleDelete(editing)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">配置名称</div>
                    <input
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例如：彩虹易支付（主站） / PayPal（USD）"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">渠道标识</div>
                    <input
                      value={form.provider_key}
                      onChange={(e) => setForm(prev => ({ ...prev, provider_key: e.target.value }))}
                      placeholder="建议与渠道类型一致：yipay / paypal"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">渠道类型</div>
                    <select
                      value={(form as any).provider_type}
                      onChange={(e) => {
                        const nextType = e.target.value
                        setForm(prev => {
                          const prevType = (prev as any).provider_type
                          const shouldSyncKey = !prev.provider_key || prev.provider_key === prevType
                          return {
                            ...prev,
                            provider_type: nextType,
                            provider_key: shouldSyncKey ? nextType : prev.provider_key
                          } as any
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="yipay">彩虹易支付</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 pt-6">
                    <input
                      type="checkbox"
                      checked={form.is_enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, is_enabled: e.target.checked }))}
                      className="rounded"
                    />
                    启用
                  </label>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">排序权重</div>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">备注</div>
                    <input
                      value={form.remark}
                      onChange={(e) => setForm(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="可选"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">展示Logo（可选）</div>
                    <input
                      value={(form as any).display_logo}
                      onChange={(e) => setForm(prev => ({ ...prev, display_logo: e.target.value } as any))}
                      placeholder="支持URL或相对路径"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">回调基础地址（可选）</div>
                    <input
                      value={String((form as any).config_json?.return_base_url || '')}
                      onChange={(e) => updateConfig({ return_base_url: e.target.value })}
                      placeholder={effectiveBaseUrl || '例如：https://example.com'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="text-xs text-gray-500 flex items-end">
                    未填写时，系统会按请求域名自动生成回调URL（建议生产环境显式填写，避免反代/HTTPS问题）。
                  </div>
                </div>

                {(form as any).provider_type === 'yipay' && (
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">彩虹易支付配置</div>
                    <div className="text-xs text-gray-500">
                      已按通用支付接口对齐：填写 RSA 公私钥后将优先走 /api/pay/create（SHA256WithRSA），未填写则回落旧版 MD5（submit.php）。
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">网关地址</div>
                        <input
                          value={String((form as any).config_json?.gateway_url || '')}
                          onChange={(e) => updateConfig({ gateway_url: e.target.value })}
                          placeholder="例如：https://pay.example.com 或 https://credit.linux.do/epay"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">接口路径（MD5 兼容，可选）</div>
                        <input
                          value={String((form as any).config_json?.api_path || '')}
                          onChange={(e) => updateConfig({ api_path: e.target.value })}
                          placeholder="/submit.php"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">网关类型（可选）</div>
                        <select
                          value={String((form as any).config_json?.gateway_variant || '')}
                          onChange={(e) => updateConfig({ gateway_variant: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="">通用易支付</option>
                          <option value="ldc">LDC</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">提交方式（MD5 兼容）</div>
                        <select
                          value={String((form as any).config_json?.submit_method || '')}
                          onChange={(e) => updateConfig({ submit_method: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="">GET（URL 跳转）</option>
                          <option value="POST">POST（表单提交/302 跳转）</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">商户私钥 merchant_private_key（RSA）</div>
                        <textarea
                          value={String((form as any).config_json?.merchant_private_key || '')}
                          onChange={(e) => updateConfig({ merchant_private_key: e.target.value })}
                          rows={4}
                          placeholder="-----BEGIN PRIVATE KEY-----"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">平台公钥 platform_public_key（RSA）</div>
                        <textarea
                          value={String((form as any).config_json?.platform_public_key || '')}
                          onChange={(e) => updateConfig({ platform_public_key: e.target.value })}
                          rows={4}
                          placeholder="-----BEGIN PUBLIC KEY-----"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">商户号 pid</div>
                        <input
                          value={String((form as any).config_json?.pid || '')}
                          onChange={(e) => updateConfig({ pid: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">商户密钥 key（MD5 兼容）</div>
                        <input
                          type="password"
                          value={String((form as any).config_json?.key || '')}
                          onChange={(e) => updateConfig({ key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">默认支付类型</div>
                        <select
                          value={String((form as any).config_json?.pay_type || '')}
                          onChange={(e) => updateConfig({ pay_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="">不固定（由网关选择）</option>
                          <option value="alipay">支付宝</option>
                          <option value="wxpay">微信</option>
                          <option value="qqpay">QQ</option>
                          <option value="epay">epay (LDC)</option>
                        </select>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      异步回调：{(String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl) ? `${String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl}/api/payments/yipay/notify` : '/api/payments/yipay/notify'}
                      {'  '}同步跳转：{(String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl) ? `${String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl}/api/payments/yipay/return` : '/api/payments/yipay/return'}
                    </div>
                  </div>
                )}

                {(form as any).provider_type === 'paypal' && (
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">PayPal 配置</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">模式</div>
                        <select
                          value={String((form as any).config_json?.mode || 'sandbox')}
                          onChange={(e) => updateConfig({ mode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="sandbox">Sandbox（测试）</option>
                          <option value="live">Live（生产）</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">币种</div>
                        <input
                          value={String((form as any).config_json?.currency || 'USD')}
                          onChange={(e) => updateConfig({ currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Client ID</div>
                        <input
                          value={String((form as any).config_json?.client_id || '')}
                          onChange={(e) => updateConfig({ client_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Client Secret</div>
                        <input
                          type="password"
                          value={String((form as any).config_json?.client_secret || '')}
                          onChange={(e) => updateConfig({ client_secret: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Webhook ID</div>
                        <input
                          value={String((form as any).config_json?.webhook_id || '')}
                          onChange={(e) => updateConfig({ webhook_id: e.target.value })}
                          placeholder="用于验签 verify-webhook-signature"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Brand Name（可选）</div>
                        <input
                          value={String((form as any).config_json?.brand_name || '')}
                          onChange={(e) => updateConfig({ brand_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Return：{(String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl) ? `${String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl}/api/payments/paypal/return` : '/api/payments/paypal/return'}
                      {'  '}Webhook：{(String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl) ? `${String((form as any).config_json?.return_base_url || '') || effectiveBaseUrl}/api/payments/paypal/webhook` : '/api/payments/paypal/webhook'}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  敏感字段会在后端使用 DB_ENCRYPTION_KEY 加密入库。邮箱通知需在后端 .env 配置 EMAIL_*。
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">用户通知</div>
                <button
                  onClick={saveNotifySettings}
                  disabled={notifySaving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {notifySaving ? '保存中...' : '保存设置'}
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm text-gray-700">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={notifyAdminOnPaid}
                    onChange={(e) => setNotifyAdminOnPaid(e.target.checked)}
                    className="rounded mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">系统邮箱提醒（管理员）</div>
                    <div className="text-xs text-gray-500">用户购买后通知管理员邮箱（后端 .env 邮箱配置）。</div>
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
                    <div className="font-medium text-gray-900">用户邮箱提醒（购买/发货）</div>
                    <div className="text-xs text-gray-500">用户购买后发送邮件；卡密订单会附带卡密内容。</div>
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
                    <div className="text-xs text-gray-500">后台录入快递单号并标记已发货后，向用户发送含单号邮件。</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
