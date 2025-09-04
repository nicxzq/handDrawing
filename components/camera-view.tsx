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

export function CameraView({ onGestureDetected, isDrawingMode = false }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPinching, setIsPinching] = useState(false)
  const [palmPosition, setPalmPosition] = useState<{ x: number; y: number } | null>(null)

  // Hysteresis / debounce state
  const pinchFramesRef = useRef(0)
  const releaseFramesRef = useRef(0)

  // Load MediaPipe Hands via CDN once
  useEffect(() => {
    let stream: MediaStream | null = null
    let camera: any = null
    let hands: any = null
    let cancelled = false

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existed = document.querySelector(`script[src="${src}"]`)
        if (existed) {
          resolve()
          return
        }
        const s = document.createElement("script")
        s.src = src
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.head.appendChild(s)
      })

    const init = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Request camera first so user can grant permission early
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        // Load MediaPipe Hands libs
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js")
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js")
        if (cancelled) return

        const mpHands = (window as any).Hands
        const mpCamera = (window as any).Camera
        const mpDraw = (window as any).drawConnectors
        const mpLandmarks = (window as any).HAND_CONNECTIONS

        if (!mpHands || !mpCamera) throw new Error("MediaPipe Hands not available")

        hands = new mpHands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` })
        hands.setOptions({
          maxNumHands: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
          modelComplexity: 1,
        })

        hands.onResults((results: any) => {
          if (cancelled) return
          setIsProcessing(true)
          try {
            handleResults(results, mpDraw, mpLandmarks)
          } finally {
            setIsProcessing(false)
          }
        })

        if (videoRef.current) {
          camera = new mpCamera(videoRef.current, {
            onFrame: async () => {
              if (!hands || !videoRef.current) return
              await hands.send({ image: videoRef.current })
            },
            width: 640,
            height: 480,
          })
          camera.start()
        }

        setIsLoading(false)
      } catch (e: any) {
        console.error("[hands] init error", e)
        setError(e?.message || "Camera/Hand tracking initialization failed")
        setIsLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      try {
        if (camera?.stop) camera.stop()
      } catch {}
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const handleResults = (results: any, drawConnectors: any, HAND_CONNECTIONS: any) => {
    const overlay = overlayRef.current
    const video = videoRef.current
    if (!overlay || !video) return

    // Fit overlay to displayed video size
    const rect = video.getBoundingClientRect()
    overlay.width = Math.max(1, Math.floor(rect.width))
    overlay.height = Math.max(1, Math.floor(rect.height))
    const ctx = overlay.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const landmarks: any[] = results.multiHandLandmarks?.[0] || []

    if (!landmarks || landmarks.length === 0) {
      // No hand: ensure end drawing if currently pinching
      if (isPinching) {
        const { x, y } = getCanvasCenterCoords()
        triggerDrawEnd()
        setIsPinching(false)
        setCurrentGesture(null)
        setPalmPosition(null)
      }
      return
    }

    // MediaPipe provides normalized [0..1] coordinates
    const toOverlay = (p: any) => ({ x: p.x * overlay.width, y: p.y * overlay.height })

    // Draw skeleton overlay
    try {
      if (drawConnectors) {
        drawConnectors(ctx, landmarks.map(toOverlay), HAND_CONNECTIONS, { color: "#10b981", lineWidth: 2 })
      }
      landmarks.forEach((p: any) => {
        const { x, y } = toOverlay(p)
        ctx.fillStyle = "rgba(255,255,255,0.9)"
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      })
    } catch {}

    // Pinch detection between Thumb tip (4) and Index tip (8)
    const thumb = toOverlay(landmarks[4])
    const index = toOverlay(landmarks[8])

    const dx = thumb.x - index.x
    const dy = thumb.y - index.y
    const pinchDist = Math.hypot(dx, dy)

    // Dynamic threshold based on hand size: distance between wrist(0) and middle knuckle(9)
    const wrist = toOverlay(landmarks[0])
    const middleBase = toOverlay(landmarks[9])
    const handScale = Math.max(20, Math.hypot(wrist.x - middleBase.x, wrist.y - middleBase.y))

    const startThreshold = handScale * 0.35 // stricter to start
    const endThreshold = handScale * 0.55 // looser to end

    let nextPinching = isPinching
    if (pinchDist < startThreshold) {
      pinchFramesRef.current += 1
      releaseFramesRef.current = 0
      if (!isPinching && pinchFramesRef.current >= 2) nextPinching = true
    } else if (pinchDist > endThreshold) {
      releaseFramesRef.current += 1
      pinchFramesRef.current = 0
      if (isPinching && releaseFramesRef.current >= 2) nextPinching = false
    } else {
      pinchFramesRef.current = 0
      releaseFramesRef.current = 0
    }

    // Use index fingertip as cursor position
    const cursor = index

    // Map overlay coords to drawing canvas coords
    const { canvasX, canvasY } = mapToDrawingCanvas(cursor.x, cursor.y, video)

    // Update badges
    const gestureData: GestureData = {
      type: nextPinching ? "pinch" : "open_palm",
      confidence: 0.9,
      position: { x: canvasX / Math.max(1, getDrawingCanvasRect().width), y: canvasY / Math.max(1, getDrawingCanvasRect().height) },
      timestamp: Date.now(),
      isDrawing: nextPinching,
    }
    setCurrentGesture(gestureData)
    setPalmPosition({ x: cursor.x / overlay.width, y: cursor.y / overlay.height })

    // Drive drawing
    if (isDrawingMode) {
      if (nextPinching && !isPinching) {
        triggerDrawStart(canvasX, canvasY)
      } else if (nextPinching && isPinching) {
        triggerDrawMove(canvasX, canvasY)
      } else if (!nextPinching && isPinching) {
        triggerDrawEnd()
      }
    }

    setIsPinching(nextPinching)

    // Visualize pinch line
    ctx.strokeStyle = nextPinching ? "#10b981" : "rgba(255,255,255,0.6)"
    ctx.lineWidth = nextPinching ? 3 : 2
    ctx.beginPath()
    ctx.moveTo(thumb.x, thumb.y)
    ctx.lineTo(index.x, index.y)
    ctx.stroke()
  }

  const getDrawingCanvasRect = () => {
    const drawingCanvas = document.querySelector("canvas.touch-none") as HTMLCanvasElement | null
    if (drawingCanvas) return drawingCanvas.getBoundingClientRect()
    // Fallback to viewport size
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as any
  }

  const getCanvasCenterCoords = () => {
    const rect = getDrawingCanvasRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  const mapToDrawingCanvas = (overlayX: number, overlayY: number, videoEl: HTMLVideoElement) => {
    const videoRect = videoEl.getBoundingClientRect()
    const normX = (overlayX - 0) / Math.max(1, videoRect.width)
    const normY = (overlayY - 0) / Math.max(1, videoRect.height)

    const canvasRect = getDrawingCanvasRect()
    const canvasX = canvasRect.left + normX * canvasRect.width
    const canvasY = canvasRect.top + normY * canvasRect.height

    // Return canvas-local coordinates expected by DrawingCanvas
    return { canvasX: canvasX - canvasRect.left, canvasY: canvasY - canvasRect.top }
  }

  const triggerDrawStart = (x: number, y: number) => {
    const detail = { x, y, tool: "brush" }
    window.dispatchEvent(new CustomEvent("canvasDrawStart", { detail }))
    window.dispatchEvent(new CustomEvent("gestureDrawStart", { detail }))
  }
  const triggerDrawMove = (x: number, y: number) => {
    const detail = { x, y }
    window.dispatchEvent(new CustomEvent("canvasDrawMove", { detail }))
    window.dispatchEvent(new CustomEvent("gestureDrawMove", { detail }))
  }
  const triggerDrawEnd = () => {
    window.dispatchEvent(new CustomEvent("canvasDrawEnd"))
    window.dispatchEvent(new CustomEvent("gestureDrawEnd"))
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
      <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />

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
                <Badge variant="secondary" className="text-xs">{currentGesture.type.replace("_", " ")}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pinching:</span>
                <Badge variant={isPinching ? "default" : "secondary"} className="text-xs">{isPinching ? "Yes" : "No"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Drawing:</span>
                <Badge variant={isPinching ? "default" : "secondary"} className="text-xs">{isPinching ? "Active" : "Inactive"}</Badge>
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
