"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BoxIcon as Bucket, Move3D, Download, Upload, Play, Square, Type, EyeIcon as Eyedropper } from "lucide-react"

interface AdvancedToolsProps {
  onToolChange: (tool: string) => void
  currentTool: string
}

export function AdvancedTools({ onToolChange, currentTool }: AdvancedToolsProps) {
  const [selectedLayer, setSelectedLayer] = useState(0)
  const [layers, setLayers] = useState([
    { id: 0, name: "Background", visible: true, opacity: 100 },
    { id: 1, name: "Layer 1", visible: true, opacity: 100 },
  ])
  const [animationFrame, setAnimationFrame] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const ADVANCED_TOOLS = [
    { id: "bucket", name: "Bucket Fill", icon: Bucket, description: "Fill closed areas with color" },
    { id: "eyedropper", name: "Eyedropper", icon: Eyedropper, description: "Pick color from canvas" },
    { id: "text", name: "Text", icon: Type, description: "Add text to canvas" },
    { id: "select", name: "Select", icon: Square, description: "Select and manipulate objects" },
    { id: "transform", name: "Transform", icon: Move3D, description: "Move, resize, rotate objects" },
  ]

  const handleFloodFill = () => {
    onToolChange("bucket")
    // Trigger flood fill functionality
    window.dispatchEvent(new CustomEvent("floodFillRequested"))
  }

  const handleEyedropper = () => {
    onToolChange("eyedropper")
  }

  const addLayer = () => {
    const newLayer = {
      id: layers.length,
      name: `Layer ${layers.length}`,
      visible: true,
      opacity: 100,
    }
    setLayers([...layers, newLayer])
    setSelectedLayer(newLayer.id)
  }

  const toggleLayerVisibility = (layerId: number) => {
    setLayers(layers.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)))
  }

  const updateLayerOpacity = (layerId: number, opacity: number) => {
    setLayers(layers.map((layer) => (layer.id === layerId ? { ...layer, opacity } : layer)))
  }

  const exportCanvas = () => {
    const canvasActions = (window as any).canvasActions
    if (canvasActions?.exportCanvas) {
      const dataUrl = canvasActions.exportCanvas()
      const link = document.createElement("a")
      link.download = "drawing.png"
      link.href = dataUrl
      link.click()
    }
  }

  const importImage = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const imageData = e.target?.result as string
          window.dispatchEvent(new CustomEvent("importImage", { detail: imageData }))
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
    if (!isAnimating) {
      // Start animation playback
      window.dispatchEvent(new CustomEvent("startAnimation"))
    } else {
      // Stop animation playback
      window.dispatchEvent(new CustomEvent("stopAnimation"))
    }
  }

  return (
    <Card className="h-full overflow-y-auto bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Advanced Tools</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="animation">Animation</TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="space-y-4">
            {/* Advanced Drawing Tools */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Special Tools</Label>
              <div className="grid grid-cols-1 gap-2">
                {ADVANCED_TOOLS.map((tool) => {
                  const Icon = tool.icon
                  return (
                    <Button
                      key={tool.id}
                      variant={currentTool === tool.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToolChange(tool.id)}
                      className="flex items-center gap-2 justify-start h-auto py-3"
                      title={tool.description}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={exportCanvas}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={importImage}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="space-y-4">
            {/* Layer Management */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Layers</Label>
                <Button size="sm" onClick={addLayer}>
                  Add Layer
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedLayer === layer.id ? "border-accent bg-accent/10" : "border-border"
                    }`}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{layer.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {layer.opacity}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLayerVisibility(layer.id)
                          }}
                          className="h-6 w-6 p-0"
                        >
                          {layer.visible ? "👁️" : "🙈"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Opacity</Label>
                      <Slider
                        value={[layer.opacity]}
                        onValueChange={(value) => updateLayerOpacity(layer.id, value[0])}
                        max={100}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="animation" className="space-y-4">
            {/* Animation Controls */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Animation Timeline</Label>

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm">Frame {animationFrame + 1}</span>
                  <Button size="sm" variant={isAnimating ? "destructive" : "default"} onClick={toggleAnimation}>
                    <Play className="w-4 h-4 mr-2" />
                    {isAnimating ? "Stop" : "Play"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Timeline</Label>
                  <Slider
                    value={[animationFrame]}
                    onValueChange={(value) => setAnimationFrame(value[0])}
                    max={29}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>30 frames</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  Add Keyframe
                </Button>
                <Button variant="outline" size="sm">
                  Onion Skin
                </Button>
              </div>
            </div>

            <Separator />

            {/* Animation Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Settings</Label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Frame Rate</Label>
                  <Badge variant="secondary" className="text-xs">
                    24 FPS
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Duration</Label>
                  <Badge variant="secondary" className="text-xs">
                    1.25s
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
