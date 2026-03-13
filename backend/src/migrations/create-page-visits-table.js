/**
 * @file create-page-visits-table.js
 * @description 创建页面访问统计表
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @created 2025-12-15
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('开始创建页面访问统计表...');

    // 检查表是否已存在
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'page_visits'
    `, { type: QueryTypes.SELECT });

    if (tables) {
      console.log('page_visits 表已存在，跳过创建');
      return;
    }

    // 创建页面访问统计表
    await sequelize.query(`
      CREATE TABLE page_visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_type VARCHAR(50) NOT NULL COMMENT '页面类型：home, social-feed, notes, navigation, galleries, services, messages, docs',
        page_path VARCHAR(500) DEFAULT NULL COMMENT '具体页面路径',
        ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址（支持IPv6）',
        user_agent TEXT DEFAULT NULL COMMENT '浏览器User-Agent',
        referer VARCHAR(500) DEFAULT NULL COMMENT '来源页面',
        visit_date DATE NOT NULL COMMENT '访问日期（用于按日统计）',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_page_type (page_type),
        INDEX idx_visit_date (visit_date),
        INDEX idx_ip_address (ip_address),
        INDEX idx_page_type_date (page_type, visit_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='页面访问统计表'
    `);

    console.log('✓ page_visits 表创建成功');
  } catch (error) {
    console.error('创建页面访问统计表失败:', error);
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
