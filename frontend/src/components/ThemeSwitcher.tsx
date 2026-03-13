'use client'

import { useTheme } from '@/contexts/ThemeContext'

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

  const themes = [
    { id: 'white', name: '白色', icon: '⚪' },
    { id: 'gray', name: '灰色', icon: '⚫' },
    { id: 'black', name: '黑色', icon: '⚫' },
    { id: 'blog', name: '博客', icon: '📝' }
  ]

  return (
    <div className="flex items-center gap-2 p-2 bg-bg-secondary rounded-lg border border-border-primary">
      <span className="text-sm text-text-secondary mr-2">主题:</span>
      <div className="flex gap-1">
        {themes.map((themeOption) => (
          <button
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id as any)}
            className={`
              px-3 py-1 text-sm rounded-md transition-all duration-200
              ${theme === themeOption.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-bg-tertiary text-text-secondary hover:bg-primary-100 hover:text-primary-700'
              }
            `}
            title={themeOption.name}
          >
            {themeOption.icon} {themeOption.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemeSwitcher