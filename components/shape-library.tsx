"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User } from "lucide-react"

interface ShapeLibraryProps {
  onShapeSelect: (shape: Shape) => void
}

interface Shape {
  id: string
  name: string
  category: string
  path: string
  viewBox: string
  preview?: React.ReactNode
}

const STICK_FIGURES: Shape[] = [
  {
    id: "stick-basic",
    name: "Basic Stick Figure",
    category: "stick-figures",
    path: "M50 20 C50 15, 55 10, 60 10 C65 10, 70 15, 70 20 C70 25, 65 30, 60 30 C55 30, 50 25, 50 20 M60 30 L60 70 M60 45 L40 55 M60 45 L80 55 M60 70 L45 90 M60 70 L75 90",
    viewBox: "0 0 120 100",
  },
  {
    id: "stick-running",
    name: "Running Stick Figure",
    category: "stick-figures",
    path: "M50 15 C50 10, 55 5, 60 5 C65 5, 70 10, 70 15 C70 20, 65 25, 60 25 C55 25, 50 20, 50 15 M60 25 L65 65 M65 40 L45 35 M65 40 L85 50 M65 65 L50 85 M65 65 L85 80",
    viewBox: "0 0 120 100",
  },
  {
    id: "stick-jumping",
    name: "Jumping Stick Figure",
    category: "stick-figures",
    path: "M50 10 C50 5, 55 0, 60 0 C65 0, 70 5, 70 10 C70 15, 65 20, 60 20 C55 20, 50 15, 50 10 M60 20 L60 50 M60 35 L35 25 M60 35 L85 25 M60 50 L40 70 M60 50 L80 70",
    viewBox: "0 0 120 80",
  },
  {
    id: "stick-sitting",
    name: "Sitting Stick Figure",
    category: "stick-figures",
    path: "M50 20 C50 15, 55 10, 60 10 C65 10, 70 15, 70 20 C70 25, 65 30, 60 30 C55 30, 50 25, 50 20 M60 30 L60 55 M60 40 L40 50 M60 40 L80 50 M40 55 L80 55 M60 55 L45 75 M60 55 L75 75",
    viewBox: "0 0 120 100",
  },
  {
    id: "stick-waving",
    name: "Waving Stick Figure",
    category: "stick-figures",
    path: "M50 20 C50 15, 55 10, 60 10 C65 10, 70 15, 70 20 C70 25, 65 30, 60 30 C55 30, 50 25, 50 20 M60 30 L60 70 M60 45 L40 55 M60 45 L85 25 M60 70 L45 90 M60 70 L75 90",
    viewBox: "0 0 120 100",
  },
  {
    id: "stick-dancing",
    name: "Dancing Stick Figure",
    category: "stick-figures",
    path: "M45 15 C45 10, 50 5, 55 5 C60 5, 65 10, 65 15 C65 20, 60 25, 55 25 C50 25, 45 20, 45 15 M55 25 L65 65 M65 40 L40 30 M65 40 L90 45 M65 65 L45 85 M65 65 L85 85",
    viewBox: "0 0 120 100",
  },
]

const BASIC_SHAPES: Shape[] = [
  {
    id: "circle",
    name: "Circle",
    category: "basic",
    path: "M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10",
    viewBox: "0 0 100 100",
  },
  {
    id: "square",
    name: "Square",
    category: "basic",
    path: "M20 20 L80 20 L80 80 L20 80 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "triangle",
    name: "Triangle",
    category: "basic",
    path: "M50 10 L90 80 L10 80 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "rectangle",
    name: "Rectangle",
    category: "basic",
    path: "M15 30 L85 30 L85 70 L15 70 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "basic",
    path: "M50 10 L90 50 L50 90 L10 50 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "pentagon",
    name: "Pentagon",
    category: "basic",
    path: "M50 10 L90 35 L75 80 L25 80 L10 35 Z",
    viewBox: "0 0 100 100",
  },
]

const SYMBOLS: Shape[] = [
  {
    id: "star",
    name: "Star",
    category: "symbols",
    path: "M50 5 L60 35 L95 35 L67.5 57.5 L77.5 87.5 L50 65 L22.5 87.5 L32.5 57.5 L5 35 L40 35 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "heart",
    name: "Heart",
    category: "symbols",
    path: "M50 85 C20 65, 5 40, 5 25 C5 15, 15 5, 25 5 C35 5, 45 15, 50 25 C55 15, 65 5, 75 5 C85 5, 95 15, 95 25 C95 40, 80 65, 50 85 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "arrow-right",
    name: "Arrow Right",
    category: "symbols",
    path: "M10 50 L70 50 M55 35 L70 50 L55 65",
    viewBox: "0 0 100 100",
  },
  {
    id: "arrow-up",
    name: "Arrow Up",
    category: "symbols",
    path: "M50 10 L50 70 M35 25 L50 10 L65 25",
    viewBox: "0 0 100 100",
  },
  {
    id: "lightning",
    name: "Lightning",
    category: "symbols",
    path: "M30 10 L70 10 L45 45 L60 45 L25 90 L40 50 L25 50 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "sun",
    name: "Sun",
    category: "symbols",
    path: "M50 20 A30 30 0 1 1 50 80 A30 30 0 1 1 50 20 M50 5 L50 15 M50 85 L50 95 M85 50 L95 50 M5 50 L15 50 M79.3 20.7 L72.1 27.9 M27.9 72.1 L20.7 79.3 M79.3 79.3 L72.1 72.1 M27.9 27.9 L20.7 20.7",
    viewBox: "0 0 100 100",
  },
]

const OBJECTS: Shape[] = [
  {
    id: "house",
    name: "House",
    category: "objects",
    path: "M10 60 L50 20 L90 60 L90 90 L60 90 L60 70 L40 70 L40 90 L10 90 Z M30 50 L40 50 L40 60 L30 60 Z M60 50 L70 50 L70 60 L60 60 Z",
    viewBox: "0 0 100 100",
  },
  {
    id: "tree",
    name: "Tree",
    category: "objects",
    path: "M50 90 L50 60 M30 60 C30 40, 70 40, 70 60 M25 50 C25 30, 75 30, 75 50 M35 40 C35 20, 65 20, 65 40",
    viewBox: "0 0 100 100",
  },
  {
    id: "car",
    name: "Car",
    category: "objects",
    path: "M10 60 L20 40 L80 40 L90 60 L90 70 L80 70 C80 75, 75 80, 70 80 C65 80, 60 75, 60 70 L40 70 C40 75, 35 80, 30 80 C25 80, 20 75, 20 70 L10 70 Z M25 50 L35 50 M65 50 L75 50",
    viewBox: "0 0 100 100",
  },
  {
    id: "flower",
    name: "Flower",
    category: "objects",
    path: "M50 50 C45 40, 55 40, 50 50 C60 45, 60 55, 50 50 C55 60, 45 60, 50 50 C40 55, 40 45, 50 50 M50 50 A5 5 0 1 1 50 60 A5 5 0 1 1 50 50 M50 60 L50 85 M45 75 L50 70 L55 75",
    viewBox: "0 0 100 100",
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "objects",
    path: "M20 60 C10 60, 10 40, 25 40 C25 25, 45 25, 50 35 C55 25, 75 25, 75 40 C90 40, 90 60, 80 60 Z",
    viewBox: "0 0 100 100",
  },
]

const ALL_SHAPES = [...STICK_FIGURES, ...BASIC_SHAPES, ...SYMBOLS, ...OBJECTS]

export function ShapeLibrary({ onShapeSelect }: ShapeLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState("stick-figures")
  const [selectedShape, setSelectedShape] = useState<string | null>(null)

  const handleShapeClick = (shape: Shape) => {
    setSelectedShape(shape.id)
    onShapeSelect(shape)
    console.log("[v0] Shape selected:", shape.name)
  }

  const renderShapePreview = (shape: Shape) => (
    <div
      key={shape.id}
      className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
        selectedShape === shape.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
      }`}
      onClick={() => handleShapeClick(shape)}
      title={shape.name}
    >
      <svg
        width="60"
        height="60"
        viewBox={shape.viewBox}
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={shape.path} />
      </svg>
      <p className="text-xs text-center mt-1 text-muted-foreground truncate">{shape.name}</p>
    </div>
  )

  const getShapesByCategory = (category: string) => {
    return ALL_SHAPES.filter((shape) => shape.category === category)
  }

  return (
    <Card className="h-full bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Shape Library
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="h-full">
          <div className="px-4 pb-2">
            <TabsList className="grid w-full grid-cols-2 gap-1 h-auto p-1">
              <TabsTrigger value="stick-figures" className="text-xs py-2">
                Stick Figures
                <Badge variant="secondary" className="ml-1 text-xs">
                  {STICK_FIGURES.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="basic" className="text-xs py-2">
                Basic Shapes
                <Badge variant="secondary" className="ml-1 text-xs">
                  {BASIC_SHAPES.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-2 gap-1 h-auto p-1 mt-1">
              <TabsTrigger value="symbols" className="text-xs py-2">
                Symbols
                <Badge variant="secondary" className="ml-1 text-xs">
                  {SYMBOLS.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="objects" className="text-xs py-2">
                Objects
                <Badge variant="secondary" className="ml-1 text-xs">
                  {OBJECTS.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="px-4 pb-4">
              <TabsContent value="stick-figures" className="mt-0">
                <div className="grid grid-cols-2 gap-3">
                  {getShapesByCategory("stick-figures").map(renderShapePreview)}
                </div>
              </TabsContent>

              <TabsContent value="basic" className="mt-0">
                <div className="grid grid-cols-2 gap-3">{getShapesByCategory("basic").map(renderShapePreview)}</div>
              </TabsContent>

              <TabsContent value="symbols" className="mt-0">
                <div className="grid grid-cols-2 gap-3">{getShapesByCategory("symbols").map(renderShapePreview)}</div>
              </TabsContent>

              <TabsContent value="objects" className="mt-0">
                <div className="grid grid-cols-2 gap-3">{getShapesByCategory("objects").map(renderShapePreview)}</div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Shape Actions */}
        <div className="px-4 py-3 border-t border-border">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Click a shape to select it, then click on the canvas to place it.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedShape(null)} className="text-xs flex-1">
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add custom shape functionality
                  console.log("[v0] Custom shape creation requested")
                }}
                className="text-xs flex-1"
              >
                Custom Shape
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
