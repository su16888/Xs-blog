const crypto = require('crypto')
const axios = require('axios')
const databaseEncryption = require('../../../utils/databaseEncryption')
const { getClientIP } = require('../../../utils/ipHelper')

function md5(input) {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex')
}

function buildBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim()
  return `${proto}://${req.get('host')}`
}

function resolveGatewayEndpoint(gatewayUrl, apiPath = '/submit.php') {
  const raw = String(gatewayUrl || '').trim()
  if (!raw) return ''
  if (raw.includes('?')) return raw
  if (raw.endsWith('.php')) return raw
  const base = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  return `${base}${path}`
}

function isLdcEpay(cfg) {
  const raw = String(cfg?.gateway_variant || cfg?.variant || cfg?.mode || '').trim().toLowerCase()
  if (raw === 'ldc' || raw === 'ldc_epay' || raw === 'linux_do_credit') return true
  const gateway = String(cfg?.gateway_url || '').toLowerCase()
  return gateway.includes('credit.linux.do/epay')
}

function pickValue(v) {
  return v === undefined || v === null ? '' : String(v)
}

function buildSignContent(params) {
  return Object.keys(params || {})
    .filter((k) => k !== 'sign' && k !== 'sign_type' && pickValue(params[k]) !== '')
    .sort()
    .map((k) => `${k}=${pickValue(params[k])}`)
    .join('&')
}

function computeMd5Sign(params, key) {
  const content = buildSignContent(params)
  return md5(content + String(key || ''))
}

function normalizePemKey(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  return raw.replace(/\r\n/g, '\n')
}

function signRsaSha256(content, merchantPrivateKey) {
  const privateKey = normalizePemKey(merchantPrivateKey)
  if (!privateKey) return ''
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(content, 'utf8')
  signer.end()
  return signer.sign(privateKey, 'base64')
}

function verifyRsaSha256(content, signBase64, platformPublicKey) {
  const publicKey = normalizePemKey(platformPublicKey)
  const signature = String(signBase64 || '').trim()
  if (!publicKey || !signature) return false
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(content, 'utf8')
  verifier.end()
  return verifier.verify(publicKey, signature, 'base64')
}

function formatMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(2)
}

function normalizeConfig(paymentConfig) {
  const raw = paymentConfig?.config_json || {}
  const decrypted = databaseEncryption.decryptSensitiveFields(raw)
  return decrypted && typeof decrypted === 'object' ? decrypted : {}
}

function pickMerchantPrivateKey(cfg) {
  return (
    cfg.merchant_private_key ||
    cfg.private_key ||
    cfg.rsa_private_key ||
    cfg.privateKey ||
    cfg.merchantPrivateKey ||
    ''
  )
}

function pickPlatformPublicKey(cfg) {
  return (
    cfg.platform_public_key ||
    cfg.public_key ||
    cfg.rsa_public_key ||
    cfg.publicKey ||
    cfg.platformPublicKey ||
    ''
  )
}

function resolveApiEndpoint(gatewayUrl, apiPath) {
  const raw = String(gatewayUrl || '').trim()
  if (!raw) return ''
  if (raw.includes('?')) return raw
  const base = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  return `${base}${path}`
}

async function createPaymentViaApiCreate({ order, service, paymentConfig, req, cfg }) {
  const endpoint = resolveApiEndpoint(cfg.gateway_url, '/api/pay/create')
  if (!endpoint) throw Object.assign(new Error('易支付配置缺少 gateway_url'), { statusCode: 400 })
  if (!cfg.pid) throw Object.assign(new Error('易支付配置缺少 pid'), { statusCode: 400 })

  const merchantPrivateKey = pickMerchantPrivateKey(cfg)
  const platformPublicKey = pickPlatformPublicKey(cfg)
  if (!merchantPrivateKey) throw Object.assign(new Error('易支付配置缺少 merchant_private_key'), { statusCode: 400 })
  if (!platformPublicKey) throw Object.assign(new Error('易支付配置缺少 platform_public_key'), { statusCode: 400 })

  const paymentTradeNo = order.payment_trade_no || `XS${order.id}${Date.now()}`

  const baseUrl = cfg.return_base_url ? String(cfg.return_base_url).trim() : buildBaseUrl(req)
  const notifyUrl = `${baseUrl}/api/payments/yipay/notify`
  // return_url 直接跳转到前端订单详情页面，不依赖易支付传递参数
  const returnUrl = `${baseUrl}/order/${order.id}`

  console.log('[yipay RSA] 创建支付:', { orderId: order.id, baseUrl, notifyUrl, returnUrl })

  const timestamp = String(Math.floor(Date.now() / 1000))
  const clientip = getClientIP(req)

  const params = {
    pid: String(cfg.pid).trim(),
    method: 'jump',
    type: cfg.pay_type ? String(cfg.pay_type).trim() : undefined,
    out_trade_no: paymentTradeNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: (service?.name || `Order#${order.id}`).toString().slice(0, 120),
    money: formatMoney(order.amount),
    clientip,
    timestamp,
    sign_type: 'RSA'
  }

  const content = buildSignContent(params)
  const sign = signRsaSha256(content, merchantPrivateKey)
  if (!sign) throw Object.assign(new Error('易支付签名失败：缺少或无效的商户私钥'), { statusCode: 400 })

  const body = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, sign })) {
    if (v === undefined || v === null || String(v) === '') continue
    body.set(k, String(v))
  }

  const response = await axios.post(endpoint, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
  })

  const data = response?.data || {}
  const code = Number(data.code)
  if (code !== 0) {
    const msg = data.msg ? String(data.msg) : '易支付下单失败'
    throw Object.assign(new Error(msg), { statusCode: 400, meta: data })
  }

  if (data.sign) {
    const verifyContent = buildSignContent(data)
    const ok = verifyRsaSha256(verifyContent, data.sign, platformPublicKey)
    if (!ok) throw Object.assign(new Error('易支付返回数据验签失败'), { statusCode: 400, meta: data })
  }

  const payType = String(data.pay_type || '').trim().toLowerCase()
  const payInfo = data.pay_info !== undefined && data.pay_info !== null ? String(data.pay_info).trim() : ''
  if (payType !== 'jump' || !payInfo) {
    throw Object.assign(new Error('易支付下单失败：未返回跳转链接（pay_type/pay_info）'), { statusCode: 400, meta: data })
  }

  return {
    paymentTradeNo,
    paymentProviderOrderId: data.trade_no ? String(data.trade_no) : null,
    paymentUrl: payInfo,
    meta: {
      provider: 'yipay',
      endpoint,
      pay_type: data.pay_type,
      trade_no: data.trade_no
    }
  }
}

async function createPayment({ order, service, paymentConfig, req }) {
  const cfg = normalizeConfig(paymentConfig)
  const merchantPrivateKey = pickMerchantPrivateKey(cfg)
  const platformPublicKey = pickPlatformPublicKey(cfg)
  const useRsa = !!(merchantPrivateKey && platformPublicKey)
  if (useRsa) {
    return createPaymentViaApiCreate({ order, service, paymentConfig, req, cfg })
  }

  const useLdc = isLdcEpay(cfg)
  const apiPath = cfg.api_path ? String(cfg.api_path) : useLdc ? '/pay/submit.php' : '/submit.php'
  const endpoint = resolveGatewayEndpoint(cfg.gateway_url, apiPath)
  if (!endpoint) throw Object.assign(new Error('易支付配置缺少 gateway_url'), { statusCode: 400 })
  if (!cfg.pid) throw Object.assign(new Error('易支付配置缺少 pid'), { statusCode: 400 })
  if (!cfg.key) throw Object.assign(new Error('易支付配置缺少 key'), { statusCode: 400 })

  const paymentTradeNo = order.payment_trade_no || `XS${order.id}${Date.now()}`

  const baseUrl = cfg.return_base_url ? String(cfg.return_base_url).trim() : buildBaseUrl(req)
  const notifyUrl = `${baseUrl}/api/payments/yipay/notify`
  // LDC 平台的 return_url 参数不会覆盖控制台配置
  // 标准易支付的 return_url 会生效
  // 统一使用前端支付结果页，前端会从 localStorage 读取订单ID
  const returnUrl = `${baseUrl}/payment-result`

  console.log('[yipay MD5] 创建支付:', { orderId: order.id, baseUrl, notifyUrl, returnUrl, useLdc })

  const params = {
    pid: String(cfg.pid).trim(),
    type: cfg.pay_type ? String(cfg.pay_type).trim() : useLdc ? 'epay' : undefined,
    out_trade_no: paymentTradeNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: (service?.name || `Order#${order.id}`).toString().slice(0, 120),
    money: formatMoney(order.amount),
    sign_type: 'MD5'
  }

  const sign = computeMd5Sign(params, cfg.key)
  const finalParams = { ...params, sign }

  const submitMethod = String(cfg.submit_method || '').trim().toUpperCase()
  const forcePost = cfg.force_submit_post === true || submitMethod === 'POST' || useLdc

  if (forcePost) {
    const body = new URLSearchParams()
    for (const [k, v] of Object.entries(finalParams)) {
      if (v === undefined || v === null || String(v) === '') continue
      body.set(k, String(v))
    }

    const response = await axios.post(endpoint, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    })

    const location = response?.headers?.location ? String(response.headers.location).trim() : ''
    if (!location) {
      const data = response?.data
      const msg =
        data && typeof data === 'object' && data.error_msg ? String(data.error_msg) : '易支付下单失败：未返回跳转地址'
      throw Object.assign(new Error(msg), { statusCode: 400, meta: data })
    }

    return {
      paymentTradeNo,
      paymentUrl: location,
      meta: {
        provider: 'yipay',
        endpoint,
        submit_method: 'POST'
      }
    }
  }

  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(finalParams)) {
    if (v === undefined || v === null || String(v) === '') continue
    query.set(k, String(v))
  }

  return {
    paymentTradeNo,
    paymentUrl: `${endpoint}?${query.toString()}`,
    meta: {
      provider: 'yipay',
      endpoint,
      submit_method: 'GET'
    }
  }
}

function verifyNotify({ payload, paymentConfig }) {
  const cfg = normalizeConfig(paymentConfig)
  const sign = pickValue(payload?.sign)
  if (!sign) return false

  const signType = pickValue(payload?.sign_type).toUpperCase()

  const platformPublicKey = pickPlatformPublicKey(cfg)
  const rsaReady = !!platformPublicKey

  if ((signType === 'RSA' || signType === 'SHA256WITHRSA') && rsaReady) {
    const content = buildSignContent(payload)
    return verifyRsaSha256(content, sign, platformPublicKey)
  }

  if (!cfg.key) return false
  const expected = computeMd5Sign(payload, cfg.key)
  return String(sign).toLowerCase() === String(expected).toLowerCase()
}

module.exports = { createPayment, verifyNotify }
