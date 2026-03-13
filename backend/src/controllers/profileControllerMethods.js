/**
 * @file profileControllerMethods.js
 * @description 个人资料控制器的公开/管理方法（需要添加到 profileController.js）
 */

// ==================== 公开API方法（/api/profile） ====================

// 获取公开个人资料（公开访问，只返回展示字段）
exports.getPublicProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({
      attributes: ['name', 'title', 'bio', 'avatar', 'background_image', 'location', 'website', 'website_title']
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '个人资料不存在'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/profile） ====================

// 获取完整个人资料（管理后台，返回所有字段）
exports.getAdminProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '个人资料不存在'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};
