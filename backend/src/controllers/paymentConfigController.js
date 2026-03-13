const PaymentConfig = require('../models/PaymentConfig')

exports.getPublicPaymentConfigs = async (req, res, next) => {
  try {
    const configs = await PaymentConfig.findAll({
      where: { is_enabled: true },
      attributes: ['id', 'name', 'provider_key', 'provider_type', 'display_logo'],
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    })
    res.json({ success: true, data: configs })
  } catch (error) {
    next(error)
  }
}
