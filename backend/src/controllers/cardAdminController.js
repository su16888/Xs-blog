const Card = require('../models/Card')
const Service = require('../models/Service')
const Order = require('../models/Order')
const { Op } = require('sequelize')

function parseCardCodes(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input
      .map(v => String(v || '').trim())
      .filter(Boolean)
  }
  return String(input)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

exports.getCards = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, service_id, card_status, bind_order_id, search } = req.query
    const where = {}

    if (service_id) where.service_id = Number(service_id)
    if (bind_order_id) where.bind_order_id = Number(bind_order_id)
    if (card_status) where.card_status = card_status
    if (search) {
      where[Op.or] = [
        { card_code: { [Op.like]: `%${search}%` } }
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50))
    const offset = (pageNum - 1) * limitNum

    const { count, rows } = await Card.findAndCountAll({
      where,
      include: [
        { model: Service, as: 'service', attributes: ['id', 'name'] },
        { model: Order, as: 'order', attributes: ['id', 'status', 'payment_status', 'created_at'] }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    })

    res.json({
      success: true,
      data: {
        cards: rows,
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

exports.importCards = async (req, res, next) => {
  try {
    const { service_id, card_codes, cards_text } = req.body
    const serviceId = Number(service_id)
    if (!serviceId || Number.isNaN(serviceId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的服务ID' })
    }

    const codes = parseCardCodes(card_codes ?? cards_text)
    const uniqueCodes = Array.from(new Set(codes))

    if (uniqueCodes.length === 0) {
      return res.status(400).json({ success: false, message: '卡密内容不能为空' })
    }

    const existingCards = await Card.findAll({
      where: {
        service_id: serviceId,
        card_code: { [Op.in]: uniqueCodes }
      },
      attributes: ['card_code']
    })
    const existingSet = new Set(existingCards.map(card => card.card_code))
    const newCodes = uniqueCodes.filter(code => !existingSet.has(code))

    if (newCodes.length === 0) {
      return res.status(200).json({
        success: true,
        message: '导入成功',
        data: {
          created_count: 0,
          skipped_count: uniqueCodes.length
        }
      })
    }

    const dataToCreate = newCodes.map(code => ({
      service_id: serviceId,
      card_code: code,
      card_status: 'unused',
      bind_order_id: null
    }))

    const created = await Card.bulkCreate(dataToCreate)

    const availableCards = await Card.count({ where: { service_id: serviceId, bind_order_id: null, card_status: 'unused' } })
    await Service.update({ stock_total: availableCards }, { where: { id: serviceId } })

    res.status(201).json({
      success: true,
      message: '导入成功',
      data: {
        created_count: created.length,
        skipped_count: uniqueCodes.length - created.length
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.updateCard = async (req, res, next) => {
  try {
    const { id } = req.params
    const { card_status, bind_order_id, card_code, service_id } = req.body
    const card = await Card.findByPk(id)
    if (!card) {
      return res.status(404).json({ success: false, message: '卡密不存在' })
    }

    let nextServiceId = card.service_id
    if (service_id !== undefined) {
      const parsed = Number(service_id)
      if (!parsed || Number.isNaN(parsed)) {
        return res.status(400).json({ success: false, message: '无效的服务ID' })
      }
      const service = await Service.findByPk(parsed)
      if (!service) {
        return res.status(400).json({ success: false, message: '服务不存在' })
      }
      nextServiceId = parsed
    }

    const prevServiceId = card.service_id
    await card.update({
      service_id: nextServiceId,
      card_status: card_status !== undefined ? card_status : card.card_status,
      bind_order_id: bind_order_id !== undefined ? (bind_order_id || null) : card.bind_order_id,
      card_code: card_code !== undefined ? card_code : card.card_code
    })

    if (prevServiceId !== nextServiceId) {
      const prevCount = await Card.count({ where: { service_id: prevServiceId, bind_order_id: null, card_status: 'unused' } })
      await Service.update({ stock_total: prevCount }, { where: { id: prevServiceId } })
    }
    const nextCount = await Card.count({ where: { service_id: nextServiceId, bind_order_id: null, card_status: 'unused' } })
    await Service.update({ stock_total: nextCount }, { where: { id: nextServiceId } })

    res.json({ success: true, message: '更新成功', data: card })
  } catch (error) {
    next(error)
  }
}

exports.deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params
    const card = await Card.findByPk(id)
    if (!card) {
      return res.status(404).json({ success: false, message: '卡密不存在' })
    }
    const serviceId = card.service_id
    await card.destroy()
    const availableCards = await Card.count({ where: { service_id: serviceId, bind_order_id: null, card_status: 'unused' } })
    await Service.update({ stock_total: availableCards }, { where: { id: serviceId } })
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    next(error)
  }
}
