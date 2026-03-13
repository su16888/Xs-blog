import { MetadataRoute } from 'next'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // 获取 SEO 设置和后台路径
  let allowSEO = false
  let adminPath = 'admins' // 默认值

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/settings`, {
      cache: 'no-store'
    })
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        const seoSetting = data.data.find((s: any) => s.key === 'allowSEO')
        allowSEO = seoSetting?.value === 'true'

        // 获取后台路径配置
        const adminPathSetting = data.data.find((s: any) => s.key === 'admin_path')
        if (adminPathSetting?.value) {
          adminPath = adminPathSetting.value
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch SEO settings:', error)
  }

  // 如果不允许 SEO，禁止所有爬虫
  if (!allowSEO) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  // 如果允许 SEO，只禁止后台路径（使用动态配置的路径）
  return {
    rules: [
      {
        userAgent: '*',
        disallow: [`/${adminPath}`, `/${adminPath}/`],
      },
    ],
  }
}
