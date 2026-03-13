const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

async function checkUsers() {
  try {
    console.log('检查数据库中的用户...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 查找所有用户
    const users = await User.findAll();
    console.log(`\n找到 ${users.length} 个用户:`);

    for (const user of users) {
      console.log(`\n用户 ID: ${user.id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.status}`);
      console.log(`密码哈希: ${user.password}`);
      console.log(`创建时间: ${user.created_at}`);

      // 测试密码验证
      const isPasswordValid = await bcrypt.compare('admin123', user.password);
      console.log(`密码 'admin123' 验证结果: ${isPasswordValid ? '✅ 正确' : '❌ 错误'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 检查用户失败:', error);
    process.exit(1);
  }
}

checkUsers();