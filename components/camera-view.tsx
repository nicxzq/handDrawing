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
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)
  const lastProcessTimeRef = useRef(0)
  const [isPinching, setIsPinching] = useState(false)
  const [palmPosition, setPalmPosition] = useState<{ x: number; y: number } | null>(null)
  const lastPalmPositionRef = useRef<{ x: number; y: number } | null>(null)
  const [fingerTips, setFingerTips] = useState<{ x: number; y: number }[]>([])

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
      const procCanvas = canvasRef.current
      const procCtx = procCanvas.getContext("2d")

      if (!procCtx || video.videoWidth === 0 || video.videoHeight === 0) return

      try {
        processingRef.current = true
        setIsProcessing(true)
        lastProcessTimeRef.current = now

        procCanvas.width = video.videoWidth
        procCanvas.height = video.videoHeight

        procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height)
        const imageData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height)

        const handData = detectPalmAndPinch(imageData, procCanvas.width, procCanvas.height)

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
          setFingerTips(handData.fingerTips || [])
          onGestureDetected(gestureData)

          if (isDrawingMode) {
            handlePalmDrawing(handData)
          }

          drawOverlay(procCanvas.width, procCanvas.height, handData)
        } else {
          if (isPinching && isDrawingMode) {
            console.log("[v0] Hand lost, stopping drawing")
            setIsPinching(false)
            triggerDrawEnd()
          }
          setPalmPosition(null)
          setFingerTips([])
          clearOverlay()
        }
      } catch (error) {
        console.error("[v0] Hand detection error:", error)
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    }

    intervalId = setInterval(detectHandGestures, 100)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [onGestureDetected, isDrawingMode, isPinching])

  const detectPalmAndPinch = (imageData: ImageData, width: number, height: number) => {
    const data = imageData.data
    const skinPixels: { x: number; y: number; intensity: number }[] = []

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - g > 15 && r + g + b > 200) {
          const intensity = (r + g + b) / 3
          skinPixels.push({ x, y, intensity })
        }
      }
    }

    if (skinPixels.length < 100) return null

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

    const fingerRegions = detectFingerRegions(skinPixels, palmX, palmY, width, height)

    // Build fingertip candidates per sector: farthest pixel from palm within ring
    const fingerTips = fingerRegions.sectorTips

    // Heuristic: choose the two closest fingertip candidates in the upper half as thumb/index approximation
    const upperTips = fingerTips.filter((t) => t && t.y < palmY)
    let minDist = Infinity
    let pair: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null
    for (let i = 0; i < upperTips.length; i++) {
      for (let j = i + 1; j < upperTips.length; j++) {
        const dx = (upperTips[i]!.x - upperTips[j]!.x)
        const dy = (upperTips[i]!.y - upperTips[j]!.y)
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < minDist) {
          minDist = d
          pair = { a: upperTips[i]!, b: upperTips[j]! }
        }
      }
    }

    const pinchThreshold = Math.min(width, height) * 0.07
    const isPinching = pair ? minDist < pinchThreshold : fingerRegions.extendedFingers < 3
    const isOpenPalm = fingerRegions.extendedFingers >= 4

    console.log("[v0] Finger analysis:", fingerRegions.extendedFingers, "extended fingers, pinchDist:", minDist)

    return {
      type: isPinching ? "pinch" : isOpenPalm ? "open_palm" : "partial_hand",
      confidence: Math.min(0.9, skinPixels.length / 500),
      position: {
        x: palmX / width,
        y: palmY / height,
      },
      isPinching,
      fingerCount: fingerRegions.extendedFingers,
      fingerTips: fingerTips.filter(Boolean) as { x: number; y: number }[],
      palm: { x: palmX, y: palmY },
      pinchPair: pair,
    }
  }

  const detectFingerRegions = (
    skinPixels: { x: number; y: number; intensity: number }[],
    palmX: number,
    palmY: number,
    width: number,
    height: number,
  ) => {
    const sectors = 8
    const sectorCounts = new Array(sectors).fill(0)
    const sectorTips: Array<{ x: number; y: number } | null> = new Array(sectors).fill(null)
    const radius = Math.min(width, height) * 0.15

    skinPixels.forEach((pixel) => {
      const dx = pixel.x - palmX
      const dy = pixel.y - palmY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > radius * 0.5 && distance < radius * 1.8) {
        const angle = Math.atan2(dy, dx)
        const sectorIndex = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * sectors) % sectors
        sectorCounts[sectorIndex]++
        const tip = sectorTips[sectorIndex]
        if (!tip || distance > Math.sqrt((tip.x - palmX) * (tip.x - palmX) + (tip.y - palmY) * (tip.y - palmY))) {
          sectorTips[sectorIndex] = { x: pixel.x, y: pixel.y }
        }
      }
    })

    const threshold = Math.max(10, skinPixels.length * 0.02)
    const extendedFingers = sectorCounts.filter((count) => count > threshold).length

    return { extendedFingers, sectorCounts, sectorTips }
  }

  const drawOverlay = (width: number, height: number, handData: any) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    overlay.width = width
    overlay.height = height
    const ctx = overlay.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    // Draw palm
    if (handData.palm) {
      ctx.fillStyle = "rgba(0, 122, 255, 0.8)"
      ctx.beginPath()
      ctx.arc(handData.palm.x, handData.palm.y, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw finger rays
    ctx.strokeStyle = handData.isPinching ? "rgba(16, 185, 129, 0.9)" : "rgba(255, 255, 255, 0.6)"
    ctx.lineWidth = 2
    ;(handData.fingerTips as { x: number; y: number }[]).forEach((tip: any) => {
      ctx.beginPath()
      ctx.moveTo(handData.palm.x, handData.palm.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()

      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw pinch link if available
    if (handData.pinchPair) {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(handData.pinchPair.a.x, handData.pinchPair.a.y)
      ctx.lineTo(handData.pinchPair.b.x, handData.pinchPair.b.y)
      ctx.stroke()
    }
  }

  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, overlay.width, overlay.height)
  }

  const handlePalmDrawing = (handData: any) => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = handData.position.x * rect.width
    const y = handData.position.y * rect.height

    console.log("[v0] Palm at:", x, y, "pinching:", handData.isPinching, "was pinching:", isPinching)

    if (handData.isPinching && !isPinching) {
      console.log("[v0] Pinch detected, starting to draw")
      triggerDrawStart(x, y)
    } else if (handData.isPinching && isPinching) {
      console.log("[v0] Continuing to draw while pinching")
      triggerDrawMove(x, y)
    } else if (!handData.isPinching && isPinching) {
      console.log("[v0] Pinch released, stopping drawing")
      triggerDrawEnd()
    }

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
      <canvas ref={overlayCanvasRef} className="absolute inset-0 pointer-events-none" />

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
