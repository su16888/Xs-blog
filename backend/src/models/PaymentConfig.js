const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentConfig = sequelize.define('PaymentConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  provider_key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  provider_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  remark: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  config_json: {
    type: DataTypes.JSON,
    allowNull: true
  },
  display_logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'payment_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PaymentConfig;
