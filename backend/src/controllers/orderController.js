const Order = require('../models/Order')
const Service = require('../models/Service')
const PaymentConfig = require('../models/PaymentConfig')
const Card = require('../models/Card')
const { sequelize } = require('../config/database')
const { getClientIP } = require('../utils/ipHelper')
const { Op } = require('sequelize')
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

exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { service_id, buyer_name, buyer_contact, buyer_email, buyer_phone, buyer_address, payment_config_id } = req.body
    if (!service_id) {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '缺少服务ID' })
    }
    const service = await Service.findByPk(service_id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!service || service.is_visible === false) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: '服务不存在或不可见' })
    }
    const rawPrice = String(service.price ?? '').trim()
    const normalizedPrice = rawPrice.replace(/[^\d.]/g, '')
    const priceNum = normalizedPrice ? parseFloat(normalizedPrice) : 0
    if (Number.isNaN(priceNum) || priceNum < 0) {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '服务价格无效' })
    }

    const productType = service.product_type || 'virtual'
    const emailValue = String(buyer_email ?? '').trim()
    const phoneValue = String(buyer_phone ?? '').trim()
    const addressValue = String(buyer_address ?? '').trim()
    const nameValue = String(buyer_name ?? '').trim()
    const contactValue = String(buyer_contact ?? '').trim()

    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '邮箱格式不正确' })
    }

    if (productType === 'card') {
      if (!emailValue) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '请填写邮箱（用于卡密发货与提醒）' })
      }
    }

    if (productType === 'physical') {
      if (!nameValue) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '请填写称呼' })
      }
      if (!phoneValue) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '请填写手机号' })
      }
      if (!addressValue) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '请填写收货地址' })
      }
      if (!emailValue) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '请填写邮箱（用于快递单号通知）' })
      }
    }

    if (productType === 'card') {
      const availableCount = await Card.count({
        where: { service_id: service_id, bind_order_id: null, card_status: 'unused' },
        transaction
      })
      if (availableCount <= 0) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '库存不足' })
      }
    } else {
      const remaining = Number(service.stock_total ?? 0)
      if (remaining <= 0) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '库存不足' })
      }
    }

    const ip_address = getClientIP(req)
    const user_agent = req.get('User-Agent')
    if (process.env.NODE_ENV === 'production') {
      const recentSince = new Date(Date.now() - 5 * 60 * 1000)
      const recentCount = await Order.count({
        where: {
          ip_address,
          service_id,
          created_at: { [Op.gt]: recentSince }
        }
      })
      if (recentCount >= 3) {
        await transaction.rollback()
        return res.status(429).json({ success: false, message: '下单过于频繁，请稍后再试' })
      }
    }

    const selectedPaymentConfigId = service.payment_config_id ?? (payment_config_id ?? null)
    if (selectedPaymentConfigId !== null && selectedPaymentConfigId !== undefined) {
      const paymentConfig = await PaymentConfig.findByPk(selectedPaymentConfigId, { transaction })
      if (!paymentConfig || paymentConfig.is_enabled === false) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: '支付配置不可用' })
      }
    }

    const order = await Order.create({
      service_id,
      amount: priceNum,
      status: 'pending',
      buyer_name: nameValue || null,
      buyer_contact: contactValue || null,
      buyer_email: emailValue || null,
      buyer_phone: phoneValue || null,
      buyer_address: addressValue || null,
      payment_config_id: selectedPaymentConfigId,
      payment_status: 'unpaid',
      ip_address,
      user_agent,
      shipping_status: productType === 'physical' ? 'unshipped' : null,
      tracking_no: null,
      shipped_at: null,
      expired_at: priceNum > 0 ? new Date(Date.now() + 5 * 60 * 1000) : null
    }, { transaction })

    if (productType !== 'card') {
      await service.decrement('stock_total', { by: 1, transaction })
    }

    await transaction.commit()

    if (priceNum === 0) {
      try {
        const paid = await markOrderPaid({ orderId: order.id, paymentGateway: 'system', paidAt: new Date() })
        if (paid.ok) {
          return res.status(201).json({
            success: true,
            message: '订单创建成功（系统支付）',
            data: {
              id: paid.order.id,
              order_no: formatOrderNo(paid.order.created_at),
              status: paid.order.status,
              payment_status: paid.order.payment_status,
              payment_gateway: paid.order.payment_gateway,
              paid_at: paid.order.paid_at,
              payment_url: null
            }
          })
        }
      } catch (e) {}
    }

    const payment_url = service.order_button_url || null
    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: {
        id: order.id,
        order_no: formatOrderNo(order.created_at),
        status: order.status,
        payment_status: order.payment_status,
        payment_gateway: order.payment_gateway,
        payment_url
      }
    })
  } catch (error) {
    try {
      await transaction.rollback()
    } catch {}
    next(error)
  }
}

exports.cancelOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = req.params
    const { buyer_contact, cancel_reason } = req.body || {}
    if (!buyer_contact) {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '缺少联系方式' })
    }

    const order = await Order.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    if (order.status !== 'pending') {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '订单当前状态不可取消' })
    }
    if (order.payment_status && order.payment_status !== 'unpaid') {
      await transaction.rollback()
      return res.status(400).json({ success: false, message: '订单已支付，无法取消' })
    }

    const ip_address = getClientIP(req)
    if (order.ip_address && ip_address && order.ip_address !== ip_address) {
      await transaction.rollback()
      return res.status(403).json({ success: false, message: '无权限取消该订单' })
    }
    if (order.buyer_contact && order.buyer_contact !== buyer_contact) {
      await transaction.rollback()
      return res.status(403).json({ success: false, message: '无权限取消该订单' })
    }

    const recentCancelSince = new Date(Date.now() - 10 * 60 * 1000)
    const recentCancelCount = await Order.count({
      where: {
        ip_address,
        status: 'canceled',
        updated_at: { [Op.gt]: recentCancelSince }
      }
    })
    if (recentCancelCount >= 5) {
      await transaction.rollback()
      return res.status(429).json({ success: false, message: '取消过于频繁，请稍后再试' })
    }

    const service = await Service.findByPk(order.service_id, { transaction, lock: transaction.LOCK.UPDATE })

    await order.update({
      status: 'canceled',
      cancel_reason: cancel_reason || '用户取消'
    }, { transaction })

    if (service && service.product_type !== 'card') {
      await service.increment('stock_total', { by: 1, transaction })
    }

    await transaction.commit()
    res.json({ success: true, message: '订单已取消', data: { id: order.id } })
  } catch (error) {
    try { await transaction.rollback() } catch {}
    next(error)
  }
}

// 公开查询订单状态（用于前端轮询支付结果）
exports.getOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const orderId = Number(id)

    if (!orderId || !Number.isFinite(orderId)) {
      return res.status(400).json({ success: false, message: '订单ID无效' })
    }

    const order = await Order.findByPk(orderId, {
      attributes: ['id', 'status', 'payment_status', 'payment_gateway', 'paid_at', 'created_at'],
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'product_type', 'order_page_slug']
        },
        {
          model: Card,
          as: 'cards',
          attributes: ['id', 'card_code', 'card_status'],
          required: false
        }
      ]
    })

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    // 简单的 IP 校验（可选，防止恶意查询）
    const ip_address = getClientIP(req)
    // 这里不做严格校验，只返回基本信息

    const isPaid = order.payment_status === 'paid'
    const productType = order.service?.product_type || 'virtual'

    // 构建返回数据
    const responseData = {
      id: order.id,
      order_no: formatOrderNo(order.created_at),
      status: order.status,
      payment_status: order.payment_status,
      payment_gateway: order.payment_gateway,
      paid_at: order.paid_at,
      service_name: order.service?.name || null,
      product_type: productType,
      service_slug: order.service?.order_page_slug || null
    }

    // 如果已支付且是卡密类型，返回卡密信息
    if (isPaid && productType === 'card' && order.cards && order.cards.length > 0) {
      responseData.cards = order.cards.map(card => ({
        id: card.id,
        card_code: card.card_code,
        card_status: card.card_status
      }))
    }

    res.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    next(error)
  }
}
