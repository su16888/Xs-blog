/**
 * @file promoController.js
 * @description 官网主题控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 */

const PromoConfig = require('../models/PromoConfig');
const PromoNavItem = require('../models/PromoNavItem');
const PromoStat = require('../models/PromoStat');
const PromoTeamMember = require('../models/PromoTeamMember');
const Setting = require('../models/Setting');
const config = require('../config/config');
const fs = require('fs');

// ==================== 公开API ====================

// 获取所有官网主题配置（公开）
exports.getPromoData = async (req, res, next) => {
  try {
    let promoSettings = null;
    let bilingualEnabled = false;

    const promoSettingRecord = await Setting.findOne({
      where: { key: 'promoSettings' }
    });

    if (promoSettingRecord && promoSettingRecord.value) {
      try {
        promoSettings = JSON.parse(promoSettingRecord.value);
        bilingualEnabled = !!promoSettings.bilingualEnabled;
      } catch (e) {
        console.error('Failed to parse promoSettings:', e);
      }
    }

    // 如果 promoSettings 存在且有数据，优先使用 JSON 中的数据
    if (promoSettings) {
      // 转换 promoSettings 为后端期望的格式
      const configObj = {};

      // Logo 配置
      if (promoSettings.logoText) configObj.logoText = { value: promoSettings.logoText, valueEn: promoSettings.logoTextEn || promoSettings.logoText };
      if (promoSettings.logoSubText) configObj.logoSubText = { value: promoSettings.logoSubText, valueEn: promoSettings.logoSubTextEn || promoSettings.logoSubText };
      if (promoSettings.logoDarkImage) configObj.logoDarkImage = { value: promoSettings.logoDarkImage, valueEn: promoSettings.logoDarkImage };
      if (promoSettings.logoLightImage) configObj.logoLightImage = { value: promoSettings.logoLightImage, valueEn: promoSettings.logoLightImage };
      if (promoSettings.browserTitle) configObj.browserTitle = { value: promoSettings.browserTitle, valueEn: promoSettings.browserTitleEn || promoSettings.browserTitle };
      if (promoSettings.browserSubtitle) configObj.browserSubtitle = { value: promoSettings.browserSubtitle, valueEn: promoSettings.browserSubtitleEn || promoSettings.browserSubtitle };

      // Hero 配置
      if (promoSettings.heroTag) configObj.heroTag = { value: promoSettings.heroTag, valueEn: promoSettings.heroTagEn || promoSettings.heroTag };
      if (promoSettings.heroTitle) configObj.heroTitle = { value: promoSettings.heroTitle, valueEn: promoSettings.heroTitleEn || promoSettings.heroTitle };
      if (promoSettings.heroDescription) configObj.heroDescription = { value: promoSettings.heroDescription, valueEn: promoSettings.heroDescriptionEn || promoSettings.heroDescription };
      if (promoSettings.heroButtonText) configObj.heroButtonText = { value: promoSettings.heroButtonText, valueEn: promoSettings.heroButtonTextEn || promoSettings.heroButtonText };
      if (promoSettings.heroButtonUrl) configObj.heroButtonUrl = promoSettings.heroButtonUrl;
      if (promoSettings.heroSecondButtonText) configObj.heroSecondButtonText = { value: promoSettings.heroSecondButtonText, valueEn: promoSettings.heroSecondButtonTextEn || promoSettings.heroSecondButtonText };
      if (promoSettings.heroSecondButtonUrl) configObj.heroSecondButtonUrl = promoSettings.heroSecondButtonUrl;

      // Hero 显示/隐藏设置
      configObj.showHeroFeatureTags = promoSettings.showHeroFeatureTags !== false;
      configObj.showHeroMainButton = promoSettings.showHeroMainButton !== false;
      configObj.showHeroSecondButton = promoSettings.showHeroSecondButton !== false;
      configObj.showContactButton = promoSettings.showContactButton !== false;

      // Hero 特性标签
      if (promoSettings.heroFeatureTags) configObj.heroFeatureTags = promoSettings.heroFeatureTags;

      // About 配置
      if (promoSettings.aboutSectionLabel) configObj.aboutSectionLabel = promoSettings.aboutSectionLabel;
      if (promoSettings.aboutSectionLabelEn) configObj.aboutSectionLabelEn = promoSettings.aboutSectionLabelEn;
      if (promoSettings.aboutTag) configObj.aboutTag = { value: promoSettings.aboutTag, valueEn: promoSettings.aboutTagEn || promoSettings.aboutTag };
      if (promoSettings.aboutTitle) configObj.aboutTitle = { value: promoSettings.aboutTitle, valueEn: promoSettings.aboutTitleEn || promoSettings.aboutTitle };
      if (promoSettings.aboutDescription) configObj.aboutDescription = { value: promoSettings.aboutDescription, valueEn: promoSettings.aboutDescriptionEn || promoSettings.aboutDescription };

      // About Features (Bento Cards)
      if (promoSettings.aboutFeatures) configObj.aboutFeatures = promoSettings.aboutFeatures;
      if (promoSettings.featuresLearnMoreText) configObj.featuresLearnMoreText = { value: promoSettings.featuresLearnMoreText, valueEn: promoSettings.featuresLearnMoreTextEn || promoSettings.featuresLearnMoreText };

      // Services 配置
      if (promoSettings.servicesSectionLabel) configObj.servicesSectionLabel = promoSettings.servicesSectionLabel;
      if (promoSettings.servicesSectionLabelEn) configObj.servicesSectionLabelEn = promoSettings.servicesSectionLabelEn;
      if (promoSettings.servicesTag) configObj.servicesTag = { value: promoSettings.servicesTag, valueEn: promoSettings.servicesTagEn || promoSettings.servicesTag };
      if (promoSettings.servicesTitle) configObj.servicesTitle = { value: promoSettings.servicesTitle, valueEn: promoSettings.servicesTitleEn || promoSettings.servicesTitle };

      // 转换服务分类和服务项
      const serviceCategories = (promoSettings.serviceCategories || []).map((category, index) => ({
        id: index + 1,
        name: category.name,
        name_en: category.nameEn || category.name,
        services: (category.services || []).map((service, serviceIndex) => ({
          id: serviceIndex + 1,
          image: service.image || null,
          title: service.title,
          title_en: service.titleEn || service.title,
          description: service.description,
          description_en: service.descriptionEn || service.description,
          url: service.url || null
        }))
      }));

      // Team 配置
      if (promoSettings.teamSectionLabel) configObj.teamSectionLabel = promoSettings.teamSectionLabel;
      if (promoSettings.teamSectionLabelEn) configObj.teamSectionLabelEn = promoSettings.teamSectionLabelEn;
      if (promoSettings.teamTag) configObj.teamTag = { value: promoSettings.teamTag, valueEn: promoSettings.teamTagEn || promoSettings.teamTag };
      if (promoSettings.teamTitle) configObj.teamTitle = { value: promoSettings.teamTitle, valueEn: promoSettings.teamTitleEn || promoSettings.teamTitle };

      // Partners 配置
      if (promoSettings.partnersSectionLabel) configObj.partnersSectionLabel = promoSettings.partnersSectionLabel;
      if (promoSettings.partnersSectionLabelEn) configObj.partnersSectionLabelEn = promoSettings.partnersSectionLabelEn;
      if (promoSettings.partnersTag) configObj.partnersTag = { value: promoSettings.partnersTag, valueEn: promoSettings.partnersTagEn || promoSettings.partnersTag };
      if (promoSettings.partnersDescription) configObj.partnersDescription = { value: promoSettings.partnersDescription, valueEn: promoSettings.partnersDescriptionEn || promoSettings.partnersDescription };

      // Contact 配置
      if (promoSettings.contactSectionLabel) configObj.contactSectionLabel = promoSettings.contactSectionLabel;
      if (promoSettings.contactSectionLabelEn) configObj.contactSectionLabelEn = promoSettings.contactSectionLabelEn;
      if (promoSettings.contactTag) configObj.contactTag = { value: promoSettings.contactTag, valueEn: promoSettings.contactTagEn || promoSettings.contactTag };
      if (promoSettings.contactTitle) configObj.contactTitle = { value: promoSettings.contactTitle, valueEn: promoSettings.contactTitleEn || promoSettings.contactTitle };
      if (promoSettings.contactDescription) configObj.contactDescription = { value: promoSettings.contactDescription, valueEn: promoSettings.contactDescriptionEn || promoSettings.contactDescription };
      if (promoSettings.contactButtonUrl) configObj.contactButtonUrl = promoSettings.contactButtonUrl;

      // Footer 配置
      if (promoSettings.footerLogoText) configObj.footerLogoText = { value: promoSettings.footerLogoText, valueEn: promoSettings.footerLogoTextEn || promoSettings.footerLogoText };
      if (promoSettings.footerLogoSubText) configObj.footerLogoSubText = { value: promoSettings.footerLogoSubText, valueEn: promoSettings.footerLogoSubTextEn || promoSettings.footerLogoSubText };
      if (promoSettings.footerDescription) configObj.footerDescription = { value: promoSettings.footerDescription, valueEn: promoSettings.footerDescriptionEn || promoSettings.footerDescription };
      if (promoSettings.footerCopyright) configObj.footerCopyright = { value: promoSettings.footerCopyright, valueEn: promoSettings.footerCopyrightEn || promoSettings.footerCopyright };

      // UI 文本配置
      if (promoSettings.uiTexts) configObj.uiTexts = promoSettings.uiTexts;

      // 转换导航菜单
      const navItems = (promoSettings.navMenuItems || [])
        .map((item, index) => {
          const rawSort = item?.sortOrder ?? item?.sort_order;
          const parsedSort = typeof rawSort === 'number' ? rawSort : parseInt(String(rawSort ?? ''), 10);
          const sort_order = Number.isFinite(parsedSort) ? parsedSort : index;

          return {
            id: index + 1,
            name: item.name,
            name_en: item.nameEn || item.name,
            link: item.link,
            sort_order,
            is_visible: true,
            __idx: index
          };
        })
        .sort((a, b) => (a.sort_order - b.sort_order) || (a.__idx - b.__idx))
        .map(({ __idx, ...rest }) => rest);

      // 转换统计数据
      const stats = (promoSettings.aboutStats || []).map((stat, index) => ({
        id: index + 1,
        stat_value: stat.value,
        stat_value_en: stat.valueEn || stat.value,
        stat_label: stat.label,
        stat_label_en: stat.labelEn || stat.label,
        sort_order: index,
        is_visible: true
      }));

      // 转换团队成员
      const teamMembers = (promoSettings.teamMembers || []).map((member, index) => ({
        id: index + 1,
        avatar_image: member.avatarImage || null,
        avatar_text: member.avatar,
        name: member.name,
        name_en: member.nameEn || member.name,
        role: member.role,
        role_en: member.roleEn || member.role,
        sort_order: index,
        is_visible: true
      }));

      // 转换联系方式
      const contactMethods = (promoSettings.contactMethods || []).map((method, index) => ({
        id: index + 1,
        icon: method.icon || null,
        value: method.value,
        sort_order: index,
        is_visible: true
      }));

      // 转换底部链接分组
      const footerLinkGroups = (promoSettings.footerLinks || []).map((group, index) => ({
        id: index + 1,
        group_title: group.groupTitle,
        group_title_en: group.groupTitleEn || group.groupTitle,
        sort_order: index,
        is_visible: true
      }));

      // 转换底部链接
      const footerLinks = [];
      (promoSettings.footerLinks || []).forEach((group, groupIndex) => {
        (group.links || []).forEach((link, linkIndex) => {
          footerLinks.push({
            id: footerLinks.length + 1,
            group_id: groupIndex + 1,
            name: link.name,
            name_en: link.nameEn || link.name,
            url: link.url,
            sort_order: linkIndex,
            is_visible: true
          });
        });
      });

      // 转换合作伙伴
      const partners = (promoSettings.partners || []).map((partner, index) => ({
        id: index + 1,
        image: partner.image || null,
        name: partner.name,
        name_en: partner.nameEn || partner.name,
        url: partner.url || null,
        sort_order: index,
        is_visible: true
      }));

      return res.json({
        success: true,
        data: {
          bilingualEnabled,
          messageCategoryId: promoSettings.messageCategoryId || null,
          config: configObj,
          navItems,
          stats,
          serviceCategories,
          teamMembers,
          partners,
          contactMethods,
          footerLinkGroups,
          footerLinks
        }
      });
    }

    // 如果 promoSettings 不存在，从独立表读取（后备方案）
    const configs = await PromoConfig.findAll({
      order: [['sort_order', 'ASC']]
    });

    const navItems = await PromoNavItem.findAll({
      where: { is_visible: true },
      order: [['sort_order', 'ASC']]
    });

    const stats = await PromoStat.findAll({
      where: { is_visible: true },
      order: [['sort_order', 'ASC']]
    });

    const teamMembers = await PromoTeamMember.findAll({
      where: { is_visible: true },
      order: [['sort_order', 'ASC']]
    });

    // 转换配置为对象格式
    const configObj = {};
    configs.forEach(item => {
      configObj[item.config_key] = {
        value: item.config_value,
        valueEn: item.config_value_en,
        type: item.config_type
      };
    });

    res.json({
      success: true,
      data: {
        bilingualEnabled,
        config: configObj,
        navItems,
        stats,
        teamMembers
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API ====================

// 获取基础配置列表
exports.getConfigs = async (req, res, next) => {
  try {
    const configs = await PromoConfig.findAll({
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    next(error);
  }
};

// 更新基础配置
exports.updateConfig = async (req, res, next) => {
  try {
    const { config_key } = req.params;
    const { config_value, config_value_en } = req.body;

    const config = await PromoConfig.findOne({ where: { config_key } });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    await config.update({
      config_value,
      config_value_en
    });

    res.json({
      success: true,
      message: '配置更新成功',
      data: config
    });
  } catch (error) {
    next(error);
  }
};

// 批量更新配置
exports.batchUpdateConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        message: '无效的配置数据'
      });
    }

    for (const item of configs) {
      const { config_key, config_value, config_value_en } = item;

      await PromoConfig.update(
        { config_value, config_value_en },
        { where: { config_key } }
      );
    }

    res.json({
      success: true,
      message: '配置批量更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 导航菜单管理 ====================

// 获取导航菜单列表
exports.getNavItems = async (req, res, next) => {
  try {
    const navItems = await PromoNavItem.findAll({
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      data: navItems
    });
  } catch (error) {
    next(error);
  }
};

// 创建导航菜单
exports.createNavItem = async (req, res, next) => {
  try {
    const navItem = await PromoNavItem.create(req.body);

    res.json({
      success: true,
      message: '导航菜单创建成功',
      data: navItem
    });
  } catch (error) {
    next(error);
  }
};

// 更新导航菜单
exports.updateNavItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const navItem = await PromoNavItem.findByPk(id);

    if (!navItem) {
      return res.status(404).json({
        success: false,
        message: '导航菜单不存在'
      });
    }

    await navItem.update(req.body);

    res.json({
      success: true,
      message: '导航菜单更新成功',
      data: navItem
    });
  } catch (error) {
    next(error);
  }
};

// 删除导航菜单
exports.deleteNavItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const navItem = await PromoNavItem.findByPk(id);

    if (!navItem) {
      return res.status(404).json({
        success: false,
        message: '导航菜单不存在'
      });
    }

    await navItem.destroy();

    res.json({
      success: true,
      message: '导航菜单删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 统计数据管理 ====================

// 获取统计数据列表
exports.getStats = async (req, res, next) => {
  try {
    const stats = await PromoStat.findAll({
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// 创建统计数据
exports.createStat = async (req, res, next) => {
  try {
    const stat = await PromoStat.create(req.body);

    res.json({
      success: true,
      message: '统计数据创建成功',
      data: stat
    });
  } catch (error) {
    next(error);
  }
};

// 更新统计数据
exports.updateStat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stat = await PromoStat.findByPk(id);

    if (!stat) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }

    await stat.update(req.body);

    res.json({
      success: true,
      message: '统计数据更新成功',
      data: stat
    });
  } catch (error) {
    next(error);
  }
};

// 删除统计数据
exports.deleteStat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stat = await PromoStat.findByPk(id);

    if (!stat) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }

    await stat.destroy();

    res.json({
      success: true,
      message: '统计数据删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 团队成员管理 ====================

// 获取团队成员列表
exports.getTeamMembers = async (req, res, next) => {
  try {
    const teamMembers = await PromoTeamMember.findAll({
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      data: teamMembers
    });
  } catch (error) {
    next(error);
  }
};

// 创建团队成员
exports.createTeamMember = async (req, res, next) => {
  try {
    const teamMember = await PromoTeamMember.create(req.body);

    res.json({
      success: true,
      message: '团队成员创建成功',
      data: teamMember
    });
  } catch (error) {
    next(error);
  }
};

// 更新团队成员
exports.updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teamMember = await PromoTeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: '团队成员不存在'
      });
    }

    await teamMember.update(req.body);

    res.json({
      success: true,
      message: '团队成员更新成功',
      data: teamMember
    });
  } catch (error) {
    next(error);
  }
};

// 删除团队成员
exports.deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teamMember = await PromoTeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: '团队成员不存在'
      });
    }

    // 删除头像图片
    if (teamMember.avatar_image) {
      const filePath = config.getFilePathFromUrl(teamMember.avatar_image);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await teamMember.destroy();

    res.json({
      success: true,
      message: '团队成员删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 图片上传 ====================

// 上传官网主题图片
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 构建文件访问URL，优先使用S3 URL
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 删除官网主题图片
exports.deleteImage = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片URL'
      });
    }

    const filePath = config.getFilePathFromUrl(url);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};
