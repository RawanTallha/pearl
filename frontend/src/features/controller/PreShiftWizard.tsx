import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchBackupCandidate, fetchSectorForController } from '../../services/dataService'
import { useSessionStore } from '../../store/useSessionStore'


type StepStatus = 'pending' | 'active' | 'completed'

interface StepData {
  id: string
  title: string
  description: string
  status: StepStatus
  result?: string
}

export function PreShiftWizard() {
  const navigate = useNavigate()
  const controller = useSessionStore((state) => state.controller)
  const [stepIndex, setStepIndex] = useState(0)
  const [complete, setComplete] = useState(false)
  
  // Face Scan state
  const [faceScanStatus, setFaceScanStatus] = useState<'idle' | 'capturing' | 'completed'>('idle')
  const [faceScanResult, setFaceScanResult] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const faceScanStreamRef = useRef<MediaStream | null>(null)
  
  // Voice Sample state
  const [voiceSampleStatus, setVoiceSampleStatus] = useState<'idle' | 'recording' | 'completed'>('idle')
  const [voiceSampleResult, setVoiceSampleResult] = useState<string>('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Reaction Time Challenge state
  const [reactionStatus, setReactionStatus] = useState<'idle' | 'waiting' | 'active' | 'completed'>('idle')
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [currentColor, setCurrentColor] = useState<'blue' | 'red'>('blue')
  const [reactionResult, setReactionResult] = useState<string>('')
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Health Check-In state
  const [sleepHours, setSleepHours] = useState<string>('')
  const [healthCheckResult, setHealthCheckResult] = useState<string>('')
  
  // Shift Start Popup state
  const [showShiftStartPopup, setShowShiftStartPopup] = useState(false)
  const [currentShift, setCurrentShift] = useState(1) // 1-4 shifts per day
  const [shiftTimeRemaining, setShiftTimeRemaining] = useState(120 * 60) // 2 hours in seconds
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0) // Break time in seconds
  const [isOnBreak, setIsOnBreak] = useState(false)
  const shiftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: sector } = useQuery({
    queryKey: ['sector', controller?.id],
    queryFn: () => fetchSectorForController(controller?.id ?? ''),
    enabled: Boolean(controller?.id),
  })

  const { data: backupCandidate } = useQuery({
    queryKey: ['backup', controller?.id],
    queryFn: () => fetchBackupCandidate(controller?.id ?? ''),
    enabled: Boolean(controller?.id),
  })


  const sequence: StepData[] = [
    {
      id: 'face',
      title: 'Face Scan',
      description: 'Quick 20-second scan to set your baseline. Optional - you can skip this step.',
      status: stepIndex === 0 ? 'active' : stepIndex > 0 ? 'completed' : 'pending',
      result: faceScanResult,
    },
    {
      id: 'voice',
      title: 'Voice Sample',
      description: 'Read a simple sentence to help us understand your voice patterns.',
      status: stepIndex === 1 ? 'active' : stepIndex > 1 ? 'completed' : 'pending',
      result: voiceSampleResult,
    },
    {
      id: 'reaction',
      title: 'Reaction Test',
      description: 'Click when you see red. Just 2-3 clicks, takes less than 30 seconds.',
      status: stepIndex === 2 ? 'active' : stepIndex > 2 ? 'completed' : 'pending',
      result: reactionResult,
    },
    {
      id: 'health',
      title: 'Quick Check-in',
      description: 'Tell us how many hours you slept to personalize your baseline.',
      status: stepIndex === 3 ? 'active' : stepIndex > 3 ? 'completed' : 'pending',
      result: healthCheckResult,
    },
  ]

  const step = sequence[stepIndex]

  const readinessScore = useMemo(() => {
    if (!controller) return null
    if (!complete) return controller.baselineReadiness
    return Math.min(1, controller.baselineReadiness + 0.02)
  }, [controller, complete])

  // Face Scan: Request camera access and capture
  const startFaceScan = useCallback(async () => {
    try {
      setFaceScanStatus('capturing')
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.')
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' // Prefer front-facing camera
        },
      })
      
      faceScanStreamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.error('Video play error:', err)
            setFaceScanStatus('idle')
            setFaceScanResult('Unable to start video playback. Please try again.')
            if (faceScanStreamRef.current) {
              faceScanStreamRef.current.getTracks().forEach((track) => track.stop())
              faceScanStreamRef.current = null
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null
            }
          })
        }
      }

      // Simulate 20-second capture
      setTimeout(() => {
        setFaceScanStatus('completed')
        setFaceScanResult('Blink frequency refreshed at 18/min. No yawns detected.')
        // Don't cleanup immediately - let user see the result
      }, 20000)
    } catch (err) {
      console.error('Camera access error:', err)
      setFaceScanStatus('idle')
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        setFaceScanResult('Camera access denied. Please grant permission to continue.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('device')) {
        setFaceScanResult('No camera found. Please connect a camera and try again.')
      } else {
        setFaceScanResult(`Camera error: ${errorMessage}. Please try again.`)
      }
      if (faceScanStreamRef.current) {
        faceScanStreamRef.current.getTracks().forEach((track) => track.stop())
        faceScanStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  const cleanupFaceScan = useCallback(() => {
    if (faceScanStreamRef.current) {
      faceScanStreamRef.current.getTracks().forEach((track) => track.stop())
      faceScanStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Voice Sample: Record audio
  const startVoiceSample = useCallback(async () => {
    try {
      setVoiceSampleStatus('recording')
      audioChunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        new Blob(audioChunksRef.current, { type: 'audio/wav' })
        // Simulate processing
        setVoiceSampleStatus('completed')
        setVoiceSampleResult('Speech cadence aligned at 126 wpm. Tone stability variance ±0.03.')
        
        // Cleanup
        stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current = null
      }
      
      mediaRecorder.start()
    } catch (err) {
      console.error('Microphone access error:', err)
      setVoiceSampleStatus('idle')
      setVoiceSampleResult('Microphone access denied. Please grant permission to continue.')
    }
  }, [])

  const stopVoiceSample = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // Reaction Time Challenge: Game logic
  const gameDurationRef = useRef<number>(0)
  const reactionStartTimeRef = useRef<number>(0)
  const maxClicksRef = useRef<number>(3) // End after 2-3 clicks
  const gameStartTimeRef = useRef<number>(0)
  
  const finishReactionChallenge = useCallback(() => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current)
    }
    
    setReactionStatus('completed')
    setCurrentColor('blue')
    
    // Calculate result based on current reaction times
    setReactionTimes((prev) => {
      if (prev.length > 0) {
        const avgReaction = prev.reduce((a, b) => a + b, 0) / prev.length
        setReactionResult(`Average response delay ${(avgReaction / 1000).toFixed(2)}s, within your optimum band.`)
      } else {
        setReactionResult('No reactions recorded. Please try again.')
      }
      return prev
    })
  }, [])
  
  const startReactionChallenge = useCallback(() => {
    setReactionStatus('waiting')
    setReactionTimes([])
    const startTime = Date.now()
    gameStartTimeRef.current = startTime
    reactionStartTimeRef.current = startTime
    
    // Game duration: Maximum 30 seconds
    gameDurationRef.current = 30000
    maxClicksRef.current = 2 + Math.floor(Math.random() * 2) // 2 or 3 clicks
    
    // Set timeout to end game after 30 seconds
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current)
    }
    reactionTimeoutRef.current = setTimeout(() => {
      finishReactionChallenge()
    }, gameDurationRef.current)
    
    // Show first red after initial wait
    const initialWait = 1000 + Math.random() * 2000
    setTimeout(() => {
      setReactionStatus((prevStatus) => {
        if (prevStatus !== 'completed') {
          setCurrentColor('red')
          reactionStartTimeRef.current = Date.now()
          return 'active'
        }
        return prevStatus
      })
    }, initialWait)
  }, [finishReactionChallenge])

  const handleReactionClick = useCallback(() => {
    if (reactionStatus === 'active' && currentColor === 'red') {
      const reactionTime = Date.now() - reactionStartTimeRef.current
      const newReactionTimes = [...reactionTimes, reactionTime]
      setReactionTimes(newReactionTimes)
      
      // Check if we have enough clicks (2-3) or time is up
      const elapsed = Date.now() - gameStartTimeRef.current
      const hasEnoughClicks = newReactionTimes.length >= maxClicksRef.current
      const timeUp = elapsed >= gameDurationRef.current
      
      if (hasEnoughClicks || timeUp) {
        // End the game
        finishReactionChallenge()
        return
      }
      
      // Continue game - show next red after a short delay
      setReactionStatus('waiting')
      setCurrentColor('blue')
      
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current)
      }
      
      const waitTime = 1000 + Math.random() * 2000
      reactionTimeoutRef.current = setTimeout(() => {
        const elapsedNow = Date.now() - gameStartTimeRef.current
        const hasEnoughClicksNow = newReactionTimes.length >= maxClicksRef.current
        
        if (elapsedNow < gameDurationRef.current && !hasEnoughClicksNow) {
          setReactionStatus('active')
          setCurrentColor('red')
          reactionStartTimeRef.current = Date.now()
        } else {
          finishReactionChallenge()
        }
      }, waitTime)
    }
  }, [reactionStatus, currentColor, reactionTimes, finishReactionChallenge])

  const handleContinue = () => {
    if (stepIndex === 1 && voiceSampleStatus !== 'completed') {
      // Voice sample not completed
      return
    }
    if (stepIndex === 2 && reactionStatus !== 'completed') {
      // Reaction challenge not completed
      return
    }
    if (stepIndex === 3 && !sleepHours) {
      // Health check-in not completed
      return
    }
    
    // Cleanup camera when moving away from face scan step
    if (stepIndex === 0) {
      cleanupFaceScan()
    }
    
    if (stepIndex < sequence.length - 1) {
      setStepIndex((prev) => prev + 1)
    } else {
      setComplete(true)
      // Show shift start popup after completion
      setTimeout(() => {
        setShowShiftStartPopup(true)
        // Initialize first shift timer
        setShiftTimeRemaining(120 * 60) // 2 hours
        setCurrentShift(1)
        setIsOnBreak(false)
        startShiftTimer()
      }, 500)
    }
  }

  // Shift timer logic
  const startShiftTimer = useCallback(() => {
    // Clear any existing timer
    if (shiftTimerRef.current) {
      clearInterval(shiftTimerRef.current)
    }

    // Start unified countdown timer that handles both shift and break
    shiftTimerRef.current = setInterval(() => {
      setIsOnBreak((prevIsOnBreak) => {
        if (prevIsOnBreak) {
          // Currently on break - count down break time
          let shouldStayOnBreak = true
          setBreakTimeRemaining((prevBreakTime) => {
            const newBreakTime = Math.max(0, prevBreakTime - 1)
            if (newBreakTime === 0 && prevBreakTime > 0) {
              // Break just ended, start next shift
              shouldStayOnBreak = false
              setCurrentShift((prevShift) => {
                const nextShift = Math.min(prevShift + 1, 4)
                if (nextShift <= 4) {
                  setShiftTimeRemaining(120 * 60) // Reset to 2 hours for next shift
                }
                return nextShift
              })
            }
            return newBreakTime
          })
          return shouldStayOnBreak
        } else {
          // Currently working on shift - count down shift time
          let shouldStayOnShift = true
          setShiftTimeRemaining((prevShiftTime) => {
            const newShiftTime = Math.max(0, prevShiftTime - 1)
            if (newShiftTime === 0 && prevShiftTime > 0) {
              // Shift just ended, start break
              shouldStayOnShift = false
              // Break duration: 40-60 minutes (randomized for flexibility)
              const breakDuration = 40 * 60 + Math.random() * 20 * 60 // 40-60 minutes
              setBreakTimeRemaining(Math.floor(breakDuration))
            }
            return newShiftTime
          })
          return shouldStayOnShift
        }
      })
    }, 1000)
  }, [])

  const handleStartShift = () => {
    // Navigate to dashboard, popup stays open
    navigate('/controller', { replace: false })
  }
  
  const handleClosePopup = () => {
    setShowShiftStartPopup(false)
    // Clear timer when popup is closed
    if (shiftTimerRef.current) {
      clearInterval(shiftTimerRef.current)
      shiftTimerRef.current = null
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup timer on unmount and when popup closes
  useEffect(() => {
    if (!showShiftStartPopup && shiftTimerRef.current) {
      clearInterval(shiftTimerRef.current)
      shiftTimerRef.current = null
    }
    return () => {
      if (shiftTimerRef.current) {
        clearInterval(shiftTimerRef.current)
      }
    }
  }, [showShiftStartPopup])

  const handleSleepHoursSubmit = () => {
    const hours = parseFloat(sleepHours)
    if (hours > 0 && hours <= 24) {
      setHealthCheckResult(`Sleep quality recorded: ${hours} hours. Baseline updated accordingly.`)
    } else {
      setHealthCheckResult('Please enter a valid number of hours (1-24).')
    }
  }

  useEffect(() => {
    return () => {
      cleanupFaceScan()
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current)
      }
    }
  }, [cleanupFaceScan])

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-8">
     

      {/* Sector Assignment */}
      {sector ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-500">Sector assignment</h3>
              <p className="text-sm text-slate-500">
                Your operational clearance is limited to <span className="text-pearl-primary">{sector.name}</span>. Shift
                group: {sector.shiftGroup}.
              </p>
            </div>
            {backupCandidate ? (
              <div className="rounded-xl border border-pearl-warning/40 bg-pearl-warning/10 px-4 py-3 text-sm text-pearl-warning">
                <p className="font-semibold">Sector backup on standby</p>
                <p>
                  {backupCandidate.name} is rostered as the immediate backup for {sector.name}. A supervisor will notify
                  them if your fatigue indicator turns red.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-900/55 px-4 py-3 text-sm text-slate-500">
                Backup assignment is under review. Contact the supervisor if a substitution is required.
              </div>
            )}
          </div>
          {sector.description ? (
            <p className="mt-4 text-xs text-slate-500">Sector brief: {sector.description}</p>
          ) : null}
        </section>
      ) : null}

    

      {/* Pre-Shift Readiness Sequence */}
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pre-shift readiness sequence</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Good morning, {controller.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Follow the four-step refresh to keep the baseline calibrated before your duty window.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-6 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Readiness</p>
            <p className="mt-2 text-4xl font-semibold text-pearl-primary">
              {readinessScore ? readinessScore.toFixed(2) : '--'}
            </p>
            <p className="text-xs text-slate-500">Baseline synced with today&apos;s metrics</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            {sequence.map((item, index) => {
              const isActive = index === stepIndex
              const isComplete = index < stepIndex || (complete && index === sequence.length - 1)
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    isActive
                      ? 'border-pearl-primary bg-slate-900/65 shadow-lg shadow-sky-500/20'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{item.title}</span>
                    <span className="text-xl">{isComplete ? '✅' : isActive ? '🟢' : '⚪'}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{item.description}</p>
                </div>
              )
            })}
          </aside>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">{step.title}</h3>
              <p className="text-sm text-slate-500">
                Step {stepIndex + 1} of {sequence.length}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-500">{step.description}</p>

            {/* Face Scan Step */}
            {stepIndex === 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-500 italic">
                  Note: Face scan is currently optional. You can skip this step and proceed to the next activity.
                </p>
                {faceScanStatus === 'idle' && (
                  <button
                    onClick={startFaceScan}
                    className="rounded-xl bg-pearl-primary px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                  >
                    Start Face Scan
                  </button>
                )}
                {faceScanStatus === 'capturing' && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/55 aspect-video">
                      <video
                        ref={videoRef}
                        muted
                        playsInline
                        autoPlay
                        className="h-full w-full object-cover"
                        aria-label="Live camera preview"
                      />
                      {!faceScanStreamRef.current && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-slate-500">
                          <p>Initializing camera...</p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">Capturing... Please hold still for 20 seconds.</p>
                    <button
                      onClick={() => {
                        cleanupFaceScan()
                        setFaceScanStatus('idle')
                        setFaceScanResult('')
                      }}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-500 hover:text-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {faceScanStatus === 'completed' && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 text-sm text-slate-500">
                      <p className="font-medium text-pearl-primary">Latest capture</p>
                      <p className="mt-2 text-slate-500">{faceScanResult}</p>
                      <p className="mt-3 text-xs text-slate-500">
                        Media is processed locally and discarded right after the features are refreshed.
                      </p>
                    </div>
                    {faceScanStreamRef.current && (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/55 aspect-video">
                        <video
                          ref={videoRef}
                          muted
                          playsInline
                          autoPlay
                          className="h-full w-full object-cover"
                          aria-label="Camera preview"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Voice Sample Step */}
            {stepIndex === 1 && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
                  <p className="text-sm font-semibold text-slate-500">Please read the following sentence aloud:</p>
                  <p className="mt-3 text-lg text-pearl-primary">
                    &quot;The quick brown fox jumps over the lazy dog while maintaining clear communication protocols.&quot;
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    This sentence helps measure vocal sensitivity and voice-related fatigue factors.
                  </p>
                </div>
                {voiceSampleStatus === 'idle' && (
                  <button
                    onClick={startVoiceSample}
                    className="rounded-xl bg-pearl-primary px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                  >
                    Start Recording
                  </button>
                )}
                {voiceSampleStatus === 'recording' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-pearl-danger"></div>
                      <p className="text-sm text-slate-500">Recording... Please read the sentence above.</p>
                    </div>
                    <button
                      onClick={stopVoiceSample}
                      className="rounded-xl bg-pearl-danger px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-red-600"
                    >
                      Stop Recording
                    </button>
                  </div>
                )}
                {voiceSampleStatus === 'completed' && (
                  <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/55 p-5 text-sm text-slate-500">
                    <p className="font-medium text-pearl-primary">Voice sample processed</p>
                    <p className="mt-2 text-slate-500">{voiceSampleResult}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reaction Time Challenge Step */}
            {stepIndex === 2 && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-500">
                  When the screen turns red, click the button as quickly as possible. The test will end after 2-3 clicks or maximum 30 seconds.
                </p>
                {reactionStatus === 'idle' && (
                  <button
                    onClick={startReactionChallenge}
                    className="rounded-xl bg-pearl-primary px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                  >
                    Start Reaction Challenge
                  </button>
                )}
                {(reactionStatus === 'waiting' || reactionStatus === 'active') && (
                  <div className="space-y-4">
                    <div
                      className={`flex h-64 items-center justify-center rounded-2xl border-4 transition-colors ${
                        currentColor === 'red'
                          ? 'border-pearl-danger bg-pearl-danger/20'
                          : 'border-slate-700 bg-slate-900/55'
                      }`}
                    >
                      <p className={`text-2xl font-bold ${currentColor === 'red' ? 'text-pearl-danger' : 'text-slate-500'}`}>
                        {currentColor === 'red' ? 'CLICK NOW!' : 'Wait for red...'}
                      </p>
                    </div>
                    {currentColor === 'red' && (
                      <button
                        onClick={handleReactionClick}
                        className="w-full rounded-xl bg-pearl-danger px-5 py-4 text-lg font-semibold text-slate-100 transition hover:bg-red-600"
                      >
                        CLICK HERE
                      </button>
                    )}
                  </div>
                )}
                {reactionStatus === 'completed' && (
                  <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/55 p-5 text-sm text-slate-500">
                    <p className="font-medium text-pearl-primary">Reaction challenge completed</p>
                    <p className="mt-2 text-slate-500">{reactionResult}</p>
                  </div>
                )}
              </div>
            )}

            {/* Health Check-In Step */}
            {stepIndex === 3 && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
                  <p className="text-sm font-semibold text-slate-500">How many hours did you sleep?</p>
                  <div className="mt-4 flex gap-3">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      placeholder="Enter hours (e.g., 7.5)"
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-pearl-primary focus:outline-none"
                    />
                    <button
                      onClick={handleSleepHoursSubmit}
                      className="rounded-xl bg-pearl-primary px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                    >
                      Submit
                    </button>
                  </div>
                </div>
                {healthCheckResult && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 text-sm text-slate-500">
                    <p className="font-medium text-pearl-primary">Health check-in recorded</p>
                    <p className="mt-2 text-slate-500">{healthCheckResult}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                ✓ Pre-shift completion stores the updated baseline under your Controller ID for supervisor awareness.
              </p>
              <button
                onClick={handleContinue}
                disabled={
                  (stepIndex === 1 && voiceSampleStatus !== 'completed') ||
                  (stepIndex === 2 && reactionStatus !== 'completed') ||
                  (stepIndex === 3 && !healthCheckResult)
                }
                className="rounded-xl bg-pearl-primary px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stepIndex === sequence.length - 1 ? 'Complete baseline refresh' : 'Proceed to next activity'}
              </button>
            </div>
            {complete ? (
              <div className="mt-6 rounded-2xl border border-pearl-success/60 bg-pearl-success/10 px-4 py-3 text-sm text-pearl-success">
                Baseline Updated — Readiness {readinessScore?.toFixed(2)} (Green). You&apos;re ready for duty.
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {/* Shift Start Popup */}
      {showShiftStartPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClosePopup}>
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-pearl-primary/60 bg-slate-900/95 p-8 shadow-2xl ring-2 ring-pearl-primary/30" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={handleClosePopup}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pearl-primary/20">
                  <span className="text-4xl">🚀</span>
                </div>
              </div>
              
              <h2 className="text-3xl font-semibold text-slate-100 mb-2">
                {isOnBreak ? 'Break Time' : `Shift ${currentShift} - Let's Begin!`}
              </h2>
              
              <p className="text-lg text-slate-300 mb-6">
                {isOnBreak 
                  ? 'Take a well-deserved break. Rest, hydrate, and recharge.'
                  : currentShift === 1
                  ? 'Welcome to your first shift! You\'re ready to start your work.'
                  : `Starting shift ${currentShift} of 4. You've got this!`}
              </p>

              {/* Countdown Timer */}
              <div className="mb-6">
                <div className="inline-flex flex-col items-center rounded-2xl border-2 border-pearl-primary/40 bg-slate-800/80 px-8 py-6">
                  <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">
                    {isOnBreak ? 'Break Time Remaining' : 'Shift Time Remaining'}
                  </p>
                  <p className="text-5xl font-mono font-bold text-pearl-primary">
                    {formatTime(isOnBreak ? breakTimeRemaining : shiftTimeRemaining)}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    {isOnBreak 
                      ? 'Next shift starts automatically when break ends'
                      : `Shift ${currentShift} of 4 • ${currentShift < 4 ? 'Break coming soon' : 'Final shift'}`}
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4].map((shiftNum) => (
                    <div
                      key={shiftNum}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        shiftNum < currentShift
                          ? 'bg-pearl-success'
                          : shiftNum === currentShift
                          ? isOnBreak
                            ? 'bg-pearl-warning animate-pulse'
                            : 'bg-pearl-primary'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {isOnBreak 
                    ? `Break between shift ${currentShift - 1} and ${currentShift}`
                    : `Working on shift ${currentShift} of 4`}
                </p>
              </div>

              {/* Supportive Messages */}
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-4">
                <p className="text-sm text-slate-300">
                  {isOnBreak
                    ? '💧 Stay hydrated • 🧘 Take deep breaths • ⏸️ Rest your mind'
                    : currentShift === 1
                    ? '✨ You\'re well-prepared • 🎯 Stay focused • 💪 You\'ve got this'
                    : '🔄 Keep the momentum • 🎯 Maintain focus • 💪 You\'re doing great'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleStartShift}
                  className="flex-1 rounded-xl bg-pearl-primary px-6 py-3 text-lg font-semibold text-slate-950 transition hover:bg-pearl-primary/90 shadow-lg"
                >
                  {isOnBreak ? 'Continue Break' : currentShift === 1 ? 'Start My First Shift' : `Start Shift ${currentShift}`}
                </button>
                <button
                  onClick={handleClosePopup}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 text-lg font-semibold text-slate-300 transition hover:bg-slate-700/50"
                >
                  Close
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {isOnBreak 
                  ? 'Take your time to rest. The next shift will begin automatically.'
                  : 'PEARL will automatically track your shifts and breaks. You can close this and continue to your dashboard.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
