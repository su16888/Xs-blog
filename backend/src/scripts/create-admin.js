const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('开始创建默认管理员账户...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步模型（创建表）
    await sequelize.sync();
    console.log('✅ 数据库表同步完成');

    // 检查管理员是否已存在
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    const existingEmail = await User.findOne({ where: { email: 'admin@example.com' } });

    if (existingAdmin || existingEmail) {
      console.log('⚠️  管理员账户已存在，跳过创建');
      console.log('用户名: admin');
      console.log('密码: admin123');
      console.log('如需重置密码，请删除现有账户后重新运行此脚本');
      process.exit(0);
    }

    // 创建管理员账户
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    console.log('✅ 默认管理员账户创建成功！');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('⚠️  请在首次登录后立即修改密码！');

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error);
    process.exit(1);
  }
}

createAdmin();