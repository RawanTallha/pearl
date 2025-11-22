import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, CartesianGrid, YAxis, XAxis } from 'recharts'
import PearlLogo from '@media/PearlLogo.png'

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

interface CameraFeed {
  id: number
  name: string
  status: CameraStatus
  stream: MediaStream | null
  videoElement: HTMLVideoElement | null
  detections: {
    eyesClosed: boolean
    yawning: boolean
    droopyEyelids: boolean
    droopyFace: boolean
    confidence: number
  }
  metrics: {
    perclos: number
    fom: number
    blinkRate: number
    yawnCount: number
  }
  detectionInterval?: ReturnType<typeof setInterval>
}

export function MonitoringDemo() {
  const navigate = useNavigate()
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ]

  const [cameras, setCameras] = useState<CameraFeed[]>([
    {
      id: 1,
      name: 'Camera 1 - Primary View',
      status: 'idle',
      stream: null,
      videoElement: null,
      detections: { eyesClosed: false, yawning: false, droopyEyelids: false, droopyFace: false, confidence: 0 },
      metrics: { perclos: 0, fom: 0, blinkRate: 0, yawnCount: 0 },
    },
    {
      id: 2,
      name: 'Camera 2 - Side View',
      status: 'idle',
      stream: null,
      videoElement: null,
      detections: { eyesClosed: false, yawning: false, droopyEyelids: false, droopyFace: false, confidence: 0 },
      metrics: { perclos: 0, fom: 0, blinkRate: 0, yawnCount: 0 },
    },
    {
      id: 3,
      name: 'Camera 3 - Top View',
      status: 'idle',
      stream: null,
      videoElement: null,
      detections: { eyesClosed: false, yawning: false, droopyEyelids: false, droopyFace: false, confidence: 0 },
      metrics: { perclos: 0, fom: 0, blinkRate: 0, yawnCount: 0 },
    },
    {
      id: 4,
      name: 'Camera 4 - Wide Angle',
      status: 'idle',
      stream: null,
      videoElement: null,
      detections: { eyesClosed: false, yawning: false, droopyEyelids: false, droopyFace: false, confidence: 0 },
      metrics: { perclos: 0, fom: 0, blinkRate: 0, yawnCount: 0 },
    },
  ])

  // Voice monitoring state
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'requesting' | 'listening' | 'error'>('idle')
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveformRef = useRef<number[]>([])
  const [voiceMetrics, setVoiceMetrics] = useState({
    fatigueIndex: 0.25,
    correlation: 0.85,
    speechRate: 120,
    toneStability: 0.92,
  })

  // Other monitoring factors
  const [reactionTime, setReactionTime] = useState(0.85)
  const [sleepHours] = useState(6.5) // Sleep hours set at pre-shift, constant during shift
  const [shiftDuration, setShiftDuration] = useState(2.5)
  const [historyScore, setHistoryScore] = useState(0.80)

  // Simulate gradual changes in monitoring factors
  useEffect(() => {
    const interval = setInterval(() => {
      setReactionTime((prev) => Math.max(0.5, Math.min(1.5, prev + (Math.random() - 0.5) * 0.05)))
      setShiftDuration((prev) => prev + 0.01) // Gradually increase shift duration
      setHistoryScore((prev) => Math.max(0.5, Math.min(1, prev + (Math.random() - 0.5) * 0.02)))
      // Sleep hours remain constant during shift (set once at pre-shift)
    }, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Chart data for voice analysis
  const [voiceChartData, setVoiceChartData] = useState<Array<{ time: string; fatigue: number; correlation: number }>>([])

  // Initialize waveform
  useEffect(() => {
    waveformRef.current = new Array(160).fill(0)
  }, [])

  // Start camera feed
  const startCamera = useCallback(async (cameraId: number) => {
    setCameras((prev) => prev.map((c) => (c.id === cameraId ? { ...c, status: 'requesting' } : c)))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })

      const videoRef = videoRefs[cameraId - 1]
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameras((prev) =>
        prev.map((c) => {
          if (c.id === cameraId) {
            return {
              ...c,
              status: 'active',
              stream,
              videoElement: videoRef.current,
            }
          }
          return c
        }),
      )

      // Simulate YOLO detections
      simulateYOLODetections(cameraId)
    } catch (err) {
      console.error('Camera access error:', err)
      setCameras((prev) => prev.map((c) => (c.id === cameraId ? { ...c, status: 'error' } : c)))
    }
  }, [])

  // Simulate YOLO model detections
  const simulateYOLODetections = useCallback((cameraId: number) => {
    const interval = setInterval(() => {
      setCameras((prev) =>
        prev.map((c) => {
          if (c.id === cameraId && c.status === 'active') {
            const random = Math.random()
            return {
              ...c,
              detections: {
                eyesClosed: random < 0.15,
                yawning: random < 0.1,
                droopyEyelids: random < 0.2,
                droopyFace: random < 0.12,
                confidence: 0.4 + Math.random() * 0.5,
              },
              metrics: {
                perclos: Math.min(1, c.metrics.perclos + (random < 0.3 ? 0.01 : -0.005)),
                fom: Math.min(1, c.metrics.fom + (random < 0.25 ? 0.01 : -0.005)),
                blinkRate: Math.max(0, c.metrics.blinkRate + (random < 0.5 ? 0.5 : -0.3)),
                yawnCount: c.metrics.yawnCount + (random < 0.05 ? 1 : 0),
              },
            }
          }
          return c
        }),
      )
    }, 1000)

    // Store interval ID for cleanup
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === cameraId) {
          return { ...c, detectionInterval: interval }
        }
        return c
      }),
    )
  }, [])

  // Stop camera feed
  const stopCamera = useCallback((cameraId: number) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === cameraId) {
          if (c.detectionInterval) {
            clearInterval(c.detectionInterval)
          }
          c.stream?.getTracks().forEach((track) => track.stop())
          const videoRef = videoRefs[cameraId - 1]
          if (videoRef.current) {
            videoRef.current.srcObject = null
          }
          return { ...c, status: 'idle', stream: null, videoElement: null }
        }
        return c
      }),
    )
  }, [])

  // Start voice monitoring
  const startVoiceMonitoring = useCallback(async () => {
    setVoiceStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setVoiceStream(stream)

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      setVoiceStatus('listening')
      updateVoiceMetrics()
    } catch (err) {
      console.error('Microphone access error:', err)
      setVoiceStatus('error')
    }
  }, [])

  // Update voice metrics
  const updateVoiceMetrics = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const buffer = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(buffer)

    // Simulate voice analysis metrics
    const now = new Date()
    const timeStr = now.toLocaleTimeString()
    const correlation = 0.7 + Math.random() * 0.25
    const fatigueIndex = 1 - correlation

    setVoiceMetrics({
      fatigueIndex,
      correlation,
      speechRate: 110 + Math.random() * 20,
      toneStability: 0.85 + Math.random() * 0.1,
    })

    setVoiceChartData((prev) => {
      const newData = [...prev, { time: timeStr, fatigue: fatigueIndex, correlation }]
      return newData.slice(-30) // Keep last 30 data points
    })

    // Update waveform
    const waveform = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(waveform)
    waveformRef.current = Array.from(waveform).slice(0, 160).map((v) => (v - 128) / 128)
  }, [])

  // Start voice metrics update loop
  useEffect(() => {
    if (voiceStatus === 'listening' && analyserRef.current) {
      const interval = setInterval(updateVoiceMetrics, 1000)
      return () => clearInterval(interval)
    }
  }, [voiceStatus, updateVoiceMetrics])

  // Stop voice monitoring
  const stopVoiceMonitoring = useCallback(() => {
    voiceStream?.getTracks().forEach((track) => track.stop())
    setVoiceStream(null)
    analyserRef.current = null
    setVoiceStatus('idle')
  }, [voiceStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameras.forEach((cam) => {
        cam.stream?.getTracks().forEach((track) => track.stop())
        if (cam.detectionInterval) {
          clearInterval(cam.detectionInterval)
        }
      })
      voiceStream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameras, voiceStream])

  // Calculate overall fatigue score
  const overallFatigue = useMemo(() => {
    const avgPerclos = cameras.reduce((sum, c) => sum + c.metrics.perclos, 0) / cameras.length
    const avgFom = cameras.reduce((sum, c) => sum + c.metrics.fom, 0) / cameras.length
    const voiceWeight = voiceMetrics.fatigueIndex
    const reactionWeight = 1 - reactionTime
    const historyWeight = 1 - historyScore

    return Number(
      Math.min(
        100,
        (avgPerclos * 0.3 + avgFom * 0.3 + voiceWeight * 0.2 + reactionWeight * 0.1 + historyWeight * 0.1) * 100,
      ).toFixed(1),
    )
  }, [cameras, voiceMetrics, reactionTime, historyScore])

  const fatigueLevel = useMemo(() => {
    const score = parseFloat(overallFatigue.toString())
    if (score < 30) return { level: 'Normal', color: 'text-pearl-success' }
    if (score < 60) return { level: 'Monitor', color: 'text-pearl-warning' }
    return { level: 'High Fatigue', color: 'text-pearl-danger' }
  }, [overallFatigue])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2c] via-[#1b2540] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between rounded-2xl bg-slate-900/70 p-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-4">
              <img src={PearlLogo} alt="PEARL" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">Monitoring & Analysis Demo</h1>
                <p className="text-sm text-slate-500">Technical showcase for mentors and programmers</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-pearl-primary hover:text-pearl-primary transition-all"
            >
              Back to Landing
            </button>
          </header>

          {/* Overall Fatigue Score */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg font-semibold text-slate-500 mb-4">Overall Fatigue Assessment</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Fatigue Score</p>
                <p className={`mt-2 text-5xl font-bold ${fatigueLevel.color}`}>{overallFatigue}</p>
                <p className={`mt-2 text-sm font-semibold ${fatigueLevel.color}`}>{fatigueLevel.level}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-4">Monitoring Factors</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vision Analysis</span>
                    <span className="text-slate-100">
                      {(cameras.reduce((sum, c) => sum + c.metrics.perclos, 0) / cameras.length).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voice Analysis</span>
                    <span className="text-slate-100">{(voiceMetrics.fatigueIndex * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reaction Time</span>
                    <span className="text-slate-100">{reactionTime.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">History Score</span>
                    <span className="text-slate-100">{(historyScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-4">Shift Context</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shift Duration</span>
                    <span className="text-slate-100">{shiftDuration.toFixed(1)} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sleep Hours</span>
                    <span className="text-slate-100">{sleepHours.toFixed(1)} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Cameras</span>
                    <span className="text-slate-100">{cameras.filter((c) => c.status === 'active').length}/4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voice Status</span>
                    <span className="text-slate-100">{voiceStatus === 'listening' ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4 Camera Sections with YOLO Detection */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-500">YOLO Model Detection - 4 Camera Feeds</h2>
                <p className="text-sm text-slate-500">Real-time vision analysis with YOLO model inference</p>
              </div>
              <button
                onClick={() => {
                  cameras.forEach((cam) => {
                    if (cam.status === 'active') stopCamera(cam.id)
                    else startCamera(cam.id)
                  })
                }}
                className="rounded-xl border border-slate-400 bg-transparent px-4 py-2 text-sm font-semibold text-pearl-primary transition hover:bg-pearl-primary/10"
              >
                {cameras.every((c) => c.status === 'active') ? 'Stop All' : 'Start All'}
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {cameras.map((camera) => (
                <div key={camera.id} className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">{camera.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => (camera.status === 'active' ? stopCamera(camera.id) : startCamera(camera.id))}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          camera.status === 'active'
                            ? 'bg-pearl-danger/20 text-pearl-danger border border-pearl-danger/40'
                            : 'bg-pearl-success/20 text-pearl-success border border-pearl-success/40'
                        }`}
                      >
                        {camera.status === 'active' ? 'Stop' : 'Start'}
                      </button>
                    </div>
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                    {camera.status === 'active' && videoRefs[camera.id - 1].current ? (
                      <video
                        ref={videoRefs[camera.id - 1]}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-900/80 text-slate-500">
                        {camera.status === 'requesting' ? 'Requesting access...' : 'Camera feed inactive'}
                      </div>
                    )}
                    {/* YOLO Detection Overlay */}
                    {camera.status === 'active' && (
                      <div className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs">
                        <div className="flex gap-2">
                          {camera.detections.eyesClosed && (
                            <span className="text-pearl-warning">👁️ Eyes Closed</span>
                          )}
                          {camera.detections.yawning && <span className="text-pearl-danger">😴 Yawning</span>}
                          {camera.detections.droopyEyelids && (
                            <span className="text-pearl-warning">Droopy Eyelids</span>
                          )}
                          {camera.detections.droopyFace && <span className="text-pearl-danger">Droopy Face</span>}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Confidence: {(camera.detections.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Metrics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">PERCLOS</p>
                      <p className="text-slate-100">{camera.metrics.perclos.toFixed(3)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">FOM</p>
                      <p className="text-slate-100">{camera.metrics.fom.toFixed(3)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">Blink Rate</p>
                      <p className="text-slate-100">{camera.metrics.blinkRate.toFixed(1)}/min</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">Yawn Count</p>
                      <p className="text-slate-100">{camera.metrics.yawnCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Voice Analysis Model */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-500">Voice Analysis Model</h2>
                <p className="text-sm text-slate-500">Real-time voice pattern analysis and fatigue detection</p>
              </div>
              <button
                onClick={voiceStatus === 'listening' ? stopVoiceMonitoring : startVoiceMonitoring}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  voiceStatus === 'listening'
                    ? 'border-pearl-danger bg-pearl-danger/20 text-pearl-danger'
                    : 'border-slate-400 bg-transparent text-pearl-primary hover:bg-pearl-primary/10'
                }`}
              >
                {voiceStatus === 'listening' ? 'Stop Monitoring' : 'Start Voice Analysis'}
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Voice Metrics */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-500">Voice Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Fatigue Index</p>
                      <p className="text-2xl font-semibold text-slate-100">
                        {(voiceMetrics.fatigueIndex * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Correlation</p>
                      <p className="text-2xl font-semibold text-slate-100">{voiceMetrics.correlation.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Speech Rate</p>
                      <p className="text-2xl font-semibold text-slate-100">{voiceMetrics.speechRate.toFixed(0)} WPM</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Tone Stability</p>
                      <p className="text-2xl font-semibold text-slate-100">{voiceMetrics.toneStability.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                {/* Waveform */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-500">Audio Waveform</h3>
                  <div className="h-24 w-full">
                    <svg className="h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="none">
                      <polyline
                        points={waveformRef.current
                          .map((val, i) => `${(i / waveformRef.current.length) * 160},${50 - val * 40}`)
                          .join(' ')}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Voice Chart */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-500">Fatigue Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={voiceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis stroke="#64748b" domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12 }}
                      />
                      <Line type="monotone" dataKey="fatigue" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="correlation" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Other Monitoring Factors */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="mb-6 text-lg font-semibold text-slate-500">Additional Monitoring Factors</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reaction Time</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">{reactionTime.toFixed(2)}s</p>
                <p className="mt-2 text-xs text-slate-500">Response delay measurement</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Sleep Hours</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">{sleepHours.toFixed(1)}h</p>
                <p className="mt-2 text-xs text-slate-500">Pre-shift sleep duration</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Shift Duration</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">{shiftDuration.toFixed(1)}h</p>
                <p className="mt-2 text-xs text-slate-500">Current shift time</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">History Score</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">{(historyScore * 100).toFixed(0)}%</p>
                <p className="mt-2 text-xs text-slate-500">Historical performance</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs text-slate-500">Al-Dana Team LRR</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

