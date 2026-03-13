/**
 * @file TodoTimeLog.js
 * @description Xs-Blog 待办事项时间记录数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-17
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TodoTimeLog = sequelize.define('TodoTimeLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  todo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '待办事项ID'
  },
  log_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '记录日期'
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '开始时间'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: '结束时间'
  },
  duration: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: '持续时长（小时）'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '工作内容描述'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'todo_time_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '待办事项时间记录表'
});

module.exports = TodoTimeLog;
