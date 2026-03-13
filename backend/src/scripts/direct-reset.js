const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

async function directReset() {
  try {
    console.log('直接重置管理员密码...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 生成新密码
    const newPassword = 'XsBlog@2024!Admin';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`\n新密码: ${newPassword}`);
    console.log(`新哈希: ${hashedPassword}`);

    // 直接执行SQL更新
    const [result] = await sequelize.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE username = ?',
      {
        replacements: [hashedPassword, 'admin']
      }
    );

    console.log(`\nSQL更新结果: ${result.affectedRows} 行受影响`);

    if (result.affectedRows > 0) {
      console.log('✅ 密码直接更新成功！');
      console.log(`用户名: admin`);
      console.log(`密码: ${newPassword}`);
    } else {
      console.log('❌ 没有找到admin用户');
    }

    // 验证更新
    const [users] = await sequelize.query(
      'SELECT username, password FROM users WHERE username = ?',
      {
        replacements: ['admin']
      }
    );

    if (users.length > 0) {
      const user = users[0];
      console.log(`\n验证结果:`);
      console.log(`用户名: ${user.username}`);
      console.log(`密码哈希: ${user.password}`);

      const isValid = await bcrypt.compare(newPassword, user.password);
      console.log(`密码验证: ${isValid ? '✅ 成功' : '❌ 失败'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 直接重置失败:', error);
    process.exit(1);
  }
}

directReset();