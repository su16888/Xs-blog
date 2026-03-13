const { sequelize } = require('../config/database');

async function migrateIsPublishedDefault() {
  try {
    console.log('开始修改 is_published 字段默认值...');

    // 检查当前默认值
    const [currentDefault] = await sequelize.query(`
      SELECT COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'is_published'
    `);

    console.log('当前 is_published 字段的默认值:', currentDefault[0]?.COLUMN_DEFAULT);

    // 修改默认值为 TRUE (1)
    console.log('修改 is_published 字段默认值为 TRUE...');
    await sequelize.query(`
      ALTER TABLE notes
      MODIFY COLUMN is_published BOOLEAN DEFAULT TRUE COMMENT '是否发布到前端'
    `);

    console.log('✅ is_published 字段默认值修改成功');

    // 验证修改结果
    const [newDefault] = await sequelize.query(`
      SELECT COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'is_published'
    `);

    console.log('修改后 is_published 字段的默认值:', newDefault[0]?.COLUMN_DEFAULT);
    console.log('✅ 迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateIsPublishedDefault();