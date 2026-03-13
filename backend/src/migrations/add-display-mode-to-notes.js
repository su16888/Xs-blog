/**
 * @file add-display-mode-to-notes.js
 * @description 为笔记表添加展示模式字段迁移
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-15
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 添加 display_mode 字段
    await queryInterface.addColumn('notes', 'display_mode', {
      type: Sequelize.ENUM('modal', 'page'),
      defaultValue: 'modal',
      allowNull: false,
      comment: '展示模式：modal-窗口展示, page-页面展示'
    });
  },

  async down(queryInterface, Sequelize) {
    // 删除添加的字段
    await queryInterface.removeColumn('notes', 'display_mode');
  }
};
