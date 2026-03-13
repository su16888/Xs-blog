/**
 * @file encryption.js
 * @description Xs-Blog 配置加密工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const crypto = require('crypto');

class ConfigEncryption {
  constructor() {
    this._encryptionKey = null;
    this._keyInitialized = false;
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * 获取加密密钥（延迟初始化）
   */
  get encryptionKey() {
    if (!this._keyInitialized) {
      this._encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || this.generateDefaultKey();
      this._keyInitialized = true;
    }
    return this._encryptionKey;
  }

  /**
   * 生成默认加密密钥
   */
  generateDefaultKey() {
    console.warn('警告: 使用默认加密密钥，生产环境请设置 CONFIG_ENCRYPTION_KEY 环境变量');
    return crypto.scryptSync('xs-blog-default-key', 'salt', 32);
  }

  /**
   * 加密配置值
   */
  encrypt(value) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 返回格式: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('配置加密失败:', error);
      return value; // 加密失败时返回原值
    }
  }

  /**
   * 解密配置值
   */
  decrypt(encryptedValue) {
    try {
      if (!encryptedValue.includes(':')) {
        return encryptedValue; // 不是加密格式，直接返回
      }

      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        return encryptedValue; // 格式不正确，直接返回
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('配置解密失败:', error);
      return encryptedValue; // 解密失败时返回原值
    }
  }

  /**
   * 加密敏感配置
   */
  encryptSensitiveConfig(config) {
    const sensitiveKeys = [
      'DB_PASSWORD',
      'JWT_SECRET',
      'API_KEY',
      'EMAIL_PASSWORD',
      'ENCRYPTION_KEY'
    ];

    const encryptedConfig = { ...config };

    sensitiveKeys.forEach(key => {
      if (encryptedConfig[key] && !encryptedConfig[key].startsWith('ENC:')) {
        encryptedConfig[key] = `ENC:${this.encrypt(encryptedConfig[key])}`;
      }
    });

    return encryptedConfig;
  }

  /**
   * 解密敏感配置
   */
  decryptSensitiveConfig(config) {
    const decryptedConfig = { ...config };

    Object.keys(decryptedConfig).forEach(key => {
      const value = decryptedConfig[key];
      if (typeof value === 'string' && value.startsWith('ENC:')) {
        decryptedConfig[key] = this.decrypt(value.substring(4));
      }
    });

    return decryptedConfig;
  }

  /**
   * 生成安全的随机密钥
   */
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 哈希配置值（用于验证）
   */
  hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

module.exports = new ConfigEncryption();