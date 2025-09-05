"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"

interface DrawingCanvasProps {
  tool: string
  brushColor: string
  brushSize: number
  brushStyle: string
  isGestureDrawing?: boolean // Added gesture drawing prop
}

// 添加DrawingCanvasRef接口定义
export interface DrawingCanvasRef {
  startDrawing: (x: number, y: number, pressure?: number) => void
  draw: (x: number, y: number, pressure?: number) => void
  stopDrawing: () => void
  undo: () => void
  redo: () => void
  clearCanvas: () => void
}

// ... existing interfaces ...

interface Point {
  x: number
  y: number
  pressure?: number
}

interface DrawingPath {
  points: Point[]
  color: string
  size: number
  style: string
  tool: string
  layer: number
}

interface Shape {
  id: string
  name: string
  category: string
  path: string
  viewBox: string
  x: number
  y: number
  scale: number
  color: string
  layer: number
  selected?: boolean // Added selection state
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  layer: number
}

// 使用forwardRef包装组件
export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  tool,
  brushColor,
  brushSize,
  brushStyle,
  isGestureDrawing = false,
}, ref) => {
  // ... existing state ...
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<DrawingPath[]>([])
  const [shapes, setShapes] = useState<Shape[]>([])
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [undoStack, setUndoStack] = useState<{ paths: DrawingPath[]; shapes: Shape[]; textElements: TextElement[] }[]>(
    [],
  )
  const [redoStack, setRedoStack] = useState<{ paths: DrawingPath[]; shapes: Shape[]; textElements: TextElement[] }[]>(
    [],
  )
  const [scale, setScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [pendingShape, setPendingShape] = useState<any>(null)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [currentLayer, setCurrentLayer] = useState(0)
  const [isGestureDrawingActive, setIsGestureDrawingActive] = useState(false) // Track gesture drawing state

  // ... existing functions (floodFill, hexToRgb, etc.) ...

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const targetColor = getPixelColor(data, startX, startY, canvas.width)

    if (colorsMatch(targetColor, hexToRgb(fillColor))) return

    const pixelsToCheck = [{ x: startX, y: startY }]
    const checkedPixels = new Set<string>()

    while (pixelsToCheck.length > 0) {
      const { x, y } = pixelsToCheck.pop()!
      const key = `${x},${y}`

      if (checkedPixels.has(key)) continue
      checkedPixels.add(key)

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue

      const currentColor = getPixelColor(data, x, y, canvas.width)
      if (!colorsMatch(currentColor, targetColor)) continue

      setPixelColor(data, x, y, canvas.width, hexToRgb(fillColor))

      pixelsToCheck.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 })
    }

    ctx.putImageData(imageData, 0, 0)
    console.log("[v0] Flood fill completed")
  }, [])

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const colorsMatch = (color1: any, color2: any) => {
    return (
      Math.abs(color1.r - color2.r) < 10 && Math.abs(color1.g - color2.g) < 10 && Math.abs(color1.b - color2.b) < 10
    )
  }

  const getPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number) => {
    const index = (y * width + x) * 4
    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3],
    }
  }

  const setPixelColor = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    color: { r: number; g: number; b: number },
  ) => {
    const index = (y * width + x) * 4
    data[index] = color.r
    data[index + 1] = color.g
    data[index + 2] = color.b
    data[index + 3] = 255
  }

  const pickColor = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(x, y, 1, 1)
    const data = imageData.data
    const color = `#${((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)}`

    window.dispatchEvent(new CustomEvent("colorPicked", { detail: color }))
    console.log("[v0] Color picked:", color)
  }, [])

  const addText = useCallback(
    (x: number, y: number) => {
      const text = prompt("Enter text:")
      if (!text) return

      const newTextElement: TextElement = {
        id: `text-${Date.now()}`,
        text,
        x,
        y,
        fontSize: 24,
        color: brushColor,
        layer: currentLayer,
      }

      setTextElements((prev) => [...prev, newTextElement])
      console.log("[v0] Text added:", text)
    },
    [brushColor, currentLayer],
  )

  const selectShape = useCallback((shapeId: string) => {
    setShapes((prev) =>
      prev.map((shape) => ({
        ...shape,
        selected: shape.id === shapeId,
      })),
    )
    setSelectedElement(shapeId)
  }, [])

  const resizeShape = useCallback((shapeId: string, newScale: number) => {
    setShapes((prev) => prev.map((shape) => (shape.id === shapeId ? { ...shape, scale: newScale } : shape)))
  }, [])

  const moveShape = useCallback((shapeId: string, newX: number, newY: number) => {
    setShapes((prev) => prev.map((shape) => (shape.id === shapeId ? { ...shape, x: newX, y: newY } : shape)))
  }, [])

  // ... existing initialization and redraw functions ...

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvasRef.current = offscreenCanvas

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      offscreenCanvas.width = window.innerWidth
      offscreenCanvas.height = window.innerHeight

      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.imageSmoothingEnabled = true

      const offscreenCtx = offscreenCanvas.getContext("2d")
      if (offscreenCtx) {
        offscreenCtx.lineCap = "round"
        offscreenCtx.lineJoin = "round"
        offscreenCtx.imageSmoothingEnabled = true
      }

      redrawCanvas()
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    console.log("[v0] Advanced canvas initialized with size:", canvas.width, "x", canvas.height)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const offscreenCanvas = offscreenCanvasRef.current
    if (!canvas || !offscreenCanvas) return

    const ctx = canvas.getContext("2d")
    const offscreenCtx = offscreenCanvas.getContext("2d")
    if (!ctx || !offscreenCtx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(scale, scale)

    for (let layer = 0; layer < 10; layer++) {
      paths
        .filter((path) => path.layer === layer)
        .forEach((path) => {
          if (path.points.length < 2) return

          ctx.strokeStyle = path.color
          ctx.lineWidth = path.size
          ctx.lineCap = path.style === "round" ? "round" : "square"

          if (path.tool === "brush" || path.tool === "pen" || path.tool === "marker" || path.tool === "highlighter") {
            drawSmoothPath(ctx, path.points, path.tool)
          } else if (path.tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out"
            path.points.forEach((point) => {
              ctx.beginPath()
              ctx.arc(point.x, point.y, path.size, 0, 2 * Math.PI)
              ctx.fill()
            })
            ctx.globalCompositeOperation = "source-over"
          }
        })

      shapes
        .filter((shape) => shape.layer === layer)
        .forEach((shape) => {
          drawShape(ctx, shape)
          if (shape.selected) {
            drawSelectionHandles(ctx, shape)
          }
        })

      textElements
        .filter((text) => text.layer === layer)
        .forEach((textEl) => {
          ctx.fillStyle = textEl.color
          ctx.font = `${textEl.fontSize}px Arial`
          ctx.fillText(textEl.text, textEl.x, textEl.y)
        })
    }

    ctx.restore()
  }, [paths, shapes, textElements, scale, panOffset])

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    const handleSize = 8
    const bounds = getShapeBounds(shape)

    ctx.fillStyle = "#007acc"
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2

    // Corner handles
    const handles = [
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.left, y: bounds.bottom },
    ]

    handles.forEach((handle) => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
    })
  }

  const getShapeBounds = (shape: Shape) => {
    const size = 100 * shape.scale
    return {
      left: shape.x,
      top: shape.y,
      right: shape.x + size,
      bottom: shape.y + size,
    }
  }

  // ... existing drawing functions ...

  const drawSmoothPath = (ctx: CanvasRenderingContext2D, points: Point[], pathTool: string) => {
    if (points.length < 2) return

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    switch (pathTool) {
      case "pen":
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        break

      case "marker":
        ctx.lineWidth = ctx.lineWidth * 1.5
        for (let i = 1; i < points.length - 1; i++) {
          const currentPoint = points[i]
          const nextPoint = points[i + 1]
          const controlX = (currentPoint.x + nextPoint.x) / 2
          const controlY = (currentPoint.y + nextPoint.y) / 2
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY)
        }
        break

      case "highlighter":
        ctx.globalAlpha = 0.3
        ctx.lineWidth = ctx.lineWidth * 2
        for (let i = 1; i < points.length - 1; i++) {
          const currentPoint = points[i]
          const nextPoint = points[i + 1]
          const controlX = (currentPoint.x + nextPoint.x) / 2
          const controlY = (currentPoint.y + nextPoint.y) / 2
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY)
        }
        ctx.globalAlpha = 1
        break

      default:
        for (let i = 1; i < points.length - 1; i++) {
          const currentPoint = points[i]
          const nextPoint = points[i + 1]
          const controlX = (currentPoint.x + nextPoint.x) / 2
          const controlY = (currentPoint.y + nextPoint.y) / 2
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY)
        }
    }

    if (points.length > 1) {
      const lastPoint = points[points.length - 1]
      ctx.lineTo(lastPoint.x, lastPoint.y)
    }

    ctx.stroke()
  }

  // 即时渲染当前路径（不提交到 paths），用于手势/鼠标移动的实时预览
  const renderLivePath = useCallback((points: Point[], pathTool: string, size: number, color: string, style: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 重绘底层
    redrawCanvas()

    // 绘制当前动态路径
    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(scale, scale)
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineCap = style === "round" ? "round" : "square"

    if (pathTool === "brush" || pathTool === "pen" || pathTool === "marker" || pathTool === "highlighter") {
      drawSmoothPath(ctx, points, pathTool)
    } else if (pathTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
      points.forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, size, 0, 2 * Math.PI)
        ctx.fill()
      })
      ctx.globalCompositeOperation = "source-over"
    }

    ctx.restore()
  }, [redrawCanvas, panOffset, scale])

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save()
    ctx.translate(shape.x, shape.y)
    ctx.scale(shape.scale, shape.scale)
    ctx.strokeStyle = shape.color
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const path2D = new Path2D(shape.path)
    ctx.stroke(path2D)

    ctx.restore()
  }

  // ... existing coordinate and state functions ...

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - panOffset.x) / scale
    const y = (clientY - rect.top - panOffset.y) / scale
    return { x, y }
  }

  const saveState = useCallback(() => {
    setUndoStack((prev) => [...prev, { paths: [...paths], shapes: [...shapes], textElements: [...textElements] }])
    setRedoStack([])
  }, [paths, shapes, textElements])

  const handleShapeClick = useCallback(
    (x: number, y: number) => {
      if (!pendingShape) {
        const clickedShape = shapes.find((shape) => {
          const bounds = getShapeBounds(shape)
          return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
        })

        if (clickedShape) {
          selectShape(clickedShape.id)
          return
        }

        // Clear selection if clicking empty space
        setShapes((prev) => prev.map((shape) => ({ ...shape, selected: false })))
        setSelectedElement(null)
        return
      }

      saveState()
      const newShape: Shape = {
        ...pendingShape,
        x: x - 50,
        y: y - 50,
        scale: 1,
        color: brushColor,
        layer: currentLayer,
        selected: false,
      }

      setShapes((prev) => [...prev, newShape])
      setPendingShape(null)
      console.log("[v0] Shape placed:", newShape.name, "at", x, y)
    },
    [pendingShape, brushColor, saveState, currentLayer, shapes, selectShape],
  )

  // 修复：优化startDrawing方法，确保状态正确管理
  const startDrawing = useCallback(
    (x: number, y: number, pressure = 1) => {
      console.log("[DrawingCanvas] startDrawing called with:", { x, y, pressure, tool, isDrawing })
      
      const drawableTools = new Set(["brush", "pen", "marker", "highlighter", "eraser"]) 
      const gestureForcesDraw = isGestureDrawing && !drawableTools.has(tool)
      const effectiveTool = gestureForcesDraw ? "brush" : tool

      if (effectiveTool === "pan") {
        setIsPanning(true)
        setLastPanPoint({ x, y })
        return
      }

      if (effectiveTool === "bucket" && !gestureForcesDraw) {
        floodFill(Math.floor(x), Math.floor(y), brushColor)
        return
      }

      if (effectiveTool === "eyedropper" && !gestureForcesDraw) {
        pickColor(Math.floor(x), Math.floor(y))
        return
      }

      if (effectiveTool === "text" && !gestureForcesDraw) {
        addText(x, y)
        return
      }

      if (effectiveTool === "shape" && pendingShape && !gestureForcesDraw) {
        handleShapeClick(x, y)
        return
      }

      if (effectiveTool === "select" && !gestureForcesDraw) {
        handleShapeClick(x, y)
        return
      }

      // 修复：如果已经在绘制中，先完成当前路径
      if (isDrawing && currentPath.length > 0) {
        console.log("[DrawingCanvas] Finishing previous path before starting new one")
        const newPath: DrawingPath = {
          points: currentPath,
          color: brushColor,
          size: brushSize,
          style: brushStyle,
          tool: effectiveTool,
          layer: currentLayer,
        }
        setPaths((prev) => [...prev, newPath])
        console.log("[v0] Completed previous path with", currentPath.length, "points on layer", currentLayer)
      }

      saveState()
      setIsDrawing(true)
      const point = { x, y, pressure }
      setCurrentPath([point])

      console.log("[v0] Started drawing at:", x, y, "with tool:", effectiveTool, "(raw:", tool, ", gesture:", isGestureDrawing, ")")

      // 立即显示起笔点（实时预览）
      requestAnimationFrame(() => {
        renderLivePath([point], effectiveTool, brushSize, brushColor, brushStyle)
      })
    },
    [tool, saveState, pendingShape, handleShapeClick, pickColor, addText, brushColor, currentLayer, floodFill, isDrawing, currentPath, brushSize, brushStyle, renderLivePath, isGestureDrawing],
  )

  // 修复：优化draw方法，确保状态同步和实时绘制
  const draw = useCallback(
    (x: number, y: number, pressure = 1) => {
      console.log("[DrawingCanvas] draw called with:", { x, y, pressure, isDrawing, currentPathLength: currentPath.length })
      
      const drawableTools = new Set(["brush", "pen", "marker", "highlighter", "eraser"]) 
      const gestureForcesDraw = isGestureDrawing && !drawableTools.has(tool)
      const effectiveTool = gestureForcesDraw ? "brush" : tool

      if (effectiveTool === "pan" && isPanning && lastPanPoint) {
        const deltaX = x - lastPanPoint.x
        const deltaY = y - lastPanPoint.y
        setPanOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
        setLastPanPoint({ x, y })
        return
      }

      // 修复：只有在绘制状态下才添加点
      if (!isDrawing) {
        console.log("[DrawingCanvas] Draw skipped - not in drawing state")
        return
      }

      const point = { x, y, pressure }
      setCurrentPath((prev) => {
        const newPath = [...prev, point]
        console.log("[DrawingCanvas] Added point to path, total points:", newPath.length)
        
        // 修复：使用 requestAnimationFrame 进行实时预览渲染
        requestAnimationFrame(() => {
          renderLivePath(newPath, effectiveTool, brushSize, brushColor, brushStyle)
        })
         
        return newPath
      })
    },
    [isDrawing, tool, isPanning, lastPanPoint, renderLivePath, brushSize, brushColor, brushStyle, isGestureDrawing],
  )

  // 修复：优化stopDrawing方法，确保路径正确完成
  const stopDrawing = useCallback(() => {
    console.log("[DrawingCanvas] stopDrawing called with:", { isDrawing, currentPathLength: currentPath.length, tool })
    
    const drawableTools = new Set(["brush", "pen", "marker", "highlighter", "eraser"]) 
    const gestureForcesDraw = isGestureDrawing && !drawableTools.has(tool)
    const effectiveTool = gestureForcesDraw ? "brush" : tool

    if (effectiveTool === "pan") {
      setIsPanning(false)
      setLastPanPoint(null)
      return
    }

    // 修复：只有在绘制状态下且有路径时才完成绘制
    if (!isDrawing || currentPath.length === 0) {
      console.log("[DrawingCanvas] Stop drawing skipped - not drawing or no current path")
      return
    }

    const newPath: DrawingPath = {
      points: currentPath,
      color: brushColor,
      size: brushSize,
      style: brushStyle,
      tool: effectiveTool,
      layer: currentLayer,
    }

    setPaths((prev) => [...prev, newPath])
    setCurrentPath([])
    setIsDrawing(false)
    console.log("[v0] Completed path with", currentPath.length, "points on layer", currentLayer)
  }, [isDrawing, currentPath, brushColor, brushSize, brushStyle, tool, currentLayer, isGestureDrawing])

  // ... existing undo, redo, clear functions ...

  const undo = useCallback(() => {
    if (undoStack.length === 0) return

    const previousState = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [...prev, { paths: [...paths], shapes: [...shapes], textElements: [...textElements] }])
    setPaths(previousState.paths)
    setShapes(previousState.shapes)
    setTextElements(previousState.textElements)
    setUndoStack((prev) => prev.slice(0, -1))
    console.log("[v0] Undo performed")
  }, [undoStack, paths, shapes, textElements])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return

    const nextState = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, { paths: [...paths], shapes: [...shapes], textElements: [...textElements] }])
    setPaths(nextState.paths)
    setShapes(nextState.shapes)
    setTextElements(nextState.textElements)
    setRedoStack((prev) => prev.slice(0, -1))
    console.log("[v0] Redo performed")
  }, [redoStack, paths, shapes, textElements])

  const clearCanvas = useCallback(() => {
    saveState()
    setPaths([])
    setShapes([])
    setTextElements([])
    console.log("[v0] Canvas cleared")
  }, [saveState])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, scale * delta))
      setScale(newScale)
      console.log("[v0] Zoom level:", newScale)
    },
    [scale],
  )

  // 添加useImperativeHandle暴露方法
  useImperativeHandle(ref, () => ({
    startDrawing: (x: number, y: number, pressure = 1) => {
      console.log("[DrawingCanvas] Ref startDrawing called with:", { x, y, pressure, tool })
      startDrawing(x, y, pressure)
    },
    draw: (x: number, y: number, pressure = 1) => {
      console.log("[DrawingCanvas] Ref draw called with:", { x, y, pressure, isDrawing, currentPathLength: currentPath.length })
      draw(x, y, pressure)
    },
    stopDrawing: () => {
      console.log("[DrawingCanvas] Ref stopDrawing called")
      stopDrawing()
    },
    undo: () => {
      console.log("[DrawingCanvas] Ref undo called")
      undo()
    },
    redo: () => {
      console.log("[DrawingCanvas] Ref redo called")
      redo()
    },
    clearCanvas: () => {
      console.log("[DrawingCanvas] Ref clearCanvas called")
      clearCanvas()
    }
  }), [startDrawing, draw, stopDrawing, undo, redo, clearCanvas, tool, isDrawing, currentPath.length, isGestureDrawing])

  useEffect(() => {
    // Handlers for gesture-based events (gated by isGestureDrawing)
    const handleGestureDrawStart = (event: CustomEvent) => {
      if (!isGestureDrawing) {
        console.log("[v0] Gesture drawing disabled, ignoring start event")
        return
      }
      const { x, y } = event.detail
      setIsGestureDrawingActive(true)
      startDrawing(x, y)
    }

    const handleGestureDrawMove = (event: CustomEvent) => {
      if (!isGestureDrawing || !isGestureDrawingActive) {
        return
      }
      const { x, y } = event.detail
      draw(x, y)
    }

    const handleGestureDrawEnd = () => {
      if (!isGestureDrawing || !isGestureDrawingActive) {
        return
      }
      setIsGestureDrawingActive(false)
      stopDrawing()
    }

    // Handlers for canvas-based events (ALWAYS honored)
    const handleCanvasDrawStart = (event: CustomEvent) => {
      const { x, y } = event.detail
      startDrawing(x, y)
    }

    const handleCanvasDrawMove = (event: CustomEvent) => {
      const { x, y } = event.detail
      draw(x, y)
    }

    const handleCanvasDrawEnd = () => {
      stopDrawing()
    }

    const handleFloodFillRequest = () => {
      console.log("[v0] Flood fill tool activated")
    }

    const handleColorPicked = (event: CustomEvent) => {
      console.log("[v0] Color picked from canvas:", event.detail)
    }

    const handleImportImage = (event: CustomEvent) => {
      const imageData = event.detail
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        console.log("[v0] Image imported to canvas")
      }
      img.src = imageData
    }

    const handleShapeSelect = (event: CustomEvent) => {
      setPendingShape(event.detail)
      console.log("[v0] Pending shape set:", event.detail.name)
    }

    window.addEventListener("gestureDrawStart", handleGestureDrawStart as EventListener)
    window.addEventListener("gestureDrawMove", handleGestureDrawMove as EventListener)
    window.addEventListener("gestureDrawEnd", handleGestureDrawEnd as EventListener)

    window.addEventListener("canvasDrawStart", handleCanvasDrawStart as EventListener)
    window.addEventListener("canvasDrawMove", handleCanvasDrawMove as EventListener)
    window.addEventListener("canvasDrawEnd", handleCanvasDrawEnd as EventListener)

    window.addEventListener("floodFillRequested", handleFloodFillRequest)
    window.addEventListener("colorPicked", handleColorPicked as EventListener)
    window.addEventListener("importImage", handleImportImage as EventListener)
    window.addEventListener("shapeSelected", handleShapeSelect as EventListener)

    return () => {
      window.removeEventListener("gestureDrawStart", handleGestureDrawStart as EventListener)
      window.removeEventListener("gestureDrawMove", handleGestureDrawMove as EventListener)
      window.removeEventListener("gestureDrawEnd", handleGestureDrawEnd as EventListener)

      window.removeEventListener("canvasDrawStart", handleCanvasDrawStart as EventListener)
      window.removeEventListener("canvasDrawMove", handleCanvasDrawMove as EventListener)
      window.removeEventListener("canvasDrawEnd", handleCanvasDrawEnd as EventListener)

      window.removeEventListener("floodFillRequested", handleFloodFillRequest)
      window.removeEventListener("colorPicked", handleColorPicked as EventListener)
      window.removeEventListener("importImage", handleImportImage as EventListener)
      window.removeEventListener("shapeSelected", handleShapeSelect as EventListener)
    }
  }, [isGestureDrawing, isGestureDrawingActive, startDrawing, draw, stopDrawing])

  // ... existing canvas actions and effects ...

  useEffect(() => {
    ;(window as any).canvasActions = {
      undo,
      redo,
      clearCanvas,
      zoomIn: () => setScale((prev) => Math.min(5, prev * 1.2)),
      zoomOut: () => setScale((prev) => Math.max(0.1, prev * 0.8)),
      resetZoom: () => {
        setScale(1)
        setPanOffset({ x: 0, y: 0 })
      },
      exportCanvas: () => {
        const canvas = canvasRef.current
        if (!canvas) return null
        return canvas.toDataURL("image/png")
      },
      setCurrentLayer: (layer: number) => setCurrentLayer(layer),
      getCurrentLayer: () => currentLayer,
      selectShape,
      resizeShape,
      moveShape,
    }
  }, [undo, redo, clearCanvas, currentLayer, selectShape, resizeShape, moveShape])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  useEffect(() => {
    if (!isDrawing || currentPath.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 重绘整个画布
    redrawCanvas()

    // 绘制当前路径
    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(scale, scale)
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = brushStyle === "round" ? "round" : "square"

    if (tool === "brush" || tool === "pen" || tool === "marker" || tool === "highlighter") {
      drawSmoothPath(ctx, currentPath, tool)
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
      currentPath.forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, brushSize, 0, 2 * Math.PI)
        ctx.fill()
      })
      ctx.globalCompositeOperation = "source-over"
    }

    ctx.restore()
  }, [currentPath, isDrawing, brushColor, brushSize, brushStyle, tool, redrawCanvas, scale, panOffset])

  // ... existing mouse and touch event handlers ...

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    startDrawing(coords.x, coords.y)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    draw(coords.x, coords.y)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY)
    const pressure = (touch as any).force || 1
    startDrawing(coords.x, coords.y, pressure)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY)
    const pressure = (touch as any).force || 1
    draw(coords.x, coords.y, pressure)
  }

  return (
    <canvas
      id="main-drawing-canvas"
      ref={canvasRef}
      className={`absolute inset-0 touch-none ${
        tool === "pan"
          ? "cursor-grab"
          : tool === "shape" && pendingShape
            ? "cursor-copy"
            : tool === "bucket"
              ? "cursor-crosshair"
              : tool === "eyedropper"
                ? "cursor-crosshair"
                : tool === "text"
                  ? "cursor-text"
                  : tool === "select"
                    ? "cursor-pointer"
                    : "cursor-crosshair"
      } ${isPanning ? "cursor-grabbing" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={stopDrawing}
      onWheel={handleWheel}
    />
  )
})

// 添加displayName用于调试
DrawingCanvas.displayName = 'DrawingCanvas'
