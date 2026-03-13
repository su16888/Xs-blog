/**
 * @file NoteSurveyQuestion.js
 * @description 问卷题目数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteSurveyQuestion = sequelize.define('NoteSurveyQuestion', {
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
  question_type: {
    type: DataTypes.ENUM('text', 'textarea', 'radio', 'checkbox', 'file', 'rating', 'date', 'time'),
    allowNull: false,
    comment: '题目类型：text-单行文本, textarea-多行文本, radio-单选, checkbox-多选, file-文件上传, rating-评分, date-日期, time-时间'
  },
  question_title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '题目标题'
  },
  question_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '题目描述/说明'
  },
  question_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '题目图片URL'
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否必填'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '题目配置（如字数限制、选项等）',
    defaultValue: {}
  }
}, {
  tableName: 'note_survey_questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NoteSurveyQuestion;
