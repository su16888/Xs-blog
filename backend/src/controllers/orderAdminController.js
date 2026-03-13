const Order = require('../models/Order')
const Service = require('../models/Service')
const PaymentConfig = require('../models/PaymentConfig')
const Card = require('../models/Card')
const { sequelize } = require('../config/database')
const {
  sendBuyerShippedNotification
} = require('../utils/email')
const { Op } = require('sequelize')
const { getBoolSetting } = require('../utils/settings')
const { markOrderPaid } = require('../services/orderPaymentService')

function formatOrderNo(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date()
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yy}${mm}${dd}${hh}${mi}${ss}`
}

exports.getOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      service_id,
      payment_config_id,
      search
    } = req.query

    const where = {}

    if (status) where.status = status
    if (payment_status) where.payment_status = payment_status
    if (service_id) where.service_id = Number(service_id)
    if (payment_config_id) where.payment_config_id = Number(payment_config_id)

    if (search) {
      where[Op.or] = [
        { buyer_name: { [Op.like]: `%${search}%` } },
        { buyer_contact: { [Op.like]: `%${search}%` } }
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const offset = (pageNum - 1) * limitNum

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name']
        },
        {
          model: PaymentConfig,
          as: 'paymentConfig',
          attributes: ['id', 'name', 'provider_key', 'is_enabled']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    })

    const normalizedRows = rows.map((row) => {
      const data = typeof row.toJSON === 'function' ? row.toJSON() : row
      return { ...data, order_no: formatOrderNo(data.created_at) }
    })

    res.json({
      success: true,
      data: {
        orders: normalizedRows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum)
        }
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params
    const order = await Order.findByPk(id, {
      include: [
        { model: Service, as: 'service' },
        { model: PaymentConfig, as: 'paymentConfig' },
        { model: Card, as: 'cards' }
      ]
    })

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    const data = typeof order.toJSON === 'function' ? order.toJSON() : order
    res.json({ success: true, data: { ...data, order_no: formatOrderNo(data.created_at) } })
  } catch (error) {
    next(error)
  }
}

exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, payment_status, cancel_reason, expired_at, payment_config_id } = req.body

    const order = await Order.findByPk(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    if (status !== undefined || payment_status !== undefined) {
      return res.status(400).json({ success: false, message: '请使用订单动作接口更新状态' })
    }

    await order.update({
      cancel_reason: cancel_reason !== undefined ? (cancel_reason || null) : order.cancel_reason,
      expired_at: expired_at !== undefined ? (expired_at ? new Date(expired_at) : null) : order.expired_at,
      payment_config_id: payment_config_id !== undefined ? payment_config_id : order.payment_config_id
    })

    res.json({ success: true, message: '更新成功', data: order })
  } catch (error) {
    next(error)
  }
}

exports.markPaid = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await markOrderPaid({ orderId: Number(id), paymentGateway: 'admin' })
    if (!result.ok) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message || '操作失败' })
    }
    res.json({
      success: true,
      message: '已标记为已支付',
      data: result.order,
      allocated_card_id: result.allocatedCardId || null
    })
  } catch (error) {
    next(error)
  }
}

exports.cancel = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = req.params
    const { cancel_reason } = req.body
    const reason = (cancel_reason || '管理员取消').toString().trim()

    const order = await Order.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    if (order.status === 'completed') {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '已完成订单不可取消' })
    }
    if (order.payment_status === 'paid') {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '已支付订单请先退款后再取消' })
    }
    if (order.status === 'canceled') {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '订单已取消' })
    }

    const service = await Service.findByPk(order.service_id, { transaction, lock: transaction.LOCK.UPDATE })
    await order.update({ status: 'canceled', cancel_reason: reason }, { transaction })
    if (service && service.product_type !== 'card') {
      await service.increment('stock_total', { by: 1, transaction })
    }

    await transaction.commit()
    res.json({ success: true, message: '订单已取消', data: order })
  } catch (error) {
    try { await transaction.rollback() } catch {}
    next(error)
  }
}

exports.complete = async (req, res, next) => {
  try {
    const { id } = req.params
    const order = await Order.findByPk(id, { include: [{ model: Service, as: 'service' }] })
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.status === 'canceled') return res.status(400).json({ success: false, message: '订单已取消' })
    if (order.status === 'completed') return res.status(400).json({ success: false, message: '订单已完成' })
    if (order.payment_status !== 'paid') return res.status(400).json({ success: false, message: '未支付订单不可完成' })

    const productType = order.service?.product_type || 'virtual'
    if (productType === 'physical' && order.shipping_status !== 'shipped') {
      return res.status(400).json({ success: false, message: '实物订单需已发货后才可完成' })
    }

    await order.update({ status: 'completed' })
    res.json({ success: true, message: '订单已完成', data: order })
  } catch (error) {
    next(error)
  }
}

exports.ship = async (req, res, next) => {
  try {
    const { id } = req.params
    const { tracking_no } = req.body
    const trackingNo = (tracking_no || '').toString().trim()
    if (!trackingNo) return res.status(400).json({ success: false, message: '请输入快递单号' })

    const notifyBuyerShipping = await getBoolSetting('orderNotifyBuyerOnShipping', false)

    const order = await Order.findByPk(id, { include: [{ model: Service, as: 'service' }] })
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.payment_status !== 'paid') return res.status(400).json({ success: false, message: '未支付订单不可发货' })
    if (order.status === 'canceled') return res.status(400).json({ success: false, message: '订单已取消' })

    const productType = order.service?.product_type || 'virtual'
    if (productType !== 'physical') return res.status(400).json({ success: false, message: '仅实物订单支持发货' })

    await order.update({
      shipping_status: 'shipped',
      tracking_no: trackingNo,
      shipped_at: new Date()
    })

    if (notifyBuyerShipping) {
      sendBuyerShippedNotification(order, order.service).catch(() => {})
    }

    res.json({ success: true, message: '已标记为已发货', data: order })
  } catch (error) {
    next(error)
  }
}

exports.deleteOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = req.params
    const order = await Order.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    const service = await Service.findByPk(order.service_id, { transaction, lock: transaction.LOCK.UPDATE })

    if (order.payment_status === 'paid') {
      const deletedCards = await Card.destroy({ where: { bind_order_id: order.id }, transaction })
      if (service && service.product_type === 'card' && deletedCards > 0) {
        const remaining = await Card.count({ where: { service_id: order.service_id, bind_order_id: null, card_status: 'unused' }, transaction })
        await service.update({ stock_total: remaining }, { transaction })
      }
    } else {
      await Card.update(
        { bind_order_id: null, card_status: 'unused' },
        { where: { bind_order_id: order.id }, transaction }
      )
      if (service && service.product_type === 'card') {
        const remaining = await Card.count({ where: { service_id: order.service_id, bind_order_id: null, card_status: 'unused' }, transaction })
        await service.update({ stock_total: remaining }, { transaction })
      }
      if (service && service.product_type !== 'card') {
        await service.increment('stock_total', { by: 1, transaction })
      }
    }

    await order.destroy({ transaction })
    await transaction.commit()
    res.json({ success: true, message: '删除成功', data: { id: Number(id) } })
  } catch (error) {
    try { await transaction.rollback() } catch {}
    next(error)
  }
}

exports.bulkDeleteOrders = async (req, res, next) => {
  try {
    const { action, confirm_token } = req.body || {}

    if (!action) {
      return res.status(400).json({ success: false, message: '缺少 action' })
    }

    // 验证 confirm_token（前端会自动传递正确的 token）
    const expectedTokens = {
      unpaid: 'DELETE_UNPAID_ORDERS',
      paid: 'DELETE_PAID_ORDERS',
      all: 'DELETE_ALL_ORDERS'
    }

    if (confirm_token !== expectedTokens[action]) {
      return res.status(400).json({ success: false, message: '确认信息不正确，请刷新页面重试' })
    }

    if (action === 'unpaid') {
      const transaction = await sequelize.transaction()
      try {

        const unpaidOrders = await Order.findAll({
          where: { payment_status: 'unpaid', status: { [Op.in]: ['pending', 'canceled'] } },
          attributes: ['id', 'service_id'],
          transaction,
          lock: transaction.LOCK.UPDATE
        })
        const orderIds = unpaidOrders.map((o) => o.id)
        const countsByServiceId = unpaidOrders.reduce((acc, o) => {
          const sid = o.service_id
          if (!sid) return acc
          acc[sid] = (acc[sid] || 0) + 1
          return acc
        }, {})

        const resetCards = orderIds.length
          ? await Card.update(
              { bind_order_id: null, card_status: 'unused' },
              { where: { bind_order_id: { [Op.in]: orderIds } }, transaction }
            )
          : [0]

        if (orderIds.length) {
          const affectedOrders = await Order.findAll({
            where: { id: { [Op.in]: orderIds } },
            attributes: ['service_id'],
            group: ['service_id'],
            transaction
          })
          const serviceIds = affectedOrders.map((o) => o.service_id).filter(Boolean)
          for (const serviceId of serviceIds) {
            const service = await Service.findByPk(serviceId, { transaction })
            if (service && service.product_type === 'card') {
              const remaining = await Card.count({
                where: { service_id: serviceId, bind_order_id: null, card_status: 'unused' },
                transaction
              })
              await service.update({ stock_total: remaining }, { transaction })
            }
            if (service && service.product_type !== 'card') {
              const incBy = countsByServiceId[serviceId] || 0
              if (incBy > 0) {
                await service.increment('stock_total', { by: incBy, transaction })
              }
            }
          }
        }

        const deleted = await Order.destroy({
          where: { payment_status: 'unpaid', status: { [Op.in]: ['pending', 'canceled'] } },
          transaction
        })
        await transaction.commit()
        return res.json({
          success: true,
          message: '删除成功',
          data: { deleted, reset_cards: resetCards?.[0] ?? 0 }
        })
      } catch (error) {
        try {
          await transaction.rollback()
        } catch {}
        return next(error)
      }
    }

    if (action === 'paid') {
      const transaction = await sequelize.transaction()
      try {
        const paidOrders = await Order.findAll({
          where: {
            payment_status: 'paid',
            status: { [Op.in]: ['paid', 'completed'] }
          },
          attributes: ['id', 'service_id'],
          transaction,
          lock: transaction.LOCK.UPDATE
        })

        const orderIds = paidOrders.map((o) => o.id)
        if (orderIds.length === 0) {
          await transaction.commit()
          return res.json({ success: true, message: '没有可删除的已支付订单', data: { deleted: 0 } })
        }

        const deletedCards = await Card.destroy({
          where: { bind_order_id: { [Op.in]: orderIds } },
          transaction
        })

        const affectedOrders = await Order.findAll({
          where: { id: { [Op.in]: orderIds } },
          attributes: ['service_id'],
          group: ['service_id'],
          transaction
        })
        const serviceIds = affectedOrders.map((o) => o.service_id).filter(Boolean)
        for (const serviceId of serviceIds) {
          const service = await Service.findByPk(serviceId, { transaction })
          if (service && service.product_type === 'card') {
            const remaining = await Card.count({
              where: { service_id: serviceId, bind_order_id: null, card_status: 'unused' },
              transaction
            })
            await service.update({ stock_total: remaining }, { transaction })
          }
        }

        const deleted = await Order.destroy({
          where: {
            id: { [Op.in]: orderIds }
          },
          transaction
        })

        await transaction.commit()
        return res.json({
          success: true,
          message: '删除成功',
          data: { deleted, deleted_cards: deletedCards }
        })
      } catch (error) {
        try {
          await transaction.rollback()
        } catch {}
        return next(error)
      }
    }

    if (action === 'all') {
      const transaction = await sequelize.transaction()
      try {
        const resetCards = await Card.update(
          { bind_order_id: null, card_status: 'unused' },
          { where: { bind_order_id: { [Op.ne]: null } }, transaction }
        )

        const cardServices = await Service.findAll({
          where: { product_type: 'card' },
          attributes: ['id'],
          transaction
        })
        for (const svc of cardServices) {
          const remaining = await Card.count({
            where: { service_id: svc.id, bind_order_id: null, card_status: 'unused' },
            transaction
          })
          await Service.update({ stock_total: remaining }, { where: { id: svc.id }, transaction })
        }

        const deleted = await Order.destroy({ where: {}, transaction })
        await transaction.commit()
        return res.json({
          success: true,
          message: '删除成功',
          data: { deleted, reset_cards: resetCards?.[0] ?? 0 }
        })
      } catch (error) {
        try {
          await transaction.rollback()
        } catch {}
        return next(error)
      }
    }

    return res.status(400).json({ success: false, message: '未知 action' })
  } catch (error) {
    next(error)
  }
}
