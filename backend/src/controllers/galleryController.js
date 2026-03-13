/**
 * @file galleryController.js
 * @description Xs-Blog 图册控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Gallery = require('../models/Gallery');
const GalleryCategory = require('../models/GalleryCategory');
const GalleryImage = require('../models/GalleryImage');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

// IP密码错误次数限制
const passwordAttempts = new Map();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1小时

const getClientIP = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';

const checkPasswordAttempts = (ip) => {
  const record = passwordAttempts.get(ip);
  if (!record || Date.now() - record.firstAttempt > LOCKOUT_DURATION) {
    if (record) passwordAttempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS, count: 0 };
  }
  const remaining = MAX_ATTEMPTS - record.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), count: record.count };
};

const recordFailedAttempt = (ip) => {
  const record = passwordAttempts.get(ip);
  if (!record || Date.now() - record.firstAttempt > LOCKOUT_DURATION) {
    passwordAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
    return { remaining: MAX_ATTEMPTS - 1, count: 1 };
  }
  record.count++;
  return { remaining: Math.max(0, MAX_ATTEMPTS - record.count), count: record.count };
};

const clearAttempts = (ip) => passwordAttempts.delete(ip);

// 获取密码尝试状态
exports.getPasswordAttemptStatus = async (req, res) => {
  const clientIP = getClientIP(req);
  const status = checkPasswordAttempts(clientIP);
  res.json({
    success: true,
    errorCount: status.count,
    remaining: status.remaining
  });
};

// ==================== 公开API方法（/api/galleries） ====================

// 获取前端可见图册列表（公开访问，只返回展示字段）
exports.getPublicGalleries = async (req, res, next) => {
  try {
    const { category_id, search } = req.query;
    const where = { is_visible: true };

    if (category_id) {
      where.category_id = category_id;
    }

    if (search) {
      const { Op } = require('sequelize');
      where.title = { [Op.like]: `%${search}%` };
    }

    const galleries = await Gallery.findAll({
      where,
      include: [{
        model: GalleryCategory,
        as: 'category',
        attributes: ['id', 'name', 'icon']
      }],
      attributes: ['id', 'title', 'description', 'cover_image', 'image_count', 'category_id', 'created_at', 'password'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    // 管理员接口返回密码明文
    const processedGalleries = galleries.map(gallery => {
      const galleryData = gallery.toJSON();
      galleryData.hasPassword = !!galleryData.password;
      return galleryData;
    });

    res.json({
      success: true,
      data: processedGalleries
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个图册详情（需要密码验证）
exports.getPublicGallery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    const gallery = await Gallery.findOne({
      where: { id, is_visible: true },
      include: [
        {
          model: GalleryCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: GalleryImage,
          as: 'images',
          attributes: ['id', 'filename', 'path', 'sort_order', 'size'],
          order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
        }
      ]
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    // 检查是否需要密码
    if (gallery.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '需要密码',
          requirePassword: true
        });
      }

      // 验证密码
      if (password !== gallery.password) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 不返回密码字段
    const galleryData = gallery.toJSON();
    delete galleryData.password;

    res.json({
      success: true,
      data: galleryData
    });
  } catch (error) {
    next(error);
  }
};

// 验证图册密码
exports.verifyGalleryPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const clientIP = getClientIP(req);

    // 检查IP是否被锁定
    const attemptStatus = checkPasswordAttempts(clientIP);
    if (!attemptStatus.allowed) {
      return res.status(429).json({
        success: false,
        message: '密码错误次数过多，请1小时后重试！',
        errorCount: attemptStatus.count,
        remaining: 0
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '密码不能为空'
      });
    }

    const gallery = await Gallery.findOne({
      where: { id, is_visible: true },
      attributes: ['id', 'password']
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    if (!gallery.password) {
      return res.json({
        success: true,
        message: '该图册无需密码'
      });
    }

    // 验证密码
    if (password !== gallery.password) {
      const result = recordFailedAttempt(clientIP);
      return res.status(401).json({
        success: false,
        message: result.remaining > 0 ? '密码错误' : '密码错误次数过多，请1小时后重试！',
        errorCount: result.count,
        remaining: result.remaining
      });
    }

    // 密码正确，清除错误记录
    clearAttempts(clientIP);

    res.json({
      success: true,
      message: '密码验证成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/galleries） ====================

// 获取所有图册（管理后台，返回完整字段）
exports.getAdminGalleries = async (req, res, next) => {
  try {
    const { category_id, search } = req.query;
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined;
    const where = {};

    if (category_id) {
      where.category_id = category_id;
    }

    if (search) {
      const { Op } = require('sequelize');
      where.title = { [Op.like]: `%${search}%` };
    }

    const queryOptions = {
      where,
      include: [
        {
          model: GalleryCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        }
      ],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    };

    if (!pagingEnabled) {
      const galleries = await Gallery.findAll(queryOptions);
      const processedGalleries = galleries.map(gallery => {
        const galleryData = gallery.toJSON();
        galleryData.hasPassword = !!galleryData.password;
        delete galleryData.images;
        return galleryData;
      });

      return res.json({
        success: true,
        data: processedGalleries
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Gallery.findAndCountAll({
      ...queryOptions,
      limit,
      offset
    });

    const processedGalleries = rows.map(gallery => {
      const galleryData = gallery.toJSON();
      galleryData.hasPassword = !!galleryData.password;
      delete galleryData.images;
      return galleryData;
    });

    res.json({
      success: true,
      data: processedGalleries,
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

// 获取单个图册（管理后台）
exports.getAdminGallery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gallery = await Gallery.findByPk(id, {
      include: [
        {
          model: GalleryCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: GalleryImage,
          as: 'images',
          order: [['sort_order', 'ASC']]
        }
      ]
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    // 不返回密码明文，只返回是否有密码
    const galleryData = gallery.toJSON();
    if (galleryData.password) {
      galleryData.hasPassword = true;
      delete galleryData.password;
    } else {
      galleryData.hasPassword = false;
    }

    res.json({
      success: true,
      data: galleryData
    });
  } catch (error) {
    next(error);
  }
};

// 创建图册
exports.createGallery = async (req, res, next) => {
  try {
    const { title, description, category_id, password, is_visible, sort_order } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '标题不能为空'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id) {
      const category = await GalleryCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    const gallery = await Gallery.create({
      title,
      description,
      category_id: category_id || null,
      password: password && password.trim() ? password.trim() : null,
      is_visible: is_visible !== undefined ? is_visible : true,
      sort_order: sort_order || 0,
      image_count: 0
    });

    res.status(201).json({
      success: true,
      message: '图册创建成功',
      data: gallery
    });
  } catch (error) {
    next(error);
  }
};

// 更新图册
exports.updateGallery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category_id, password, is_visible, sort_order } = req.body;

    const gallery = await Gallery.findByPk(id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id !== undefined && category_id !== null) {
      const category = await GalleryCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    // 处理密码更新：空字符串表示取消密码
    let newPassword = gallery.password;
    if (password !== undefined) {
      newPassword = password.trim() || null;
    }

    await gallery.update({
      title: title !== undefined ? title : gallery.title,
      description: description !== undefined ? description : gallery.description,
      category_id: category_id !== undefined ? category_id : gallery.category_id,
      password: newPassword,
      is_visible: is_visible !== undefined ? is_visible : gallery.is_visible,
      sort_order: sort_order !== undefined ? sort_order : gallery.sort_order
    });

    res.json({
      success: true,
      message: '图册更新成功',
      data: gallery
    });
  } catch (error) {
    next(error);
  }
};

// 删除图册
exports.deleteGallery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gallery = await Gallery.findByPk(id, {
      include: [{
        model: GalleryImage,
        as: 'images'
      }]
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    // 删除图片文件
    const galleryPath = path.join(__dirname, '../../uploads/imagesall', id.toString());
    try {
      await fs.rm(galleryPath, { recursive: true, force: true });
    } catch (err) {
      console.error('删除图册文件夹失败:', err);
    }

    // 删除数据库记录（级联删除图片记录）
    await gallery.destroy();

    res.json({
      success: true,
      message: '图册删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传图片到图册
exports.uploadImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const gallery = await Gallery.findByPk(id);
    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: '图册不存在'
      });
    }

    // 获取当前图片的最大排序值
    const maxSortOrder = await GalleryImage.max('sort_order', {
      where: { gallery_id: id }
    }) || 0;

    // 创建图片记录
    const imageRecords = files.map((file, index) => {
      // 优先使用S3 URL，否则使用本地相对路径
      let filePath;
      if (file.s3Url) {
        filePath = file.s3Url;
      } else {
        // 将绝对路径转换为相对路径（从 uploads/ 开始）
        filePath = file.path.replace(/\\/g, '/');
        const uploadsIndex = filePath.indexOf('uploads/');
        if (uploadsIndex !== -1) {
          filePath = filePath.substring(uploadsIndex);
        }
      }

      return {
        gallery_id: id,
        filename: file.filename,
        path: filePath,
        sort_order: maxSortOrder + index + 1,
        size: file.size
      };
    });

    const images = await GalleryImage.bulkCreate(imageRecords);

    // 更新图册的图片数量和封面
    const imageCount = await GalleryImage.count({ where: { gallery_id: id } });
    const coverImage = await GalleryImage.findOne({
      where: { gallery_id: id },
      order: [['sort_order', 'ASC']]
    });

    await gallery.update({
      image_count: imageCount,
      cover_image: coverImage ? coverImage.path : null
    });

    res.json({
      success: true,
      message: '图片上传成功',
      data: images
    });
  } catch (error) {
    next(error);
  }
};

// 删除图片
exports.deleteImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const image = await GalleryImage.findOne({
      where: { id: imageId, gallery_id: id }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 删除文件
    try {
      const filePath = path.join(__dirname, '../../', image.path);
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('删除图片文件失败:', err);
      }
    }

    // 删除数据库记录
    await image.destroy();

    // 更新图册的图片数量和封面
    const gallery = await Gallery.findByPk(id);
    const imageCount = await GalleryImage.count({ where: { gallery_id: id } });
    const coverImage = await GalleryImage.findOne({
      where: { gallery_id: id },
      order: [['sort_order', 'ASC']]
    });

    await gallery.update({
      image_count: imageCount,
      cover_image: coverImage ? coverImage.path : null
    });

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 更新图片排序
exports.updateImageOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageOrders } = req.body; // [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }, ...]

    if (!imageOrders || !Array.isArray(imageOrders)) {
      return res.status(400).json({
        success: false,
        message: '无效的排序数据'
      });
    }

    // 批量更新排序
    await Promise.all(
      imageOrders.map(({ id: imageId, sort_order }) =>
        GalleryImage.update(
          { sort_order },
          { where: { id: imageId, gallery_id: id } }
        )
      )
    );

    // 更新封面（第一张图片）
    const gallery = await Gallery.findByPk(id);
    const coverImage = await GalleryImage.findOne({
      where: { gallery_id: id },
      order: [['sort_order', 'ASC']]
    });

    await gallery.update({
      cover_image: coverImage ? coverImage.path : null
    });

    res.json({
      success: true,
      message: '排序更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 批量更新图册排序
exports.updateGalleryOrder = async (req, res, next) => {
  try {
    const { galleryOrders } = req.body; // [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }, ...]

    if (!galleryOrders || !Array.isArray(galleryOrders)) {
      return res.status(400).json({
        success: false,
        message: '无效的排序数据'
      });
    }

    // 批量更新排序
    await Promise.all(
      galleryOrders.map(({ id, sort_order }) =>
        Gallery.update(
          { sort_order },
          { where: { id } }
        )
      )
    );

    res.json({
      success: true,
      message: '排序更新成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
