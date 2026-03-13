
const { sequelize } = require('../config/database');
const migration = require('../migrations/add-draw-type-to-lotteries');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize);
    
    console.log('Migration executed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
