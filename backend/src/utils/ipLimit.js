/**
 * @file ipLimit.js
 * @description Xs-Blog IP限制工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { sequelize } = require('../config/database');
const Setting = require('../models/Setting');

// 获取IP限制天数设置
async function getIpLimitDays() {
  try {
    const setting = await Setting.findOne({
      where: { key: 'messageIpLimitDays' }
    });

    if (!setting || !setting.value) {
      console.log('[IP限制] 未找到设置，使用默认值: 1天');
      return 1; // 默认1天
    }

    const days = parseInt(setting.value);
    console.log('[IP限制] 从数据库读取的设置值:', setting.value, '-> 解析后:', days);
    return isNaN(days) ? 1 : days;
  } catch (error) {
    console.error('获取IP限制天数设置失败:', error);
    return 1; // 出错时返回默认值
  }
}

// 检查IP是否在限制时间内提交过留言
async function checkIPLimit(ipAddress) {
  try {
    // 获取限制天数
    const limitDays = await getIpLimitDays();
    console.log('[IP限制] 检查IP:', ipAddress, '限制天数:', limitDays);

    // 如果设置为0，表示不限制
    if (limitDays === 0) {
      console.log('[IP限制] 设置为0天，不限制提交');
      return { allowed: true };
    }

    const [result] = await sequelize.query(`
      SELECT last_submit_at
      FROM message_ip_records
      WHERE ip_address = ?
    `, {
      replacements: [ipAddress]
    });

    if (result.length === 0) {
      return { allowed: true };
    }

    const lastSubmitAt = new Date(result[0].last_submit_at);
    const now = new Date();
    const hoursDiff = (now - lastSubmitAt) / (1000 * 60 * 60);
    const limitHours = limitDays * 24;

    if (hoursDiff < limitHours) {
      const hoursLeft = Math.ceil(limitHours - hoursDiff);
      const daysLeft = Math.ceil(hoursLeft / 24);

      let message;
      if (limitDays === 1) {
        message = `24小时内只能提交一次留言，请 ${hoursLeft} 小时后再试`;
      } else {
        message = `${limitDays}天内只能提交一次留言，请 ${daysLeft} 天后再试`;
      }

      return {
        allowed: false,
        message: message
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('检查IP限制失败:', error);
    return { allowed: true }; // 出错时允许提交，避免影响用户体验
  }
}

// 记录IP提交
async function recordIPSubmission(ipAddress) {
  try {
    await sequelize.query(`
      INSERT INTO message_ip_records (ip_address, last_submit_at)
      VALUES (?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE last_submit_at = CURRENT_TIMESTAMP
    `, {
      replacements: [ipAddress]
    });
  } catch (error) {
    // 忽略记录失败的错误
  }
}

module.exports = {
  checkIPLimit,
  recordIPSubmission
};