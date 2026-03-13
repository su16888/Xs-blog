/**
 * @file databaseSecurity.js
 * @description Xs-Blog 数据库安全中间件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const databaseEncryption = require('../utils/databaseEncryption');
const databaseAudit = require('../utils/databaseAudit');

/**
 * 数据库查询审计中间件
 */
exports.auditDatabaseQueries = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();

  // 拦截响应以记录查询结果
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 记录敏感操作
    if (req.method !== 'GET') {
      const userId = req.user?.id || 'anonymous';
      const clientIP = req.ip || req.connection.remoteAddress;

      databaseAudit.logDataModification(
        req.method,
        req.path.split('/').pop() || 'unknown',
        userId,
        clientIP,
        req.params.id,
        {
          duration,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode
        }
      );
    }

    // 恢复原始send方法
    originalSend.call(this, data);
  };

  next();
};

/**
 * 敏感数据加密中间件
 */
exports.encryptSensitiveData = (req, res, next) => {
  // 跳过所有认证相关请求的密码加密，因为这些请求中的密码会由 bcrypt 处理
  const authPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/password',
    '/api/auth/username'
  ];

  // 跳过笔记相关请求的密码加密，因为笔记密码需要明文存储以支持 URL 参数访问
  const notePaths = [
    '/api/notes',
    '/api/admin/notes'
  ];

  // 跳过图册相关请求的密码加密，因为图册密码需要明文存储
  const galleryPaths = [
    '/api/galleries',
    '/api/admin/galleries'
  ];

  // 跳过S3配置相关请求，因为S3密钥需要明文存储以便直接使用
  const s3Paths = [
    '/api/admin/settings/s3/config',
    '/api/admin/settings/s3/test'
  ];

  // 跳过支付配置请求：provider_key 是业务标识，不应被按“key”规则加密
  const paymentConfigPaths = [
    '/api/admin/payment-configs',
    '/api/payment-configs'
  ];

  if (authPaths.some(path => req.path === path) && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }

  // 跳过S3配置请求
  if (s3Paths.some(path => req.path === path) && req.method === 'POST') {
    return next();
  }

  // 跳过支付配置创建/更新请求
  if (paymentConfigPaths.some(path => req.path.startsWith(path)) && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }

  // 跳过订单批量删除请求（confirm_token 不应被加密）
  if (req.path === '/api/admin/orders/bulk-delete' && req.method === 'POST') {
    return next();
  }

  // 跳过笔记创建和更新请求
  if (notePaths.some(path => req.path.startsWith(path)) && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }

  // 跳过图册创建和更新请求
  if (galleryPaths.some(path => req.path.startsWith(path)) && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }

  // 在请求处理前加密敏感数据
  if (req.body && Object.keys(req.body).length > 0) {
    req.originalBody = { ...req.body };
    req.body = databaseEncryption.encryptSensitiveFields(req.body);
  }

  next();
};

/**
 * 敏感数据解密中间件
 */
exports.decryptSensitiveData = (req, res, next) => {
  // 在响应发送前解密敏感数据
  const originalJson = res.json;

  res.json = function(data) {
    if (data && typeof data === 'object') {
      // 解密响应数据中的敏感字段
      data = databaseEncryption.decryptSensitiveFields(data);
    }

    originalJson.call(this, data);
  };

  next();
};

/**
 * 密码哈希中间件
 */
exports.hashPasswords = (req, res, next) => {
  // 自动哈希密码字段
  if (req.body && req.body.password) {
    req.body.password = databaseEncryption.hashPassword(req.body.password);
  }

  next();
};

/**
 * 数据库操作频率限制
 */
exports.rateLimitDatabaseOperations = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const operationType = req.method;
  const now = Date.now();

  // 简单的内存中频率限制（生产环境应使用Redis）
  if (!global.databaseOperationCounts) {
    global.databaseOperationCounts = {};
  }

  if (!global.databaseOperationCounts[clientIP]) {
    global.databaseOperationCounts[clientIP] = {
      count: 0,
      lastReset: now,
      operations: {}
    };
  }

  const ipData = global.databaseOperationCounts[clientIP];

  // 每分钟重置计数
  if (now - ipData.lastReset > 60000) {
    ipData.count = 0;
    ipData.operations = {};
    ipData.lastReset = now;
  }

  // 限制操作频率
  const maxOperationsPerMinute = process.env.NODE_ENV === 'production' ? 100 : 1000;

  if (ipData.count >= maxOperationsPerMinute) {
    databaseAudit.logOperation(
      'RATE_LIMIT_EXCEEDED',
      'system',
      'anonymous',
      clientIP,
      {
        operationCount: ipData.count,
        limit: maxOperationsPerMinute,
        userAgent: req.get('User-Agent')
      }
    );

    return res.status(429).json({
      success: false,
      message: '操作频率过高，请稍后再试'
    });
  }

  ipData.count++;

  // 记录特定操作类型
  if (!ipData.operations[operationType]) {
    ipData.operations[operationType] = 0;
  }
  ipData.operations[operationType]++;

  next();
};

/**
 * 数据库连接健康检查
 */
exports.databaseHealthCheck = (req, res, next) => {
  const { sequelize } = require('../config/database');

  // 定期检查数据库连接状态
  sequelize.authenticate()
    .then(() => {
      // 连接正常
      if (req.path === '/health/database') {
        return res.json({
          success: true,
          message: '数据库连接正常',
          timestamp: new Date().toISOString()
        });
      }
      next();
    })
    .catch(error => {
      console.error('数据库连接检查失败:', error);

      if (req.path === '/health/database') {
        return res.status(503).json({
          success: false,
          message: '数据库连接异常',
          error: error.message
        });
      }

      // 对于其他请求，继续处理但记录警告
      databaseAudit.logOperation(
        'DATABASE_CONNECTION_ERROR',
        'system',
        'anonymous',
        req.ip || req.connection.remoteAddress,
        {
          error: error.message,
          userAgent: req.get('User-Agent')
        }
      );

      next();
    });
};

/**
 * 数据库备份中间件
 */
exports.databaseBackup = (req, res, next) => {
  const databaseBackup = require('../utils/databaseBackup');

  // 备份相关端点
  if (req.path === '/api/admin/database/backup' && req.method === 'POST') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    databaseBackup.createBackup(req.body)
      .then(backupInfo => {
        res.json({
          success: true,
          message: '备份创建成功',
          backup: backupInfo
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          message: '备份创建失败',
          error: error.message
        });
      });

    return;
  }

  // 恢复备份端点
  if (req.path === '/api/admin/database/restore' && req.method === 'POST') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { backupFile } = req.body;

    if (!backupFile) {
      return res.status(400).json({
        success: false,
        message: '缺少备份文件参数'
      });
    }

    databaseBackup.restoreBackup(backupFile, req.body)
      .then(result => {
        res.json({
          success: true,
          message: '数据库恢复成功'
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          message: '数据库恢复失败',
          error: error.message
        });
      });

    return;
  }

  // 列出备份端点
  if (req.path === '/api/admin/database/backups' && req.method === 'GET') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const backups = databaseBackup.listBackups();
    res.json({
      success: true,
      backups
    });

    return;
  }

  next();
};

/**
 * 数据库审计日志查询
 */
exports.getAuditLogs = (req, res, next) => {
  if (req.path === '/api/admin/database/audit-logs' && req.method === 'GET') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const logs = databaseAudit.getAuditLogs(req.query);
    res.json({
      success: true,
      logs
    });

    return;
  }

  next();
};
