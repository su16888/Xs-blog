/**
 * @file migrateToRelativePaths.js
 * @description 将数据库中的绝对路径转换为相对路径
 * @usage node src/scripts/migrateToRelativePaths.js
 *
 * 此脚本会处理以下表和字段：
 * 1. notes.content - 笔记内容中的图片路径
 * 2. notes.cover_image - 笔记封面图
 * 3. notes.media_urls - 媒体URL（JSON数组）
 * 4. gallery_images.path - 图册图片路径
 * 5. galleries.cover_image - 图册封面图
 * 6. profile.avatar - 头像
 * 7. profile.background_image - 背景图
 * 8. settings.setting_value - 设置值（可能包含图片路径）
 * 9. social_links.icon - 社交链接图标
 * 10. services.cover_image - 服务封面图
 * 11. sites.logo - 网站导航logo
 * 12. promo_config.config_value - 推广配置（可能包含图片）
 * 13. promo_partners.image - 合作伙伴图片
 * 14. promo_team_members.avatar_image - 团队成员头像
 * 15. promo_services.image - 推广服务图片
 */

const { sequelize } = require('../config/database');

// 将绝对路径转换为相对路径的函数
function convertToRelativePath(url) {
  if (!url) return url;

  // 如果已经是相对路径，直接返回
  if (url.startsWith('/uploads/')) {
    return url;
  }

  // 匹配 http(s)://xxx/uploads/xxx 格式
  const match = url.match(/https?:\/\/[^\/]+\/uploads\/(.+)/);
  if (match) {
    return `/uploads/${match[1]}`;
  }

  return url;
}

// 处理文本内容中的所有图片路径（如笔记content）
function convertContentPaths(content) {
  if (!content) return content;

  // 匹配所有 http(s)://xxx/uploads/xxx 格式的URL
  // 包括在 src="..." 和 markdown ![](url) 格式中的
  return content.replace(
    /https?:\/\/[^\s"'\)]+\/uploads\/[^\s"'\)]+/g,
    (match) => convertToRelativePath(match)
  );
}

// 处理JSON数组中的路径
function convertJsonArrayPaths(jsonStr) {
  if (!jsonStr) return jsonStr;

  try {
    let arr = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    if (Array.isArray(arr)) {
      arr = arr.map(url => convertToRelativePath(url));
      return JSON.stringify(arr);
    }
  } catch (e) {
    // 如果不是有效JSON，尝试作为普通字符串处理
    return convertToRelativePath(jsonStr);
  }

  return jsonStr;
}

async function migrate() {
  console.log('========================================');
  console.log('开始迁移：将绝对路径转换为相对路径');
  console.log('========================================\n');

  const transaction = await sequelize.transaction();

  try {
    // 1. 处理 notes 表
    console.log('1. 处理 notes 表...');
    const [notes] = await sequelize.query(
      'SELECT id, content, cover_image, media_urls FROM notes',
      { transaction }
    );

    let notesUpdated = 0;
    for (const note of notes) {
      const newContent = convertContentPaths(note.content);
      const newCoverImage = convertToRelativePath(note.cover_image);
      const newMediaUrls = convertJsonArrayPaths(note.media_urls);

      if (newContent !== note.content || newCoverImage !== note.cover_image || newMediaUrls !== note.media_urls) {
        await sequelize.query(
          'UPDATE notes SET content = ?, cover_image = ?, media_urls = ? WHERE id = ?',
          {
            replacements: [newContent, newCoverImage, newMediaUrls, note.id],
            transaction
          }
        );
        notesUpdated++;
      }
    }
    console.log(`   - 共检查 ${notes.length} 条笔记，更新 ${notesUpdated} 条\n`);

    // 2. 处理 gallery_images 表
    console.log('2. 处理 gallery_images 表...');
    const [galleryImages] = await sequelize.query(
      'SELECT id, path FROM gallery_images',
      { transaction }
    );

    let galleryUpdated = 0;
    for (const img of galleryImages) {
      const newPath = convertToRelativePath(img.path);
      if (newPath !== img.path) {
        await sequelize.query(
          'UPDATE gallery_images SET path = ? WHERE id = ?',
          { replacements: [newPath, img.id], transaction }
        );
        galleryUpdated++;
      }
    }
    console.log(`   - 共检查 ${galleryImages.length} 张图片，更新 ${galleryUpdated} 张\n`);

    // 3. 处理 profile 表
    console.log('3. 处理 profile 表...');
    const [profiles] = await sequelize.query(
      'SELECT id, avatar, background_image FROM profile',
      { transaction }
    );

    let profileUpdated = 0;
    for (const profile of profiles) {
      const newAvatar = convertToRelativePath(profile.avatar);
      const newBgImage = convertToRelativePath(profile.background_image);

      if (newAvatar !== profile.avatar || newBgImage !== profile.background_image) {
        await sequelize.query(
          'UPDATE profile SET avatar = ?, background_image = ? WHERE id = ?',
          { replacements: [newAvatar, newBgImage, profile.id], transaction }
        );
        profileUpdated++;
      }
    }
    console.log(`   - 共检查 ${profiles.length} 条资料，更新 ${profileUpdated} 条\n`);

    // 4. 处理 settings 表（可能包含图片路径的设置项）
    console.log('4. 处理 settings 表...');
    const imageSettingKeys = [
      'siteLogo', 'siteFavicon', 'defaultAvatar', 'defaultCover',
      'defaultNoteCover', 'backgroundImage', 'loginBackground',
      'customFont', 'ogImage'
    ];

    const [settings] = await sequelize.query(
      `SELECT id, setting_key, setting_value FROM settings WHERE setting_key IN (${imageSettingKeys.map(() => '?').join(',')})`,
      { replacements: imageSettingKeys, transaction }
    );

    let settingsUpdated = 0;
    for (const setting of settings) {
      const newValue = convertToRelativePath(setting.setting_value);
      if (newValue !== setting.setting_value) {
        await sequelize.query(
          'UPDATE settings SET setting_value = ? WHERE id = ?',
          { replacements: [newValue, setting.id], transaction }
        );
        settingsUpdated++;
      }
    }
    console.log(`   - 共检查 ${settings.length} 条设置，更新 ${settingsUpdated} 条\n`);

    // 5. 处理 social_links 表
    console.log('5. 处理 social_links 表...');
    try {
      const [socialLinks] = await sequelize.query(
        'SELECT id, icon FROM social_links',
        { transaction }
      );

      let socialUpdated = 0;
      for (const link of socialLinks) {
        const newIcon = convertToRelativePath(link.icon);
        if (newIcon !== link.icon) {
          await sequelize.query(
            'UPDATE social_links SET icon = ? WHERE id = ?',
            { replacements: [newIcon, link.id], transaction }
          );
          socialUpdated++;
        }
      }
      console.log(`   - 共检查 ${socialLinks.length} 条社交链接，更新 ${socialUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 6. 处理 services 表
    console.log('6. 处理 services 表...');
    try {
      const [services] = await sequelize.query(
        'SELECT id, image FROM services',
        { transaction }
      );

      let servicesUpdated = 0;
      for (const service of services) {
        const newImage = convertToRelativePath(service.image);
        if (newImage !== service.image) {
          await sequelize.query(
            'UPDATE services SET image = ? WHERE id = ?',
            { replacements: [newImage, service.id], transaction }
          );
          servicesUpdated++;
        }
      }
      console.log(`   - 共检查 ${services.length} 条服务，更新 ${servicesUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 7. 处理 promo_configs 表
    console.log('7. 处理 promo_configs 表...');
    try {
      const [promoConfigs] = await sequelize.query(
        'SELECT id, logo, hero_image, about_image FROM promo_configs',
        { transaction }
      );

      let promoUpdated = 0;
      for (const config of promoConfigs) {
        const newLogo = convertToRelativePath(config.logo);
        const newHeroImage = convertToRelativePath(config.hero_image);
        const newAboutImage = convertToRelativePath(config.about_image);

        if (newLogo !== config.logo || newHeroImage !== config.hero_image || newAboutImage !== config.about_image) {
          await sequelize.query(
            'UPDATE promo_configs SET logo = ?, hero_image = ?, about_image = ? WHERE id = ?',
            { replacements: [newLogo, newHeroImage, newAboutImage, config.id], transaction }
          );
          promoUpdated++;
        }
      }
      console.log(`   - 共检查 ${promoConfigs.length} 条推广配置，更新 ${promoUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 8. 处理 promo_partners 表
    console.log('8. 处理 promo_partners 表...');
    try {
      const [partners] = await sequelize.query(
        'SELECT id, logo FROM promo_partners',
        { transaction }
      );

      let partnersUpdated = 0;
      for (const partner of partners) {
        const newLogo = convertToRelativePath(partner.logo);
        if (newLogo !== partner.logo) {
          await sequelize.query(
            'UPDATE promo_partners SET logo = ? WHERE id = ?',
            { replacements: [newLogo, partner.id], transaction }
          );
          partnersUpdated++;
        }
      }
      console.log(`   - 共检查 ${partners.length} 条合作伙伴，更新 ${partnersUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 9. 处理 promo_team_members 表
    console.log('9. 处理 promo_team_members 表...');
    try {
      const [members] = await sequelize.query(
        'SELECT id, avatar FROM promo_team_members',
        { transaction }
      );

      let membersUpdated = 0;
      for (const member of members) {
        const newAvatar = convertToRelativePath(member.avatar);
        if (newAvatar !== member.avatar) {
          await sequelize.query(
            'UPDATE promo_team_members SET avatar = ? WHERE id = ?',
            { replacements: [newAvatar, member.id], transaction }
          );
          membersUpdated++;
        }
      }
      console.log(`   - 共检查 ${members.length} 条团队成员，更新 ${membersUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 10. 处理 promo_services 表
    console.log('10. 处理 promo_services 表...');
    try {
      const [promoServices] = await sequelize.query(
        'SELECT id, image FROM promo_services',
        { transaction }
      );

      let promoServicesUpdated = 0;
      for (const service of promoServices) {
        const newImage = convertToRelativePath(service.image);
        if (newImage !== service.image) {
          await sequelize.query(
            'UPDATE promo_services SET image = ? WHERE id = ?',
            { replacements: [newImage, service.id], transaction }
          );
          promoServicesUpdated++;
        }
      }
      console.log(`   - 共检查 ${promoServices.length} 条推广服务，更新 ${promoServicesUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 11. 处理 galleries 表（图册封面）
    console.log('11. 处理 galleries 表...');
    try {
      const [galleries] = await sequelize.query(
        'SELECT id, cover_image FROM galleries',
        { transaction }
      );

      let galleriesUpdated = 0;
      for (const gallery of galleries) {
        const newCoverImage = convertToRelativePath(gallery.cover_image);
        if (newCoverImage !== gallery.cover_image) {
          await sequelize.query(
            'UPDATE galleries SET cover_image = ? WHERE id = ?',
            { replacements: [newCoverImage, gallery.id], transaction }
          );
          galleriesUpdated++;
        }
      }
      console.log(`   - 共检查 ${galleries.length} 个图册，更新 ${galleriesUpdated} 个\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 12. 处理 sites 表（网站导航logo）
    console.log('12. 处理 sites 表...');
    try {
      const [sites] = await sequelize.query(
        'SELECT id, logo FROM sites',
        { transaction }
      );

      let sitesUpdated = 0;
      for (const site of sites) {
        const newLogo = convertToRelativePath(site.logo);
        if (newLogo !== site.logo) {
          await sequelize.query(
            'UPDATE sites SET logo = ? WHERE id = ?',
            { replacements: [newLogo, site.id], transaction }
          );
          sitesUpdated++;
        }
      }
      console.log(`   - 共检查 ${sites.length} 个网站，更新 ${sitesUpdated} 个\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 13. 处理 promo_config 表（推广配置，可能包含图片路径）
    console.log('13. 处理 promo_config 表...');
    try {
      const imageConfigKeys = [
        'logo', 'hero_image', 'hero_background', 'about_image',
        'favicon', 'og_image', 'background_image'
      ];

      const [promoConfig] = await sequelize.query(
        `SELECT id, config_key, config_value FROM promo_config WHERE config_key IN (${imageConfigKeys.map(() => '?').join(',')})`,
        { replacements: imageConfigKeys, transaction }
      );

      let promoConfigUpdated = 0;
      for (const config of promoConfig) {
        const newValue = convertToRelativePath(config.config_value);
        if (newValue !== config.config_value) {
          await sequelize.query(
            'UPDATE promo_config SET config_value = ? WHERE id = ?',
            { replacements: [newValue, config.id], transaction }
          );
          promoConfigUpdated++;
        }
      }
      console.log(`   - 共检查 ${promoConfig.length} 条推广配置，更新 ${promoConfigUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 14. 处理 promo_team_members 表（avatar_image 字段）
    console.log('14. 处理 promo_team_members.avatar_image...');
    try {
      const [teamMembers] = await sequelize.query(
        'SELECT id, avatar_image FROM promo_team_members',
        { transaction }
      );

      let teamMembersUpdated = 0;
      for (const member of teamMembers) {
        const newAvatarImage = convertToRelativePath(member.avatar_image);
        if (newAvatarImage !== member.avatar_image) {
          await sequelize.query(
            'UPDATE promo_team_members SET avatar_image = ? WHERE id = ?',
            { replacements: [newAvatarImage, member.id], transaction }
          );
          teamMembersUpdated++;
        }
      }
      console.log(`   - 共检查 ${teamMembers.length} 条团队成员，更新 ${teamMembersUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 15. 处理 promo_partners 表（image 字段）
    console.log('15. 处理 promo_partners.image...');
    try {
      const [partnersImg] = await sequelize.query(
        'SELECT id, image FROM promo_partners',
        { transaction }
      );

      let partnersImgUpdated = 0;
      for (const partner of partnersImg) {
        const newImage = convertToRelativePath(partner.image);
        if (newImage !== partner.image) {
          await sequelize.query(
            'UPDATE promo_partners SET image = ? WHERE id = ?',
            { replacements: [newImage, partner.id], transaction }
          );
          partnersImgUpdated++;
        }
      }
      console.log(`   - 共检查 ${partnersImg.length} 条合作伙伴图片，更新 ${partnersImgUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 16. 处理 services 表（cover_image 字段）
    console.log('16. 处理 services.cover_image...');
    try {
      const [servicesCover] = await sequelize.query(
        'SELECT id, cover_image FROM services',
        { transaction }
      );

      let servicesCoverUpdated = 0;
      for (const service of servicesCover) {
        const newCoverImage = convertToRelativePath(service.cover_image);
        if (newCoverImage !== service.cover_image) {
          await sequelize.query(
            'UPDATE services SET cover_image = ? WHERE id = ?',
            { replacements: [newCoverImage, service.id], transaction }
          );
          servicesCoverUpdated++;
        }
      }
      console.log(`   - 共检查 ${servicesCover.length} 条服务封面，更新 ${servicesCoverUpdated} 条\n`);
    } catch (e) {
      console.log('   - 表不存在或无需处理\n');
    }

    // 提交事务
    await transaction.commit();

    console.log('========================================');
    console.log('迁移完成！所有绝对路径已转换为相对路径');
    console.log('========================================');

  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('迁移失败，已回滚：', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 运行迁移
migrate();
