const Setting = require('../models/Setting')

async function getBoolSetting(key, defaultValue = false) {
  try {
    const s = await Setting.findOne({ where: { key } })
    if (!s) return defaultValue
    const v = typeof s.value === 'string' ? s.value.trim().toLowerCase() : s.value
    return v === true || v === 1 || v === '1' || v === 'true' || v === 'yes' || v === 'on'
  } catch (e) {
    return defaultValue
  }
}

module.exports = { getBoolSetting }

