/**
 * @file ServiceSpecification.js
 * @description Xs-Blog 服务规格数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceSpecification = sequelize.define('ServiceSpecification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属服务ID（关联services表）',
    references: {
      model: 'services',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  spec_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '规格名称'
  },
  spec_value: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '规格值'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序（数字越小越靠前）'
  }
}, {
  tableName: 'service_specifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ServiceSpecification;
