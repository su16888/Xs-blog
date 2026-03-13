'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { cn } from '@/lib/utils'

export default function SiteFooter({
  className,
  containerClassName,
  showBorder = true
}: {
  className?: string
  containerClassName?: string
  showBorder?: boolean
}) {
  const { settings } = useSettings()

  const fallback = `© ${new Date().getFullYear()} Xs-blog. All rights reserved.`
  const html = settings.footerCopyright || fallback

  return (
    <footer className={cn(showBorder && 'border-t border-border-primary', 'py-6', className)}>
      <div className={cn('container mx-auto px-4 max-w-6xl text-center text-sm text-text-tertiary', containerClassName)}>
        <p dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </footer>
  )
}

