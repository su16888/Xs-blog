/**
 * @file NoteSurveySubmission.js
 * @description 问卷提交记录数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteSurveySubmission = sequelize.define('NoteSurveySubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  survey_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的问卷ID',
    references: {
      model: 'note_surveys',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  submitter_ip: {
    type: DataTypes.STRING(45),
    allowNull: false,
    comment: '提交者IP地址'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '提交时间'
  }
}, {
  tableName: 'note_survey_submissions',
  timestamps: false
});

module.exports = NoteSurveySubmission;
