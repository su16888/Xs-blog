/**
 * @file databaseEncryption.js
 * @description Xs-Blog 数据库字段加密工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const crypto = require('crypto');

class DatabaseEncryption {
  constructor() {
    // 使用环境变量中的加密密钥
    this.encryptionKey = process.env.DB_ENCRYPTION_KEY || this.generateDefaultKey();
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * 生成默认加密密钥
   */
  generateDefaultKey() {
    console.warn('警告: 使用默认数据库加密密钥，生产环境请设置 DB_ENCRYPTION_KEY 环境变量');
    return crypto.scryptSync('xs-blog-db-encryption-key', 'salt', 32);
  }

  /**
   * 获取32字节的密钥
   */
  getKey() {
    if (Buffer.isBuffer(this.encryptionKey) && this.encryptionKey.length === 32) {
      return this.encryptionKey;
    }
    // 如果是字符串，使用 scrypt 派生32字节密钥
    return crypto.scryptSync(String(this.encryptionKey), 'xs-blog-salt', 32);
  }

  /**
   * 加密数据库字段
   */
  encryptField(value) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    try {
      const iv = crypto.randomBytes(12); // GCM 推荐使用 12 字节 IV
      const key = this.getKey();
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 返回格式: ENC:iv:authTag:encryptedData
      return `ENC:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('数据库字段加密失败:', error);
      return value; // 加密失败时返回原值
    }
  }

  /**
   * 解密数据库字段
   */
  decryptField(encryptedValue) {
    if (!encryptedValue || typeof encryptedValue !== 'string') {
      return encryptedValue;
    }

    if (!encryptedValue.startsWith('ENC:')) {
      return encryptedValue; // 不是加密格式，直接返回
    }

    try {
      const encryptedData = encryptedValue.substring(4);
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        return encryptedValue; // 格式不正确，直接返回
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const key = this.getKey();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('数据库字段解密失败:', error);
      return encryptedValue; // 解密失败时返回原值
    }
  }

  /**
   * 检查是否为加密字段
   */
  isEncrypted(value) {
    return typeof value === 'string' && value.startsWith('ENC:');
  }

  /**
   * 批量加密对象中的敏感字段
   */
  encryptSensitiveFields(data, sensitiveKeys = ['password', 'secret', 'token', 'key']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const encryptedData = { ...data };

    Object.keys(encryptedData).forEach(key => {
      const value = encryptedData[key];

      // 如果是敏感字段且未加密，则加密
      if (sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      ) && typeof value === 'string' && !this.isEncrypted(value)) {
        encryptedData[key] = this.encryptField(value);
      }
    });

    return encryptedData;
  }

  /**
   * 批量解密对象中的加密字段
   */
  decryptSensitiveFields(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const decryptedData = { ...data };

    Object.keys(decryptedData).forEach(key => {
      const value = decryptedData[key];

      // 如果是加密字段，则解密
      if (this.isEncrypted(value)) {
        decryptedData[key] = this.decryptField(value);
      }
    });

    return decryptedData;
  }

  /**
   * 生成安全的随机密钥
   */
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 哈希密码（用于用户密码存储）
   */
  hashPassword(password) {
    if (!password) {
      return null;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');

    return `${salt}:${hash}`;
  }

  /**
   * 验证密码
   */
  verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }

    const [salt, originalHash] = hashedPassword.split(':');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');

    return hash === originalHash;
  }
}

module.exports = new DatabaseEncryption();