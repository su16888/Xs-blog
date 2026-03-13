/**
 * @file serviceController.js
 * @description Xs-Blog 服务业务控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceSpecification = require('../models/ServiceSpecification');
const Card = require('../models/Card');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sanitizeHtml = require('sanitize-html');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

const normalizeContentFormat = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'text' || raw === 'markdown' || raw === 'html') return raw;
  return 'markdown';
};

const sanitizeServiceHtml = (value) => {
  const html = String(value ?? '');
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
      'ul', 'ol', 'li',
      'blockquote',
      'pre', 'code',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a',
      'img',
      'div', 'span'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': []
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }, true)
    }
  });
};

const isMissingColumnError = (error, columnName) => {
  const message = String(error?.original?.message || error?.parent?.message || error?.message || '');
  const code = String(error?.original?.code || error?.parent?.code || error?.original?.sqlState || '');
  const normalized = message.toLowerCase();
  if (code === 'ER_BAD_FIELD_ERROR' || code === '42703') return message.includes(columnName);
  if (normalized.includes('unknown column') && message.includes(columnName)) return true;
  if (normalized.includes('does not exist') && message.includes(columnName)) return true;
  return false;
};

const publicServiceAttributes = (includeContentFormat = true) => ([
  'id',
  'name',
  'description',
  'content',
  ...(includeContentFormat ? ['content_format'] : []),
  'cover_image',
  'price',
  'is_recommended',
  'show_order_button',
  'order_button_text',
  'order_button_url',
  'product_type',
  'stock_total',
  'stock_sold',
  'show_stock',
  'show_sales',
  'payment_config_id',
  'order_page_slug'
]);

const normalizeOrderPageSlug = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  return raw;
};

const generateRandomSlug = (length = 10) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
};

const generateUniqueOrderPageSlug = async ({ excludeServiceId } = {}) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateRandomSlug(10);
    const where = { order_page_slug: candidate };
    if (excludeServiceId) {
      where.id = { [Op.ne]: excludeServiceId };
    }
    const exists = await Service.count({ where });
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate unique order_page_slug');
};

const isValidPaymentPrice = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return false;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0;
};

const computeOrderButtonUrlFromSlug = (orderPageSlug) => {
  if (!orderPageSlug) return '';
  const raw = String(orderPageSlug).trim();
  if (!raw) return '';
  return raw.startsWith('/') ? raw : `/p/${raw}`;
};

// ==================== 公开API方法（/api/services） ====================

// 获取前端可见服务（公开访问，只返回展示字段）
exports.getPublicServices = async (req, res, next) => {
  try {
    const { category_id, is_recommended, search, page = 1, limit = 12 } = req.query;
    const where = { is_visible: true };

    // 分类筛选
    if (category_id) {
      where.category_id = category_id;
    }

    // 推荐筛选
    if (is_recommended) {
      where.is_recommended = is_recommended === 'true';
    }

    // 搜索
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const queryOptions = (includeContentFormat) => ({
      where,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          attributes: ['id', 'spec_name', 'spec_value', 'sort_order'],
          separate: true,
          order: [['sort_order', 'ASC']]
        }
      ],
      attributes: publicServiceAttributes(includeContentFormat),
      order: [
        ['is_recommended', 'DESC'],
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: offset
    });

    let count;
    let services;
    try {
      const result = await Service.findAndCountAll(queryOptions(true));
      count = result.count;
      services = result.rows;
    } catch (error) {
      if (!isMissingColumnError(error, 'content_format')) throw error;
      const result = await Service.findAndCountAll(queryOptions(false));
      count = result.count;
      services = result.rows.map(item => ({ ...item.toJSON(), content_format: 'markdown' }));
    }

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个服务详情（公开访问）
exports.getPublicService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const raw = String(id);
    const isNumericId = /^\d+$/.test(raw);

    const queryOptions = (includeContentFormat) => ({
      where: isNumericId ? { id: Number(raw), is_visible: true } : { order_page_slug: raw, is_visible: true },
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          attributes: ['id', 'spec_name', 'spec_value', 'sort_order'],
          order: [['sort_order', 'ASC']]
        }
      ],
      attributes: publicServiceAttributes(includeContentFormat)
    });

    let service;
    try {
      service = await Service.findOne(queryOptions(true));
    } catch (error) {
      if (!isMissingColumnError(error, 'content_format')) throw error;
      service = await Service.findOne(queryOptions(false));
      if (service) {
        service = { ...service.toJSON(), content_format: 'markdown' };
      }
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '服务不存在或未发布'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// 获取按分类分组的服务（用于前台展示）
exports.getServicesGroupedByCategory = async (req, res, next) => {
  try {
    // 获取所有前端可见的服务
    const queryOptions = (includeContentFormat) => ({
      where: { is_visible: true },
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'icon'],
          where: { is_visible: true },
          required: false
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          attributes: ['id', 'spec_name', 'spec_value', 'sort_order'],
          separate: true,
          order: [['sort_order', 'ASC']]
        }
      ],
      order: [
        ['is_recommended', 'DESC'],
        [{ model: ServiceCategory, as: 'category' }, 'sort_order', 'ASC'],
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ],
      attributes: publicServiceAttributes(includeContentFormat).concat(['category_id', 'sort_order'])
    });

    let services;
    try {
      services = await Service.findAll(queryOptions(true));
    } catch (error) {
      if (!isMissingColumnError(error, 'content_format')) throw error;
      const rows = await Service.findAll(queryOptions(false));
      services = rows.map(item => ({ ...item.toJSON(), content_format: 'markdown' }));
    }

    // 分离推荐服务
    const recommended = services.filter(service => service.is_recommended);

    // 按分类分组
    const categoryMap = new Map();
    const uncategorizedServices = [];

    services.forEach(service => {
      // 如果没有分类，添加到未分类列表
      if (!service.category_id || !service.category) {
        uncategorizedServices.push(service);
        return;
      }

      const catId = service.category_id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: {
            id: service.category.id,
            name: service.category.name,
            description: service.category.description,
            icon: service.category.icon
          },
          services: []
        });
      }

      categoryMap.get(catId).services.push(service);
    });

    // 转换为数组，保持排序
    const categories = Array.from(categoryMap.values());

    // 如果有未分类的服务，添加到分类列表末尾
    if (uncategorizedServices.length > 0) {
      categories.push({
        category: {
          id: null,
          name: '未分类',
          description: '暂未分类的服务',
          icon: '📦'
        },
        services: uncategorizedServices
      });
    }

    res.json({
      success: true,
      data: {
        recommended,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/services） ====================

// 获取所有服务（管理后台，返回完整字段）
exports.getAdminServices = async (req, res, next) => {
  try {
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined;
    const { category_id, is_visible, is_recommended, search } = req.query;
    const where = {};

    // 分类筛选
    if (category_id) {
      where.category_id = category_id;
    }

    // 可见性筛选
    if (is_visible !== undefined) {
      where.is_visible = is_visible === 'true';
    }

    // 推荐筛选
    if (is_recommended !== undefined) {
      where.is_recommended = is_recommended === 'true';
    }

    // 搜索
    const { Op } = require('sequelize');
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      where,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          separate: true,
          order: [['sort_order', 'ASC']]
        }
      ],
      order: [
        ['is_recommended', 'DESC'],
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    };

    if (!pagingEnabled) {
      const services = await Service.findAll(queryOptions);
      return res.json({
        success: true,
        data: services
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Service.findAndCountAll({
      ...queryOptions,
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个服务（管理后台）
exports.getAdminService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id, {
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          order: [['sort_order', 'ASC']]
        }
      ]
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '服务不存在'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// 创建服务
exports.createService = async (req, res, next) => {
  try {
    const {
      name,
      description,
      content,
      content_format,
      cover_image,
      price,
      category_id,
      is_visible,
      is_recommended,
      sort_order,
      show_order_button,
      order_button_text,
      order_button_url,
      product_type,
      stock_total,
      stock_sold,
      show_stock,
      show_sales,
      payment_config_id,
      order_page_slug,
      specifications
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '服务名称不能为空'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id) {
      const category = await ServiceCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    const normalizedPaymentConfigId = payment_config_id !== undefined && payment_config_id !== null && String(payment_config_id).trim() !== ''
      ? Number(payment_config_id)
      : null;

    let normalizedOrderPageSlug = null;
    if (order_page_slug !== undefined && order_page_slug !== null) {
      if (isNonEmptyString(order_page_slug)) {
        normalizedOrderPageSlug = normalizeOrderPageSlug(order_page_slug);
        if (!normalizedOrderPageSlug) {
          return res.status(400).json({
            success: false,
            message: '下单页路径格式不正确（仅支持英文/数字/下划线/短横线，或以 / 开头的相对路径）'
          });
        }
      } else if (String(order_page_slug).trim() !== '') {
        normalizedOrderPageSlug = normalizeOrderPageSlug(order_page_slug);
        if (!normalizedOrderPageSlug) {
          return res.status(400).json({
            success: false,
            message: '下单页路径格式不正确（仅支持英文/数字/下划线/短横线，或以 / 开头的相对路径）'
          });
        }
      }
    }

    if (normalizedPaymentConfigId !== null && !normalizedOrderPageSlug) {
      normalizedOrderPageSlug = await generateUniqueOrderPageSlug();
    }

    if (normalizedPaymentConfigId !== null && !isValidPaymentPrice(price)) {
      return res.status(400).json({
        success: false,
        message: '绑定支付方式时，价格必须为合法数字（最多两位小数且大于0）'
      });
    }

    const finalShowOrderButton = normalizedPaymentConfigId !== null ? true : (show_order_button || false);
    const finalOrderButtonUrl = normalizedPaymentConfigId !== null
      ? computeOrderButtonUrlFromSlug(normalizedOrderPageSlug)
      : (order_button_url || '');

    const finalProductType = product_type || 'virtual'
    const finalContentFormat = content_format !== undefined ? normalizeContentFormat(content_format) : 'markdown'
    const finalContent = finalContentFormat === 'html' ? sanitizeServiceHtml(content) : content

    // 创建服务
    let service;
    const createPayload = {
      name,
      description,
      content: finalContent,
      content_format: finalContentFormat,
      cover_image,
      price,
      category_id: category_id || null,
      is_visible: is_visible !== undefined ? is_visible : true,
      is_recommended: is_recommended || false,
      sort_order: sort_order || 0,
      show_order_button: finalShowOrderButton,
      order_button_text: order_button_text || '立即下单',
      order_button_url: finalOrderButtonUrl,
      product_type: finalProductType,
      stock_total: finalProductType === 'card' ? 0 : (stock_total !== undefined ? stock_total : 0),
      stock_sold: stock_sold !== undefined ? stock_sold : 0,
      show_stock: show_stock !== undefined ? show_stock : true,
      show_sales: show_sales !== undefined ? show_sales : true,
      payment_config_id: normalizedPaymentConfigId,
      order_page_slug: normalizedOrderPageSlug
    };

    try {
      service = await Service.create(createPayload);
    } catch (error) {
      if (!isMissingColumnError(error, 'content_format')) throw error;
      const fallbackPayload = { ...createPayload };
      delete fallbackPayload.content_format;
      service = await Service.create(fallbackPayload);
    }

    // 如果有规格数据，批量创建规格
    if (specifications && Array.isArray(specifications) && specifications.length > 0) {
      const specsToCreate = specifications.map((spec, index) => ({
        service_id: service.id,
        spec_name: spec.spec_name,
        spec_value: spec.spec_value,
        sort_order: spec.sort_order !== undefined ? spec.sort_order : index
      }));

      await ServiceSpecification.bulkCreate(specsToCreate);
    }

    // 重新查询服务，包含规格
    const createdService = await Service.findByPk(service.id, {
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          order: [['sort_order', 'ASC']]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: '服务创建成功',
      data: createdService
    });
  } catch (error) {
    next(error);
  }
};

// 更新服务
exports.updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      content,
      content_format,
      cover_image,
      price,
      category_id,
      is_visible,
      is_recommended,
      sort_order,
      show_order_button,
      order_button_text,
      order_button_url,
      product_type,
      stock_total,
      stock_sold,
      show_stock,
      show_sales,
      payment_config_id,
      order_page_slug,
      specifications
    } = req.body;

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '服务不存在'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id !== undefined && category_id !== null) {
      const category = await ServiceCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    const updatedPaymentConfigId = payment_config_id !== undefined
      ? (payment_config_id !== null && String(payment_config_id).trim() !== '' ? Number(payment_config_id) : null)
      : service.payment_config_id;

    let updatedOrderPageSlug = service.order_page_slug;
    if (order_page_slug !== undefined) {
      if (order_page_slug === null || String(order_page_slug).trim() === '') {
        updatedOrderPageSlug = null;
      } else {
        const normalized = normalizeOrderPageSlug(order_page_slug);
        if (!normalized) {
          return res.status(400).json({
            success: false,
            message: '下单页路径格式不正确（仅支持英文/数字/下划线/短横线，或以 / 开头的相对路径）'
          });
        }
        updatedOrderPageSlug = normalized;
      }
    }

    if (updatedPaymentConfigId !== null && !updatedOrderPageSlug) {
      updatedOrderPageSlug = await generateUniqueOrderPageSlug({ excludeServiceId: Number(id) });
    }

    const effectivePrice = price !== undefined ? price : service.price;
    if (updatedPaymentConfigId !== null && !isValidPaymentPrice(effectivePrice)) {
      return res.status(400).json({
        success: false,
        message: '绑定支付方式时，价格必须为合法数字（最多两位小数且大于0）'
      });
    }

    const finalShowOrderButton = updatedPaymentConfigId !== null
      ? true
      : (show_order_button !== undefined ? show_order_button : service.show_order_button);
    const finalOrderButtonUrl = updatedPaymentConfigId !== null
      ? computeOrderButtonUrlFromSlug(updatedOrderPageSlug)
      : (order_button_url !== undefined ? order_button_url : service.order_button_url);

    const nextProductType = product_type !== undefined ? product_type : service.product_type
    const nextContentFormat = content_format !== undefined ? normalizeContentFormat(content_format) : (service.content_format || 'markdown')
    const rawNextContent = content !== undefined ? content : service.content
    const nextContent = nextContentFormat === 'html' ? sanitizeServiceHtml(rawNextContent) : rawNextContent
    const cardTotal = nextProductType === 'card'
      ? await Card.count({ where: { service_id: Number(id), bind_order_id: null, card_status: 'unused' } })
      : null

    // 更新服务基本信息
    const updatePayload = {
      name: name !== undefined ? name : service.name,
      description: description !== undefined ? description : service.description,
      content: nextContent,
      content_format: nextContentFormat,
      cover_image: cover_image !== undefined ? cover_image : service.cover_image,
      price: price !== undefined ? price : service.price,
      category_id: category_id !== undefined ? category_id : service.category_id,
      is_visible: is_visible !== undefined ? is_visible : service.is_visible,
      is_recommended: is_recommended !== undefined ? is_recommended : service.is_recommended,
      sort_order: sort_order !== undefined ? sort_order : service.sort_order,
      show_order_button: finalShowOrderButton,
      order_button_text: order_button_text !== undefined ? order_button_text : service.order_button_text,
      order_button_url: finalOrderButtonUrl,
      product_type: nextProductType,
      stock_total: nextProductType === 'card' ? cardTotal : (stock_total !== undefined ? stock_total : service.stock_total),
      stock_sold: stock_sold !== undefined ? stock_sold : service.stock_sold,
      show_stock: show_stock !== undefined ? show_stock : service.show_stock,
      show_sales: show_sales !== undefined ? show_sales : service.show_sales,
      payment_config_id: updatedPaymentConfigId,
      order_page_slug: updatedOrderPageSlug
    };

    try {
      await service.update(updatePayload);
    } catch (error) {
      if (!isMissingColumnError(error, 'content_format')) throw error;
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.content_format;
      await service.update(fallbackPayload);
    }

    // 如果提供了规格数据，更新规格
    if (specifications && Array.isArray(specifications)) {
      // 删除现有规格
      await ServiceSpecification.destroy({
        where: { service_id: id }
      });

      // 创建新规格
      if (specifications.length > 0) {
        const specsToCreate = specifications.map((spec, index) => ({
          service_id: id,
          spec_name: spec.spec_name,
          spec_value: spec.spec_value,
          sort_order: spec.sort_order !== undefined ? spec.sort_order : index
        }));

        await ServiceSpecification.bulkCreate(specsToCreate);
      }
    }

    // 重新查询服务，包含最新数据
    const updatedService = await Service.findByPk(id, {
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: ServiceSpecification,
          as: 'specifications',
          order: [['sort_order', 'ASC']]
        }
      ]
    });

    res.json({
      success: true,
      message: '服务更新成功',
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
};

// 删除服务
exports.deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '服务不存在'
      });
    }

    // 删除服务（会级联删除规格）
    await service.destroy();

    res.json({
      success: true,
      message: '服务删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 批量删除服务
exports.batchDeleteServices = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的服务ID列表'
      });
    }

    await Service.destroy({
      where: { id: ids }
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个服务`
    });
  } catch (error) {
    next(error);
  }
};

// 上传服务封面图
exports.uploadServiceCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    // 优先使用S3 URL，否则使用本地路径
    const imageUrl = req.file.s3Url || `/uploads/shop/${req.file.filename}`;

    res.json({
      success: true,
      message: '封面图上传成功',
      data: { url: imageUrl }
    });
  } catch (error) {
    next(error);
  }
};
