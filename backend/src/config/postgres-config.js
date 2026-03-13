/**
 * @file postgres-config.js
 * @description PostgreSQL 性能优化配置
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2025-12-19
 */

/**
 * 配置 PostgreSQL 会话级性能优化
 * @param {import('sequelize').Sequelize} sequelize - Sequelize 实例
 */
async function configurePostgres(sequelize) {
  if (sequelize.options.dialect !== 'postgres') {
    return;
  }

  try {
    // 设置搜索路径
    await sequelize.query('SET search_path TO public;');

    // 设置时区
    await sequelize.query("SET timezone = 'Asia/Shanghai';");

    // 优化查询计划器（SSD 优化）
    await sequelize.query('SET random_page_cost = 1.1;');
    await sequelize.query("SET effective_cache_size = '256MB';");

    // 设置工作内存（用于排序和哈希操作）
    await sequelize.query("SET work_mem = '16MB';");

    // 设置维护工作内存（用于 VACUUM、CREATE INDEX 等）
    await sequelize.query("SET maintenance_work_mem = '64MB';");

    console.log('✅ PostgreSQL performance optimizations applied.');
  } catch (error) {
    console.warn('⚠️ Failed to apply PostgreSQL optimizations:', error.message);
  }
}

module.exports = configurePostgres;
