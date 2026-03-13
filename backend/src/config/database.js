/**
 * @file database.js
 * @description Xs-Blog 数据库配置
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { Sequelize } = require('sequelize');
const config = require('./config');
const configurePostgres = require('./postgres-config');

// 数据库安全配置
const dbConfig = {
  dialect: config.database.dialect,
  logging: config.database.logging,
  timezone: config.database.timezone,

  // MySQL 特定配置
  ...(config.database.dialect === 'mysql' && {
    host: config.database.host,
    port: config.database.port,

    // 安全配置
    dialectOptions: {
      // SSL 连接配置（生产环境推荐）
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false,

      // 连接超时设置
      connectTimeout: 60000,

      // 字符集配置
      charset: 'utf8mb4'
    },

    // 连接重试配置
    retry: {
      max: 3,
      timeout: 30000
    },

    // 查询超时
    queryTimeout: 30000,

    // 连接池配置（合并基础配置和健康检查）
    pool: {
      ...config.database.pool,
      acquire: 60000,
      evict: 10000,
      handleDisconnects: true
    }
  }),

  // SQLite 特定配置
  ...(config.database.dialect === 'sqlite' && {
    storage: config.database.storage,

    // SQLite 不需要连接池，但保留配置以保持兼容性
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }),

  // PostgreSQL 特定配置
  ...(config.database.dialect === 'postgres' && {
    host: config.database.host,
    port: config.database.port,

    // 安全配置
    dialectOptions: {
      // SSL 连接配置（生产环境推荐）
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false,

      // 语句超时（毫秒）
      statement_timeout: 30000,
      // 查询超时（毫秒）
      query_timeout: 30000
    },

    // 连接池配置
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
      evict: 10000
    }
  }),

  // 防止SQL注入
  benchmark: false,

  // 连接验证
  validateConnection: true
};

// 根据数据库类型初始化 Sequelize
const sequelize = config.database.dialect === 'sqlite'
  ? new Sequelize({
      ...dbConfig,
      // SQLite 不需要数据库名、用户名和密码
    })
  : new Sequelize(
      config.database.database,
      config.database.username,
      config.database.password,
      dbConfig
    );

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // 应用 PostgreSQL 性能优化
    await configurePostgres(sequelize);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
