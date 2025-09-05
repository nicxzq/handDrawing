"use client"

import { useState, useEffect, useRef } from "react"
import { CameraView } from "@/components/camera-view"
import { DrawingCanvas, DrawingCanvasRef } from "@/components/drawing-canvas"
import { ToolPanel } from "@/components/tool-panel"
import { ShapeLibrary } from "@/components/shape-library"
import { AdvancedTools } from "@/components/advanced-tools"
import { CanvasControls } from "@/components/canvas-controls"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, CameraOff, Palette, Shapes, Settings, Keyboard, Minimize2, Languages } from "lucide-react"

interface GestureData {
  type: string
  confidence: number
  position: { x: number; y: number }
  timestamp: number
  isDrawing?: boolean
}

const LANGUAGES = {
  en: {
    enableCamera: "Enable Camera",
    disableCamera: "Disable Camera",
    tools: "Tools",
    shapes: "Shapes",
    advanced: "Advanced",
    shortcuts: "Shortcuts",
    language: "Language",
    keyboardShortcuts: "Keyboard Shortcuts:",
    brushTool: "B - Brush",
    eraserTool: "E - Eraser",
    fillTool: "F - Fill",
    eyedropperTool: "I - Eyedropper",
    textTool: "T - Text",
    panTool: "Space - Pan",
    undoAction: "Ctrl+Z - Undo",
    redoAction: "Ctrl+Shift+Z - Redo",
  },
  zh: {
    enableCamera: "启用摄像头",
    disableCamera: "禁用摄像头",
    tools: "工具",
    shapes: "形状",
    advanced: "高级",
    shortcuts: "快捷键",
    language: "语言",
    keyboardShortcuts: "键盘快捷键：",
    brushTool: "B - 画笔",
    eraserTool: "E - 橡皮擦",
    fillTool: "F - 填充",
    eyedropperTool: "I - 吸管",
    textTool: "T - 文本",
    panTool: "空格 - 平移",
    undoAction: "Ctrl+Z - 撤销",
    redoAction: "Ctrl+Shift+Z - 重做",
  },
  es: {
    enableCamera: "Activar Cámara",
    disableCamera: "Desactivar Cámara",
    tools: "Herramientas",
    shapes: "Formas",
    advanced: "Avanzado",
    shortcuts: "Atajos",
    language: "Idioma",
    keyboardShortcuts: "Atajos de Teclado:",
    brushTool: "B - Pincel",
    eraserTool: "E - Borrador",
    fillTool: "F - Rellenar",
    eyedropperTool: "I - Cuentagotas",
    textTool: "T - Texto",
    panTool: "Espacio - Desplazar",
    undoAction: "Ctrl+Z - Deshacer",
    redoAction: "Ctrl+Shift+Z - Rehacer",
  },
}

export default function DrawingApp() {
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)
  const [showToolPanel, setShowToolPanel] = useState(true)
  const [showShapeLibrary, setShowShapeLibrary] = useState(false)
  const [showAdvancedTools, setShowAdvancedTools] = useState(false)
  const [currentTool, setCurrentTool] = useState("brush")
  const [brushColor, setBrushColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)
  const [brushStyle, setBrushStyle] = useState("round")
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en") // Added language state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(true) // Added shortcuts visibility
  const [shortcutsPosition, setShortcutsPosition] = useState({ x: 16, y: 16 }) // Added position state
  const [isDrawingMode, setIsDrawingMode] = useState(true) // Default to drawing mode when camera is enabled for better UX

  // 添加DrawingCanvas的ref
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null)

  // 添加直接通信方法
  const handleDrawStart = (x: number, y: number) => {
    console.log("[MainApp] Draw start at:", x, y)
    drawingCanvasRef.current?.startDrawing(x, y)
  }

  const handleDrawMove = (x: number, y: number) => {
    drawingCanvasRef.current?.draw(x, y)
  }

  const handleDrawEnd = () => {
    console.log("[MainApp] Draw end")
    drawingCanvasRef.current?.stopDrawing()
  }

  const t = LANGUAGES[language] // Translation helper

  useEffect(() => {
    const handleGestureToolChange = (event: CustomEvent) => {
      const newTool = event.detail
      setCurrentTool(newTool)
      console.log("[v0] Tool changed via gesture:", newTool)
    }

    const handleColorPicked = (event: CustomEvent) => {
      setBrushColor(event.detail)
      console.log("[v0] Color picked and set:", event.detail)
    }

    const handleGestureDrawStart = (event: CustomEvent) => {
      const { x, y, tool } = event.detail
      window.dispatchEvent(new CustomEvent("canvasDrawStart", { detail: { x, y, tool } }))
    }

    const handleGestureDrawMove = (event: CustomEvent) => {
      const { x, y } = event.detail
      window.dispatchEvent(new CustomEvent("canvasDrawMove", { detail: { x, y } }))
    }

    const handleGestureDrawEnd = () => {
      window.dispatchEvent(new CustomEvent("canvasDrawEnd"))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "z":
            event.preventDefault()
            if (event.shiftKey) {
              ;(window as any).canvasActions?.redo()
            } else {
              ;(window as any).canvasActions?.undo()
            }
            break
          case "s":
            event.preventDefault()
            ;(window as any).canvasActions?.exportCanvas()
            break
          case "a":
            event.preventDefault()
            break
        }
      } else {
        switch (event.key) {
          case "b":
            setCurrentTool("brush")
            break
          case "e":
            setCurrentTool("eraser")
            break
          case "f":
            setCurrentTool("bucket")
            break
          case "i":
            setCurrentTool("eyedropper")
            break
          case "t":
            setCurrentTool("text")
            break
          case " ":
            event.preventDefault()
            setCurrentTool("pan")
            break
          case "d":
            setIsDrawingMode(!isDrawingMode)
            break
        }
      }
    }

    window.addEventListener("gestureToolChange", handleGestureToolChange as EventListener)
    window.addEventListener("colorPicked", handleColorPicked as EventListener)
    window.addEventListener("gestureDrawStart", handleGestureDrawStart as EventListener)
    window.addEventListener("gestureDrawMove", handleGestureDrawMove as EventListener)
    window.addEventListener("gestureDrawEnd", handleGestureDrawEnd as EventListener)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("gestureToolChange", handleGestureToolChange as EventListener)
      window.removeEventListener("colorPicked", handleColorPicked as EventListener)
      window.removeEventListener("gestureDrawStart", handleGestureDrawStart as EventListener)
      window.removeEventListener("gestureDrawMove", handleGestureDrawMove as EventListener)
      window.removeEventListener("gestureDrawEnd", handleGestureDrawEnd as EventListener)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isDrawingMode])

  const handleShapeSelect = (shape: any) => {
    setCurrentTool("shape")
    window.dispatchEvent(new CustomEvent("shapeSelected", { detail: shape }))
  }

  const handleGestureDetected = (gesture: GestureData) => {
    console.log("[v0] Gesture detected in main app:", gesture)
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* Camera View - positioned behind canvas for gesture recognition */}
      {isCameraEnabled && (
        <div className="absolute inset-0 z-0">
          <CameraView 
            onGestureDetected={handleGestureDetected} 
            isDrawingMode={isDrawingMode}
            onDrawStart={handleDrawStart}
            onDrawMove={handleDrawMove}
            onDrawEnd={handleDrawEnd}
          />
        </div>
      )}

      {/* Main Drawing Canvas - full screen */}
      <div className="absolute inset-0 z-10">
        <DrawingCanvas
          ref={drawingCanvasRef}
          tool={currentTool}
          brushColor={brushColor}
          brushSize={brushSize}
          brushStyle={brushStyle}
          isGestureDrawing={isDrawingMode && isCameraEnabled}
        />
      </div>

      {/* Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={isCameraEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsCameraEnabled(!isCameraEnabled)
              if (!isCameraEnabled) {
                setIsDrawingMode(true)
              }
            }}
            className="bg-card/90 backdrop-blur-sm"
          >
            {isCameraEnabled ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {isCameraEnabled ? t.disableCamera : t.enableCamera}
          </Button>
          {isCameraEnabled && (
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className="bg-card/90 backdrop-blur-sm"
            >
              {isDrawingMode ? "Draw Mode" : "Tool Mode"}
            </Button>
          )}
        </div>

        <CanvasControls />

        <div className="flex gap-2">
          <Select value={language} onValueChange={(value: keyof typeof LANGUAGES) => setLanguage(value)}>
            <SelectTrigger className="w-auto bg-card/90 backdrop-blur-sm">
              <Languages className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showToolPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowToolPanel(!showToolPanel)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Palette className="w-4 h-4" />
            {t.tools}
          </Button>
          <Button
            variant={showShapeLibrary ? "default" : "outline"}
            size="sm"
            onClick={() => setShowShapeLibrary(!showShapeLibrary)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Shapes className="w-4 h-4" />
            {t.shapes}
          </Button>
          <Button
            variant={showAdvancedTools ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Settings className="w-4 h-4" />
            {t.advanced}
          </Button>
        </div>
      </div>

      {/* Tool Panel - collapsible from right side */}
      {showToolPanel && (
        <div className="absolute right-4 top-20 bottom-4 z-20 w-80">
          <ToolPanel
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            brushColor={brushColor}
            onBrushColorChange={setBrushColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            brushStyle={brushStyle}
            onBrushStyleChange={setBrushStyle}
            language={language} // Pass language prop to ToolPanel
          />
        </div>
      )}

      {/* Shape Library - collapsible from left side */}
      {showShapeLibrary && (
        <div className="absolute left-4 top-20 bottom-4 z-20 w-64">
          <ShapeLibrary onShapeSelect={handleShapeSelect} />
        </div>
      )}

      {/* Advanced Tools Panel */}
      {showAdvancedTools && (
        <div className="absolute left-4 top-20 bottom-4 z-20 w-80">
          <AdvancedTools onToolChange={setCurrentTool} currentTool={currentTool} />
        </div>
      )}

      {showKeyboardShortcuts && (
        <div
          className="absolute z-20 select-none"
          style={{
            bottom: `${shortcutsPosition.y}px`,
            right: `${shortcutsPosition.x}px`,
          }}
        >
          <div className="bg-card/90 backdrop-blur-sm rounded-lg border text-xs text-muted-foreground max-w-xs">
            <div className="flex items-center justify-between p-2 border-b">
              <div className="font-medium flex items-center gap-2">
                <Keyboard className="w-3 h-3" />
                {t.shortcuts}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowKeyboardShortcuts(false)} className="h-6 w-6 p-0">
                <Minimize2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="p-2 space-y-1">
              <div className="font-medium mb-1">{t.keyboardShortcuts}</div>
              <div>
                {t.brushTool}, {t.eraserTool}, {t.fillTool}
              </div>
              <div>
                {t.eyedropperTool}, {t.textTool}
              </div>
              <div>{t.panTool}</div>
              <div>
                {t.undoAction}, {t.redoAction}
              </div>
              <div>D - {isDrawingMode ? "Tool Mode" : "Draw Mode"}</div>
            </div>
          </div>
        </div>
      )}

      {!showKeyboardShortcuts && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowKeyboardShortcuts(true)}
          className="absolute bottom-4 right-4 z-20 bg-card/90 backdrop-blur-sm"
        >
          <Keyboard className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
