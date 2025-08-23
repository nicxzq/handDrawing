"use client"

import { Button } from "@/components/ui/button"
import { Undo2, Redo2, Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

export function CanvasControls() {
  const handleUndo = () => {
    if ((window as any).canvasActions?.undo) {
      ;(window as any).canvasActions.undo()
    }
  }

  const handleRedo = () => {
    if ((window as any).canvasActions?.redo) {
      ;(window as any).canvasActions.redo()
    }
  }

  const handleClear = () => {
    if ((window as any).canvasActions?.clearCanvas) {
      ;(window as any).canvasActions.clearCanvas()
    }
  }

  const handleZoomIn = () => {
    if ((window as any).canvasActions?.zoomIn) {
      ;(window as any).canvasActions.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if ((window as any).canvasActions?.zoomOut) {
      ;(window as any).canvasActions.zoomOut()
    }
  }

  const handleResetZoom = () => {
    if ((window as any).canvasActions?.resetZoom) {
      ;(window as any).canvasActions.resetZoom()
    }
  }

  return (
    <div className="flex gap-2 bg-card/90 backdrop-blur-sm rounded-lg p-2">
      <Button variant="outline" size="sm" onClick={handleUndo} title="Undo">
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleRedo} title="Redo">
        <Redo2 className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleClear} title="Clear Canvas">
        <Trash2 className="w-4 h-4" />
      </Button>
      <div className="w-px bg-border mx-1" />
      <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleResetZoom} title="Reset Zoom">
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  )
}
