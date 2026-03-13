/**
 * 添加 custom_copyright 字段到 social_feed_profile 表
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function up() {
  try {
    // 检查字段是否已存在
    const columns = await sequelize.query(
      `SHOW COLUMNS FROM social_feed_profile LIKE 'custom_copyright'`,
      { type: QueryTypes.SELECT }
    );

    if (columns.length === 0) {
      await sequelize.query(
        `ALTER TABLE social_feed_profile ADD COLUMN custom_copyright VARCHAR(255) DEFAULT '' AFTER signature`
      );
      console.log('成功添加 custom_copyright 字段');
    } else {
      console.log('custom_copyright 字段已存在');
    }
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

async function down() {
  try {
    await sequelize.query(
      `ALTER TABLE social_feed_profile DROP COLUMN custom_copyright`
    );
    console.log('成功删除 custom_copyright 字段');
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down };
