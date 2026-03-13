const axios = require('axios')
const databaseEncryption = require('../../../utils/databaseEncryption')

const tokenCache = new Map()

function normalizeConfig(paymentConfig) {
  const raw = paymentConfig?.config_json || {}
  const decrypted = databaseEncryption.decryptSensitiveFields(raw)
  return decrypted && typeof decrypted === 'object' ? decrypted : {}
}

function getApiBase(mode) {
  const m = String(mode || '').trim().toLowerCase()
  return m === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

function buildBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim()
  return `${proto}://${req.get('host')}`
}

async function getAccessToken({ clientId, clientSecret, mode }) {
  const cacheKey = `${mode}:${clientId}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 5000) return cached.token

  const apiBase = getApiBase(mode)
  const response = await axios.post(
    `${apiBase}/v1/oauth2/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: clientId, password: clientSecret },
      timeout: 15000
    }
  )

  const token = response?.data?.access_token
  const expiresIn = Number(response?.data?.expires_in || 0)
  if (!token) throw Object.assign(new Error('PayPal 获取 access_token 失败'), { statusCode: 400 })

  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + Math.max(0, expiresIn - 10) * 1000 })
  return token
}

async function createPayment({ order, service, paymentConfig, req }) {
  const cfg = normalizeConfig(paymentConfig)
  const mode = cfg.mode || 'sandbox'
  const clientId = String(cfg.client_id || '').trim()
  const clientSecret = String(cfg.client_secret || '').trim()
  if (!clientId) throw Object.assign(new Error('PayPal 配置缺少 client_id'), { statusCode: 400 })
  if (!clientSecret) throw Object.assign(new Error('PayPal 配置缺少 client_secret'), { statusCode: 400 })

  const baseUrl = cfg.return_base_url ? String(cfg.return_base_url).trim() : buildBaseUrl(req)
  const returnUrl = `${baseUrl}/api/payments/paypal/return`
  const cancelUrl = `${baseUrl}/api/payments/paypal/cancel`

  const paymentTradeNo = order.payment_trade_no || `XS${order.id}${Date.now()}`
  const currency = String(cfg.currency || 'USD').trim().toUpperCase()

  const token = await getAccessToken({ clientId, clientSecret, mode })
  const apiBase = getApiBase(mode)

  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: paymentTradeNo,
        description: (service?.name || `Order#${order.id}`).toString().slice(0, 120),
        amount: {
          currency_code: currency,
          value: Number(order.amount).toFixed(2)
        }
      }
    ],
    application_context: {
      brand_name: cfg.brand_name ? String(cfg.brand_name).slice(0, 127) : undefined,
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  }

  const response = await axios.post(`${apiBase}/v2/checkout/orders`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  })

  const paypalOrderId = response?.data?.id
  const approveLink = Array.isArray(response?.data?.links)
    ? response.data.links.find((l) => l?.rel === 'approve')?.href
    : null

  if (!paypalOrderId || !approveLink) {
    throw Object.assign(new Error('PayPal 创建订单失败：缺少跳转链接'), { statusCode: 400 })
  }

  return {
    paymentTradeNo,
    paymentProviderOrderId: paypalOrderId,
    paymentUrl: approveLink,
    meta: { provider: 'paypal', mode, currency }
  }
}

async function capturePayment({ paypalOrderId, paymentConfig }) {
  const cfg = normalizeConfig(paymentConfig)
  const mode = cfg.mode || 'sandbox'
  const clientId = String(cfg.client_id || '').trim()
  const clientSecret = String(cfg.client_secret || '').trim()
  if (!clientId || !clientSecret) throw Object.assign(new Error('PayPal 配置不完整'), { statusCode: 400 })

  const token = await getAccessToken({ clientId, clientSecret, mode })
  const apiBase = getApiBase(mode)

  const response = await axios.post(
    `${apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {},
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 15000
    }
  )

  return response?.data
}

async function verifyWebhook({ req, event, paymentConfig }) {
  const cfg = normalizeConfig(paymentConfig)
  const mode = cfg.mode || 'sandbox'
  const clientId = String(cfg.client_id || '').trim()
  const clientSecret = String(cfg.client_secret || '').trim()
  const webhookId = String(cfg.webhook_id || '').trim()
  if (!clientId || !clientSecret || !webhookId) return false

  const transmissionId = req.get('paypal-transmission-id')
  const transmissionTime = req.get('paypal-transmission-time')
  const certUrl = req.get('paypal-cert-url')
  const authAlgo = req.get('paypal-auth-algo')
  const transmissionSig = req.get('paypal-transmission-sig')
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false

  const token = await getAccessToken({ clientId, clientSecret, mode })
  const apiBase = getApiBase(mode)

  const body = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId,
    webhook_event: event
  }

  const resp = await axios.post(`${apiBase}/v1/notifications/verify-webhook-signature`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15000
  })

  return String(resp?.data?.verification_status || '').toUpperCase() === 'SUCCESS'
}

module.exports = { createPayment, capturePayment, verifyWebhook }
