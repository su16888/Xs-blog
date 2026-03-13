/**
 * @file migrate-todos-timelogs.js
 * @description 为 todos 表添加 time_logs 字段的迁移脚本
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-07
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { sequelize } = require('../config/database');

async function migrateTodosTimeLogs() {
  try {
    console.log('开始迁移 todos 表，添加 time_logs 字段...');

    // 检查 time_logs 列是否存在
    const [timeLogsExists] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'todos'
        AND COLUMN_NAME = 'time_logs'
    `);

    if (timeLogsExists[0].count === 0) {
      console.log('添加 time_logs 列...');
      await sequelize.query(`
        ALTER TABLE todos
        ADD COLUMN time_logs JSON NULL COMMENT '时间点记录，格式：[{id, time, description}]' AFTER completed_at
      `);
      console.log('✅ time_logs 列添加成功');
    } else {
      console.log('time_logs 列已存在，跳过');
    }

    console.log('✅ 迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateTodosTimeLogs();
