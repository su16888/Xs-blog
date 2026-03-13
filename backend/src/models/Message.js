/**
 * @file Message.js
 * @description Xs-Blog 留言数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '用户称呼'
  },
  contact: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '用户联系方式'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '留言内容'
  },
  attachments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '附件路径（JSON数组）'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '提交者IP地址'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
  },
  status: {
    type: DataTypes.ENUM('pending', 'read', 'replied'),
    defaultValue: 'pending',
    comment: '状态：待处理、已读、已回复'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Message;
