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

const express = require('express');
const router = express.Router();
const { generateCaptcha } = require('../utils/captcha');

// 获取验证码
router.get('/', (req, res) => {
  try {
    const captcha = generateCaptcha();

    // 设置响应头
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // 返回验证码ID和SVG数据
    res.json({
      success: true,
      data: {
        id: captcha.id,
        svg: captcha.data
      }
    });
  } catch (error) {
    console.error('生成验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成验证码失败'
    });
  }
});

module.exports = router;