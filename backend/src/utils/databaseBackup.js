/**
 * @file databaseBackup.js
 * @description Xs-Blog 数据库备份工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDirectory();
  }

  /**
   * 确保备份目录存在
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(options = {}) {
    const {
      encrypt = true,
      compress = true,
      includeData = true,
      backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`
    } = options;

    const config = require('../config/config');
    const dbConfig = config.database;

    try {
      // 生成备份文件名
      let backupFile = path.join(this.backupDir, `${backupName}.sql`);

      // MySQL 备份命令
      const dumpCommand = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} > "${backupFile}"`;

      console.log('开始创建数据库备份...');

      // 执行备份命令
      await this.executeCommand(dumpCommand);

      // 检查备份文件是否创建成功
      if (!fs.existsSync(backupFile)) {
        throw new Error('备份文件创建失败');
      }

      let finalBackupFile = backupFile;

      // 压缩备份
      if (compress) {
        const compressedFile = `${backupFile}.gz`;
        const compressCommand = `gzip "${backupFile}"`;
        await this.executeCommand(compressCommand);
        finalBackupFile = compressedFile;
        backupFile = compressedFile;
      }

      // 加密备份
      if (encrypt) {
        const encryptedFile = `${backupFile}.enc`;
        await this.encryptFile(finalBackupFile, encryptedFile);
        finalBackupFile = encryptedFile;

        // 删除未加密的临时文件
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
      }

      const backupInfo = {
        filename: path.basename(finalBackupFile),
        path: finalBackupFile,
        size: fs.statSync(finalBackupFile).size,
        createdAt: new Date().toISOString(),
        encrypted: encrypt,
        compressed: compress
      };

      console.log(`✅ 数据库备份创建成功: ${backupInfo.filename}`);
      return backupInfo;

    } catch (error) {
      console.error('❌ 数据库备份失败:', error);
      throw error;
    }
  }

  /**
   * 恢复数据库备份
   */
  async restoreBackup(backupFile, options = {}) {
    const {
      decrypt = true,
      decompress = true
    } = options;

    const config = require('../config/config');
    const dbConfig = config.database;

    try {
      const backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(this.backupDir, backupFile);

      if (!fs.existsSync(backupPath)) {
        throw new Error('备份文件不存在');
      }

      let restoreFile = backupPath;

      // 解密备份文件
      if (decrypt && backupPath.endsWith('.enc')) {
        const decryptedFile = backupPath.replace('.enc', '');
        await this.decryptFile(backupPath, decryptedFile);
        restoreFile = decryptedFile;
      }

      // 解压缩备份文件
      if (decompress && restoreFile.endsWith('.gz')) {
        const decompressedFile = restoreFile.replace('.gz', '');
        const decompressCommand = `gunzip "${restoreFile}"`;
        await this.executeCommand(decompressCommand);
        restoreFile = decompressedFile;
      }

      // 恢复数据库
      const restoreCommand = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} < "${restoreFile}"`;

      console.log('开始恢复数据库...');
      await this.executeCommand(restoreCommand);

      // 清理临时文件
      if (restoreFile !== backupPath) {
        fs.unlinkSync(restoreFile);
      }

      console.log('✅ 数据库恢复成功');
      return { success: true };

    } catch (error) {
      console.error('❌ 数据库恢复失败:', error);
      throw error;
    }
  }

  /**
   * 加密文件
   */
  async encryptFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'xs-blog-backup-key';
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher('aes-256-cbc', key);
      const input = fs.createReadStream(inputFile);
      const output = fs.createWriteStream(outputFile);

      // 写入 IV
      output.write(iv);

      input
        .pipe(cipher)
        .pipe(output)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  /**
   * 解密文件
   */
  async decryptFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'xs-blog-backup-key';
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);

      const input = fs.createReadStream(inputFile);
      const output = fs.createWriteStream(outputFile);

      // 读取 IV
      let iv;
      input.once('readable', () => {
        iv = input.read(16);
        if (!iv || iv.length !== 16) {
          reject(new Error('无效的加密文件'));
          return;
        }

        const decipher = crypto.createDecipher('aes-256-cbc', key);
        input
          .pipe(decipher)
          .pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });
    });
  }

  /**
   * 执行命令
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`命令执行失败: ${stderr || error.message}`));
          return;
        }
        resolve(stdout);
      });
    });
  }

  /**
   * 列出所有备份文件
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.gz') || file.endsWith('.enc'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          return {
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            encrypted: file.endsWith('.enc'),
            compressed: file.endsWith('.gz')
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return files;
    } catch (error) {
      console.error('列出备份文件失败:', error);
      return [];
    }
  }

  /**
   * 清理旧备份
   */
  cleanupOldBackups(retentionDays = 30) {
    try {
      const backups = this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldBackups = backups.filter(backup => new Date(backup.createdAt) < cutoffDate);

      oldBackups.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`已删除旧备份: ${backup.filename}`);
      });

      console.log(`已清理 ${oldBackups.length} 个旧备份文件`);
      return oldBackups.length;
    } catch (error) {
      console.error('清理旧备份失败:', error);
      return 0;
    }
  }

  /**
   * 验证备份文件完整性
   */
  verifyBackup(backupFile) {
    const backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(this.backupDir, backupFile);

    if (!fs.existsSync(backupPath)) {
      return { valid: false, error: '备份文件不存在' };
    }

    try {
      const stats = fs.statSync(backupPath);
      const fileSize = stats.size;

      // 检查文件大小（至少应该有数据）
      if (fileSize < 100) {
        return { valid: false, error: '备份文件可能已损坏（文件大小异常）' };
      }

      // 对于加密文件，尝试读取前几个字节
      if (backupPath.endsWith('.enc')) {
        const buffer = fs.readFileSync(backupPath, { start: 0, end: 16 });
        if (buffer.length !== 16) {
          return { valid: false, error: '加密备份文件可能已损坏' };
        }
      }

      return {
        valid: true,
        size: fileSize,
        createdAt: stats.birthtime
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new DatabaseBackup();