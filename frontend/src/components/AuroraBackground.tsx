'use client'

import { useEffect, useState } from 'react'

export default function AuroraBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-300/30 blur-[100px] animate-blob filter opacity-60"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-400/30 blur-[100px] animate-blob animation-delay-2000 filter opacity-60"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary-200/30 blur-[100px] animate-blob animation-delay-4000 filter opacity-60"></div>
    </div>
  )
}
