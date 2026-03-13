/**
 * @file captcha.js
 * @description Xs-Blog 验证码工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');

// 存储验证码的缓存（生产环境建议使用Redis）
const captchaStore = new Map();

// 生成验证码
function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4, // 验证码长度
    ignoreChars: '0o1iIl', // 忽略容易混淆的字符
    noise: 2, // 干扰线条数量
    color: true, // 彩色验证码
    background: '#f0f0f0', // 背景色
    width: 120, // 宽度
    height: 40 // 高度
  });

  // 生成唯一ID
  const captchaId = crypto.randomBytes(16).toString('hex');
  const captchaText = captcha.text.toLowerCase(); // 转换为小写，不区分大小写

  // 存储验证码，5分钟后过期
  captchaStore.set(captchaId, {
    text: captchaText,
    expires: Date.now() + 5 * 60 * 1000 // 5分钟
  });

  // 清理过期验证码
  cleanupExpiredCaptchas();

  return {
    id: captchaId,
    data: captcha.data,
    text: captchaText // 仅用于调试，生产环境不应返回
  };
}

// 验证验证码
function validateCaptcha(captchaId, userInput) {
  if (!captchaId || !userInput) {
    return false;
  }

  const captcha = captchaStore.get(captchaId);
  if (!captcha) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > captcha.expires) {
    captchaStore.delete(captchaId);
    return false;
  }

  // 验证用户输入（不区分大小写）
  const isValid = captcha.text === userInput.toLowerCase();

  // 验证后删除验证码，防止重复使用
  if (isValid) {
    captchaStore.delete(captchaId);
  }

  return isValid;
}

// 清理过期验证码
function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [id, captcha] of captchaStore.entries()) {
    if (now > captcha.expires) {
      captchaStore.delete(id);
    }
  }
}

// 定期清理过期验证码（每小时清理一次）
setInterval(cleanupExpiredCaptchas, 60 * 60 * 1000);

module.exports = {
  generateCaptcha,
  validateCaptcha
};