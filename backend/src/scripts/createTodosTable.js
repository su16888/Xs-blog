const { sequelize, Todo } = require('../models');

async function createTodosTable() {
  try {
    console.log('Creating todos table...');

    // 创建表（如果不存在）
    await Todo.sync({ force: false });

    console.log('✅ Todos table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating todos table:', error);
    process.exit(1);
  }
}

createTodosTable();
