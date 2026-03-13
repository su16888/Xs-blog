/**
 * @file rateLimit.js
 * @description Xs-Blog 速率限制中间件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const rateLimit = require('express-rate-limit');

// 登录速率限制 - 防止暴力破解
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制15分钟内最多5次尝试
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 删除 keyGenerator，使用默认的 IPv6 安全处理
  // 跳过成功的请求（只计算失败的）
  skipSuccessfulRequests: true
});

// API请求速率限制 - 防止滥用
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100, // 限制每分钟100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
  // 删除 keyGenerator，使用默认的 IPv6 安全处理
});

// 严格的API速率限制（用于敏感操作）
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 限制15分钟内最多10次
  message: {
    success: false,
    message: '操作过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
  // 删除 keyGenerator，使用默认的 IPv6 安全处理
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter
};
