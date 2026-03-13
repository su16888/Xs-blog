/**
 * 重置管理员密码脚本
 * 使用方法: node reset-admin-password.js
 */

const bcrypt = require('bcryptjs');

async function generatePassword() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('\n=== 管理员密码重置 ===\n');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('\n生成的密码哈希:');
  console.log(hashedPassword);
  console.log('\n请在数据库中执行以下 SQL:');
  console.log('\nUPDATE users SET password = \'' + hashedPassword + '\' WHERE username = \'admin\';');
  console.log('\n或者重新导入数据库 schema.sql 文件');
  console.log('\n======================\n');
}

generatePassword();
