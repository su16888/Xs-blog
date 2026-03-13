'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { Maximize2, Download, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { createPortal } from 'react-dom'

interface MermaidRendererProps {
  chart: string
  className?: string
}

// 全局 Mermaid 模块缓存
let mermaidModule: typeof import('mermaid') | null = null

function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mainTransformRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'code'>('chart')
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mainScale, setMainScale] = useState(1)
  const [mainPosition, setMainPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [themeVersion, setThemeVersion] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // 使用 ref 存储拖动状态，避免闭包问题
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const lastTouchDistance = useRef<number>(0)
  const lastTouchCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // 主容器拖动状态
  const isMainDraggingRef = useRef(false)
  const mainDragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const mainPositionRef = useRef({ x: 0, y: 0 })
  const mainScaleRef = useRef(1)
  const mainLastTouchDistance = useRef<number>(0)

  const sanitizeFlowchartSquareLabels = useCallback((input: string) => {
    const findBoundaryIndex = (line: string, startIndex: number) => {
      const patterns = ['-.->', '-->', '---', '==>', ':::']
      let boundary = -1
      for (const p of patterns) {
        const idx = line.indexOf(p, startIndex)
        if (idx !== -1 && (boundary === -1 || idx < boundary)) boundary = idx
      }
      return boundary === -1 ? line.length : boundary
    }

    const sanitizeLine = (line: string) => {
      let i = 0
      let out = ''
      while (i < line.length) {
        const openIdx = line.indexOf('[', i)
        if (openIdx === -1) {
          out += line.slice(i)
          break
        }

        const prev = openIdx > 0 ? line[openIdx - 1] : ''
        const next = openIdx + 1 < line.length ? line[openIdx + 1] : ''
        if (!prev || !/[0-9A-Za-z_-]/.test(prev) || next === '"' || next === '[') {
          out += line.slice(i, openIdx + 1)
          i = openIdx + 1
          continue
        }

        const boundary = findBoundaryIndex(line, openIdx + 1)
        const segment = line.slice(openIdx + 1, boundary)
        const closeRel = segment.lastIndexOf(']')
        if (closeRel === -1) {
          out += line.slice(i, openIdx + 1)
          i = openIdx + 1
          continue
        }

        const closeIdx = openIdx + 1 + closeRel
        const inner = line.slice(openIdx + 1, closeIdx)
        const safeInner = inner.replaceAll('[', '【').replaceAll(']', '】')
        out += line.slice(i, openIdx + 1) + safeInner + ']'
        i = closeIdx + 1
      }
      return out
    }

    const normalized = input.replace(/\r\n/g, '\n')
    return normalized.split('\n').map(sanitizeLine).join('\n')
  }, [])

  const preprocessChart = useCallback((input: string) => {
    const trimmed = input.trim()
    const firstLine = (trimmed.split('\n')[0] || '').trim().toLowerCase()
    const isFlowchart = firstLine.startsWith('flowchart') || firstLine.startsWith('graph')
    if (!isFlowchart) return trimmed
    return sanitizeFlowchartSquareLabels(trimmed)
  }, [sanitizeFlowchartSquareLabels])

  // 同步 ref 和 state
  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    mainPositionRef.current = mainPosition
  }, [mainPosition])

  useEffect(() => {
    mainScaleRef.current = mainScale
  }, [mainScale])

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const observer = new MutationObserver(() => setThemeVersion(v => v + 1))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style']
    })
    return () => observer.disconnect()
  }, [])

  // 初始化并渲染 Mermaid
  useEffect(() => {
    const renderChart = async () => {
      try {
        // 动态导入 mermaid
        if (!mermaidModule) {
          mermaidModule = await import('mermaid')
        }
        const mermaid = mermaidModule.default

        const rootStyles = getComputedStyle(document.documentElement)
        const readVar = (name: string, fallback: string) => rootStyles.getPropertyValue(name).trim() || fallback

        const bgSecondary = readVar('--bg-secondary', '#ffffff')
        const bgTertiary = readVar('--bg-tertiary', '#f5f5f5')
        const textPrimary = readVar('--text-primary', '#111827')
        const textSecondary = readVar('--text-secondary', '#54697b')
        const textTertiary = readVar('--text-tertiary', '#6b7280')
        const borderPrimary = readVar('--border-primary', '#e5e7eb')
        const borderSecondary = readVar('--border-secondary', '#d1d5db')
        const primary500 = readVar('--primary-500', '#10B981')
        const primary400 = readVar('--primary-400', '#34d399')
        const primary300 = readVar('--primary-300', '#6ee7b7')
        const errorBg = readVar('--error-bg', '#fef2f2')
        const errorText = readVar('--error-text', '#dc2626')
        const warningBg = readVar('--warning-bg', '#fffbeb')
        const warningText = readVar('--warning-text', '#d97706')
        const successBg = readVar('--success-bg', '#f0fdf4')
        const successText = readVar('--success-text', '#16a34a')

        const themeCSS = `
          .background { fill: ${bgSecondary} !important; }
          .label text, text { fill: ${textSecondary} !important; }
          .node text { fill: ${textPrimary} !important; }
          .node rect, .node polygon, .node circle, .node ellipse { fill: ${bgTertiary} !important; stroke: ${borderSecondary} !important; }
          .edgePath .path, .flowchart-link { stroke: ${borderSecondary} !important; }
          .edgeLabel text { fill: ${textSecondary} !important; }
          .cluster rect { fill: ${bgSecondary} !important; stroke: ${borderSecondary} !important; }
          .actor rect { fill: ${bgTertiary} !important; stroke: ${borderSecondary} !important; }
          .messageLine0, .messageLine1, .messageLine { stroke: ${borderSecondary} !important; }
          .note rect { fill: ${bgTertiary} !important; stroke: ${borderSecondary} !important; }
          .note text { fill: ${textPrimary} !important; }
          .activation0, .activation1, .activation2 { fill: ${bgTertiary} !important; stroke: ${borderSecondary} !important; }
          .arrowheadPath, .marker { fill: ${borderSecondary} !important; stroke: ${borderSecondary} !important; }
          .titleText, .pieTitleText { fill: ${textPrimary} !important; }
          .legend text { fill: ${textSecondary} !important; }
        `

        // 每次都重新初始化以确保配置生效
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          themeCSS,
          themeVariables: {
            primaryTextColor: textSecondary,
            secondaryTextColor: textSecondary,
            tertiaryTextColor: textSecondary,
            textColor: textSecondary,
            nodeTextColor: textPrimary,
            primaryColor: bgTertiary,
            primaryBorderColor: borderSecondary,
            secondaryColor: bgSecondary,
            secondaryBorderColor: borderSecondary,
            tertiaryColor: bgSecondary,
            tertiaryBorderColor: borderPrimary,
            lineColor: borderSecondary,
            labelTextColor: textSecondary,
            actorTextColor: textSecondary,
            signalTextColor: textSecondary,
            labelBoxBkgColor: bgTertiary,
            labelBoxBorderColor: borderSecondary,
            noteBkgColor: bgTertiary,
            noteTextColor: textPrimary,
            noteBorderColor: borderSecondary,
            pieTextColor: textSecondary,
            taskTextColor: textSecondary,
            taskTextOutsideColor: textSecondary,
            sectionBkgColor: bgTertiary,
            sectionTextColor: textSecondary,
            taskTextDarkColor: textSecondary,
            titleColor: textPrimary,
            fillType0: bgTertiary,
            fillType1: bgSecondary,
            fillType2: bgTertiary,
            fillType3: bgSecondary,
            fontSize: '14px',
            nodeBorder: borderSecondary,
            mainBkg: bgSecondary,
            errorBkgColor: bgSecondary,
            errorTextColor: textPrimary,
            classText: textPrimary,
            relationLabelColor: textSecondary,
            actorBorder: borderSecondary,
            actorBkg: bgTertiary,
            signalColor: textTertiary,
            clusterBkg: bgSecondary,
            clusterBorder: borderSecondary,
            edgeLabelBackground: bgSecondary,
            defaultLinkColor: borderSecondary,
            arrowheadColor: borderSecondary,
            accent1: primary500,
            accent2: primary400,
            accent3: primary300,
            critBkgColor: errorBg,
            critBorderColor: errorText,
            doneBkgColor: successBg,
            doneBorderColor: successText,
            activeTaskBkgColor: primary500,
            activeTaskBorderColor: primary500,
            todayLineColor: warningText,
            todayLineStroke: warningText,
            taskBkgColor: bgTertiary,
            taskBorderColor: borderSecondary,
            gridColor: borderPrimary,

            quadrant1Fill: bgTertiary,
            quadrant2Fill: bgSecondary,
            quadrant3Fill: bgSecondary,
            quadrant4Fill: bgTertiary,
            quadrant1TextFill: textSecondary,
            quadrant2TextFill: textSecondary,
            quadrant3TextFill: textSecondary,
            quadrant4TextFill: textSecondary,
            quadrantPointFill: primary500,
            quadrantPointTextFill: textPrimary,
            quadrantXAxisTextFill: textSecondary,
            quadrantYAxisTextFill: textSecondary,
            quadrantInternalBorderStrokeFill: borderPrimary,
            quadrantExternalBorderStrokeFill: borderSecondary,
          },
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis',
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50
          },
          sequence: {
            useMaxWidth: false,
            wrap: false,
            width: 180,
            height: 60,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35
          },
          gantt: {
            useMaxWidth: false,
            leftPadding: 75,
            rightPadding: 20,
            barHeight: 20,
            barGap: 4
          },
          mindmap: {
            useMaxWidth: false,
            padding: 20
          },
          pie: {
            useMaxWidth: false
          },
          er: {
            useMaxWidth: false
          },
          journey: {
            useMaxWidth: false
          },
          gitGraph: {
            useMaxWidth: false
          },
          class: {
            useMaxWidth: false
          },
          state: {
            useMaxWidth: false
          },
          quadrantChart: {
            useMaxWidth: false,
            pointTextPadding: 10
          }
        })

        // 生成唯一 ID
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

        // 创建一个隐藏的大容器来渲染，确保生成完整尺寸的 SVG
        const hiddenContainer = document.createElement('div')
        hiddenContainer.id = id
        hiddenContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:3000px;visibility:hidden;'
        document.body.appendChild(hiddenContainer)

        try {
          const rawChart = chart.trim()
          const fallbackChart = preprocessChart(rawChart)

          let renderedSvg = ''
          let renderError: unknown = null

          try {
            const result = await mermaid.render(`${id}-svg`, rawChart, hiddenContainer)
            renderedSvg = result.svg
          } catch (err) {
            renderError = err
            if (fallbackChart !== rawChart) {
              const result = await mermaid.render(`${id}-svg-compat`, fallbackChart, hiddenContainer)
              renderedSvg = result.svg
              renderError = null
            }
          }

          if (!renderedSvg) {
            throw renderError instanceof Error ? renderError : new Error('图表渲染失败')
          }

          // 处理 SVG，确保有固定尺寸
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = renderedSvg
          const svgEl = tempDiv.querySelector('svg')

          if (svgEl) {
            // 获取 viewBox 尺寸
            const viewBox = svgEl.getAttribute('viewBox')
            let svgWidth = 0
            let svgHeight = 0

            if (viewBox) {
              const parts = viewBox.split(/[\s,]+/).map(Number)
              if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
                svgWidth = parts[2]
                svgHeight = parts[3]
              }
            }

            // 如果没有从 viewBox 获取到，尝试从属性获取
            if (!svgWidth || !svgHeight) {
              const widthAttr = svgEl.getAttribute('width')
              const heightAttr = svgEl.getAttribute('height')
              if (widthAttr) svgWidth = parseFloat(widthAttr) || 0
              if (heightAttr) svgHeight = parseFloat(heightAttr) || 0
            }

            // 确保有最小尺寸
            svgWidth = Math.max(svgWidth, 300)
            svgHeight = Math.max(svgHeight, 200)

            // 移除所有可能导致缩放的样式
            svgEl.removeAttribute('style')
            svgEl.setAttribute('width', String(svgWidth))
            svgEl.setAttribute('height', String(svgHeight))

            // 设置固定尺寸的内联样式
            svgEl.style.cssText = `width:${svgWidth}px;height:${svgHeight}px;min-width:${svgWidth}px;max-width:none;display:block;`
          }

          setSvg(tempDiv.innerHTML)
          setError(null)
        } finally {
          // 清理隐藏容器
          document.body.removeChild(hiddenContainer)
        }
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(err instanceof Error ? err.message : '图表渲染失败')
      }
    }

    if (chart && mounted) {
      renderChart()
    }
  }, [chart, mounted, themeVersion, preprocessChart])

  // 下载为指定格式
  const handleDownload = useCallback(async (format: 'svg' | 'png' | 'jpg') => {
    if (!svg || !containerRef.current) return

    try {
      const svgElement = containerRef.current.querySelector('svg')
      if (!svgElement) return

      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

      let width = 800
      let height = 600

      const viewBox = svgElement.getAttribute('viewBox')
      if (viewBox) {
        const parts = viewBox.split(/\s+|,/).map(Number)
        if (parts.length >= 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
          width = parts[2]
          height = parts[3]
        }
      }

      width = Math.max(width, 400)
      height = Math.max(height, 300)

      clonedSvg.setAttribute('width', String(width))
      clonedSvg.setAttribute('height', String(height))
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)

      // JPG 需要白色背景
      if (format === 'jpg') {
        const rootStyles = getComputedStyle(document.documentElement)
        const jpgBg = rootStyles.getPropertyValue('--bg-secondary').trim() || '#ffffff'
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('width', '100%')
        rect.setAttribute('height', '100%')
        rect.setAttribute('fill', jpgBg)
        clonedSvg.insertBefore(rect, clonedSvg.firstChild)
      }

      const serializer = new XMLSerializer()
      let svgString = serializer.serializeToString(clonedSvg)

      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      }

      if (format === 'svg') {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const link = document.createElement('a')
        link.download = `mermaid-chart-${Date.now()}.svg`
        link.href = URL.createObjectURL(svgBlob)
        link.click()
        URL.revokeObjectURL(link.href)
      } else {
        // PNG 或 JPG：转换为 canvas
        const canvas = document.createElement('canvas')
        const scaleFactor = 2
        canvas.width = width * scaleFactor
        canvas.height = height * scaleFactor
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // JPG 需要白色背景，PNG 保持透明
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const img = new Image()
        // 使用 data URL 避免跨域问题
        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)))

        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const link = document.createElement('a')
          link.download = `mermaid-chart-${Date.now()}.${format}`
          link.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95)
          link.click()
        }

        img.onerror = () => {
          // 备用：下载 SVG
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
          const link = document.createElement('a')
          link.download = `mermaid-chart-${Date.now()}.svg`
          link.href = URL.createObjectURL(svgBlob)
          link.click()
          URL.revokeObjectURL(link.href)
        }

        img.src = `data:image/svg+xml;base64,${svgBase64}`
      }
      setIsDownloadOpen(false)
    } catch (err) {
      console.error('Download error:', err)
    }
  }, [svg])

  // 打开预览 - 计算合适的初始缩放比例
  const openPreview = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 获取 SVG 尺寸
    const svgElement = containerRef.current?.querySelector('svg')
    if (svgElement) {
      const svgWidth = svgElement.getBoundingClientRect().width || parseFloat(svgElement.getAttribute('width') || '800')
      const svgHeight = svgElement.getBoundingClientRect().height || parseFloat(svgElement.getAttribute('height') || '600')

      // 计算适合屏幕的缩放比例（留出边距）
      const padding = 80
      const maxWidth = window.innerWidth - padding * 2
      const maxHeight = window.innerHeight - padding * 2

      const scaleX = maxWidth / svgWidth
      const scaleY = maxHeight / svgHeight
      const fitScale = Math.max(0.25, Math.min(5, Math.min(scaleX, scaleY)))

      setScale(fitScale)
    } else {
      setScale(1)
    }

    setPosition({ x: 0, y: 0 })
    setIsPreviewOpen(true)
  }, [])

  // 关闭预览
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  // 缩放控制
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setScale(s => Math.min(s + 0.25, 5))
  }, [])

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setScale(s => Math.max(s - 0.25, 0.25))
  }, [])

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDownloadOpen(true)
  }, [])

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.max(0.25, Math.min(5, s + delta)))
  }, [])

  // 鼠标拖动 - 使用 requestAnimationFrame 优化性能
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !previewRef.current) return
    e.preventDefault()
    const newPosition = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    }
    positionRef.current = newPosition
    // 直接操作 DOM 避免 React 重渲染
    previewRef.current.style.transform = `translate(${newPosition.x}px, ${newPosition.y}px) scale(${scaleRef.current})`
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      // 同步 state 以保持一致性
      setPosition({ ...positionRef.current })
    }
  }, [])

  // 触摸事件处理
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.touches[0].clientX - positionRef.current.x,
        y: e.touches[0].clientY - positionRef.current.y
      }
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false
      lastTouchDistance.current = getTouchDistance(e.touches)
      lastTouchCenter.current = getTouchCenter(e.touches)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.touches.length === 1 && isDraggingRef.current && previewRef.current) {
      const newPosition = {
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      }
      positionRef.current = newPosition
      // 直接操作 DOM 避免 React 重渲染
      previewRef.current.style.transform = `translate(${newPosition.x}px, ${newPosition.y}px) scale(${scaleRef.current})`
    } else if (e.touches.length === 2 && previewRef.current) {
      const newDistance = getTouchDistance(e.touches)
      const newCenter = getTouchCenter(e.touches)

      if (lastTouchDistance.current > 0) {
        const scaleChange = newDistance / lastTouchDistance.current
        const newScale = Math.max(0.25, Math.min(5, scaleRef.current * scaleChange))
        scaleRef.current = newScale
      }

      const dx = newCenter.x - lastTouchCenter.current.x
      const dy = newCenter.y - lastTouchCenter.current.y
      const newPosition = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy
      }
      positionRef.current = newPosition
      // 直接操作 DOM 避免 React 重渲染
      previewRef.current.style.transform = `translate(${newPosition.x}px, ${newPosition.y}px) scale(${scaleRef.current})`

      lastTouchDistance.current = newDistance
      lastTouchCenter.current = newCenter
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
    lastTouchDistance.current = 0
    // 同步 state 以保持一致性
    setPosition({ ...positionRef.current })
    setScale(scaleRef.current)
  }, [])

  const applyMainTransform = useCallback((nextPosition: { x: number; y: number }, nextScale: number) => {
    if (!mainTransformRef.current) return
    mainTransformRef.current.style.transform = `translate(${nextPosition.x}px, ${nextPosition.y}px) scale(${nextScale})`
  }, [])

  useEffect(() => {
    applyMainTransform(mainPosition, mainScale)
  }, [applyMainTransform, mainPosition, mainScale])

  const handleMainPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!scrollContainerRef.current) return
    e.preventDefault()
    isMainDraggingRef.current = true
    mainDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: mainPositionRef.current.x,
      posY: mainPositionRef.current.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handleMainPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMainDraggingRef.current) return
    e.preventDefault()
    const dx = e.clientX - mainDragStartRef.current.x
    const dy = e.clientY - mainDragStartRef.current.y
    const nextPosition = {
      x: mainDragStartRef.current.posX + dx,
      y: mainDragStartRef.current.posY + dy
    }
    mainPositionRef.current = nextPosition
    applyMainTransform(nextPosition, mainScaleRef.current)
  }, [applyMainTransform])

  const handleMainPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMainDraggingRef.current) return
    isMainDraggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    setMainPosition({ ...mainPositionRef.current })
  }, [])

  const handleMainPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMainDraggingRef.current) return
    isMainDraggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    setMainPosition({ ...mainPositionRef.current })
  }, [])

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  const handleMainWheel = useCallback((e: WheelEvent) => {
    if (!scrollContainerRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const viewport = scrollContainerRef.current
    const rect = viewport.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    const prevScale = mainScaleRef.current
    const prevPosition = mainPositionRef.current
    const worldX = (cx - prevPosition.x) / prevScale
    const worldY = (cy - prevPosition.y) / prevScale

    const nextScale = clamp(prevScale * Math.exp(-e.deltaY * 0.0015), 0.25, 5)
    const nextPosition = {
      x: cx - worldX * nextScale,
      y: cy - worldY * nextScale
    }

    mainScaleRef.current = nextScale
    mainPositionRef.current = nextPosition
    applyMainTransform(nextPosition, nextScale)
    setMainScale(nextScale)
    setMainPosition({ ...nextPosition })
  }, [applyMainTransform])

  const handleMainTouchStart = useCallback((e: TouchEvent) => {
    if (!scrollContainerRef.current) return
    if (e.touches.length === 1) {
      isMainDraggingRef.current = true
      mainDragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        posX: mainPositionRef.current.x,
        posY: mainPositionRef.current.y
      }
      mainLastTouchDistance.current = 0
    } else if (e.touches.length === 2) {
      isMainDraggingRef.current = false
      mainLastTouchDistance.current = getTouchDistance(e.touches)
    }
  }, [])

  const handleMainTouchMove = useCallback((e: TouchEvent) => {
    if (!scrollContainerRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const viewport = scrollContainerRef.current
    const rect = viewport.getBoundingClientRect()

    if (e.touches.length === 1 && isMainDraggingRef.current) {
      const dx = e.touches[0].clientX - mainDragStartRef.current.x
      const dy = e.touches[0].clientY - mainDragStartRef.current.y
      const nextPosition = {
        x: mainDragStartRef.current.posX + dx,
        y: mainDragStartRef.current.posY + dy
      }
      mainPositionRef.current = nextPosition
      applyMainTransform(nextPosition, mainScaleRef.current)
    } else if (e.touches.length === 2) {
      const prevScale = mainScaleRef.current
      const prevPosition = mainPositionRef.current

      const newDistance = getTouchDistance(e.touches)
      if (mainLastTouchDistance.current <= 0 || newDistance <= 0) {
        mainLastTouchDistance.current = newDistance
        return
      }

      const center = getTouchCenter(e.touches)
      const cx = center.x - rect.left
      const cy = center.y - rect.top

      const worldX = (cx - prevPosition.x) / prevScale
      const worldY = (cy - prevPosition.y) / prevScale

      const scaleChange = newDistance / mainLastTouchDistance.current
      const nextScale = clamp(prevScale * scaleChange, 0.25, 5)
      const nextPosition = {
        x: cx - worldX * nextScale,
        y: cy - worldY * nextScale
      }

      mainScaleRef.current = nextScale
      mainPositionRef.current = nextPosition
      applyMainTransform(nextPosition, nextScale)

      mainLastTouchDistance.current = newDistance
      setMainScale(nextScale)
      setMainPosition({ ...nextPosition })
    }
  }, [applyMainTransform])

  const handleMainTouchEnd = useCallback(() => {
    isMainDraggingRef.current = false
    mainLastTouchDistance.current = 0
    setMainScale(mainScaleRef.current)
    setMainPosition({ ...mainPositionRef.current })
  }, [])

  useEffect(() => {
    const viewport = scrollContainerRef.current
    if (!viewport) return

    viewport.addEventListener('wheel', handleMainWheel, { passive: false })
    viewport.addEventListener('touchstart', handleMainTouchStart, { passive: true })
    viewport.addEventListener('touchmove', handleMainTouchMove, { passive: false })
    viewport.addEventListener('touchend', handleMainTouchEnd, { passive: true })

    return () => {
      viewport.removeEventListener('wheel', handleMainWheel)
      viewport.removeEventListener('touchstart', handleMainTouchStart)
      viewport.removeEventListener('touchmove', handleMainTouchMove)
      viewport.removeEventListener('touchend', handleMainTouchEnd)
    }
  }, [handleMainWheel, handleMainTouchEnd, handleMainTouchMove, handleMainTouchStart])

  useEffect(() => {
    if (!svg || !scrollContainerRef.current || !containerRef.current) return

    const timer = window.setTimeout(() => {
      const viewport = scrollContainerRef.current
      const svgEl = containerRef.current?.querySelector('svg')
      if (!viewport || !svgEl) return

      const vw = viewport.clientWidth
      const vh = viewport.clientHeight
      const sw = parseFloat(svgEl.getAttribute('width') || '0') || svgEl.getBoundingClientRect().width || 800
      const sh = parseFloat(svgEl.getAttribute('height') || '0') || svgEl.getBoundingClientRect().height || 600

      const padding = 32
      const fitScale = clamp(Math.min(vw / (sw + padding), vh / (sh + padding)), 0.25, 5)
      const nextPosition = {
        x: (vw - sw * fitScale) / 2,
        y: (vh - sh * fitScale) / 2
      }

      mainScaleRef.current = fitScale
      mainPositionRef.current = nextPosition
      applyMainTransform(nextPosition, fitScale)
      setMainScale(fitScale)
      setMainPosition(nextPosition)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [applyMainTransform, svg])

  // 预览弹窗的事件监听
  useEffect(() => {
    if (!isPreviewOpen || !previewContainerRef.current) return

    const container = previewContainerRef.current

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPreviewOpen, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

  // ESC 关闭预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        closePreview()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewOpen, closePreview])

  // 预览打开时禁止 body 滚动
  useEffect(() => {
    if (isPreviewOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isPreviewOpen])

  const handlePreviewContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePreview()
    }
  }, [closePreview])

  if (error) {
    return (
      <div className={`mermaid-error p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <p className="text-red-600 dark:text-red-400 text-sm">Mermaid 图表渲染失败: {error}</p>
        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={`mermaid-loading p-8 flex items-center justify-center bg-bg-secondary rounded-lg ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const previewModal = isPreviewOpen && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* 关闭按钮 */}
      <button
        onClick={closePreview}
        className="absolute top-4 right-4 z-10 p-2 bg-white/95 dark:bg-gray-800/95 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors shadow-lg"
        title="关闭 (ESC)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 图表预览区域 */}
      <div
        ref={previewContainerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={previewRef}
          className="relative select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* SVG 内容 */}
          <div
            className="bg-white rounded-xl p-6 shadow-2xl mermaid-preview-svg pointer-events-none"
            style={{ userSelect: 'none' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {/* 透明蒙版 - 用于拖动交互 */}
          <div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={handlePreviewContentClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white/95 dark:bg-gray-800/95 rounded-full border border-gray-200 dark:border-gray-700 shadow-lg">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[60px] text-center font-medium">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="放大"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="重置"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={handleDownloadClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="下载"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* 图表容器 */}
      <div className={`mermaid-container relative my-4 ${className}`}>
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-2">
          {/* 左侧 Mermaid 标识 */}
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="font-medium">Mermaid</span>
          </div>

          {/* 右侧按钮 */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'chart' ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:bg-bg-secondary'}`}
              >
                图表
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-border-primary ${viewMode === 'code' ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:bg-bg-secondary'}`}
              >
                代码
              </button>
            </div>
            <button
              type="button"
              onClick={openPreview}
              className="p-1.5 bg-bg-primary hover:bg-bg-secondary border border-border-primary rounded-lg text-text-secondary hover:text-primary-500 transition-colors shadow-sm"
              title="放大预览"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              className="p-1.5 bg-bg-primary hover:bg-bg-secondary border border-border-primary rounded-lg text-text-secondary hover:text-primary-500 transition-colors shadow-sm"
              title="下载图片"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="mermaid-scroll-container">
            <div
              ref={scrollContainerRef}
              className="mermaid-scroll-inner cursor-grab"
              onPointerDown={handleMainPointerDown}
              onPointerMove={handleMainPointerMove}
              onPointerUp={handleMainPointerUp}
              onPointerCancel={handleMainPointerCancel}
            >
              <div ref={mainTransformRef} className="mermaid-svg-wrapper">
                <div
                  ref={containerRef}
                  className="mermaid-svg-content"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-bg-secondary border border-border-primary rounded-lg p-4 overflow-auto">
            <pre className="text-xs text-text-secondary whitespace-pre font-mono">{chart.trim()}</pre>
          </div>
        )}
      </div>

      {previewModal}

      {/* 下载格式选择弹窗 */}
      {isDownloadOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsDownloadOpen(false)}
        >
          <div
            className="bg-bg-secondary rounded-2xl p-6 shadow-2xl border border-border-primary min-w-[280px] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">下载图表</h3>
                <p className="text-xs text-text-tertiary">选择导出格式</p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleDownload('svg')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-500">SVG</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary-500 transition-colors">矢量图</span>
                  <p className="text-xs text-text-tertiary">无损缩放，适合编辑</p>
                </div>
              </button>
              <button
                onClick={() => handleDownload('png')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-500">PNG</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary-500 transition-colors">透明背景</span>
                  <p className="text-xs text-text-tertiary">高清位图，支持透明</p>
                </div>
              </button>
              <button
                onClick={() => handleDownload('jpg')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-500">JPG</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary-500 transition-colors">白色背景</span>
                  <p className="text-xs text-text-tertiary">通用格式，体积较小</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setIsDownloadOpen(false)}
              className="w-full mt-4 px-4 py-2.5 text-sm text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default memo(MermaidRenderer)
