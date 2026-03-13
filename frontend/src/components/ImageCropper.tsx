'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Point, Area } from 'react-easy-crop'

interface ImageCropperProps {
  image: string
  onComplete: (croppedImage: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

/**
 * 创建图片裁剪结果
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

/**
 * 获取裁剪后的图片
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('无法获取canvas上下文')
  }

  // 设置canvas尺寸为裁剪区域尺寸
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // 绘制裁剪后的图片
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // 返回blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas为空'))
      }
    }, 'image/jpeg', 0.95)
  })
}

export default function ImageCropper({
  image,
  onComplete,
  onCancel,
  aspectRatio = 1
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleComplete = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setProcessing(true)
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onComplete(croppedImage)
    } catch (error) {
      console.error('裁剪失败:', error)
    } finally {
      setProcessing(false)
    }
  }, [image, croppedAreaPixels, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4">
        {/* 标题 */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">裁剪图片</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            拖动图片调整位置，滚动鼠标缩放
          </p>
        </div>

        {/* 裁剪区域 */}
        <div className="relative w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={aspectRatio === 1 ? 'round' : 'rect'}
          />
        </div>

        {/* 缩放滑块 */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            缩放
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            disabled={processing}
          >
            取消
          </button>
          <button
            onClick={handleComplete}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? '处理中...' : '完成裁剪'}
          </button>
        </div>
      </div>
    </div>
  )
}
