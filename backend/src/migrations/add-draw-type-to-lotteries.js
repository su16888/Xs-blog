/**
 * @file add-draw-type-to-lotteries.js
 * @description 为 note_lotteries 表添加 draw_type 字段
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 检查列是否存在
    const tableInfo = await queryInterface.describeTable('note_lotteries');
    
    if (!tableInfo.draw_type) {
      await queryInterface.addColumn('note_lotteries', 'draw_type', {
        type: DataTypes.ENUM('manual', 'auto'),
        defaultValue: 'manual',
        allowNull: false,
        comment: '开奖方式：manual-手动, auto-自动'
      });
      console.log('✅ 已添加 draw_type 字段到 note_lotteries 表');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('note_lotteries');
    
    if (tableInfo.draw_type) {
      await queryInterface.removeColumn('note_lotteries', 'draw_type');
      // 注意：sequelize 不会自动删除 enum 类型，这里可能需要手动处理，但在 SQLite 中通常不需要
      console.log('✅ 已从 note_lotteries 表移除 draw_type 字段');
    }
  }
};
