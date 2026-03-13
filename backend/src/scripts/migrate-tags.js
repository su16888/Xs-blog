/**
 * 标签数据迁移脚本
 *
 * 功能：
 * 1. 执行数据库结构迁移SQL
 * 2. 从notes表的tags字段（逗号分隔）提取标签
 * 3. 将标签插入tags表（去重）
 * 4. 在note_tags表中创建关联关系
 * 5. 迁移分类数据到categories表
 *
 * 使用方法：
 * node src/scripts/migrate-tags.js
 */

const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../config/config');
const path = require('path');
const fs = require('fs').promises;

// 创建数据库连接
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: console.log
  }
);

// 颜色配置
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * 执行SQL迁移文件
 */
async function executeMigrationSQL() {
  try {
    log('\n📄 读取迁移SQL文件...', 'blue');
    const sqlPath = path.join(__dirname, '../../../database/migrations/refactor_tags_and_categories.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // 分割SQL语句（跳过注释行）
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    log(`\n🚀 执行迁移SQL (共 ${statements.length} 条语句)...`, 'blue');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.includes('CREATE TABLE') || stmt.includes('ALTER TABLE')) {
        try {
          await sequelize.query(stmt, { type: QueryTypes.RAW });
          log(`  ✓ 语句 ${i + 1}/${statements.length} 执行成功`, 'green');
        } catch (error) {
          // 忽略已存在的错误
          if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            log(`  ⚠ 语句 ${i + 1}/${statements.length} 已存在，跳过`, 'yellow');
          } else {
            throw error;
          }
        }
      }
    }

    log('✅ SQL迁移完成\n', 'green');
  } catch (error) {
    log(`❌ SQL迁移失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 迁移分类数据到categories表
 */
async function migrateCategories() {
  try {
    log('📦 迁移分类数据...', 'blue');

    // 1. 从notes表中提取分类
    log('  - 提取笔记分类...', 'yellow');
    await sequelize.query(`
      INSERT IGNORE INTO categories (name, type, description, sort_order, color)
      SELECT DISTINCT
        category as name,
        'note' as type,
        CONCAT('笔记分类: ', category) as description,
        0 as sort_order,
        '#6366f1' as color
      FROM notes
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `, { type: QueryTypes.INSERT });

    // 2. 从sticky_notes表中提取分类
    log('  - 提取便签分类...', 'yellow');
    await sequelize.query(`
      INSERT IGNORE INTO categories (name, type, description, sort_order, color)
      SELECT DISTINCT
        category as name,
        'sticky_note' as type,
        CONCAT('便签分类: ', category) as description,
        0 as sort_order,
        '#10b981' as color
      FROM sticky_notes
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `, { type: QueryTypes.INSERT });

    // 3. 从tags表中提取分类
    log('  - 提取标签分类...', 'yellow');
    await sequelize.query(`
      INSERT IGNORE INTO categories (name, type, description, sort_order, color)
      SELECT DISTINCT
        category as name,
        'tag' as type,
        CONCAT('标签分类: ', category) as description,
        0 as sort_order,
        '#f59e0b' as color
      FROM tags
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `, { type: QueryTypes.INSERT });

    // 4. 更新notes表的category_id
    log('  - 更新笔记分类关联...', 'yellow');
    await sequelize.query(`
      UPDATE notes n
      INNER JOIN categories c ON n.category = c.name AND c.type = 'note'
      SET n.category_id = c.id
      WHERE n.category IS NOT NULL AND n.category != ''
    `, { type: QueryTypes.UPDATE });

    // 5. 更新sticky_notes表的category_id
    log('  - 更新便签分类关联...', 'yellow');
    await sequelize.query(`
      UPDATE sticky_notes sn
      INNER JOIN categories c ON sn.category = c.name AND c.type = 'sticky_note'
      SET sn.category_id = c.id
      WHERE sn.category IS NOT NULL AND sn.category != ''
    `, { type: QueryTypes.UPDATE });

    // 6. 更新tags表的category_id
    log('  - 更新标签分类关联...', 'yellow');
    await sequelize.query(`
      UPDATE tags t
      INNER JOIN categories c ON t.category = c.name AND c.type = 'tag'
      SET t.category_id = c.id
      WHERE t.category IS NOT NULL AND t.category != ''
    `, { type: QueryTypes.UPDATE });

    log('✅ 分类数据迁移完成\n', 'green');
  } catch (error) {
    log(`❌ 分类数据迁移失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 迁移标签数据
 */
async function migrateTags() {
  try {
    log('🏷️  迁移标签数据...', 'blue');

    // 1. 获取所有包含标签的笔记
    const notes = await sequelize.query(
      'SELECT id, tags FROM notes WHERE tags IS NOT NULL AND tags != ""',
      { type: QueryTypes.SELECT }
    );

    log(`  找到 ${notes.length} 条包含标签的笔记`, 'yellow');

    if (notes.length === 0) {
      log('  没有需要迁移的标签数据', 'yellow');
      return;
    }

    // 2. 收集所有标签（去重）
    const allTagsSet = new Set();
    const noteTagsMap = new Map(); // note_id -> tag_names[]

    for (const note of notes) {
      const tagNames = note.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      tagNames.forEach(tag => allTagsSet.add(tag));
      noteTagsMap.set(note.id, tagNames);
    }

    const uniqueTags = Array.from(allTagsSet);
    log(`  提取到 ${uniqueTags.length} 个唯一标签`, 'yellow');

    // 3. 插入标签到tags表（如果不存在）
    log('  - 插入标签到tags表...', 'yellow');
    const tagColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    for (let i = 0; i < uniqueTags.length; i++) {
      const tagName = uniqueTags[i];
      const color = tagColors[i % tagColors.length];

      try {
        await sequelize.query(
          `INSERT IGNORE INTO tags (name, description, color, sort_order)
           VALUES (:name, :description, :color, :sortOrder)`,
          {
            replacements: {
              name: tagName,
              description: `标签: ${tagName}`,
              color: color,
              sortOrder: i
            },
            type: QueryTypes.INSERT
          }
        );
      } catch (error) {
        // 忽略重复键错误
        if (!error.message.includes('Duplicate')) {
          throw error;
        }
      }
    }

    // 4. 获取所有标签ID
    const tagsInDb = await sequelize.query(
      'SELECT id, name FROM tags',
      { type: QueryTypes.SELECT }
    );

    const tagNameToId = new Map(tagsInDb.map(t => [t.name, t.id]));

    // 5. 创建note_tags关联关系
    log('  - 创建笔记-标签关联...', 'yellow');
    let relationCount = 0;

    for (const [noteId, tagNames] of noteTagsMap) {
      for (const tagName of tagNames) {
        const tagId = tagNameToId.get(tagName);
        if (tagId) {
          try {
            await sequelize.query(
              `INSERT IGNORE INTO note_tags (note_id, tag_id)
               VALUES (:noteId, :tagId)`,
              {
                replacements: { noteId, tagId },
                type: QueryTypes.INSERT
              }
            );
            relationCount++;
          } catch (error) {
            // 忽略重复键错误
            if (!error.message.includes('Duplicate')) {
              console.error(`    ⚠ 创建关联失败 (note_id: ${noteId}, tag_id: ${tagId}):`, error.message);
            }
          }
        }
      }
    }

    log(`  ✓ 创建了 ${relationCount} 条笔记-标签关联`, 'green');
    log('✅ 标签数据迁移完成\n', 'green');
  } catch (error) {
    log(`❌ 标签数据迁移失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 验证迁移结果
 */
async function verifyMigration() {
  try {
    log('🔍 验证迁移结果...', 'blue');

    // 统计数据
    const [categoriesCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM categories',
      { type: QueryTypes.SELECT }
    );

    const [tagsCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM tags',
      { type: QueryTypes.SELECT }
    );

    const [noteTagsCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM note_tags',
      { type: QueryTypes.SELECT }
    );

    const [notesWithCategoryId] = await sequelize.query(
      'SELECT COUNT(*) as count FROM notes WHERE category_id IS NOT NULL',
      { type: QueryTypes.SELECT }
    );

    log('\n📊 迁移统计:', 'bright');
    log(`  - 分类总数: ${categoriesCount.count}`, 'green');
    log(`  - 标签总数: ${tagsCount.count}`, 'green');
    log(`  - 笔记-标签关联数: ${noteTagsCount.count}`, 'green');
    log(`  - 已关联分类的笔记数: ${notesWithCategoryId.count}`, 'green');

    log('\n✅ 迁移验证完成\n', 'green');
  } catch (error) {
    log(`❌ 验证失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🚀 开始标签和分类数据迁移', 'bright');
    log('='.repeat(60) + '\n', 'bright');

    // 测试数据库连接
    log('🔌 测试数据库连接...', 'blue');
    await sequelize.authenticate();
    log('✅ 数据库连接成功\n', 'green');

    // 执行迁移步骤
    await executeMigrationSQL();
    await migrateCategories();
    await migrateTags();
    await verifyMigration();

    log('='.repeat(60), 'bright');
    log('🎉 迁移完成！', 'bright');
    log('='.repeat(60) + '\n', 'bright');

    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ 迁移失败', 'red');
    log('='.repeat(60), 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 执行主函数
main();
