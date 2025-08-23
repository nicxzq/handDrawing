"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Target, CheckCircle } from "lucide-react"

interface TrainingSession {
  gesture: string
  samples: number
  accuracy: number
  completed: boolean
}

const GESTURE_TRAINING_DATA = [
  { name: "fist", label: "Fist", description: "Close your hand into a fist", icon: "✊" },
  { name: "open_palm", label: "Open Palm", description: "Show your open palm to the camera", icon: "✋" },
  { name: "point", label: "Point", description: "Point with your index finger", icon: "👆" },
  { name: "peace", label: "Peace Sign", description: "Make a peace sign with two fingers", icon: "✌️" },
  { name: "thumbs_up", label: "Thumbs Up", description: "Give a thumbs up", icon: "👍" },
]

export function GestureTrainer() {
  const [isTraining, setIsTraining] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<string | null>(null)
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    GESTURE_TRAINING_DATA.map((g) => ({
      gesture: g.name,
      samples: 0,
      accuracy: 0,
      completed: false,
    })),
  )
  const [trainingProgress, setTrainingProgress] = useState(0)

  const startTraining = (gestureName: string) => {
    setCurrentGesture(gestureName)
    setIsTraining(true)
    setTrainingProgress(0)

    // Simulate training process
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTraining(false)
          setCurrentGesture(null)

          // Update training session
          setTrainingSessions((prev) =>
            prev.map((session) =>
              session.gesture === gestureName
                ? { ...session, samples: session.samples + 10, accuracy: Math.random() * 20 + 80, completed: true }
                : session,
            ),
          )

          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const resetTraining = () => {
    setTrainingSessions((prev) =>
      prev.map((session) => ({
        ...session,
        samples: 0,
        accuracy: 0,
        completed: false,
      })),
    )
  }

  const overallAccuracy = trainingSessions.reduce((acc, session) => acc + session.accuracy, 0) / trainingSessions.length

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Gesture Training
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Accuracy</span>
            <Badge variant={overallAccuracy > 80 ? "default" : "secondary"}>{Math.round(overallAccuracy)}%</Badge>
          </div>
          <Progress value={overallAccuracy} className="h-2" />
        </div>

        {/* Training Sessions */}
        <div className="space-y-3">
          {GESTURE_TRAINING_DATA.map((gesture, index) => {
            const session = trainingSessions[index]
            const isCurrentlyTraining = currentGesture === gesture.name && isTraining

            return (
              <div key={gesture.name} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{gesture.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{gesture.label}</p>
                      <p className="text-xs text-muted-foreground">{gesture.description}</p>
                    </div>
                  </div>
                  {session.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>

                {session.samples > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{session.samples} samples</span>
                    <span>{Math.round(session.accuracy)}% accuracy</span>
                  </div>
                )}

                {isCurrentlyTraining && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="w-3 h-3 animate-pulse" />
                      <span>Training in progress...</span>
                    </div>
                    <Progress value={trainingProgress} className="h-1" />
                  </div>
                )}

                <Button
                  size="sm"
                  variant={session.completed ? "outline" : "default"}
                  onClick={() => startTraining(gesture.name)}
                  disabled={isTraining}
                  className="w-full"
                >
                  {session.completed ? "Retrain" : "Train"} {gesture.label}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetTraining} className="flex-1 bg-transparent">
            Reset All
          </Button>
          <Button variant="default" className="flex-1" disabled={trainingSessions.some((s) => !s.completed)}>
            Save Model
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
