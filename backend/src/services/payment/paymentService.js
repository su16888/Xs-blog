const PaymentConfig = require('../../models/PaymentConfig')
const Order = require('../../models/Order')
const Service = require('../../models/Service')
const yipay = require('./providers/yipay')
const paypal = require('./providers/paypal')
const { markOrderPaid } = require('../orderPaymentService')

function normalizeProviderType(paymentConfig) {
  const raw = (paymentConfig?.provider_type || paymentConfig?.provider_key || '').toString().trim().toLowerCase()
  if (raw === 'yipay' || raw === 'pay_yipay' || raw === 'epay' || raw === 'easypay') return 'yipay'
  if (raw === 'paypal') return 'paypal'
  return raw
}

function pickProvider(providerType) {
  if (providerType === 'yipay') return yipay
  if (providerType === 'paypal') return paypal
  return null
}

async function createPaymentForOrder({ orderId, req }) {
  const order = await Order.findByPk(orderId, { include: [{ model: Service, as: 'service' }] })
  if (!order) return { ok: false, statusCode: 404, message: '订单不存在' }
  if (order.status === 'canceled') return { ok: false, statusCode: 400, message: '订单已取消' }
  if (order.payment_status === 'paid') return { ok: false, statusCode: 400, message: '订单已支付' }

  if (Number(order.amount) === 0) {
    const paid = await markOrderPaid({ orderId: order.id, paymentGateway: 'system', paidAt: new Date() })
    if (!paid.ok) return { ok: false, statusCode: paid.statusCode || 400, message: paid.message || '系统支付失败' }
    return {
      ok: true,
      order: paid.order,
      paymentUrl: null,
      paymentTradeNo: paid.order.payment_trade_no || null,
      paymentGateway: 'system'
    }
  }
  if (!order.payment_config_id) return { ok: false, statusCode: 400, message: '该订单未绑定支付方式' }

  const paymentConfig = await PaymentConfig.findByPk(order.payment_config_id)
  if (!paymentConfig || paymentConfig.is_enabled === false) {
    return { ok: false, statusCode: 400, message: '支付配置不可用' }
  }

  const providerType = normalizeProviderType(paymentConfig)
  const provider = pickProvider(providerType)
  if (!provider) return { ok: false, statusCode: 400, message: `不支持的支付渠道：${providerType || 'unknown'}` }

  // 调用支付提供商创建支付
  let result
  try {
    result = await provider.createPayment({ order, service: order.service, paymentConfig, req })
  } catch (err) {
    console.error(`[createPaymentForOrder] 创建支付失败: ${err.message}`, { orderId, providerType })
    const message = err?.statusCode ? err.message : '创建支付链接失败，请稍后重试'
    return { ok: false, statusCode: err?.statusCode || 500, message }
  }

  if (!result || !result.paymentUrl) {
    return { ok: false, statusCode: 500, message: '支付渠道未返回有效的支付链接' }
  }

  await order.update({
    payment_gateway: providerType,
    payment_trade_no: result.paymentTradeNo || order.payment_trade_no,
    payment_provider_order_id: result.paymentProviderOrderId || order.payment_provider_order_id,
    payment_url: result.paymentUrl || order.payment_url,
    payment_meta: result.meta !== undefined ? result.meta : order.payment_meta
  })

  return {
    ok: true,
    order,
    paymentUrl: order.payment_url,
    paymentTradeNo: order.payment_trade_no,
    paymentGateway: providerType
  }
}

module.exports = { createPaymentForOrder, normalizeProviderType }
