/**
 * @file app.js
 * @description Xs-Blog 后端应用入口文件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

// ============================================
// 强制重新加载 .env 文件（确保每次启动都读取最新配置）
// ============================================
const dotenv = require('dotenv');
const fs = require('fs');
const envPath = require('path').join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
}

// ============================================
// 错误输出限制器（超过20个错误中断启动）
// ============================================
let _errorCount = 0;
const _maxErrors = 20;
const _originalConsoleError = console.error;
console.error = function(...args) {
  _errorCount++;
  _originalConsoleError.apply(console, args);
  if (_errorCount >= _maxErrors) {
    _originalConsoleError.call(console, `\n⛔ 错误数量已达到 ${_maxErrors} 个，程序中断启动！`);
    process.exit(1);
  }
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const { testConnection } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const security = require('./middlewares/security');
const databaseSecurity = require('./middlewares/databaseSecurity');
const { ensureStartupSchema } = require('./utils/startupMigrations');
const { startScheduler } = require('./services/lotteryScheduler');
const { startOrderAutoCancelScheduler } = require('./services/orderAutoCancelScheduler');

// ============================================
// 主启动函数
// ============================================
(async () => {
  const app = express();

  // 信任代理配置
  app.set('trust proxy', true);

  // 测试数据库连接
  await testConnection();
  await ensureStartupSchema();

  // 安全中间件 - 增强HTTP头安全性
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // 隐藏X-Powered-By头
  app.disable('x-powered-by');

  // CORS 配置
  app.use(cors(config.cors));

  // 日志中间件
  if (config.server.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // 解析 JSON
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 静态文件服务 - 添加 CORS 头和防盗链
  app.use('/uploads', security.staticRefererCheck, cors(config.cors), express.static(path.join(__dirname, '../', config.upload.path)));

  // 安全中间件
  app.use('/api', security.apiRefererCheck);
  app.use(security.sqlInjectionProtection);
  app.use(security.ipWhitelist);

  // 数据库安全中间件
  app.use(databaseSecurity.auditDatabaseQueries);
  app.use(databaseSecurity.encryptSensitiveData);
  app.use(databaseSecurity.decryptSensitiveData);

  // 速率限制
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 5000 : 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: (req) => {
      if (process.env.NODE_ENV === 'development') {
        const skipPaths = ['/api/settings', '/api/auth/me'];
        return skipPaths.some(p => req.path.startsWith(p));
      }
      return false;
    }
  });
  app.use('/api/', limiter);

  // 健康检查路由
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString()
    });
  });

  // 数据库健康检查
  app.get('/health/database', async (req, res) => {
    const { sequelize } = require('./config/database');
    try {
      await sequelize.authenticate();
      res.json({
        success: true,
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Database connection failed',
        error: error.message
      });
    }
  });

  // 阻止直接访问 /api/ 根路径
  app.get('/api', (req, res) => {
    res.status(403).json({
      success: false,
      message: '禁止直接访问API根路径'
    });
  });

  // API 路由
  app.use('/api', routes);

  // 注册管理路由（从 .env 读取 ADMIN_API_PATH 配置）
  const { registerAdminRoutes } = routes;
  if (registerAdminRoutes) {
    registerAdminRoutes(app);
  }

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  // 错误处理中间件
  app.use(errorHandler);

  // 3. 启动服务器
  const PORT = process.env.PORT || config.server.port;
  const HOST = process.env.HOST || 'localhost';
  const PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📝 Environment: ${config.server.env}`);
    console.log(`🔗 API URL: ${PROTOCOL}://${HOST}:${PORT}/api`);

    // 启动自动抽奖调度器
    startScheduler();
    startOrderAutoCancelScheduler();
  });
})();
