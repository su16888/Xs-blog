/**
 * @file Service.js
 * @description Xs-Blog 服务业务数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '服务名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '服务简述'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '服务详情介绍（Markdown格式）'
  },
  content_format: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'markdown',
    comment: '服务详情格式（text/markdown/html）'
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '服务封面图（1:1正方形）'
  },
  price: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '价格（文本格式，可包含非数字）'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID（关联service_categories表）',
    references: {
      model: 'service_categories',
      key: 'id'
    }
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台显示'
  },
  is_recommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否推荐服务'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序（数字越小越靠前）'
  },
  show_order_button: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否显示"立即下单"按钮'
  },
  order_button_text: {
    type: DataTypes.STRING(50),
    defaultValue: '立即下单',
    comment: '下单按钮文字'
  },
  order_button_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '下单按钮跳转URL'
  },
  spec_title: {
    type: DataTypes.STRING(50),
    defaultValue: '服务规格',
    comment: '服务规格标题（可自定义）'
  },
  product_type: {
    type: DataTypes.ENUM('card', 'virtual', 'physical'),
    defaultValue: 'virtual',
    comment: '商品类型'
  },
  stock_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '库存总量'
  },
  stock_sold: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '已售数量'
  },
  show_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否展示库存'
  },
  show_sales: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否展示销量'
  },
  payment_config_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '绑定支付配置ID'
  },
  order_page_slug: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '下单页路径'
  }
}, {
  tableName: 'services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Service;
