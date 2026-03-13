require('dotenv').config();
const { Todo } = require('../models');

async function createTodosTable() {
  try {
    console.log('Creating todos table...');
    console.log('Database:', process.env.DB_NAME);

    // 创建表（如果不存在）
    await Todo.sync({ force: false });

    console.log('✅ Todos table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating todos table:', error.message);
    process.exit(1);
  }
}

createTodosTable();
