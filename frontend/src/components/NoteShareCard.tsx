'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { safeFetch } from '@/lib/utils'

interface NoteShareCardProps {
  noteId: number
  title: string
  password?: string
  onClose: () => void
}

// 绘制圆角矩形的辅助函数
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export default function NoteShareCard({ noteId, title, password, onClose }: NoteShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [avatar, setAvatar] = useState('')
  const [siteName, setSiteName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfileAndGenerate()
  }, [])

  const loadProfileAndGenerate = async () => {
    let loadedAvatar = ''
    let loadedSiteName = ''

    try {
      // 加载个人资料（禁用缓存避免 body stream 问题）
      const profileRes = await safeFetch('/api/profile', undefined, false)
      const profileData = await profileRes.json()
      if (profileData.success && profileData.data?.avatar) {
        loadedAvatar = profileData.data.avatar.startsWith('http')
          ? profileData.data.avatar
          : `${window.location.origin}${profileData.data.avatar}`
        setAvatar(loadedAvatar)
      }

      // 加载网站设置（禁用缓存避免 body stream 问题）
      const settingsRes = await safeFetch('/api/settings', undefined, false)
      const settingsData = await settingsRes.json()
      if (settingsData.success && settingsData.data) {
        const siteTitle = settingsData.data.find((s: any) => s.key === 'siteTitle')?.value
        loadedSiteName = siteTitle || ''
        setSiteName(loadedSiteName)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }

    // 直接传递数据生成卡片
    await generateCard(loadedAvatar, loadedSiteName)
  }

  const generateCard = async (avatarUrl: string = avatar, siteTitle: string = siteName) => {
    const canvas = canvasRef.current
    if (!canvas) {
      setError('Canvas 不可用')
      setLoading(false)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('无法获取 Canvas 上下文')
      setLoading(false)
      return
    }

    try {
      // 设置画布尺寸
      canvas.width = 600
      canvas.height = 800

      // 背景渐变
      const gradient = ctx.createLinearGradient(0, 0, 0, 800)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 600, 800)

      // 白色卡片（使用辅助函数绘制圆角矩形）
      ctx.fillStyle = '#ffffff'
      drawRoundRect(ctx, 40, 60, 520, 680, 20)
      ctx.fill()

      // 加载头像
      if (avatarUrl) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('头像加载失败'))
            img.src = avatarUrl
          })
          ctx.save()
          ctx.beginPath()
          ctx.arc(300, 140, 50, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(img, 250, 90, 100, 100)
          ctx.restore()
        } catch (e) {
          // 头像加载失败，绘制默认圆形
          ctx.fillStyle = '#667eea'
          ctx.beginPath()
          ctx.arc(300, 140, 50, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // 没有头像，绘制默认圆形
        ctx.fillStyle = '#667eea'
        ctx.beginPath()
        ctx.arc(300, 140, 50, 0, Math.PI * 2)
        ctx.fill()
      }

      // 网站名称
      ctx.fillStyle = '#1a202c'
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(siteTitle || '分享笔记', 300, 230)

      // 笔记标题（截断）
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#4a5568'
      const maxWidth = 460
      let displayTitle = title || '无标题'
      if (ctx.measureText(displayTitle).width > maxWidth) {
        while (ctx.measureText(displayTitle + '...').width > maxWidth && displayTitle.length > 0) {
          displayTitle = displayTitle.slice(0, -1)
        }
        displayTitle += '...'
      }
      ctx.fillText(displayTitle, 300, 280)

      // 生成二维码
      const currentUrl = window.location.origin
      let noteUrl = `${currentUrl}/note/${noteId}`
      if (password) {
        noteUrl += `?password=${encodeURIComponent(password)}`
      }

      const qrDataUrl = await QRCode.toDataURL(noteUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      const qrImg = new Image()
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => resolve()
        qrImg.src = qrDataUrl
      })
      ctx.drawImage(qrImg, 160, 320, 280, 280)

      // 域名/IP
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#718096'
      ctx.fillText(currentUrl.replace(/^https?:\/\//, ''), 300, 650)

      // 提示文字
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = '#a0aec0'
      ctx.fillText('扫描二维码查看笔记', 300, 690)

      setLoading(false)
    } catch (err) {
      console.error('生成卡片失败:', err)
      setError('生成卡片失败')
      setLoading(false)
    }
  }

  const downloadCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `note-${noteId}-share.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium text-gray-800">分享笔记</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center">
          {loading && <div className="text-gray-500 mb-4">生成中...</div>}
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-lg"
            style={{ width: '300px', height: '400px', display: loading ? 'none' : 'block' }}
          />

          <button
            onClick={downloadCard}
            disabled={loading || !!error}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            下载分享图片
          </button>
        </div>
      </div>
    </div>
  )
}
