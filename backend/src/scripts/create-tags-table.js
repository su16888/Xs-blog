require('dotenv').config();
const { sequelize } = require('../config/database');
const Tag = require('../models/Tag');

async function createTagsTable() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    console.log('正在创建 tags 表...');
    await Tag.sync({ force: true });
    console.log('tags 表创建成功');

    await sequelize.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('创建表失败:', error);
    process.exit(1);
  }
}

createTagsTable();
