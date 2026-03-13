/**
 * @file Profile.js
 * @description Xs-Blog 个人资料数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  website_title: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  company: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  background_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'profile',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Profile;
