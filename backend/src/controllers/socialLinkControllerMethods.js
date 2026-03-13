/**
 * @file socialLinkControllerMethods.js
 * @description 社交链接控制器的公开/管理方法（需要添加到 socialLinkController.js）
 */

// ==================== 公开API方法（/api/social-links） ====================

// 获取可见社交链接（公开访问，只返回展示字段）
exports.getPublicSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLink.findAll({
      where: { is_visible: true },
      attributes: ['platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/social-links） ====================

// 获取所有社交链接（管理后台，返回完整字段）
exports.getAdminSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLink.findAll({
      attributes: ['id', 'platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile', 'is_visible', 'sort_order', 'created_at', 'updated_at'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};
