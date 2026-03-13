const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending'
  },
  buyer_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  buyer_contact: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  buyer_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  buyer_phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  buyer_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_config_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payment_configs',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  payment_gateway: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payment_trade_no: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  payment_provider_order_id: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  payment_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.STRING(50),
    defaultValue: 'unpaid'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payment_meta: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancel_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shipping_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  tracking_no: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipped_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expired_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Order;
