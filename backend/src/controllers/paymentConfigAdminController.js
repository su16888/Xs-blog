const PaymentConfig = require('../models/PaymentConfig')
const { Op } = require('sequelize')
const databaseEncryption = require('../utils/databaseEncryption')
const config = require('../config/config')

const normalizePaymentConfig = (config) => {
  if (!config) return config
  const data = typeof config.toJSON === 'function' ? config.toJSON() : config
  const normalized = { ...data }
  if (normalized && normalized.config_json && typeof normalized.config_json === 'object') {
    normalized.config_json = databaseEncryption.decryptSensitiveFields(normalized.config_json)
  }
  return normalized
}

exports.getPaymentConfigs = async (req, res, next) => {
  try {
    const { is_enabled, search } = req.query
    const where = {}

    if (is_enabled !== undefined) {
      where.is_enabled = is_enabled === 'true' || is_enabled === true
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { provider_key: { [Op.like]: `%${search}%` } }
      ]
    }

    const configs = await PaymentConfig.findAll({
      where,
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    })

    res.json({ success: true, data: configs.map(normalizePaymentConfig) })
  } catch (error) {
    next(error)
  }
}

exports.getPaymentConfig = async (req, res, next) => {
  try {
    const { id } = req.params
    const config = await PaymentConfig.findByPk(id)
    if (!config) {
      return res.status(404).json({ success: false, message: '支付配置不存在' })
    }
    res.json({ success: true, data: normalizePaymentConfig(config) })
  } catch (error) {
    next(error)
  }
}

exports.createPaymentConfig = async (req, res, next) => {
  try {
    const { name, provider_key, provider_type, is_enabled, sort_order, remark, config_json, display_logo } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: '支付配置名称不能为空' })
    }
    if (!provider_key) {
      return res.status(400).json({ success: false, message: '支付渠道标识不能为空' })
    }

    let normalizedConfigJson = config_json
    if (typeof normalizedConfigJson === 'string' && normalizedConfigJson.trim()) {
      try {
        normalizedConfigJson = JSON.parse(normalizedConfigJson)
      } catch (e) {
        return res.status(400).json({ success: false, message: 'config_json 不是合法 JSON' })
      }
    }
    if (normalizedConfigJson && typeof normalizedConfigJson === 'object') {
      normalizedConfigJson = databaseEncryption.encryptSensitiveFields(normalizedConfigJson)
    } else {
      normalizedConfigJson = null
    }

    const config = await PaymentConfig.create({
      name,
      provider_key,
      provider_type: provider_type || null,
      is_enabled: is_enabled !== undefined ? !!is_enabled : true,
      sort_order: sort_order !== undefined ? Number(sort_order) : 0,
      remark: remark || null,
      config_json: normalizedConfigJson,
      display_logo: display_logo || null
    })

    res.status(201).json({ success: true, message: '创建成功', data: normalizePaymentConfig(config) })
  } catch (error) {
    next(error)
  }
}

exports.updatePaymentConfig = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, provider_key, provider_type, is_enabled, sort_order, remark, config_json, display_logo } = req.body
    const config = await PaymentConfig.findByPk(id)
    if (!config) {
      return res.status(404).json({ success: false, message: '支付配置不存在' })
    }

    let normalizedConfigJson = config_json
    if (normalizedConfigJson !== undefined) {
      if (typeof normalizedConfigJson === 'string' && normalizedConfigJson.trim()) {
        try {
          normalizedConfigJson = JSON.parse(normalizedConfigJson)
        } catch (e) {
          return res.status(400).json({ success: false, message: 'config_json 不是合法 JSON' })
        }
      }
      if (normalizedConfigJson && typeof normalizedConfigJson === 'object') {
        normalizedConfigJson = databaseEncryption.encryptSensitiveFields(normalizedConfigJson)
      } else {
        normalizedConfigJson = null
      }
    }

    await config.update({
      name: name !== undefined ? name : config.name,
      provider_key: provider_key !== undefined ? provider_key : config.provider_key,
      provider_type: provider_type !== undefined ? (provider_type || null) : config.provider_type,
      is_enabled: is_enabled !== undefined ? !!is_enabled : config.is_enabled,
      sort_order: sort_order !== undefined ? Number(sort_order) : config.sort_order,
      remark: remark !== undefined ? (remark || null) : config.remark,
      config_json: config_json !== undefined ? normalizedConfigJson : config.config_json,
      display_logo: display_logo !== undefined ? (display_logo || null) : config.display_logo
    })

    res.json({ success: true, message: '更新成功', data: normalizePaymentConfig(config) })
  } catch (error) {
    next(error)
  }
}

exports.deletePaymentConfig = async (req, res, next) => {
  try {
    const { id } = req.params
    const config = await PaymentConfig.findByPk(id)
    if (!config) {
      return res.status(404).json({ success: false, message: '支付配置不存在' })
    }
    await config.destroy()
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    next(error)
  }
}

exports.uploadDisplayLogo = async (req, res, next) => {
  try {
    const { id } = req.params
    const record = await PaymentConfig.findByPk(id)
    if (!record) {
      return res.status(404).json({ success: false, message: '支付配置不存在' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '缺少上传文件' })
    }

    const fileUrl = req.file.s3Url || config.getFileUrl(req.file)
    await record.update({ display_logo: fileUrl })

    res.json({ success: true, message: '上传成功', data: normalizePaymentConfig(record) })
  } catch (error) {
    next(error)
  }
}
