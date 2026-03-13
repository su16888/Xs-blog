/**
 * @file Todo.js
 * @description Xs-Blog 待办事项数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Todo = sequelize.define('Todo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminder_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminder_dismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // v2.5 新增：进度管理字段
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'todo'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  actual_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // v2.6 新增：时间点记录
  time_logs: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: '时间点记录，格式：[{id, time, description}]'
  }
}, {
  tableName: 'todos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义父子任务关系
Todo.hasMany(Todo, {
  as: 'subtasks',
  foreignKey: 'parent_id'
});

Todo.belongsTo(Todo, {
  as: 'parent',
  foreignKey: 'parent_id'
});

module.exports = Todo;
