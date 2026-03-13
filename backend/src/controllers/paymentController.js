const Order = require('../models/Order')
const PaymentConfig = require('../models/PaymentConfig')
const Service = require('../models/Service')
const { createPaymentForOrder, normalizeProviderType } = require('../services/payment/paymentService')
const { markOrderPaid } = require('../services/orderPaymentService')
const yipay = require('../services/payment/providers/yipay')
const paypal = require('../services/payment/providers/paypal')

// 生成支付结果 HTML 页面
function renderPaymentResultHtml({ title, orderId, message, extra = '' }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; }
    h2 { color: #333; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; margin: 8px 0; }
    .order-id { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .success { color: #22c55e; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  ${orderId ? `<p>订单号：<span class="order-id">${orderId}</span></p>` : ''}
  ${message ? `<p>${message}</p>` : ''}
  ${extra}
  <p style="margin-top: 24px; font-size: 14px; color: #999;">如有疑问，请返回原页面查看订单状态或联系客服。</p>
</body>
</html>`
}

function pickCallbackPayload(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (Object.keys(body).length > 0) return body
  const query = req.query && typeof req.query === 'object' ? req.query : {}
  return query
}

exports.createOrderPayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await createPaymentForOrder({ orderId: Number(id), req })
    if (!result.ok) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message || '创建支付失败' })
    }
    res.json({
      success: true,
      data: {
        order_id: result.order.id,
        payment_gateway: result.paymentGateway,
        payment_trade_no: result.paymentTradeNo,
        payment_url: result.paymentUrl
      }
    })
  } catch (error) {
    next(error)
  }
}

// 易支付异步通知（服务器对服务器）
exports.yipayNotify = async (req, res) => {
  try {
    const payload = pickCallbackPayload(req)
    console.log('[yipayNotify] 收到通知:', JSON.stringify(payload))

    const outTradeNo = String(payload.out_trade_no || '').trim()

    // 缺少订单号，返回 fail 让平台重试
    if (!outTradeNo) {
      console.warn('[yipayNotify] 缺少 out_trade_no')
      return res.status(200).send('fail')
    }

    const order = await Order.findOne({
      where: { payment_trade_no: outTradeNo },
      include: [{ model: Service, as: 'service' }]
    })

    if (!order) {
      console.warn(`[yipayNotify] 订单不存在: ${outTradeNo}`)
      return res.status(200).send('fail')
    }

    console.log(`[yipayNotify] 找到订单: id=${order.id}, payment_status=${order.payment_status}`)

    // 订单已支付，直接返回成功
    if (order.payment_status === 'paid') {
      return res.status(200).send('success')
    }

    const paymentConfig = order.payment_config_id ? await PaymentConfig.findByPk(order.payment_config_id) : null
    if (!paymentConfig) {
      console.warn(`[yipayNotify] 支付配置不存在: order=${order.id}`)
      return res.status(200).send('fail')
    }

    if (paymentConfig.is_enabled === false) {
      console.warn(`[yipayNotify] 支付配置已禁用: config=${paymentConfig.id}`)
      return res.status(200).send('fail')
    }

    const providerType = normalizeProviderType(paymentConfig)
    console.log(`[yipayNotify] 支付渠道: ${providerType}`)

    if (providerType !== 'yipay') {
      console.warn(`[yipayNotify] 支付渠道不匹配: expected=yipay, got=${providerType}`)
      return res.status(200).send('fail')
    }

    // 验签
    const signOk = yipay.verifyNotify({ payload, paymentConfig })
    console.log(`[yipayNotify] 验签结果: ${signOk}`)

    if (!signOk) {
      console.warn(`[yipayNotify] 验签失败: order=${order.id}, sign=${payload.sign}, sign_type=${payload.sign_type}`)
      return res.status(200).send('fail')
    }

    // 检查交易状态
    const tradeStatus = String(payload.trade_status || '').trim().toUpperCase()
    console.log(`[yipayNotify] 交易状态: ${tradeStatus}`)

    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      // 非成功状态，返回 success 表示已收到通知
      console.log(`[yipayNotify] 交易状态非成功: ${tradeStatus}, order=${order.id}`)
      return res.status(200).send('success')
    }

    // 验证金额
    const money = Number(payload.money)
    const amount = Number(order.amount)
    if (Number.isFinite(money) && Number.isFinite(amount)) {
      const diff = Math.abs(money - amount)
      if (diff > 0.01) {
        console.warn(`[yipayNotify] 金额不匹配: expected=${amount}, got=${money}, order=${order.id}`)
        return res.status(200).send('fail')
      }
    }

    // 标记订单已支付
    const result = await markOrderPaid({
      orderId: order.id,
      paymentGateway: 'yipay',
      paymentTradeNo: outTradeNo,
      paymentProviderOrderId: payload.trade_no ? String(payload.trade_no) : null,
      paymentMeta: payload,
      paidAt: new Date()
    })

    if (!result.ok) {
      console.error(`[yipayNotify] 标记支付失败: ${result.message}, order=${order.id}`)
      return res.status(200).send('fail')
    }

    console.log(`[yipayNotify] 支付成功: order=${order.id}`)
    return res.status(200).send('success')
  } catch (error) {
    console.error('[yipayNotify] 异常:', error)
    return res.status(200).send('fail')
  }
}

// 易支付同步回调（用户浏览器跳转）
exports.yipayReturn = async (req, res) => {
  try {
    const payload = req.query && typeof req.query === 'object' ? req.query : {}
    console.log('[yipayReturn] 收到回调参数:', JSON.stringify(payload))

    // 优先使用 out_trade_no 查找订单
    const outTradeNo = String(payload.out_trade_no || '').trim()

    let order = null

    // 方式1：通过 out_trade_no（payment_trade_no）查找
    if (outTradeNo) {
      order = await Order.findOne({
        where: { payment_trade_no: outTradeNo },
        include: [{ model: Service, as: 'service' }]
      })
    }

    // 方式2：如果没找到，尝试从 out_trade_no 中提取订单ID（格式：XS{orderId}{timestamp}）
    if (!order && outTradeNo && outTradeNo.startsWith('XS')) {
      const match = outTradeNo.match(/^XS(\d+)/)
      if (match) {
        const orderId = Number(match[1])
        if (orderId && Number.isFinite(orderId)) {
          order = await Order.findByPk(orderId, {
            include: [{ model: Service, as: 'service' }]
          })
        }
      }
    }

    // 如果没有订单号参数（LDC等平台return_url不传参数的情况）
    // 跳转到前端支付结果页面，由前端从 localStorage 读取订单ID
    if (!order && !outTradeNo) {
      return res.redirect('/payment-result')
    }

    // 如果有订单号但找不到订单，显示错误页面
    if (!order) {
      const html = renderPaymentResultHtml({
        title: '订单查询失败',
        orderId: outTradeNo || null,
        message: '无法找到对应的订单，请返回原页面查看订单状态。',
        extra: '<p>如果支付已完成，订单状态会在稍后自动更新。</p><p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const paymentConfig = order.payment_config_id ? await PaymentConfig.findByPk(order.payment_config_id) : null
    const providerType = paymentConfig ? normalizeProviderType(paymentConfig) : ''

    // 尝试验签
    const canVerify = paymentConfig && providerType === 'yipay' && paymentConfig.is_enabled !== false && payload.sign
    const verified = canVerify ? yipay.verifyNotify({ payload, paymentConfig }) : null

    const tradeStatus = String(payload.trade_status || '').trim().toUpperCase()

    // 如果订单未支付且验签通过且交易成功，尝试标记支付
    if (order.payment_status !== 'paid' && verified === true) {
      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        // 验证金额
        const money = Number(payload.money)
        const amount = Number(order.amount)
        const amountOk = !Number.isFinite(money) || !Number.isFinite(amount) || Math.abs(money - amount) <= 0.01

        if (amountOk) {
          await markOrderPaid({
            orderId: order.id,
            paymentGateway: 'yipay',
            paymentTradeNo: outTradeNo,
            paymentProviderOrderId: payload.trade_no ? String(payload.trade_no) : null,
            paymentMeta: payload,
            paidAt: new Date()
          })
        }
      }
    }

    // 直接跳转到订单详情页面
    return res.redirect(`/order/${order.id}`)
  } catch (error) {
    console.error('[yipayReturn] 异常:', error)
    const html = renderPaymentResultHtml({
      title: '系统异常',
      orderId: null,
      message: '处理支付回调时发生错误，请返回原页面查看订单状态。'
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  }
}

// 易支付同步回调（带订单ID路径参数）
exports.yipayReturnWithOrderId = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId)
    const payload = req.query && typeof req.query === 'object' ? req.query : {}

    if (!orderId || !Number.isFinite(orderId)) {
      const html = renderPaymentResultHtml({
        title: '订单ID无效',
        orderId: null,
        message: '订单ID格式不正确。',
        extra: '<p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Service, as: 'service' }]
    })

    if (!order) {
      const html = renderPaymentResultHtml({
        title: '订单不存在',
        orderId: orderId,
        message: '未找到对应的订单记录。',
        extra: '<p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const paymentConfig = order.payment_config_id ? await PaymentConfig.findByPk(order.payment_config_id) : null
    const providerType = paymentConfig ? normalizeProviderType(paymentConfig) : ''

    // 尝试验签（如果有签名参数）
    const canVerify = paymentConfig && providerType === 'yipay' && paymentConfig.is_enabled !== false && payload.sign
    const verified = canVerify ? yipay.verifyNotify({ payload, paymentConfig }) : null

    const tradeStatus = String(payload.trade_status || '').trim().toUpperCase()

    // 如果订单未支付且验签通过且交易成功，尝试标记支付
    if (order.payment_status !== 'paid' && verified === true) {
      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        const money = Number(payload.money)
        const amount = Number(order.amount)
        const amountOk = !Number.isFinite(money) || !Number.isFinite(amount) || Math.abs(money - amount) <= 0.01

        if (amountOk) {
          await markOrderPaid({
            orderId: order.id,
            paymentGateway: 'yipay',
            paymentTradeNo: order.payment_trade_no || payload.out_trade_no || null,
            paymentProviderOrderId: payload.trade_no ? String(payload.trade_no) : null,
            paymentMeta: payload,
            paidAt: new Date()
          })
        }
      }
    }

    // 直接跳转到订单详情页面
    return res.redirect(`/order/${order.id}`)
  } catch (error) {
    console.error('[yipayReturnWithOrderId] 异常:', error)
    const html = renderPaymentResultHtml({
      title: '系统异常',
      orderId: null,
      message: '处理支付回调时发生错误，请返回原页面查看订单状态。'
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  }
}

// PayPal 同步回调（用户浏览器跳转）
exports.paypalReturn = async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim()

    if (!token) {
      const html = renderPaymentResultHtml({
        title: '支付回调异常',
        orderId: null,
        message: '缺少 PayPal token 参数，无法跳转到订单详情页。',
        extra: '<p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const order = await Order.findOne({
      where: { payment_provider_order_id: token },
      include: [{ model: Service, as: 'service' }]
    })

    if (!order) {
      const html = renderPaymentResultHtml({
        title: '订单不存在',
        orderId: null,
        message: '未找到对应的订单记录。',
        extra: '<p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    // 订单已支付 - 直接跳转
    if (order.payment_status === 'paid') {
      return res.redirect(`/order/${order.id}`)
    }

    const paymentConfig = order.payment_config_id ? await PaymentConfig.findByPk(order.payment_config_id) : null

    if (!paymentConfig || paymentConfig.is_enabled === false) {
      // 跳转到订单页面，让用户看到当前状态
      return res.redirect(`/order/${order.id}`)
    }

    const providerType = normalizeProviderType(paymentConfig)
    if (providerType !== 'paypal') {
      return res.redirect(`/order/${order.id}`)
    }

    // 尝试捕获支付
    let capture = null
    try {
      capture = await paypal.capturePayment({ paypalOrderId: token, paymentConfig })
    } catch (err) {
      console.error('[paypalReturn] capturePayment 失败:', err.message)
    }

    const captureStatus = String(capture?.status || '').toUpperCase()

    if (captureStatus === 'COMPLETED') {
      // 验证支付金额是否与订单金额一致
      const capturedAmount = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
      const orderAmount = Number(order.amount).toFixed(2)

      if (capturedAmount && capturedAmount !== orderAmount) {
        console.error(`[paypalReturn] 金额不匹配: orderId=${order.id}, expected=${orderAmount}, got=${capturedAmount}`)
        // 金额不匹配，不标记订单为已支付，跳转到订单页面显示异常
        return res.redirect(`/order/${order.id}?error=amount_mismatch`)
      }

      // 标记订单已支付
      await markOrderPaid({
        orderId: order.id,
        paymentGateway: 'paypal',
        paymentTradeNo: order.payment_trade_no || null,
        paymentProviderOrderId: token,
        paymentMeta: capture,
        paidAt: new Date()
      })
    }

    // 跳转到订单详情页面
    return res.redirect(`/order/${order.id}`)
  } catch (error) {
    console.error('[paypalReturn] 异常:', error)
    const html = renderPaymentResultHtml({
      title: '系统异常',
      orderId: null,
      message: '处理支付回调时发生错误，请返回原页面查看订单状态。'
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  }
}

// PayPal 取消支付回调
exports.paypalCancel = async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim()

    // 尝试查找订单
    if (token) {
      const order = await Order.findOne({ where: { payment_provider_order_id: token } })
      if (order) {
        // 跳转到订单详情页面
        return res.redirect(`/order/${order.id}`)
      }
    }

    // 找不到订单，显示提示页面
    const html = renderPaymentResultHtml({
      title: '已取消支付',
      orderId: null,
      message: '你已取消本次支付。',
      extra: '<p><a href="/services" style="color: #6366f1;">返回服务列表</a></p>'
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (error) {
    console.error('[paypalCancel] 异常:', error)
    const html = renderPaymentResultHtml({
      title: '已取消支付',
      orderId: null,
      message: '你已取消本次支付，可以返回原页面重新发起支付。'
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  }
}

// PayPal Webhook（服务器对服务器）
exports.paypalWebhook = async (req, res) => {
  try {
    const event = req.body || {}
    const eventType = String(event.event_type || '').trim()

    // 提取 PayPal 订单 ID
    let paypalOrderId = ''
    if (eventType.startsWith('CHECKOUT.ORDER.')) {
      paypalOrderId = String(event.resource?.id || '').trim()
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      paypalOrderId = String(event.resource?.supplementary_data?.related_ids?.order_id || '').trim()
    }

    // 无法识别的事件类型或缺少订单 ID，返回成功
    if (!paypalOrderId) {
      return res.status(200).json({ success: true })
    }

    const order = await Order.findOne({ where: { payment_provider_order_id: paypalOrderId } })
    if (!order) {
      // 订单不存在，可能是其他系统的订单，返回成功
      return res.status(200).json({ success: true })
    }

    // 订单已支付，直接返回成功
    if (order.payment_status === 'paid') {
      return res.status(200).json({ success: true })
    }

    const paymentConfig = order.payment_config_id ? await PaymentConfig.findByPk(order.payment_config_id) : null
    if (!paymentConfig) {
      console.warn(`[paypalWebhook] 支付配置不存在: order=${order.id}`)
      return res.status(200).json({ success: true })
    }

    if (paymentConfig.is_enabled === false) {
      console.warn(`[paypalWebhook] 支付配置已禁用: config=${paymentConfig.id}`)
      return res.status(200).json({ success: true })
    }

    if (normalizeProviderType(paymentConfig) !== 'paypal') {
      console.warn(`[paypalWebhook] 支付渠道不匹配: order=${order.id}`)
      return res.status(200).json({ success: true })
    }

    // 验签
    let verified = false
    try {
      verified = await paypal.verifyWebhook({ req, event, paymentConfig })
    } catch (err) {
      console.error('[paypalWebhook] 验签异常:', err.message)
    }

    if (!verified) {
      console.warn(`[paypalWebhook] 验签失败: order=${order.id}`)
      // 验签失败也返回 200，避免 PayPal 重试
      return res.status(200).json({ success: true })
    }

    // 处理支付完成事件
    if (eventType === 'CHECKOUT.ORDER.COMPLETED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // 验证支付金额
      let capturedAmount = null
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        capturedAmount = event.resource?.amount?.value
      } else if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
        capturedAmount = event.resource?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
      }

      const orderAmount = Number(order.amount).toFixed(2)
      if (capturedAmount && capturedAmount !== orderAmount) {
        console.error(`[paypalWebhook] 金额不匹配: orderId=${order.id}, expected=${orderAmount}, got=${capturedAmount}`)
        // 金额不匹配，不标记订单为已支付
        return res.status(200).json({ success: true, message: 'amount_mismatch' })
      }

      const result = await markOrderPaid({
        orderId: order.id,
        paymentGateway: 'paypal',
        paymentTradeNo: order.payment_trade_no || null,
        paymentProviderOrderId: paypalOrderId,
        paymentMeta: event,
        paidAt: new Date()
      })

      if (result.ok) {
        console.log(`[paypalWebhook] 支付成功: order=${order.id}`)
      } else {
        console.error(`[paypalWebhook] 标记支付失败: ${result.message}, order=${order.id}`)
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[paypalWebhook] 异常:', error)
    // 即使异常也返回 200，避免 PayPal 无限重试
    return res.status(200).json({ success: true })
  }
}
