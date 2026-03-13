/**
 * @file authController.js
 * @description Xs-Blog 认证控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-05
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// 注册
exports.register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      role: 'user',
      status: 'active'
    });

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 登录
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 调试信息 - 检查实际收到的密码
    console.log('登录请求调试信息:');
    console.log(`用户名: ${username}`);
    console.log(`收到的密码: ${password}`);
    console.log(`密码长度: ${password ? password.length : 0}`);
    console.log(`密码是否以$2a$开头: ${password ? password.startsWith('$2a$') : false}`);

    // 检查是否使用HTTPS（生产环境）
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const isProduction = process.env.NODE_ENV === 'production';

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// 修改密码
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
    }

    // 查找用户
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await user.update({
      password: hashedNewPassword
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
};

// 修改用户名
exports.changeUsername = async (req, res, next) => {
  try {
    const { currentPassword, newUsername } = req.body;

    // 验证必填字段
    if (!currentPassword || !newUsername) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新用户名不能为空'
      });
    }

    // 查找用户
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 检查新用户名是否已存在
    const existingUser = await User.findOne({ where: { username: newUsername } });
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 更新用户名
    await user.update({
      username: newUsername
    });

    res.json({
      success: true,
      message: '用户名修改成功'
    });
  } catch (error) {
    next(error);
  }
};

// 退出登录
exports.logout = async (req, res, next) => {
  try {
    // 对于JWT token，退出登录通常是在客户端删除token
    // 这里可以添加一些服务端的清理逻辑，比如记录退出日志等

    res.json({
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    next(error);
  }
};
