/**
 * @file PageVisit.js
 * @description Xs-Blog 页面访问统计数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-15
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PageVisit = sequelize.define('PageVisit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  page_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '页面类型：home, social-feed, notes, navigation, galleries, services, messages, docs'
  },
  page_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '具体页面路径'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: false,
    comment: 'IP地址（支持IPv6）'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '浏览器User-Agent'
  },
  referer: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '来源页面'
  },
  visit_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '访问日期（用于按日统计）'
  }
}, {
  tableName: 'page_visits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_page_type',
      fields: ['page_type']
    },
    {
      name: 'idx_visit_date',
      fields: ['visit_date']
    },
    {
      name: 'idx_ip_address',
      fields: ['ip_address']
    },
    {
      name: 'idx_page_type_date',
      fields: ['page_type', 'visit_date']
    }
  ]
});

module.exports = PageVisit;
