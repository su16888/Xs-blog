const Order = require('../models/Order')
const Service = require('../models/Service')
const PaymentConfig = require('../models/PaymentConfig')
const Card = require('../models/Card')
const { sequelize } = require('../config/database')
const { allocateCardForOrder } = require('./orderFulfillmentService')
const { getBoolSetting } = require('../utils/settings')
const {
  sendOrderPaidAdminNotification,
  sendBuyerPaidNotification
} = require('../utils/email')

async function markOrderPaid({
  orderId,
  paymentGateway = null,
  paymentTradeNo = null,
  paymentProviderOrderId = null,
  paymentUrl = null,
  paymentMeta = null,
  paidAt = null
}) {
  const notifyAdmin = await getBoolSetting('orderNotifyAdminOnPaid', false)
  const notifyBuyer = await getBoolSetting('orderNotifyBuyerOnPaid', false)

  let allocatedCard = null
  const paidAtValue = paidAt ? new Date(paidAt) : new Date()

  try {
    await sequelize.transaction(async (t) => {
      // 使用行锁查询订单，防止并发更新
      const order = await Order.findByPk(orderId, {
        include: [{ model: Service, as: 'service' }],
        lock: t.LOCK.UPDATE,
        transaction: t
      })

      if (!order) {
        throw Object.assign(new Error('订单不存在'), { statusCode: 404 })
      }
      if (order.status === 'canceled') {
        throw Object.assign(new Error('订单已取消'), { statusCode: 400 })
      }
      if (order.payment_status === 'paid') {
        throw Object.assign(new Error('订单已是已支付状态'), { statusCode: 400 })
      }

      const service = order.service
      const productType = service?.product_type || 'virtual'

      await order.update(
        {
          status: 'paid',
          payment_status: 'paid',
          paid_at: paidAtValue,
          payment_gateway: paymentGateway || order.payment_gateway,
          payment_trade_no: paymentTradeNo || order.payment_trade_no,
          payment_provider_order_id: paymentProviderOrderId || order.payment_provider_order_id,
          payment_url: paymentUrl || order.payment_url,
          payment_meta: paymentMeta !== undefined ? paymentMeta : order.payment_meta,
          shipping_status: productType === 'physical' ? (order.shipping_status || 'unshipped') : order.shipping_status
        },
        { transaction: t }
      )

      if (productType === 'card') {
        const card = await allocateCardForOrder({ orderId: order.id, serviceId: order.service_id, transaction: t })
        if (!card) {
          throw Object.assign(new Error('无可用卡密，无法发货'), { statusCode: 400 })
        }
        allocatedCard = card
      }

      await Service.increment('stock_sold', { by: 1, where: { id: order.service_id }, transaction: t })
    })
  } catch (e) {
    if (e?.statusCode) return { ok: false, statusCode: e.statusCode, message: e.message }
    throw e
  }

  const fresh = await Order.findByPk(orderId, {
    include: [
      { model: Service, as: 'service' },
      { model: PaymentConfig, as: 'paymentConfig' },
      { model: Card, as: 'cards' }
    ]
  })

  if (notifyAdmin) {
    sendOrderPaidAdminNotification(fresh, fresh.service).catch(() => {})
  }

  if (notifyBuyer) {
    const productType = fresh.service?.product_type || 'virtual'
    const cards = productType === 'card' ? (fresh.cards || []) : []
    sendBuyerPaidNotification(fresh, fresh.service, cards).catch(() => {})
  }

  return { ok: true, order: fresh, allocatedCardId: allocatedCard?.id || null }
}

module.exports = { markOrderPaid }
