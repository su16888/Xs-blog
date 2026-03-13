/**
 * @file NoteSurvey.js
 * @description 笔记问卷数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteSurvey = sequelize.define('NoteSurvey', {
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
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '问卷标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '问卷描述/说明'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '问卷开始时间（可选）'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '问卷截止时间（可选）'
  },
  ip_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '每个IP最多提交次数',
    validate: {
      min: 1
    }
  },
  allow_resubmit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否允许修改提交'
  },
  result_visibility: {
    type: DataTypes.ENUM('none', 'before', 'after', 'admin'),
    allowNull: false,
    defaultValue: 'before',
    comment: '结果可见性：none-不可见(兼容), before-前台可见, after-提交后可见, admin-仅后台可见'
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
    comment: '问卷提交后自动跳转URL'
  },
  total_submissions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总提交数（冗余字段）'
  }
}, {
  tableName: 'note_surveys',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NoteSurvey;
