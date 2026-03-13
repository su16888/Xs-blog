const { Op } = require('sequelize')

const Order = require('../models/Order')
const Service = require('../models/Service')
const Card = require('../models/Card')
const { sequelize } = require('../config/database')

function getExpireMinutes() {
  const raw = String(process.env.ORDER_EXPIRE_MINUTES || '').trim()
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  return 5
}

async function cancelExpiredUnpaidOrdersOnce() {
  const transaction = await sequelize.transaction()
  try {
    const now = new Date()
    const expireMinutes = getExpireMinutes()
    const threshold = new Date(Date.now() - expireMinutes * 60 * 1000)

    const expiredOrders = await Order.findAll({
      where: {
        payment_status: 'unpaid',
        status: 'pending',
        created_at: { [Op.lte]: threshold }
      },
      attributes: ['id', 'service_id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    const orderIds = expiredOrders.map((o) => o.id)
    if (orderIds.length === 0) {
      await transaction.commit()
      return { canceled: 0, restored_stock: 0 }
    }

    const countsByServiceId = expiredOrders.reduce((acc, o) => {
      const sid = o.service_id
      if (!sid) return acc
      acc[sid] = (acc[sid] || 0) + 1
      return acc
    }, {})

    await Order.update(
      {
        status: 'canceled',
        cancel_reason: '超时未支付自动取消',
        expired_at: now
      },
      { where: { id: { [Op.in]: orderIds }, payment_status: 'unpaid', status: 'pending' }, transaction }
    )

    await Card.update(
      { bind_order_id: null, card_status: 'unused' },
      { where: { bind_order_id: { [Op.in]: orderIds } }, transaction }
    )

    const serviceIds = Object.keys(countsByServiceId).map((v) => Number(v)).filter((n) => Number.isFinite(n))
    let restoredStock = 0
    for (const serviceId of serviceIds) {
      const service = await Service.findByPk(serviceId, { transaction })
      if (!service) continue
      if (service.product_type === 'card') continue
      const incBy = countsByServiceId[serviceId] || 0
      if (incBy > 0) {
        restoredStock += incBy
        await service.increment('stock_total', { by: incBy, transaction })
      }
    }

    await transaction.commit()
    return { canceled: orderIds.length, restored_stock: restoredStock }
  } catch (error) {
    try {
      await transaction.rollback()
    } catch {}
    throw error
  }
}

exports.cancelExpiredUnpaidOrdersOnce = cancelExpiredUnpaidOrdersOnce

exports.startOrderAutoCancelScheduler = () => {
  const enabled = String(process.env.ORDER_AUTO_CANCEL_ENABLED || '').trim().toLowerCase()
  if (enabled === 'false' || enabled === '0' || enabled === 'no') return

  const intervalMs = 60 * 1000

  cancelExpiredUnpaidOrdersOnce().catch(() => {})
  setInterval(() => {
    cancelExpiredUnpaidOrdersOnce().catch(() => {})
  }, intervalMs)
}
