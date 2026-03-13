/**
 * @file NotePoll.js
 * @description 笔记投票数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotePoll = sequelize.define('NotePoll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  note_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的笔记ID',
    references: {
      model: 'notes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '投票标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '投票描述/说明'
  },
  poll_type: {
    type: DataTypes.ENUM('single', 'multiple'),
    allowNull: false,
    defaultValue: 'single',
    comment: '投票类型：single-单选, multiple-多选'
  },
  max_choices: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '最多可选择数量（多选时有效）',
    validate: {
      min: 1
    }
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '投票开始时间（可选）'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '投票截止时间（可选）'
  },
  result_visibility: {
    type: DataTypes.ENUM('none', 'before', 'after', 'admin'),
    allowNull: false,
    defaultValue: 'before',
    comment: '结果可见性：none-不可见, before-投票前可见, after-投票后可见, admin-仅后台可见'
  },
  allow_revote: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否允许修改投票'
  },
  ip_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '每个IP最多投票次数',
    validate: {
      min: 1
    }
  },
  show_participants: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台展示参与人数'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  redirect_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    comment: '投票后自动跳转URL'
  },
  total_votes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总投票人数（冗余字段）'
  }
}, {
  tableName: 'note_polls',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NotePoll;
