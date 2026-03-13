/**
 * @file security.js
 * @description Xs-Blog 安全中间件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const crypto = require('crypto');
const config = require('../config/config');

/**
 * API密钥验证中间件
 */
exports.verifyApiKey = (req, res, next) => {
  // 跳过开发环境
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API密钥缺失'
    });
  }

  if (apiKey !== config.security.apiKey) {
    return res.status(403).json({
      success: false,
      message: '无效的API密钥'
    });
  }

  next();
};

/**
 * IP白名单验证中间件
 */
exports.ipWhitelist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // 如果配置了IP白名单且不为空
  if (config.security.ipWhitelist && config.security.ipWhitelist.length > 0) {
    const allowed = config.security.ipWhitelist.some(ip => {
      return clientIP.includes(ip) || ip === '*';
    });

    if (!allowed) {
      console.warn(`IP访问被拒绝: ${clientIP}`);
      return res.status(403).json({
        success: false,
        message: 'IP地址不在白名单中'
      });
    }
  }

  next();
};

/**
 * 请求签名验证中间件
 */
exports.verifySignature = (req, res, next) => {
  if (!config.security.requestSigning) {
    return next();
  }

  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];

  if (!signature || !timestamp) {
    return res.status(400).json({
      success: false,
      message: '请求签名缺失'
    });
  }

  // 检查时间戳是否在合理范围内（5分钟内）
  const now = Date.now();
  const requestTime = parseInt(timestamp);

  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      message: '请求已过期'
    });
  }

  // 验证签名
  const expectedSignature = crypto
    .createHmac('sha256', config.security.apiKey)
    .update(`${timestamp}${JSON.stringify(req.body)}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).json({
      success: false,
      message: '无效的请求签名'
    });
  }

  next();
};

/**
 * 敏感操作日志记录
 */
exports.logSensitiveOperation = (operation) => {
  return (req, res, next) => {
    if (config.security.logSensitiveOperations) {
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      console.log(`[敏感操作] ${operation} - IP: ${clientIP} - UserAgent: ${userAgent} - Time: ${new Date().toISOString()}`);
    }
    next();
  };
};

/**
 * API防盗链中间件
 * 阻止直接在浏览器地址栏访问API，只允许来自合法来源的请求
 *
 * 验证逻辑：
 * 1. 开发环境：跳过验证
 * 2. 非GET请求：跳过验证（POST/PUT/DELETE不会被浏览器直接访问）
 * 3. 生产环境GET请求：必须满足以下条件之一
 *    - Referer/Origin 来自允许的域名（基于 CORS_ORIGIN 配置）
 *    - 是合法的 AJAX/Fetch 请求且 Origin 在白名单中
 */
const OPEN_RETURN_PATHS = ['/payments/yipay/return', '/payments/yipay/notify', '/payments/paypal/return', '/payments/paypal/cancel', '/payments/paypal/webhook'];

exports.apiRefererCheck = (req, res, next) => {
  // 跳过开发环境
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // 跳过非GET请求（POST/PUT/DELETE通常不会被直接浏览器访问）
  if (req.method !== 'GET') {
    return next();
  }

  if (OPEN_RETURN_PATHS.includes(req.path)) {
    return next();
  }

  // 获取请求来源信息
  const referer = req.headers['referer'];
  const origin = req.headers['origin'];
  const secFetchSite = req.headers['sec-fetch-site'];
  const secFetchMode = req.headers['sec-fetch-mode'];

  // 同源请求直接放行（same-origin 表示来自同一站点）
  if (secFetchSite === 'same-origin') {
    return next();
  }

  // 构建允许的来源列表
  const allowedOrigins = buildAllowedOrigins(req);

  // 验证 Referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      if (isOriginAllowed(refererOrigin, allowedOrigins)) {
        return next();
      }
    } catch (e) {
      // Referer 解析失败，继续检查其他条件
    }
  }

  // 验证 Origin（CORS 预检或跨域请求会带）
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    return next();
  }

  // 检查是否是合法的 Fetch/AJAX 请求（cors 模式 + 有 Origin）
  if (secFetchMode === 'cors' && origin) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return next();
    }
  }

  // 服务端请求（无浏览器特征头，如 SSR、curl 等）
  // 这类请求没有 Sec-Fetch-* 头，且通常没有 Referer
  const hasSecFetchHeaders = req.headers['sec-fetch-mode'] || req.headers['sec-fetch-site'];
  if (!hasSecFetchHeaders && !referer && !origin) {
    // 可能是服务端请求或旧浏览器，检查是否接受 JSON
    const acceptHeader = req.headers['accept'] || '';
    if (acceptHeader.includes('application/json')) {
      return next();
    }
  }

  // 拒绝访问
  return res.status(403).json({
    success: false,
    message: '禁止直接访问API'
  });
};

/**
 * 构建允许的来源列表
 * 基于 CORS_ORIGIN 环境变量和自动检测
 */
function buildAllowedOrigins(req) {
  const origins = new Set();

  // 1. 从 CORS_ORIGIN 环境变量获取
  if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
    process.env.CORS_ORIGIN.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) {
        origins.add(trimmed);
        // 同时添加不带端口的版本（用于 80/443 端口）
        try {
          const url = new URL(trimmed);
          origins.add(`${url.protocol}//${url.hostname}`);
        } catch (e) {}
      }
    });
  }

  // 2. 自动检测模式：基于当前请求的 Host 推断前端地址
  const host = req.get('host');
  if (host) {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const frontendPort = process.env.FRONTEND_PORT || '3000';

    try {
      // 解析当前 host
      let hostname = host;
      let currentPort = '';

      if (host.includes(':')) {
        [hostname, currentPort] = host.split(':');
      }

      // 添加同域名的前端地址（带端口）
      origins.add(`${protocol}://${hostname}:${frontendPort}`);
      // 添加同域名（不带端口，用于 Nginx 反向代理）
      origins.add(`${protocol}://${hostname}`);
      // 添加 https 版本
      origins.add(`https://${hostname}`);
      origins.add(`https://${hostname}:${frontendPort}`);
    } catch (e) {}
  }

  // 3. 添加 localhost 变体（用于本地测试）
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * 检查来源是否在允许列表中
 */
function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false;

  // 如果 CORS_ORIGIN 设置为 *，允许所有
  if (process.env.CORS_ORIGIN === '*') {
    return true;
  }

  // 精确匹配
  if (allowedOrigins.has(origin)) {
    return true;
  }

  // 尝试不带端口匹配（处理默认端口 80/443）
  try {
    const url = new URL(origin);
    const originWithoutPort = `${url.protocol}//${url.hostname}`;
    if (allowedOrigins.has(originWithoutPort)) {
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * 静态资源防盗链中间件
 * 阻止直接在浏览器地址栏访问静态资源，只允许从网页引用
 */
exports.staticRefererCheck = (req, res, next) => {
  // 跳过开发环境
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // 需要保护的文件扩展名
  const protectedExtensions = [
    '.css', '.js', '.md',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp',
    '.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.ttf', '.otf', '.woff', '.woff2', '.eot'
  ];

  // 获取请求路径的扩展名
  const ext = require('path').extname(req.path).toLowerCase();

  // 如果不是受保护的文件类型，直接放行
  if (!protectedExtensions.includes(ext)) {
    return next();
  }

  // 检查 Referer 头（从网页引用的资源会带）
  const referer = req.headers['referer'];

  // 检查 Sec-Fetch-Dest 头（现代浏览器会发送，表示资源用途）
  // image, style, script, font, video, audio 等表示是从网页引用的
  const secFetchDest = req.headers['sec-fetch-dest'];
  const validDest = ['image', 'style', 'script', 'font', 'video', 'audio', 'document', 'embed', 'object'];
  const isValidDest = secFetchDest && validDest.includes(secFetchDest);

  // 检查 Sec-Fetch-Site 头
  // same-origin, same-site, cross-site 表示是从网页发起的
  // none 表示直接在地址栏输入
  const secFetchSite = req.headers['sec-fetch-site'];
  const isFromPage = secFetchSite && secFetchSite !== 'none';

  // 如果有 Referer 或者是从网页引用的资源，放行
  if (referer || isValidDest || isFromPage) {
    return next();
  }

  // 否则拒绝访问
  return res.status(403).send('Forbidden: Direct access not allowed');
};

/**
 * SQL注入防护中间件
 */
exports.sqlInjectionProtection = (req, res, next) => {
  // 检查是否是已认证用户（后台管理员）
  const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

  // 如果是认证用户，跳过 SQL 注入检查（管理员可以输入任何内容）
  if (isAuthenticated) {
    return next();
  }

  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(WAITFOR|DELAY)\b)/i
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  // 检查查询参数
  if (req.query && Object.values(req.query).some(checkValue)) {
    return res.status(400).json({
      success: false,
      message: '检测到可疑的请求参数'
    });
  }

  // 检查请求体
  if (req.body && Object.values(req.body).some(checkValue)) {
    return res.status(400).json({
      success: false,
      message: '检测到可疑的请求数据'
    });
  }

  next();
};
