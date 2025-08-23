"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Paintbrush, Eraser, Move, Pen, Brush, Highlighter } from "lucide-react"

interface ToolPanelProps {
  currentTool: string
  onToolChange: (tool: string) => void
  brushColor: string
  onBrushColorChange: (color: string) => void
  brushSize: number
  onBrushSizeChange: (size: number) => void
  brushStyle: string
  onBrushStyleChange: (style: string) => void
  language?: "en" | "zh" | "es" // Added language prop
}

const TRANSLATIONS = {
  en: {
    drawingTools: "Drawing Tools",
    tools: "Tools",
    color: "Color",
    brushSize: "Brush Size",
    brushStyle: "Brush Style",
    opacity: "Opacity",
    advancedSettings: "Advanced Settings",
    pressureSensitivity: "Pressure Sensitivity",
    enablePressure: "Enable pressure sensitivity",
    strokeSmoothing: "Stroke Smoothing",
    brushTexture: "Brush Texture",
    quickActions: "Quick Actions",
    black: "Black",
    white: "White",
    resetSize: "Reset Size",
    fullOpacity: "Full Opacity",
    brush: "Brush",
    pen: "Pen",
    marker: "Marker",
    highlighter: "Highlighter",
    eraser: "Eraser",
    pan: "Pan",
    round: "Round",
    square: "Square",
    soft: "Soft",
    smooth: "Smooth",
    rough: "Rough",
    textured: "Textured",
    watercolor: "Watercolor",
    standardBrush: "Standard brush",
    sharpPen: "Sharp pen tool",
    thickMarker: "Thick marker",
    transparentHighlighter: "Transparent highlighter",
    removeStrokes: "Remove strokes",
    moveCanvas: "Move canvas",
  },
  zh: {
    drawingTools: "绘图工具",
    tools: "工具",
    color: "颜色",
    brushSize: "画笔大小",
    brushStyle: "画笔样式",
    opacity: "不透明度",
    advancedSettings: "高级设置",
    pressureSensitivity: "压力感应",
    enablePressure: "启用压力感应",
    strokeSmoothing: "笔画平滑",
    brushTexture: "画笔纹理",
    quickActions: "快速操作",
    black: "黑色",
    white: "白色",
    resetSize: "重置大小",
    fullOpacity: "完全不透明",
    brush: "画笔",
    pen: "钢笔",
    marker: "马克笔",
    highlighter: "荧光笔",
    eraser: "橡皮擦",
    pan: "平移",
    round: "圆形",
    square: "方形",
    soft: "柔和",
    smooth: "光滑",
    rough: "粗糙",
    textured: "纹理",
    watercolor: "水彩",
    standardBrush: "标准画笔",
    sharpPen: "尖锐钢笔工具",
    thickMarker: "粗马克笔",
    transparentHighlighter: "透明荧光笔",
    removeStrokes: "移除笔画",
    moveCanvas: "移动画布",
  },
  es: {
    drawingTools: "Herramientas de Dibujo",
    tools: "Herramientas",
    color: "Color",
    brushSize: "Tamaño del Pincel",
    brushStyle: "Estilo del Pincel",
    opacity: "Opacidad",
    advancedSettings: "Configuración Avanzada",
    pressureSensitivity: "Sensibilidad a la Presión",
    enablePressure: "Habilitar sensibilidad a la presión",
    strokeSmoothing: "Suavizado de Trazos",
    brushTexture: "Textura del Pincel",
    quickActions: "Acciones Rápidas",
    black: "Negro",
    white: "Blanco",
    resetSize: "Restablecer Tamaño",
    fullOpacity: "Opacidad Completa",
    brush: "Pincel",
    pen: "Pluma",
    marker: "Marcador",
    highlighter: "Resaltador",
    eraser: "Borrador",
    pan: "Desplazar",
    round: "Redondo",
    square: "Cuadrado",
    soft: "Suave",
    smooth: "Liso",
    rough: "Áspero",
    textured: "Texturizado",
    watercolor: "Acuarela",
    standardBrush: "Pincel estándar",
    sharpPen: "Herramienta de pluma afilada",
    thickMarker: "Marcador grueso",
    transparentHighlighter: "Resaltador transparente",
    removeStrokes: "Eliminar trazos",
    moveCanvas: "Mover lienzo",
  },
}

const PRESET_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#800000",
  "#008000",
  "#000080",
  "#808000",
  "#800080",
  "#008080",
  "#C0C0C0",
  "#808080",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
]

export function ToolPanel({
  currentTool,
  onToolChange,
  brushColor,
  onBrushColorChange,
  brushSize,
  onBrushSizeChange,
  brushStyle,
  onBrushStyleChange,
  language = "en", // Added language prop with default
}: ToolPanelProps) {
  const [customColor, setCustomColor] = useState(brushColor)
  const [opacity, setOpacity] = useState(100)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const t = TRANSLATIONS[language]

  const BRUSH_TYPES = [
    { id: "brush", name: t.brush, icon: Paintbrush, description: t.standardBrush },
    { id: "pen", name: t.pen, icon: Pen, description: t.sharpPen },
    { id: "marker", name: t.marker, icon: Brush, description: t.thickMarker },
    { id: "highlighter", name: t.highlighter, icon: Highlighter, description: t.transparentHighlighter },
    { id: "eraser", name: t.eraser, icon: Eraser, description: t.removeStrokes },
    { id: "pan", name: t.pan, icon: Move, description: t.moveCanvas },
  ]

  const BRUSH_STYLES = [
    { id: "round", name: t.round, preview: "●" },
    { id: "square", name: t.square, preview: "■" },
    { id: "soft", name: t.soft, preview: "◉" },
  ]

  const handleColorChange = (color: string) => {
    setCustomColor(color)
    onBrushColorChange(color)
  }

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0])
    // Convert opacity to hex alpha and append to color
    const alpha = Math.round((value[0] / 100) * 255)
      .toString(16)
      .padStart(2, "0")
    const colorWithAlpha = customColor.length === 7 ? customColor + alpha : customColor.slice(0, 7) + alpha
    onBrushColorChange(colorWithAlpha)
  }

  return (
    <Card className="h-full overflow-y-auto bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t.drawingTools}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tool Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t.tools}</Label>
          <div className="grid grid-cols-2 gap-2">
            {BRUSH_TYPES.map((tool) => {
              const Icon = tool.icon
              return (
                <Button
                  key={tool.id}
                  variant={currentTool === tool.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToolChange(tool.id)}
                  className="flex flex-col gap-1 h-auto py-3"
                  title={tool.description}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{tool.name}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t.color}</Label>

          {/* Custom Color Picker */}
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 rounded border border-border cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Preset Colors */}
          <div className="grid grid-cols-8 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  customColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Brush Size */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">{t.brushSize}</Label>
            <Badge variant="secondary" className="text-xs">
              {brushSize}px
            </Badge>
          </div>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => onBrushSizeChange(value[0])}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />

          {/* Size Preview */}
          <div className="flex justify-center py-2">
            <div
              className="rounded-full border border-border"
              style={{
                width: Math.min(brushSize * 2, 40),
                height: Math.min(brushSize * 2, 40),
                backgroundColor: customColor,
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Brush Style */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t.brushStyle}</Label>
          <div className="grid grid-cols-3 gap-2">
            {BRUSH_STYLES.map((style) => (
              <Button
                key={style.id}
                variant={brushStyle === style.id ? "default" : "outline"}
                size="sm"
                onClick={() => onBrushStyleChange(style.id)}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <span className="text-lg">{style.preview}</span>
                <span className="text-xs">{style.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Opacity Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">{t.opacity}</Label>
            <Badge variant="secondary" className="text-xs">
              {opacity}%
            </Badge>
          </div>
          <Slider value={[opacity]} onValueChange={handleOpacityChange} max={100} min={1} step={1} className="w-full" />
        </div>

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            {t.advancedSettings}
            <span className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>▼</span>
          </Button>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              {/* Pressure Sensitivity */}
              <div className="space-y-2">
                <Label className="text-sm">{t.pressureSensitivity}</Label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pressure" className="rounded" />
                  <Label htmlFor="pressure" className="text-xs">
                    {t.enablePressure}
                  </Label>
                </div>
              </div>

              {/* Smoothing */}
              <div className="space-y-2">
                <Label className="text-sm">{t.strokeSmoothing}</Label>
                <Slider defaultValue={[50]} max={100} min={0} step={1} className="w-full" />
              </div>

              {/* Texture */}
              <div className="space-y-2">
                <Label className="text-sm">{t.brushTexture}</Label>
                <select className="w-full px-2 py-1 text-xs border border-border rounded bg-background">
                  <option value="smooth">{t.smooth}</option>
                  <option value="rough">{t.rough}</option>
                  <option value="textured">{t.textured}</option>
                  <option value="watercolor">{t.watercolor}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t.quickActions}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => handleColorChange("#000000")} className="text-xs">
              {t.black}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleColorChange("#FFFFFF")} className="text-xs">
              {t.white}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBrushSizeChange(5)} className="text-xs">
              {t.resetSize}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpacity(100)} className="text-xs">
              {t.fullOpacity}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
