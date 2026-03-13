'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 修改 is_published 字段的默认值为 true (1)
    await queryInterface.sequelize.query(`
      ALTER TABLE notes
      MODIFY COLUMN is_published BOOLEAN DEFAULT TRUE COMMENT '是否发布到前端'
    `);
  },

  async down(queryInterface, Sequelize) {
    // 回滚到原来的默认值 false
    await queryInterface.sequelize.query(`
      ALTER TABLE notes
      MODIFY COLUMN is_published BOOLEAN DEFAULT FALSE COMMENT '是否发布到前端'
    `);
  }
};