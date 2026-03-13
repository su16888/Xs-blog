/**
 * @file add-source-info-to-notes.js
 * @description 为笔记表添加来源信息字段迁移
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-19
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 添加 source_type 字段
    await queryInterface.addColumn('notes', 'source_type', {
      type: Sequelize.ENUM('none', 'original', 'reprint'),
      defaultValue: 'none',
      allowNull: false,
      comment: '来源类型：none-不展示, original-原创, reprint-转载'
    });

    // 添加 source_url 字段
    await queryInterface.addColumn('notes', 'source_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: '转载来源URL'
    });

    // 添加 source_text 字段
    await queryInterface.addColumn('notes', 'source_text', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '文章来源文本（当source_url为空时使用）'
    });
  },

  async down(queryInterface, Sequelize) {
    // 删除添加的字段
    await queryInterface.removeColumn('notes', 'source_type');
    await queryInterface.removeColumn('notes', 'source_url');
    await queryInterface.removeColumn('notes', 'source_text');
  }
};