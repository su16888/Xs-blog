/**
 * @file add-cover-image-to-notes.js
 * @description 为笔记表添加封面图字段
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @created 2025-11-17
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('开始添加笔记封面图字段...');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'cover_image'
    `, { type: QueryTypes.SELECT });

    if (results) {
      console.log('封面图字段已存在，跳过添加');
      return;
    }

    // 添加封面图字段
    await sequelize.query(`
      ALTER TABLE notes
      ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL
      COMMENT '笔记封面图URL'
    `);

    console.log('✓ 封面图字段添加成功');
  } catch (error) {
    console.error('添加封面图字段失败:', error);
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
