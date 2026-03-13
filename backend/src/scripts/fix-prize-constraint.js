
const { sequelize } = require('../config/database');

async function fixConstraint() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const queryInterface = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();
    
    console.log(`Detected dialect: ${dialect}`);

    if (dialect === 'mysql') {
      try {
        await sequelize.query('ALTER TABLE note_lottery_prizes DROP CHECK check_quantity_positive');
        console.log('Dropped check_quantity_positive (MySQL)');
      } catch (e) {
        console.log('Error dropping constraint (might not exist):', e.message);
      }
      
      try {
        await sequelize.query('ALTER TABLE note_lottery_prizes ADD CONSTRAINT check_quantity_positive CHECK (quantity >= 0)');
        console.log('Added updated check_quantity_positive (MySQL)');
      } catch (e) {
        console.error('Error adding constraint:', e.message);
      }
    } 
    else if (dialect === 'postgres') {
      try {
        await sequelize.query('ALTER TABLE note_lottery_prizes DROP CONSTRAINT IF EXISTS check_quantity_positive');
        console.log('Dropped check_quantity_positive (Postgres)');
      } catch (e) {
        console.log('Error dropping constraint:', e.message);
      }
      
      try {
        await sequelize.query('ALTER TABLE note_lottery_prizes ADD CONSTRAINT check_quantity_positive CHECK (quantity >= 0)');
        console.log('Added updated check_quantity_positive (Postgres)');
      } catch (e) {
        console.error('Error adding constraint:', e.message);
      }
    }
    else if (dialect === 'sqlite') {
      console.log('SQLite does not support altering constraints easily. Attempting to disable foreign keys and rebuild table is risky in this script.');
      console.log('If you are using SQLite, the constraint might be ignored depending on your version, or you might need to manually rebuild the table.');
      
      // Attempting a hack for SQLite: verify if check constraint is actually enforcing > 0
      // Usually SQLite constraints are defined at CREATE TABLE.
      // If the user is running SQLite, they might not face this issue unless they have a very specific setup or strict mode.
      // But if they DO face it, we would need to:
      // 1. Rename table
      // 2. Create new table with correct constraint
      // 3. Copy data
      // 4. Drop old table
      
      console.log('Attempting SQLite table rebuild (safe mode)...');
      
      const transaction = await sequelize.transaction();
      try {
        // 1. Check if table exists
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='note_lottery_prizes'");
        if (results.length > 0) {
           // 2. Get create SQL
           const [schema] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='note_lottery_prizes'");
           let createSql = schema[0].sql;
           
           if (createSql.includes('quantity > 0')) {
             console.log('Found problematic constraint in SQLite schema.');
             
             // 3. Rename current table
             await sequelize.query('ALTER TABLE note_lottery_prizes RENAME TO note_lottery_prizes_old', { transaction });
             
             // 4. Create new table with fixed SQL
             const newCreateSql = createSql.replace('quantity > 0', 'quantity >= 0');
             await sequelize.query(newCreateSql, { transaction });
             
             // 5. Copy data
             await sequelize.query('INSERT INTO note_lottery_prizes SELECT * FROM note_lottery_prizes_old', { transaction });
             
             // 6. Drop old table
             await sequelize.query('DROP TABLE note_lottery_prizes_old', { transaction });
             
             console.log('SQLite table rebuilt successfully.');
           } else {
             console.log('Constraint seems fine or not found in SQL string.');
           }
        }
        await transaction.commit();
      } catch (e) {
        await transaction.rollback();
        console.error('SQLite fix failed:', e.message);
      }
    }
    else {
      console.log(`Unsupported dialect for automatic fix: ${dialect}`);
    }

  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await sequelize.close();
  }
}

fixConstraint();
