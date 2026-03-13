const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

async function resetAdmin() {
  try {
    console.log('重置管理员账户...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 查找现有的管理员用户
    const existingUser = await User.findOne({ where: { role: 'admin' } });

    if (existingUser) {
      console.log(`\n找到现有管理员用户: ${existingUser.username}`);

      // 更新用户名和密码
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await existingUser.update({
        username: 'admin',
        password: hashedPassword
      });

      console.log('✅ 管理员账户已重置！');
      console.log('用户名: admin');
      console.log('密码: admin123');
      console.log('⚠️  请在首次登录后立即修改密码！');
    } else {
      // 如果没有管理员用户，创建一个新的
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const admin = await User.create({
        username: 'admin',
        email: 'admin@xsblog.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });

      console.log('✅ 新管理员账户创建成功！');
      console.log('用户名: admin');
      console.log('密码: admin123');
      console.log('⚠️  请在首次登录后立即修改密码！');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 重置管理员账户失败:', error);
    process.exit(1);
  }
}

resetAdmin();