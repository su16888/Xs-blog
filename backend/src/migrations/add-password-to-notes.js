const { sequelize } = require('../config/database');

async function addPasswordColumn() {
  try {
    console.log('开始添加 password 字段到 notes 表...');

    // 先检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'password'
    `);

    if (results.length > 0) {
      console.log('⚠️  password 字段已存在，跳过添加');
      process.exit(0);
      return;
    }

    // 添加 password 字段
    await sequelize.query(`
      ALTER TABLE notes
      ADD COLUMN password VARCHAR(100) DEFAULT NULL
      COMMENT '访问密码'
      AFTER is_published
    `);

    console.log('✅ password 字段添加成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  addPasswordColumn();
}

module.exports = addPasswordColumn;
