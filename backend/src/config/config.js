/**
 * @file config.js
 * @description Xs-Blog 后端配置文件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

// 使用加密的环境变量管理器
const envManager = require('../utils/envManager');
envManager.loadEnv();
envManager.validateEnv();

module.exports = {
  // 数据库配置
  database: {
    // 数据库类型：mysql 或 sqlite
    dialect: process.env.DB_DIALECT || 'mysql',

    // MySQL 配置
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xsblog888',

    // SQLite 配置（当 DB_DIALECT=sqlite 时生效）
    storage: process.env.DB_STORAGE || './database/xsblog.db',

    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00'
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 上传配置
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB (默认)
    adminMaxSize: 5 * 1024 * 1024, // 5MB (管理端硬限制)
    userMaxSize: parseInt(process.env.USER_MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB (用户端可配置)
    allowedTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/svg', 'image/x-icon', 'image/vnd.microsoft.icon',
      // 字体文件类型
      'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
      'application/x-font-ttf', 'application/x-font-truetype', 'application/x-font-opentype',
      'application/font-woff', 'application/font-woff2', 'application/vnd.ms-fontobject'
    ]
  },

  // CORS 配置（跨域资源共享）
  // ========================================
  // 支持三种配置方式：
  // 1. 自动检测：CORS_ORIGIN 留空，自动允许同域名的前端请求
  // 2. 单个域名：CORS_ORIGIN=http://example.com
  // 3. 多个域名：CORS_ORIGIN=http://example.com,https://example.com
  // 4. 允许所有：CORS_ORIGIN=*（不推荐用于生产环境）
  // ========================================
  cors: {
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      const normalizeOrigin = (value) => {
        if (!value) return value;
        return String(value).trim().replace(/\/$/, '');
      };

      const incoming = normalizeOrigin(origin);
      if (incoming) {
        try {
          const u = new URL(incoming);
          const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
          if (loopbackHosts.has(u.hostname)) {
            return callback(null, true);
          }
        } catch (e) {}
      }

      // 方式一：如果设置了 CORS_ORIGIN 环境变量（手动配置模式）
      if (process.env.CORS_ORIGIN) {
        // 允许所有来源（开发测试用）
        if (process.env.CORS_ORIGIN === '*') {
          return callback(null, true);
        }

        // 检查是否在允许列表中（支持多个域名，用逗号分隔）
        const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => normalizeOrigin(o));
        if (!incoming || allowedOrigins.includes(incoming)) {
          return callback(null, true);
        }

        // 不在允许列表中，拒绝请求
        return callback(new Error('Not allowed by CORS'));
      }

      // 方式二：如果没有设置 CORS_ORIGIN，自动检测模式（推荐）
      // 自动允许来自同一服务器的前端请求
      // 例如：后端在 http://119.8.116.13:3001，自动允许 http://119.8.116.13:3000
      // 例如：后端在 https://yourdomain.com:3001，自动允许 https://yourdomain.com:3000
      if (!origin) {
        // 没有 origin（同源请求或非浏览器请求，如 Postman）
        return callback(null, true);
      }

      try {
        const incoming = normalizeOrigin(origin);
        const originUrl = new URL(incoming);
        // 从环境变量读取前端端口，默认为 3000
        const frontendPort = process.env.FRONTEND_PORT || '3000';

        // 自动允许同主机的前端端口（带端口号）
        const allowedOriginWithPort = `${originUrl.protocol}//${originUrl.hostname}:${frontendPort}`;
        // 自动允许同主机（不带端口号，适用于 80/443 端口）
        const allowedOriginWithoutPort = `${originUrl.protocol}//${originUrl.hostname}`;

        if (incoming === allowedOriginWithPort || incoming === allowedOriginWithoutPort) {
          return callback(null, true);
        }

        // 默认拒绝其他来源
        return callback(new Error('Not allowed by CORS'));
      } catch (err) {
        return callback(new Error('Invalid origin'));
      }
    },
    credentials: true, // 允许携带凭证（Cookie、Authorization 等）
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的 HTTP 方法
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 允许的请求头
    maxAge: 86400 // 预检请求缓存时间（24小时）
  },

  // 安全配置
  security: {
    // API密钥验证
    apiKey: process.env.API_KEY || 'xs-blog-secure-key',
    // 请求签名
    requestSigning: process.env.REQUEST_SIGNING === 'true',
    // IP白名单
    ipWhitelist: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [],
    // 敏感操作记录
    logSensitiveOperations: true
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },

  // 网站信息配置
  site: {
    name: process.env.SITE_NAME || 'Xs-Blog'
  },

  // 邮件配置
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    notificationTo: process.env.EMAIL_NOTIFICATION_TO
  },

  // 文件URL生成配置
  // 返回相对路径 /uploads/xxx，便于切换存储方式（本地/S3等）
  // 前端通过 getFileUrl 函数将相对路径转换为完整URL
  // 参数说明：
  //   - filenameOrFile: 文件名字符串 或 multer 文件对象（包含 path 属性）
  //   - req: 可选，请求对象（用于从 req.file 获取路径）
  getFileUrl: function(filenameOrFile, req = null) {
    let relativePath;
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';

    // 情况1：传入的是 multer 文件对象（包含 path 属性）
    if (filenameOrFile && typeof filenameOrFile === 'object' && filenameOrFile.path) {
      const fullPath = filenameOrFile.path.replace(/\\/g, '/');
      const uploadIndex = fullPath.indexOf(uploadDir + '/');
      if (uploadIndex !== -1) {
        relativePath = fullPath.substring(uploadIndex + uploadDir.length + 1);
      } else {
        relativePath = filenameOrFile.filename || filenameOrFile.path.split('/').pop();
      }
    }
    // 情况2：传入的是文件名字符串，且 req.file 存在
    else if (req && req.file && req.file.path) {
      const fullPath = req.file.path.replace(/\\/g, '/');
      const uploadIndex = fullPath.indexOf(uploadDir + '/');
      if (uploadIndex !== -1) {
        relativePath = fullPath.substring(uploadIndex + uploadDir.length + 1);
      } else {
        relativePath = filenameOrFile;
      }
    }
    // 情况3：只传入文件名字符串
    else {
      relativePath = filenameOrFile;
    }

    // 返回相对路径，前端会根据需要拼接完整URL
    return `/uploads/${relativePath}`;
  },

  // 从 URL 或相对路径中提取文件的物理路径
  getFilePathFromUrl: function(urlOrPath) {
    if (!urlOrPath) return null;

    const path = require('path');
    let relativePath = urlOrPath;

    // 如果是完整 URL，提取 /uploads/ 之后的部分
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const uploadIndex = urlOrPath.indexOf('/uploads/');
      if (uploadIndex !== -1) {
        relativePath = urlOrPath.substring(uploadIndex);
      }
    }

    // 如果是相对路径（以 /uploads/ 开头），转换为物理路径
    if (relativePath.startsWith('/uploads/')) {
      return path.join(__dirname, '../../', relativePath);
    }

    return null;
  }
};
