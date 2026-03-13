/**
 * @file envManager.js
 * @description Xs-Blog 环境变量管理器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const fs = require('fs');
const path = require('path');
const encryption = require('./encryption');

class EnvManager {
  constructor() {
    this.envPath = path.join(__dirname, '../../.env');
    this.envExamplePath = path.join(__dirname, '../../.env.example');
  }

  /**
   * 加载并解密环境变量
   */
  loadEnv() {
    if (!fs.existsSync(this.envPath)) {
      console.warn('.env 文件不存在，使用默认配置');
      return;
    }

    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      line = line.trim();

      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        return;
      }

      const [key, ...valueParts] = line.split('=');
      let value = valueParts.join('=').trim();

      // 解密加密的值
      if (value.startsWith('ENC:')) {
        value = encryption.decrypt(value.substring(4));
      }

      // 设置环境变量
      process.env[key] = value;
    });

    console.log('环境变量加载完成');
  }

  /**
   * 加密敏感环境变量
   */
  encryptSensitiveVariables() {
    if (!fs.existsSync(this.envPath)) {
      console.error('.env 文件不存在');
      return false;
    }

    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const lines = envContent.split('\n');
    const encryptedLines = [];

    const sensitiveKeys = [
      'DB_PASSWORD',
      'JWT_SECRET',
      'API_KEY',
      'EMAIL_PASSWORD',
      'CONFIG_ENCRYPTION_KEY'
    ];

    lines.forEach(line => {
      line = line.trim();

      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        encryptedLines.push(line);
        return;
      }

      const [key, ...valueParts] = line.split('=');
      let value = valueParts.join('=').trim();

      // 如果是敏感变量且未加密，则加密
      if (sensitiveKeys.includes(key) && value && !value.startsWith('ENC:')) {
        value = `ENC:${encryption.encrypt(value)}`;
        console.log(`已加密环境变量: ${key}`);
      }

      encryptedLines.push(`${key}=${value}`);
    });

    // 备份原文件
    const backupPath = `${this.envPath}.backup.${Date.now()}`;
    fs.copyFileSync(this.envPath, backupPath);
    console.log(`原文件已备份到: ${backupPath}`);

    // 写入加密后的文件
    fs.writeFileSync(this.envPath, encryptedLines.join('\n'));
    console.log('环境变量加密完成');

    return true;
  }

  /**
   * 验证环境变量完整性
   */
  validateEnv() {
    const requiredVars = [
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET'
    ];

    const missingVars = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      console.error('缺少必需的环境变量:', missingVars.join(', '));
      return false;
    }

    console.log('环境变量验证通过');
    return true;
  }

  /**
   * 生成.env.example文件
   */
  generateEnvExample() {
    const exampleContent = `# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-database-password
DB_NAME=xsblog888

# JWT配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS配置（前端地址，多个地址用逗号分隔）
# 开发环境示例: http://localhost:3000
# 生产环境示例: https://yourdomain.com
# 允许所有来源: *
CORS_ORIGIN=http://localhost:3000

# 安全配置
API_KEY=your-api-key
REQUEST_SIGNING=false
IP_WHITELIST=

# 加密配置
CONFIG_ENCRYPTION_KEY=your-encryption-key

# 邮件配置（可选）
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password

# 上传配置
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# 前端配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ADMIN_PATH=admin`;

    fs.writeFileSync(this.envExamplePath, exampleContent);
    console.log('.env.example 文件已生成');
  }

  /**
   * 获取环境变量信息（隐藏敏感值）
   */
  getEnvInfo() {
    const envInfo = {};
    const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];

    Object.keys(process.env).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
        envInfo[key] = '***HIDDEN***';
      } else {
        envInfo[key] = process.env[key];
      }
    });

    return envInfo;
  }
}

module.exports = new EnvManager();