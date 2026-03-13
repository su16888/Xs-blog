/**
 * @file associations.js
 * @description Xs-Blog 数据模型关联定义
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

/**
 * 模型关联关系定义
 * 在这里统一定义所有模型之间的关联关系
 */

const Note = require('./Note');
const Tag = require('./Tag');
const NoteTag = require('./NoteTag');
const Category = require('./Category');
const StickyNote = require('./StickyNote');
const Message = require('./Message');
const MessageCategory = require('./MessageCategory');
const Site = require('./Site');
const NavigationCategory = require('./NavigationCategory');
const Todo = require('./Todo');
const TodoTimeLog = require('./TodoTimeLog');
const TodoCategory = require('./TodoCategory');
const Setting = require('./Setting');
const Gallery = require('./Gallery');
const GalleryCategory = require('./GalleryCategory');
const GalleryImage = require('./GalleryImage');
const Service = require('./Service');
const ServiceCategory = require('./ServiceCategory');
const ServiceSpecification = require('./ServiceSpecification');
const PaymentConfig = require('./PaymentConfig');
const Order = require('./Order');
const Card = require('./Card');
const NotePoll = require('./NotePoll');
const NotePollOption = require('./NotePollOption');
const NotePollVote = require('./NotePollVote');
const NoteSurvey = require('./NoteSurvey');
const NoteSurveyQuestion = require('./NoteSurveyQuestion');
const NoteSurveyQuestionOption = require('./NoteSurveyQuestionOption');
const NoteSurveySubmission = require('./NoteSurveySubmission');
const NoteSurveyAnswer = require('./NoteSurveyAnswer');
const NoteLottery = require('./NoteLottery');
const NoteLotteryPrize = require('./NoteLotteryPrize');
const NoteLotteryEntry = require('./NoteLotteryEntry');

// ========================================
// 笔记 <-> 标签 (多对多)
// ========================================
Note.belongsToMany(Tag, {
  through: NoteTag,
  foreignKey: 'note_id',
  otherKey: 'tag_id',
  as: 'tagList'
});

Tag.belongsToMany(Note, {
  through: NoteTag,
  foreignKey: 'tag_id',
  otherKey: 'note_id',
  as: 'notes'
});

// ========================================
// 笔记 <-> 分类 (多对一)
// ========================================
Note.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'categoryInfo'
});

Category.hasMany(Note, {
  foreignKey: 'category_id',
  as: 'notes'
});

// ========================================
// 标签 <-> 分类 (多对一)
// ========================================
Tag.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'categoryInfo'
});

Category.hasMany(Tag, {
  foreignKey: 'category_id',
  as: 'tags'
});

// ========================================
// 便签 <-> 分类 (多对一)
// ========================================
StickyNote.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'categoryInfo'
});

Category.hasMany(StickyNote, {
  foreignKey: 'category_id',
  as: 'stickyNotes'
});

// ========================================
// 留言 <-> 留言分类 (多对一)
// ========================================
Message.belongsTo(MessageCategory, {
  foreignKey: 'category_id',
  as: 'MessageCategory'
});

MessageCategory.hasMany(Message, {
  foreignKey: 'category_id',
  as: 'messages'
});

// ========================================
// 导航站点 <-> 导航分类 (多对一)
// ========================================
Site.belongsTo(NavigationCategory, {
  foreignKey: 'category_id',
  as: 'category'
});

NavigationCategory.hasMany(Site, {
  foreignKey: 'category_id',
  as: 'sites'
});

// ========================================
// 待办事项 <-> 时间记录 (一对多)
// ========================================
Todo.hasMany(TodoTimeLog, {
  foreignKey: 'todo_id',
  as: 'timeLogs'
});

TodoTimeLog.belongsTo(Todo, {
  foreignKey: 'todo_id',
  as: 'todo'
});

// ========================================
// 图册 <-> 图册分类 (多对一)
// ========================================
Gallery.belongsTo(GalleryCategory, {
  foreignKey: 'category_id',
  as: 'category'
});

GalleryCategory.hasMany(Gallery, {
  foreignKey: 'category_id',
  as: 'galleries'
});

// ========================================
// 图册 <-> 图片 (一对多)
// ========================================
Gallery.hasMany(GalleryImage, {
  foreignKey: 'gallery_id',
  as: 'images'
});

GalleryImage.belongsTo(Gallery, {
  foreignKey: 'gallery_id',
  as: 'gallery'
});

// ========================================
// 服务 <-> 服务分类 (多对一)
// ========================================
Service.belongsTo(ServiceCategory, {
  foreignKey: 'category_id',
  as: 'category'
});

ServiceCategory.hasMany(Service, {
  foreignKey: 'category_id',
  as: 'services'
});

// ========================================
// 服务 <-> 服务规格 (一对多)
// ========================================
Service.hasMany(ServiceSpecification, {
  foreignKey: 'service_id',
  as: 'specifications'
});

ServiceSpecification.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service'
});

Service.hasMany(Order, {
  foreignKey: 'service_id',
  as: 'orders'
});

Order.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service'
});

PaymentConfig.hasMany(Order, {
  foreignKey: 'payment_config_id',
  as: 'orders'
});

Order.belongsTo(PaymentConfig, {
  foreignKey: 'payment_config_id',
  as: 'paymentConfig'
});

Service.hasMany(Card, {
  foreignKey: 'service_id',
  as: 'cards'
});

Card.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service'
});

Order.hasMany(Card, {
  foreignKey: 'bind_order_id',
  as: 'cards'
});

Card.belongsTo(Order, {
  foreignKey: 'bind_order_id',
  as: 'order'
});

// ========================================
// 笔记 <-> 投票 (一对多)
// ========================================
Note.hasMany(NotePoll, {
  foreignKey: 'note_id',
  as: 'polls'
});

NotePoll.belongsTo(Note, {
  foreignKey: 'note_id',
  as: 'note'
});

// ========================================
// 投票 <-> 投票选项 (一对多)
// ========================================
NotePoll.hasMany(NotePollOption, {
  foreignKey: 'poll_id',
  as: 'options'
});

NotePollOption.belongsTo(NotePoll, {
  foreignKey: 'poll_id',
  as: 'poll'
});

// ========================================
// 投票 <-> 投票记录 (一对多)
// ========================================
NotePoll.hasMany(NotePollVote, {
  foreignKey: 'poll_id',
  as: 'votes'
});

NotePollVote.belongsTo(NotePoll, {
  foreignKey: 'poll_id',
  as: 'poll'
});

// ========================================
// 投票选项 <-> 投票记录 (一对多)
// ========================================
NotePollOption.hasMany(NotePollVote, {
  foreignKey: 'option_id',
  as: 'votes'
});

NotePollVote.belongsTo(NotePollOption, {
  foreignKey: 'option_id',
  as: 'option'
});

// ========================================
// 笔记 <-> 问卷 (一对多)
// ========================================
Note.hasMany(NoteSurvey, {
  foreignKey: 'note_id',
  as: 'surveys'
});

NoteSurvey.belongsTo(Note, {
  foreignKey: 'note_id',
  as: 'note'
});

// ========================================
// 问卷 <-> 问卷题目 (一对多)
// ========================================
NoteSurvey.hasMany(NoteSurveyQuestion, {
  foreignKey: 'survey_id',
  as: 'questions'
});

NoteSurveyQuestion.belongsTo(NoteSurvey, {
  foreignKey: 'survey_id',
  as: 'survey'
});

// ========================================
// 问卷题目 <-> 题目选项 (一对多)
// ========================================
NoteSurveyQuestion.hasMany(NoteSurveyQuestionOption, {
  foreignKey: 'question_id',
  as: 'options'
});

NoteSurveyQuestionOption.belongsTo(NoteSurveyQuestion, {
  foreignKey: 'question_id',
  as: 'question'
});

// ========================================
// 问卷 <-> 提交记录 (一对多)
// ========================================
NoteSurvey.hasMany(NoteSurveySubmission, {
  foreignKey: 'survey_id',
  as: 'submissions'
});

NoteSurveySubmission.belongsTo(NoteSurvey, {
  foreignKey: 'survey_id',
  as: 'survey'
});

// ========================================
// 提交记录 <-> 答案 (一对多)
// ========================================
NoteSurveySubmission.hasMany(NoteSurveyAnswer, {
  foreignKey: 'submission_id',
  as: 'answers'
});

NoteSurveyAnswer.belongsTo(NoteSurveySubmission, {
  foreignKey: 'submission_id',
  as: 'submission'
});

// ========================================
// 题目 <-> 答案 (一对多)
// ========================================
NoteSurveyQuestion.hasMany(NoteSurveyAnswer, {
  foreignKey: 'question_id',
  as: 'answers'
});

NoteSurveyAnswer.belongsTo(NoteSurveyQuestion, {
  foreignKey: 'question_id',
  as: 'question'
});

// ========================================
// 笔记 <-> 抽奖 (一对多)
// ========================================
Note.hasMany(NoteLottery, {
  foreignKey: 'note_id',
  as: 'lotteries'
});

NoteLottery.belongsTo(Note, {
  foreignKey: 'note_id',
  as: 'note'
});

// ========================================
// 抽奖 <-> 奖项 (一对多)
// ========================================
NoteLottery.hasMany(NoteLotteryPrize, {
  foreignKey: 'lottery_id',
  as: 'prizes'
});

NoteLotteryPrize.belongsTo(NoteLottery, {
  foreignKey: 'lottery_id',
  as: 'lottery'
});

// ========================================
// 抽奖 <-> 参与记录 (一对多)
// ========================================
NoteLottery.hasMany(NoteLotteryEntry, {
  foreignKey: 'lottery_id',
  as: 'entries'
});

NoteLotteryEntry.belongsTo(NoteLottery, {
  foreignKey: 'lottery_id',
  as: 'lottery'
});

// ========================================
// 奖项 <-> 参与记录 (一对多)
// ========================================
NoteLotteryPrize.hasMany(NoteLotteryEntry, {
  foreignKey: 'prize_id',
  as: 'entries'
});

NoteLotteryEntry.belongsTo(NoteLotteryPrize, {
  foreignKey: 'prize_id',
  as: 'prize'
});

module.exports = {
  Note,
  Tag,
  NoteTag,
  Category,
  StickyNote,
  Message,
  MessageCategory,
  Site,
  NavigationCategory,
  Todo,
  TodoTimeLog,
  TodoCategory,
  Setting,
  Gallery,
  GalleryCategory,
  GalleryImage,
  Service,
  ServiceCategory,
  ServiceSpecification,
  PaymentConfig,
  Order,
  Card,
  NotePoll,
  NotePollOption,
  NotePollVote,
  NoteSurvey,
  NoteSurveyQuestion,
  NoteSurveyQuestionOption,
  NoteSurveySubmission,
  NoteSurveyAnswer,
  NoteLottery,
  NoteLotteryPrize,
  NoteLotteryEntry
};
