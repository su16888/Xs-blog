const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

async function safeDescribeTable(queryInterface, tableName) {
  try {
    return await queryInterface.describeTable(tableName)
  } catch (e) {
    return null
  }
}

async function getSqliteCreateTableSql(tableName) {
  const [rows] = await sequelize.query(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
    { replacements: [tableName] }
  )
  const first = Array.isArray(rows) ? rows[0] : null
  return first?.sql ? String(first.sql) : ''
}

async function getSqliteColumns(tableName) {
  const [rows] = await sequelize.query(`PRAGMA table_info(${sequelize.getQueryInterface().quoteIdentifier(tableName)})`)
  return Array.isArray(rows) ? rows.map((r) => r?.name).filter(Boolean) : []
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition, tableDesc) {
  const table = tableDesc || (await safeDescribeTable(queryInterface, tableName))
  if (table && table[columnName]) return
  await queryInterface.addColumn(tableName, columnName, definition)
}

async function hasIndex(queryInterface, tableName, indexName) {
  if (!indexName) return false
  try {
    const indexes = await queryInterface.showIndex(tableName)
    return Array.isArray(indexes) && indexes.some((idx) => idx && idx.name === indexName)
  } catch (e) {
    return false
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  try {
    if (options?.name) {
      const exists = await hasIndex(queryInterface, tableName, options.name)
      if (exists) return
    }
    await queryInterface.addIndex(tableName, fields, options)
  } catch (e) {}
}

async function ensurePaymentConfigSchema(queryInterface, dialect) {
  const jsonType = dialect === 'sqlite' ? DataTypes.TEXT : DataTypes.JSON
  const table = await safeDescribeTable(queryInterface, 'payment_configs')

  await addColumnIfMissing(queryInterface, 'payment_configs', 'provider_type', {
    type: DataTypes.STRING(50),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'payment_configs', 'config_json', {
    type: jsonType,
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'payment_configs', 'display_logo', {
    type: DataTypes.STRING(255),
    allowNull: true
  }, table)

  await addIndexIfMissing(queryInterface, 'payment_configs', ['provider_type'], { name: 'idx_provider_type' })
}

async function ensureOrdersSchema(queryInterface, dialect) {
  const jsonType = dialect === 'sqlite' ? DataTypes.TEXT : DataTypes.JSON
  const table = await safeDescribeTable(queryInterface, 'orders')

  await addColumnIfMissing(queryInterface, 'orders', 'buyer_email', {
    type: DataTypes.STRING(255),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'buyer_phone', {
    type: DataTypes.STRING(50),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'buyer_address', {
    type: DataTypes.TEXT,
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'shipping_status', {
    type: DataTypes.STRING(50),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'tracking_no', {
    type: DataTypes.STRING(100),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'shipped_at', {
    type: DataTypes.DATE,
    allowNull: true
  }, table)

  await addColumnIfMissing(queryInterface, 'orders', 'payment_gateway', {
    type: DataTypes.STRING(50),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'payment_trade_no', {
    type: DataTypes.STRING(64),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'payment_provider_order_id', {
    type: DataTypes.STRING(128),
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'payment_url', {
    type: DataTypes.TEXT,
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'paid_at', {
    type: DataTypes.DATE,
    allowNull: true
  }, table)
  await addColumnIfMissing(queryInterface, 'orders', 'payment_meta', {
    type: jsonType,
    allowNull: true
  }, table)

  await addIndexIfMissing(queryInterface, 'orders', ['shipping_status'], { name: 'idx_orders_shipping_status' })
  await addIndexIfMissing(queryInterface, 'orders', ['payment_trade_no'], { name: 'idx_payment_trade_no' })
  await addIndexIfMissing(queryInterface, 'orders', ['payment_gateway'], { name: 'idx_payment_gateway' })
  await addIndexIfMissing(queryInterface, 'orders', ['paid_at'], { name: 'idx_paid_at' })
}

async function ensureNotePollSchema(queryInterface, dialect) {
  if (dialect !== 'sqlite') return

  const table = await safeDescribeTable(queryInterface, 'note_polls')
  if (!table) return

  const createSql = await getSqliteCreateTableSql('note_polls')
  if (!createSql) return

  const hasNone = createSql.includes("'none'") || createSql.includes('"none"')
  if (hasNone) return

  const createTableSql = `
CREATE TABLE note_polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'single',
  max_choices INTEGER DEFAULT 1,
  start_time TEXT,
  end_time TEXT,
  result_visibility TEXT NOT NULL DEFAULT 'after',
  allow_revote INTEGER DEFAULT 0,
  ip_limit INTEGER DEFAULT 1,
  redirect_url TEXT,
  is_active INTEGER DEFAULT 1,
  total_votes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CHECK (poll_type IN ('single', 'multiple')),
  CHECK (result_visibility IN ('none', 'before', 'after', 'admin')),
  CHECK (max_choices > 0),
  CHECK (ip_limit > 0)
);
`

  const createIndexesAndTriggersSql = `
CREATE INDEX IF NOT EXISTS idx_note_polls_note_id ON note_polls(note_id);
CREATE INDEX IF NOT EXISTS idx_note_polls_is_active ON note_polls(is_active);
CREATE INDEX IF NOT EXISTS idx_note_polls_end_time ON note_polls(end_time);
CREATE TRIGGER IF NOT EXISTS update_note_polls_updated_at
AFTER UPDATE ON note_polls
BEGIN
  UPDATE note_polls SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`

  try {
    await sequelize.query('PRAGMA foreign_keys=OFF')
    await sequelize.query('BEGIN TRANSACTION')

    await sequelize.query('ALTER TABLE note_polls RENAME TO note_polls_old')
    await sequelize.query(createTableSql)

    const oldColumns = await getSqliteColumns('note_polls_old')
    const has = (name) => oldColumns.includes(name)

    const selectExpressions = [
      has('id') ? 'id' : 'NULL AS id',
      has('note_id') ? 'note_id' : 'NULL AS note_id',
      has('title') ? 'title' : "'' AS title",
      has('description') ? 'description' : 'NULL AS description',
      has('poll_type') ? 'poll_type' : "'single' AS poll_type",
      has('max_choices') ? 'max_choices' : '1 AS max_choices',
      has('start_time') ? 'start_time' : 'NULL AS start_time',
      has('end_time') ? 'end_time' : 'NULL AS end_time',
      has('result_visibility')
        ? "CASE WHEN result_visibility IS NULL OR TRIM(result_visibility) = '' THEN 'after' ELSE result_visibility END AS result_visibility"
        : "'after' AS result_visibility",
      has('allow_revote') ? 'allow_revote' : '0 AS allow_revote',
      has('ip_limit') ? 'ip_limit' : '1 AS ip_limit',
      has('redirect_url') ? 'redirect_url' : 'NULL AS redirect_url',
      has('is_active') ? 'is_active' : '1 AS is_active',
      has('total_votes') ? 'total_votes' : '0 AS total_votes',
      has('created_at') ? 'created_at' : "datetime('now') AS created_at",
      has('updated_at') ? 'updated_at' : "datetime('now') AS updated_at"
    ]

    const insertSql = `
INSERT INTO note_polls (
  id, note_id, title, description, poll_type, max_choices, start_time, end_time,
  result_visibility, allow_revote, ip_limit, redirect_url, is_active, total_votes, created_at, updated_at
)
SELECT
  ${selectExpressions.join(',\n  ')}
FROM note_polls_old;
`
    await sequelize.query(insertSql)
    await sequelize.query('DROP TABLE note_polls_old')
    await sequelize.query(createIndexesAndTriggersSql)

    await sequelize.query("DELETE FROM sqlite_sequence WHERE name = 'note_polls'")
    await sequelize.query(
      "INSERT INTO sqlite_sequence(name, seq) SELECT 'note_polls', COALESCE(MAX(id), 0) FROM note_polls"
    )

    await sequelize.query('COMMIT')
  } catch (e) {
    try {
      await sequelize.query('ROLLBACK')
    } catch (rollbackError) {}
    throw e
  } finally {
    try {
      await sequelize.query('PRAGMA foreign_keys=ON')
    } catch (e) {}
  }
}

async function ensureNoteExtensionsSchema(queryInterface, dialect) {
  const pollTable = await safeDescribeTable(queryInterface, 'note_polls')
  if (pollTable) {
    await addColumnIfMissing(queryInterface, 'note_polls', 'show_participants', {
      type: dialect === 'postgres' ? DataTypes.SMALLINT : DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }, pollTable)
  }

  const surveyTable = await safeDescribeTable(queryInterface, 'note_surveys')
  if (surveyTable) {
    await addColumnIfMissing(queryInterface, 'note_surveys', 'show_participants', {
      type: dialect === 'postgres' ? DataTypes.SMALLINT : DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }, surveyTable)
  }

  const lotteryTable = await safeDescribeTable(queryInterface, 'note_lotteries')
  if (lotteryTable) {
    await addColumnIfMissing(queryInterface, 'note_lotteries', 'result_visibility', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'before'
    }, lotteryTable)
  }

  if (dialect === 'mysql') {
    const updateCheckConstraint = async (tableName, columnName, allowedValues) => {
      try {
        const [rows] = await sequelize.query(
          `
SELECT tc.CONSTRAINT_NAME AS name, cc.CHECK_CLAUSE AS clause
FROM information_schema.TABLE_CONSTRAINTS tc
JOIN information_schema.CHECK_CONSTRAINTS cc
  ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
 AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
WHERE tc.TABLE_SCHEMA = DATABASE()
  AND tc.TABLE_NAME = ?
  AND tc.CONSTRAINT_TYPE = 'CHECK'
          `,
          { replacements: [tableName] }
        )

        const constraints = Array.isArray(rows) ? rows : []
        const related = constraints.filter((r) => String(r?.clause || '').includes(columnName))
        for (const c of related) {
          const name = c?.name
          if (!name) continue
          try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` DROP CHECK \`${name}\``)
          } catch (e) {}
        }

        const allowed = allowedValues.map((v) => `'${v}'`).join(', ')
        await sequelize.query(
          `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`chk_${tableName}_${columnName}\` CHECK (\`${columnName}\` IN (${allowed}))`
        )
      } catch (e) {}
    }

    await updateCheckConstraint('note_polls', 'result_visibility', ['none', 'before', 'after', 'admin'])
    await updateCheckConstraint('note_surveys', 'result_visibility', ['none', 'before', 'after', 'admin'])
    await updateCheckConstraint('note_lotteries', 'result_visibility', ['before', 'after', 'admin'])
  }
}

async function ensureStartupSchema() {
  const queryInterface = sequelize.getQueryInterface()
  const dialect = sequelize.getDialect()

  try {
    await ensurePaymentConfigSchema(queryInterface, dialect)
  } catch (e) {}

  try {
    await ensureOrdersSchema(queryInterface, dialect)
  } catch (e) {}

  try {
    await ensureNoteExtensionsSchema(queryInterface, dialect)
  } catch (e) {}

  try {
    await ensureNotePollSchema(queryInterface, dialect)
  } catch (e) {}
}

module.exports = { ensureStartupSchema }
