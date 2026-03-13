/**
 * @file index.js
 * @description Xs-Blog 数据模型入口文件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const Profile = require('./Profile');
const SocialLink = require('./SocialLink');
const Site = require('./Site');
const Note = require('./Note');
const Setting = require('./Setting');
const StickyNote = require('./StickyNote');
const Todo = require('./Todo');
const TodoTimeLog = require('./TodoTimeLog');
const TodoCategory = require('./TodoCategory');
const Tag = require('./Tag');
const Category = require('./Category');
const NoteTag = require('./NoteTag');
const Message = require('./Message');
const MessageCategory = require('./MessageCategory');
const NavigationCategory = require('./NavigationCategory');
const Service = require('./Service');
const ServiceCategory = require('./ServiceCategory');
const ServiceSpecification = require('./ServiceSpecification');
const PageVisit = require('./PageVisit');

// 导入关联定义
require('./associations');

// 导出所有模型
module.exports = {
  sequelize,
  User,
  Profile,
  SocialLink,
  Site,
  Note,
  Setting,
  StickyNote,
  Todo,
  TodoTimeLog,
  TodoCategory,
  Tag,
  Category,
  NoteTag,
  Message,
  MessageCategory,
  NavigationCategory,
  Service,
  ServiceCategory,
  ServiceSpecification,
  PageVisit
};
