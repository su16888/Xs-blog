// 设置接口定义
export interface Setting {
  key: string
  value: string
  type?: string
}

// 设置状态接口
export interface SettingsState {
  siteTitle: string
  siteSubtitle: string
  siteDescription: string
  siteKeywords: string
  themeColor: string
  themeType: string
  footerCopyright: string
  backgroundImage: string
  backgroundOpacity: string
  showSiteNav: string
  showNotes: string
  showSocialLinks: string
  defaultDisplaySection: string
  customFont: string
  customFontName: string
  todoReminderCheckInterval: string
  showNoteTags: string
  showNoteCategories: string
  messageIpLimitDays: string
  noteLayoutColumns: string
  avatarShape: string
  showNoteCover: string
  defaultNoteCover: string
  showNavigationRecommended: string
  blogLogo: string
  blogLogoText: string
  blogNavLinks: string
  showTopNavbar: string
  showWapSidebar: string
  enableAvatarThemeSwitch: string
  promoThemeEnabled: string
  socialFeedThemeEnabled: string
  docsThemeEnabled: string
  enableUserPage: string
  enableBlogPage: string
  enablePromoPage: string
  enableDocsPage: string
  allowSEO: string
  enableSocialFeedPage: string
  blogAnnouncements: string
  blogAnnouncementEnabled: string
  hideBlogProfileCard: string
  customScript: string
  enableMessageEmailNotification: string
}

// 导航链接接口
export interface NavLink {
  name: string
  url: string
  icon?: string
}

// 用户名表单接口
export interface UsernameForm {
  currentPassword: string
  newUsername: string
}

// 密码表单接口
export interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Toast状态接口
export interface ToastState {
  show: boolean
  type: 'success' | 'error'
  message: string
}

// S3配置接口
export interface S3Config {
  storageType: string
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  customDomain: string
  pathStyle: boolean
}

// 页面文本设置接口
export interface PageTextItem {
  title?: string
  description?: string
  browserTitle: string
  browserSubtitle?: string
  usageTitle?: string
  usageContent?: string
}

export interface PageTexts {
  navigation: PageTextItem
  services: PageTextItem
  notes: PageTextItem
  galleries: PageTextItem
  messages: PageTextItem
  promo: PageTextItem
  socialFeed: PageTextItem
  docs: PageTextItem
}

// 首页内容区域设置
export interface HomeContentSections {
  section1: 'notes' | 'navigation' | 'services' | 'galleries' | ''
  section2: 'notes' | 'navigation' | 'services' | 'galleries' | ''
  showInDefaultTheme: boolean
}

// 标签页类型
export type ActiveTab = 'basic' | 'functions' | 'navigation' | 'text-settings' | 'account'

// 文本设置子标签页类型
export type TextSettingsTab = 'page-texts' | 'home-content' | 's3-storage' | 'docs-order'

// 默认设置值
export const defaultSettings: SettingsState = {
  siteTitle: '',
  siteSubtitle: '',
  siteDescription: '',
  siteKeywords: '',
  themeColor: 'white',
  themeType: 'default',
  footerCopyright: '',
  backgroundImage: '',
  backgroundOpacity: '0.5',
  showSiteNav: 'true',
  showNotes: 'true',
  showSocialLinks: 'true',
  defaultDisplaySection: 'notes',
  customFont: '',
  customFontName: '',
  todoReminderCheckInterval: '5',
  showNoteTags: 'true',
  showNoteCategories: 'true',
  messageIpLimitDays: '1',
  noteLayoutColumns: '1',
  avatarShape: 'circle',
  showNoteCover: 'true',
  defaultNoteCover: '',
  showNavigationRecommended: 'true',
  blogLogo: '',
  blogLogoText: '',
  blogNavLinks: '[]',
  showTopNavbar: 'true',
  showWapSidebar: 'true',
  enableAvatarThemeSwitch: 'false',
  promoThemeEnabled: 'false',
  socialFeedThemeEnabled: 'false',
  docsThemeEnabled: 'false',
  enableUserPage: 'true',
  enableBlogPage: 'true',
  enablePromoPage: 'true',
  enableDocsPage: 'true',
  allowSEO: 'false',
  enableSocialFeedPage: 'true',
  blogAnnouncements: '[]',
  blogAnnouncementEnabled: 'false',
  hideBlogProfileCard: 'false',
  customScript: '',
  enableMessageEmailNotification: 'false'
}

// 默认页面文本
export const defaultPageTexts: PageTexts = {
  navigation: { title: '导航列表', description: '探索精选的网站导航', browserTitle: '导航列表', browserSubtitle: '' },
  services: { title: '服务业务', description: '为您提供专业的服务解决方案', browserTitle: '服务业务', browserSubtitle: '' },
  notes: { title: '笔记列表', description: '探索所有已发布的笔记内容', browserTitle: '全部笔记', browserSubtitle: '' },
  galleries: { title: '图库列表', description: '探索精彩的图片合集', browserTitle: '图库列表', browserSubtitle: '' },
  messages: { title: '联系我们', description: '有任何问题都可以通过这里进行提交你的想法！', browserTitle: '留言板', browserSubtitle: '' },
  promo: { browserTitle: '官网首页', browserSubtitle: '欢迎访问' },
  socialFeed: { browserTitle: '朋友圈', browserSubtitle: '分享生活点滴' },
  docs: { title: '文档中心', description: '浏览所有可用的 Markdown 文档，点击查看详情', browserTitle: '文档中心', browserSubtitle: '', usageTitle: '使用说明', usageContent: '将 Markdown 文件放入 public/markdown 目录\n通过 /docs/文件名 访问文档\n支持标准 Markdown 语法、GFM 扩展和 HTML 标签' }
}

// 默认首页内容设置
export const defaultHomeContentSections: HomeContentSections = {
  section1: 'notes',
  section2: 'navigation',
  showInDefaultTheme: true
}

// 默认S3配置
export const defaultS3Config: S3Config = {
  storageType: 'local',
  endpoint: '',
  region: 'us-east-1',
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  customDomain: '',
  pathStyle: false
}
