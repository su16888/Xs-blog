/**
 * @file add-new-settings.js
 * @description 添加头像形状、笔记封面显示和默认封面设置
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @created 2025-11-17
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('开始添加新的系统设置...');

    // 定义要添加的设置
    const newSettings = [
      {
        key: 'avatarShape',
        value: 'circle',
        type: 'string',
        description: '头像形状设置 (circle: 圆形, rounded: 圆角矩形)'
      },
      {
        key: 'showNoteCover',
        value: 'true',
        type: 'string',
        description: '是否显示笔记封面 (true: 显示, false: 不显示)'
      },
      {
        key: 'defaultNoteCover',
        value: '',
        type: 'string',
        description: '默认笔记封面图URL（当笔记没有封面时使用）'
      }
    ];

    // 逐个检查并添加设置
    for (const setting of newSettings) {
      // 检查设置是否已存在
      const [existing] = await sequelize.query(`
        SELECT setting_key
        FROM settings
        WHERE setting_key = ?
      `, {
        replacements: [setting.key],
        type: QueryTypes.SELECT
      });

      if (existing) {
        console.log(`✓ 设置 "${setting.key}" 已存在，跳过添加`);
        continue;
      }

      // 添加新设置
      await sequelize.query(`
        INSERT INTO settings (setting_key, setting_value, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [setting.key, setting.value, setting.type, setting.description]
      });

      console.log(`✓ 设置 "${setting.key}" 添加成功`);
    }

    console.log('✓ 所有新设置添加完成');
  } catch (error) {
    console.error('添加新设置失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = migrate;
