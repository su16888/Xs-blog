/**
 * @file auth.js
 * @description Xs-Blog 认证路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    // 验证 token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }

    return res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
};

module.exports = authMiddleware;
