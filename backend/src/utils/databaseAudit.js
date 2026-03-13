/**
 * @file databaseAudit.js
 * @description Xs-Blog 数据库审计日志工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const fs = require('fs');
const path = require('path');

class DatabaseAudit {
  constructor() {
    this.auditLogPath = path.join(__dirname, '../../logs/database_audit.log');
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 记录数据库操作审计日志
   */
  logOperation(operation, table, userId, ipAddress, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      operation,
      table,
      userId,
      ipAddress,
      details,
      userAgent: details.userAgent || 'Unknown'
    };

    // 写入文件日志
    const logLine = `${timestamp} | ${operation} | ${table} | User: ${userId} | IP: ${ipAddress} | Details: ${JSON.stringify(details)}\n`;

    fs.appendFileSync(this.auditLogPath, logLine, 'utf8');

    // 同时在控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB Audit] ${logLine.trim()}`);
    }

    return logEntry;
  }

  /**
   * 记录敏感数据访问
   */
  logSensitiveAccess(table, userId, ipAddress, accessedFields, userAgent = 'Unknown') {
    return this.logOperation(
      'SENSITIVE_ACCESS',
      table,
      userId,
      ipAddress,
      {
        accessedFields,
        userAgent,
        severity: 'HIGH'
      }
    );
  }

  /**
   * 记录数据修改操作
   */
  logDataModification(operation, table, userId, ipAddress, recordId, changes, userAgent = 'Unknown') {
    return this.logOperation(
      operation,
      table,
      userId,
      ipAddress,
      {
        recordId,
        changes,
        userAgent,
        severity: operation === 'DELETE' ? 'HIGH' : 'MEDIUM'
      }
    );
  }

  /**
   * 记录批量操作
   */
  logBulkOperation(operation, table, userId, ipAddress, affectedCount, criteria, userAgent = 'Unknown') {
    return this.logOperation(
      operation,
      table,
      userId,
      ipAddress,
      {
        affectedCount,
        criteria,
        userAgent,
        severity: 'MEDIUM'
      }
    );
  }

  /**
   * 记录登录尝试
   */
  logLoginAttempt(username, ipAddress, success, reason = '', userAgent = 'Unknown') {
    return this.logOperation(
      'LOGIN_ATTEMPT',
      'users',
      username,
      ipAddress,
      {
        success,
        reason,
        userAgent,
        severity: success ? 'LOW' : 'MEDIUM'
      }
    );
  }

  /**
   * 记录权限变更
   */
  logPermissionChange(targetUserId, changedBy, ipAddress, permissions, userAgent = 'Unknown') {
    return this.logOperation(
      'PERMISSION_CHANGE',
      'users',
      changedBy,
      ipAddress,
      {
        targetUserId,
        permissions,
        userAgent,
        severity: 'HIGH'
      }
    );
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(options = {}) {
    const {
      startDate,
      endDate,
      operation,
      table,
      userId,
      limit = 100
    } = options;

    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return [];
      }

      const logContent = fs.readFileSync(this.auditLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());

      let logs = lines.map(line => {
        const parts = line.split(' | ');
        if (parts.length >= 6) {
          return {
            timestamp: parts[0],
            operation: parts[1],
            table: parts[2],
            userId: parts[3].replace('User: ', ''),
            ipAddress: parts[4].replace('IP: ', ''),
            details: JSON.parse(parts[5].replace('Details: ', ''))
          };
        }
        return null;
      }).filter(log => log !== null);

      // 应用过滤器
      if (startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
      }

      if (endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
      }

      if (operation) {
        logs = logs.filter(log => log.operation === operation);
      }

      if (table) {
        logs = logs.filter(log => log.table === table);
      }

      if (userId) {
        logs = logs.filter(log => log.userId === userId);
      }

      return logs.slice(0, limit);
    } catch (error) {
      console.error('读取审计日志失败:', error);
      return [];
    }
  }

  /**
   * 清理旧日志
   */
  cleanupOldLogs(retentionDays = 90) {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const logs = this.getAuditLogs();
      const recentLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);

      // 重新写入最近的日志
      const logContent = recentLogs.map(log =>
        `${log.timestamp} | ${log.operation} | ${log.table} | User: ${log.userId} | IP: ${log.ipAddress} | Details: ${JSON.stringify(log.details)}`
      ).join('\n') + '\n';

      fs.writeFileSync(this.auditLogPath, logContent, 'utf8');
      console.log(`已清理 ${logs.length - recentLogs.length} 条旧审计日志`);
    } catch (error) {
      console.error('清理审计日志失败:', error);
    }
  }
}

module.exports = new DatabaseAudit();