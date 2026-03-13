const { sequelize } = require('../config/database');

async function addShowInProfileColumn() {
  try {
    console.log('开始添加 show_in_profile 字段到 social_links 表...');

    // 先检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'social_links'
      AND COLUMN_NAME = 'show_in_profile'
    `);

    if (results.length > 0) {
      console.log('⚠️  show_in_profile 字段已存在，跳过添加');
      process.exit(0);
      return;
    }

    // 添加 show_in_profile 字段
    await sequelize.query(`
      ALTER TABLE social_links
      ADD COLUMN show_in_profile TINYINT(1) DEFAULT 0
      COMMENT '是否在个人资料卡片中显示（最多3个）'
    `);

    console.log('✅ show_in_profile 字段添加成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  addShowInProfileColumn();
}

module.exports = addShowInProfileColumn;
