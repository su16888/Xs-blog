const { sequelize } = require('../config/database');

async function verifyMigration() {
  try {
    console.log('开始验证 is_published 字段默认值...');

    // 检查当前默认值
    const [result] = await sequelize.query(`
      SELECT COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'is_published'
    `);

    console.log('✅ 验证结果: is_published 字段默认值 =', result[0]?.COLUMN_DEFAULT);

    // 测试插入新记录
    const [insertResult] = await sequelize.query(`
      INSERT INTO notes (title, content)
      VALUES ('测试笔记', '这是一个测试内容')
    `);

    console.log('✅ 测试插入新笔记成功');

    // 检查新插入记录的 is_published 值
    const [checkResult] = await sequelize.query(`
      SELECT is_published FROM notes WHERE id = LAST_INSERT_ID()
    `);

    console.log('✅ 新笔记的 is_published 值 =', checkResult[0]?.is_published);

    // 清理测试数据
    await sequelize.query(`DELETE FROM notes WHERE id = LAST_INSERT_ID()`);
    console.log('✅ 测试数据已清理');

    console.log('✅ 验证完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyMigration();