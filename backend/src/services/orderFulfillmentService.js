const Card = require('../models/Card')
const Service = require('../models/Service')

async function allocateCardForOrder({ orderId, serviceId, transaction }) {
  const card = await Card.findOne({
    where: {
      service_id: serviceId,
      bind_order_id: null,
      card_status: 'unused'
    },
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (!card) {
    return null
  }

  await card.update(
    {
      bind_order_id: orderId,
      card_status: 'used'
    },
    { transaction }
  )

  const remaining = await Card.count({
    where: { service_id: serviceId, bind_order_id: null, card_status: 'unused' },
    transaction
  })
  await Service.update({ stock_total: remaining }, { where: { id: serviceId }, transaction })

  return card
}

module.exports = {
  allocateCardForOrder
}
