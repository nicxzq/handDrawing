"use client"

import { useRef, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Hand, Eye } from "lucide-react"

interface CameraViewProps {
  onGestureDetected: (gesture: GestureData) => void
  isDrawingMode?: boolean
}

interface GestureData {
  type: string
  confidence: number
  position: { x: number; y: number }
  timestamp: number
  isDrawing?: boolean
}

interface HandLandmark {
  x: number
  y: number
  z?: number
}

export function CameraView({ onGestureDetected, isDrawingMode = false }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)
  const lastProcessTimeRef = useRef(0)
  const [isPinching, setIsPinching] = useState(false)
  const [palmPosition, setPalmPosition] = useState<{ x: number; y: number } | null>(null)
  const lastPalmPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }

        setIsLoading(false)
        console.log("[v0] Camera initialized for palm tracking")
      } catch (err) {
        console.error("[v0] Camera access error:", err)
        setError("Unable to access camera. Please ensure camera permissions are granted.")
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const detectHandGestures = () => {
      const now = Date.now()
      if (processingRef.current || now - lastProcessTimeRef.current < 100) {
        return
      }

      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return

      try {
        processingRef.current = true
        setIsProcessing(true)
        lastProcessTimeRef.current = now

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const handData = detectPalmAndPinch(imageData, canvas.width, canvas.height)

        if (handData) {
          console.log("[v0] Hand detected:", handData.type, "at", handData.position, "pinching:", handData.isPinching)

          const gestureData: GestureData = {
            type: handData.type,
            confidence: handData.confidence,
            position: handData.position,
            timestamp: now,
            isDrawing: handData.isPinching,
          }

          setCurrentGesture(gestureData)
          setPalmPosition(handData.position)
          setIsPinching(handData.isPinching)
          onGestureDetected(gestureData)

          if (isDrawingMode) {
            handlePalmDrawing(handData)
          }
        } else {
          // No hand detected, stop drawing if we were drawing
          if (isPinching && isDrawingMode) {
            console.log("[v0] Hand lost, stopping drawing")
            setIsPinching(false)
            triggerDrawEnd()
          }
          setPalmPosition(null)
        }
      } catch (error) {
        console.error("[v0] Hand detection error:", error)
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    }

    intervalId = setInterval(detectHandGestures, 100) // 10 FPS for smooth tracking

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [onGestureDetected, isDrawingMode, isPinching])

  const detectPalmAndPinch = (imageData: ImageData, width: number, height: number) => {
    const data = imageData.data
    const skinPixels: { x: number; y: number; intensity: number }[] = []

    // Enhanced skin detection with better color range
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // Improved skin detection algorithm
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - g > 15 && r + g + b > 200) {
          const intensity = (r + g + b) / 3
          skinPixels.push({ x, y, intensity })
        }
      }
    }

    if (skinPixels.length < 100) return null // Need minimum skin pixels for hand

    // Find palm center (largest cluster of skin pixels)
    let palmX = 0
    let palmY = 0
    let totalIntensity = 0

    skinPixels.forEach((pixel) => {
      palmX += pixel.x * pixel.intensity
      palmY += pixel.y * pixel.intensity
      totalIntensity += pixel.intensity
    })

    palmX /= totalIntensity
    palmY /= totalIntensity

    // Detect if fingers are extended (open palm) or pinched
    const fingerRegions = detectFingerRegions(skinPixels, palmX, palmY, width, height)
    const isPinching = fingerRegions.extendedFingers < 3 // Less than 3 extended fingers = pinch
    const isOpenPalm = fingerRegions.extendedFingers >= 4 // 4+ extended fingers = open palm

    console.log("[v0] Finger analysis:", fingerRegions.extendedFingers, "extended fingers, pinching:", isPinching)

    return {
      type: isPinching ? "pinch" : isOpenPalm ? "open_palm" : "partial_hand",
      confidence: Math.min(0.9, skinPixels.length / 500),
      position: {
        x: palmX / width,
        y: palmY / height,
      },
      isPinching,
      fingerCount: fingerRegions.extendedFingers,
    }
  }

  const detectFingerRegions = (
    skinPixels: { x: number; y: number; intensity: number }[],
    palmX: number,
    palmY: number,
    width: number,
    height: number,
  ) => {
    // Divide hand region into sectors to detect extended fingers
    const sectors = 8
    const sectorCounts = new Array(sectors).fill(0)
    const radius = Math.min(width, height) * 0.15 // Hand radius

    skinPixels.forEach((pixel) => {
      const dx = pixel.x - palmX
      const dy = pixel.y - palmY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > radius * 0.5 && distance < radius * 1.5) {
        // This pixel is in the finger region
        const angle = Math.atan2(dy, dx)
        const sectorIndex = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * sectors) % sectors
        sectorCounts[sectorIndex]++
      }
    })

    // Count sectors with significant pixel density (extended fingers)
    const threshold = Math.max(10, skinPixels.length * 0.02)
    const extendedFingers = sectorCounts.filter((count) => count > threshold).length

    return { extendedFingers, sectorCounts }
  }

  const handlePalmDrawing = (handData: any) => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = handData.position.x * rect.width
    const y = handData.position.y * rect.height

    console.log("[v0] Palm at:", x, y, "pinching:", handData.isPinching, "was pinching:", isPinching)

    if (handData.isPinching && !isPinching) {
      // Start drawing - pinch detected
      console.log("[v0] Pinch detected, starting to draw")
      triggerDrawStart(x, y)
    } else if (handData.isPinching && isPinching) {
      // Continue drawing - still pinching
      console.log("[v0] Continuing to draw while pinching")
      triggerDrawMove(x, y)
    } else if (!handData.isPinching && isPinching) {
      // Stop drawing - pinch released
      console.log("[v0] Pinch released, stopping drawing")
      triggerDrawEnd()
    }

    // Update cursor position regardless of drawing state
    triggerCursorMove(x, y)
  }

  const triggerDrawStart = (x: number, y: number) => {
    window.dispatchEvent(
      new CustomEvent("gestureDrawStart", {
        detail: { x, y, tool: "brush" },
      }),
    )
  }

  const triggerDrawMove = (x: number, y: number) => {
    window.dispatchEvent(
      new CustomEvent("gestureDrawMove", {
        detail: { x, y },
      }),
    )
  }

  const triggerDrawEnd = () => {
    window.dispatchEvent(new CustomEvent("gestureDrawEnd"))
  }

  const triggerCursorMove = (x: number, y: number) => {
    // Show cursor position for visual feedback
    window.dispatchEvent(
      new CustomEvent("gestureCursorMove", {
        detail: { x, y },
      }),
    )
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}

      <video ref={videoRef} className="w-full h-full object-cover opacity-20" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute top-4 left-4 z-20 space-y-2">
        {currentGesture && (
          <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Hand className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Palm Tracking</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Gesture:</span>
                <Badge variant="secondary" className="text-xs">
                  {currentGesture.type.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pinching:</span>
                <Badge variant={isPinching ? "default" : "secondary"} className="text-xs">
                  {isPinching ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Drawing:</span>
                <Badge variant={isPinching ? "default" : "secondary"} className="text-xs">
                  {isPinching ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="bg-card/90 backdrop-blur-sm rounded-lg p-2 border">
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3 animate-pulse text-primary" />
              <span className="text-xs text-muted-foreground">Tracking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 border max-w-xs">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Hand className="w-4 h-4" />
            Palm Drawing Controls
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              ✋ <strong>Open Palm:</strong> Move cursor
            </div>
            <div>
              🤏 <strong>Pinch (thumb + index):</strong> Start drawing
            </div>
            <div>
              ✋ <strong>Release Pinch:</strong> Stop drawing
            </div>
            <div className="text-xs text-muted-foreground mt-2 italic">
              Keep your palm facing the camera for best tracking
            </div>
          </div>
        </div>
      </div>

      {palmPosition && (
        <div
          className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg pointer-events-none z-30 transform -translate-x-2 -translate-y-2"
          style={{
            left: `${palmPosition.x * 100}%`,
            top: `${palmPosition.y * 100}%`,
            opacity: isPinching ? 1 : 0.6,
            transform: `translate(-50%, -50%) scale(${isPinching ? 1.2 : 1})`,
            transition: "all 0.1s ease-out",
          }}
        />
      )}
    </div>
  )
}
