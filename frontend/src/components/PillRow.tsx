'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

type PillRowProps = {
  className?: string
  category?: React.ReactNode
  tags?: React.ReactNode[]
  measureKey?: string
}

export default function PillRow({ className, category, tags = [], measureKey }: PillRowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const categoryRef = useRef<HTMLDivElement | null>(null)
  const tagRefs = useRef<Array<HTMLDivElement | null>>([])
  const [visibleTagCount, setVisibleTagCount] = useState(tags.length)

  const normalizedTags = useMemo(() => tags.filter(Boolean), [tags])

  useEffect(() => {
    tagRefs.current = new Array(normalizedTags.length).fill(null)
    setVisibleTagCount(normalizedTags.length)
  }, [normalizedTags.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const el = containerRef.current
      if (!el) return

      const containerWidth = el.clientWidth
      if (!containerWidth) {
        setVisibleTagCount(normalizedTags.length)
        return
      }

      const style = window.getComputedStyle(el)
      const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0

      let used = 0
      const catEl = categoryRef.current
      if (catEl) {
        used += catEl.offsetWidth
      }

      let count = 0
      for (let i = 0; i < normalizedTags.length; i += 1) {
        const tagEl = tagRefs.current[i]
        if (!tagEl) break
        const w = tagEl.offsetWidth
        const next = used + (used > 0 ? gap : 0) + w
        if (next <= containerWidth) {
          used = next
          count = i + 1
        } else {
          break
        }
      }

      setVisibleTagCount(count)
    }

    const raf = window.requestAnimationFrame(measure)
    const ro = new ResizeObserver(() => measure())
    ro.observe(container)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [category, normalizedTags, measureKey])

  if (!category && normalizedTags.length === 0) return null

  return (
    <div ref={containerRef} className={`flex items-center gap-1 overflow-hidden min-w-0 ${className || ''}`}>
      {category ? (
        <div ref={categoryRef} className="flex-shrink-0">
          {category}
        </div>
      ) : null}
      {normalizedTags.map((tag, idx) => (
        <div
          key={idx}
          ref={(el) => { tagRefs.current[idx] = el }}
          className={`flex-shrink-0 ${idx < visibleTagCount ? '' : 'hidden'}`}
        >
          {tag}
        </div>
      ))}
    </div>
  )
}

