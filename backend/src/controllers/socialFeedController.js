/**
 * @file socialFeedController.js
 * @description Xs-Blog 朋友圈控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-01
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const { generateThumbnailsForUploads, getThumbnailPath, deleteThumbnail, isImageFile } = require('../utils/thumbnail');

// ==================== 公开API方法 ====================

// 获取朋友圈个人资料
exports.getProfile = async (req, res, next) => {
  try {
    const rows = await sequelize.query(
      'SELECT * FROM social_feed_profile ORDER BY id ASC LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (rows.length === 0) {
      // 如果没有数据，返回默认值
      return res.json({
        success: true,
        data: {
          cover_image: '',
          avatar: '',
          nickname: '朋友圈',
          signature: '分享生活，记录美好时刻',
          custom_copyright: ''
        }
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// 获取朋友圈动态列表（公开访问）
exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 获取总数
    const countResult = await sequelize.query(
      'SELECT COUNT(*) as total FROM social_feed_posts WHERE is_published = 1',
      { type: QueryTypes.SELECT }
    );
    const total = countResult[0].total;

    // 获取动态列表
    const posts = await sequelize.query(
      `SELECT id, content, images, video, likes_count, comments_count, is_pinned, created_at
       FROM social_feed_posts
       WHERE is_published = 1
       ORDER BY is_pinned DESC, sort_order DESC, created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset },
        type: QueryTypes.SELECT
      }
    );

    // 解析图片JSON，并转换布尔值，同时生成缩略图路径
    const postsWithImages = posts.map(post => {
      const images = post.images ? JSON.parse(post.images) : [];
      // 为每张图片生成对应的缩略图路径
      const thumbnails = images.map(img => {
        if (isImageFile(img)) {
          return getThumbnailPath(img);
        }
        return img; // 视频等非图片文件返回原路径
      });

      return {
        ...post,
        images,
        thumbnails,
        is_pinned: Boolean(post.is_pinned)
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsWithImages,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_count: total,
          per_page: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个动态详情
exports.getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const posts = await sequelize.query(
      `SELECT id, content, images, video, likes_count, comments_count, is_pinned, created_at
       FROM social_feed_posts
       WHERE id = :id AND is_published = 1`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '动态不存在'
      });
    }

    const post = posts[0];
    post.images = post.images ? JSON.parse(post.images) : [];

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（需要认证） ====================

// 获取所有动态列表（管理后台用，包含草稿）
exports.getAllPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const { status } = req.query;
    const normalizedStatus = typeof status === 'string' ? status.trim() : '';
    const whereParts = [];
    const replacements = { limit, offset };
    if (normalizedStatus === 'published') {
      whereParts.push('is_published = 1');
    } else if (normalizedStatus === 'draft') {
      whereParts.push('is_published = 0');
    }
    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countsResult = await sequelize.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN is_published = 0 THEN 1 ELSE 0 END) as draft
      FROM social_feed_posts`,
      { type: QueryTypes.SELECT }
    );
    const counts = countsResult?.[0] || {};
    const totalAll = Number(counts.total || 0);
    const totalPublished = Number(counts.published || 0);
    const totalDraft = Number(counts.draft || 0);
    const total =
      normalizedStatus === 'published'
        ? totalPublished
        : normalizedStatus === 'draft'
          ? totalDraft
          : totalAll;

    // 获取所有动态列表（包括草稿）
    const posts = await sequelize.query(
      `SELECT id, content, images, video, likes_count, comments_count, is_pinned, is_published, sort_order, created_at
       FROM social_feed_posts
       ${whereSql}
       ORDER BY is_pinned DESC, sort_order DESC, created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    // 解析图片JSON
    const postsWithImages = posts.map(post => ({
      ...post,
      images: post.images ? JSON.parse(post.images) : [],
      is_published: Boolean(post.is_published),
      is_pinned: Boolean(post.is_pinned)
    }));

    res.json({
      success: true,
      data: {
        posts: postsWithImages,
        counts: {
          total: totalAll,
          published: totalPublished,
          draft: totalDraft
        },
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_count: total,
          per_page: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 更新朋友圈个人资料
exports.updateProfile = async (req, res, next) => {
  try {
    const { cover_image, avatar, nickname, signature, custom_copyright } = req.body;

    // 检查是否已存在记录
    const existing = await sequelize.query(
      'SELECT id FROM social_feed_profile LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      // 插入新记录
      await sequelize.query(
        `INSERT INTO social_feed_profile (cover_image, avatar, nickname, signature, custom_copyright)
         VALUES (:cover_image, :avatar, :nickname, :signature, :custom_copyright)`,
        {
          replacements: {
            cover_image: cover_image || '',
            avatar: avatar || '',
            nickname: nickname || '朋友圈',
            signature: signature || '',
            custom_copyright: custom_copyright || ''
          },
          type: QueryTypes.INSERT
        }
      );
    } else {
      // 更新现有记录
      await sequelize.query(
        `UPDATE social_feed_profile
         SET cover_image = :cover_image, avatar = :avatar, nickname = :nickname, signature = :signature, custom_copyright = :custom_copyright, updated_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            cover_image: cover_image || '',
            avatar: avatar || '',
            nickname: nickname || '朋友圈',
            signature: signature || '',
            custom_copyright: custom_copyright || '',
            id: existing[0].id
          },
          type: QueryTypes.UPDATE
        }
      );
    }

    res.json({
      success: true,
      message: '个人资料更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传封面图片
exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    // 优先使用S3 URL，否则使用本地路径
    const coverPath = req.file.s3Url || `/uploads/social-feed/${req.file.filename}`;

    // 更新数据库
    const existing = await sequelize.query(
      'SELECT id, cover_image FROM social_feed_profile LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await sequelize.query(
        'INSERT INTO social_feed_profile (cover_image, nickname) VALUES (:coverPath, :nickname)',
        {
          replacements: { coverPath, nickname: '朋友圈' },
          type: QueryTypes.INSERT
        }
      );
    } else {
      // 删除旧封面图片
      if (existing[0].cover_image) {
        const oldPath = path.join(__dirname, '../../public', existing[0].cover_image);
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('删除旧封面失败:', err);
        }
      }

      await sequelize.query(
        'UPDATE social_feed_profile SET cover_image = :coverPath, updated_at = NOW() WHERE id = :id',
        {
          replacements: { coverPath, id: existing[0].id },
          type: QueryTypes.UPDATE
        }
      );
    }

    res.json({
      success: true,
      message: '封面上传成功',
      data: { cover_image: coverPath }
    });
  } catch (error) {
    next(error);
  }
};

// 上传头像
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    // 优先使用S3 URL，否则使用本地路径
    const avatarPath = req.file.s3Url || `/uploads/social-feed/${req.file.filename}`;

    // 更新数据库
    const existing = await sequelize.query(
      'SELECT id, avatar FROM social_feed_profile LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await sequelize.query(
        'INSERT INTO social_feed_profile (avatar, nickname) VALUES (:avatarPath, :nickname)',
        {
          replacements: { avatarPath, nickname: '朋友圈' },
          type: QueryTypes.INSERT
        }
      );
    } else {
      // 删除旧头像
      if (existing[0].avatar) {
        const oldPath = path.join(__dirname, '../../public', existing[0].avatar);
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('删除旧头像失败:', err);
        }
      }

      await sequelize.query(
        'UPDATE social_feed_profile SET avatar = :avatarPath, updated_at = NOW() WHERE id = :id',
        {
          replacements: { avatarPath, id: existing[0].id },
          type: QueryTypes.UPDATE
        }
      );
    }

    res.json({
      success: true,
      message: '头像上传成功',
      data: { avatar: avatarPath }
    });
  } catch (error) {
    next(error);
  }
};

// 创建动态
exports.createPost = async (req, res, next) => {
  try {
    const { content, images, video, is_pinned, is_published, sort_order } = req.body;

    // 验证：至少需要有内容、图片或视频之一
    const hasContent = content && content.trim() !== '';
    const hasImages = images && Array.isArray(images) && images.length > 0;
    const hasVideo = video && video.trim() !== '';

    if (!hasContent && !hasImages && !hasVideo) {
      return res.status(400).json({
        success: false,
        message: '请输入内容、上传图片或视频'
      });
    }

    const imagesJson = images ? JSON.stringify(images) : null;

    const [result] = await sequelize.query(
      `INSERT INTO social_feed_posts (content, images, video, is_pinned, is_published, sort_order)
       VALUES (:content, :images, :video, :is_pinned, :is_published, :sort_order)`,
      {
        replacements: {
          content: content || '',
          images: imagesJson,
          video: video || null,
          is_pinned: is_pinned ? 1 : 0,
          is_published: is_published !== false ? 1 : 0,
          sort_order: sort_order || 0
        },
        type: QueryTypes.INSERT
      }
    );

    res.json({
      success: true,
      message: '动态创建成功',
      data: { id: result }
    });
  } catch (error) {
    next(error);
  }
};

// 更新动态
exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, images, video, is_pinned, is_published, sort_order } = req.body;

    // 检查动态是否存在
    const existing = await sequelize.query(
      'SELECT id FROM social_feed_posts WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '动态不存在'
      });
    }

    const imagesJson = images ? JSON.stringify(images) : null;

    await sequelize.query(
      `UPDATE social_feed_posts
       SET content = :content, images = :images, video = :video, is_pinned = :is_pinned, is_published = :is_published, sort_order = :sort_order, updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          content: content || '',
          images: imagesJson,
          video: video || null,
          is_pinned: is_pinned ? 1 : 0,
          is_published: is_published !== false ? 1 : 0,
          sort_order: sort_order || 0,
          id
        },
        type: QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      message: '动态更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 删除动态
exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 获取动态信息（包含图片）
    const posts = await sequelize.query(
      'SELECT images FROM social_feed_posts WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '动态不存在'
      });
    }

    // 删除关联的图片文件
    if (posts[0].images) {
      try {
        const images = JSON.parse(posts[0].images);
        for (const imagePath of images) {
          const fullPath = path.join(__dirname, '../../public', imagePath);
          try {
            await fs.unlink(fullPath);
          } catch (err) {
            console.error('删除图片失败:', err);
          }
        }
      } catch (err) {
        console.error('解析图片JSON失败:', err);
      }
    }

    // 删除动态记录
    await sequelize.query(
      'DELETE FROM social_feed_posts WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );

    res.json({
      success: true,
      message: '动态删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传动态图片
exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    // 生成缩略图并获取路径
    const imageResults = await generateThumbnailsForUploads(req.files, 'social-feed');

    // 返回原图和缩略图路径
    const images = imageResults.map(item => item.original);
    const thumbnails = imageResults.map(item => item.thumbnail);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        images,      // 原图路径数组
        thumbnails   // 缩略图路径数组
      }
    });
  } catch (error) {
    next(error);
  }
};

// 批量删除动态
exports.batchDeletePosts = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的动态ID列表'
      });
    }

    // 获取所有动态的图片信息
    const posts = await sequelize.query(
      `SELECT id, images FROM social_feed_posts WHERE id IN (:ids)`,
      {
        replacements: { ids },
        type: QueryTypes.SELECT
      }
    );

    // 删除所有关联的图片文件
    for (const post of posts) {
      if (post.images) {
        try {
          const images = JSON.parse(post.images);
          for (const imagePath of images) {
            const fullPath = path.join(__dirname, '../../public', imagePath);
            try {
              await fs.unlink(fullPath);
            } catch (err) {
              console.error('删除图片失败:', err);
            }
          }
        } catch (err) {
          console.error('解析图片JSON失败:', err);
        }
      }
    }

    // 批量删除动态记录
    await sequelize.query(
      `DELETE FROM social_feed_posts WHERE id IN (:ids)`,
      {
        replacements: { ids },
        type: QueryTypes.DELETE
      }
    );

    res.json({
      success: true,
      message: `成功删除 ${posts.length} 条动态`
    });
  } catch (error) {
    next(error);
  }
};

// 更新动态排序
exports.updatePostSort = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sort_order } = req.body;

    if (sort_order === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供排序值'
      });
    }

    await sequelize.query(
      'UPDATE social_feed_posts SET sort_order = :sort_order, updated_at = NOW() WHERE id = :id',
      {
        replacements: { sort_order, id },
        type: QueryTypes.UPDATE
      }
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
