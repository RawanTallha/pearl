import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, CartesianGrid, YAxis, XAxis } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { fetchControllerById } from '../../services/dataService'
import { processFrameWithYOLO } from '../../services/yoloService'
import type { ControllerProfile } from '../../types'
import PearlLogo from '@media/PearlLogo.png'

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

interface CameraFeed {
  id: number
  name: string
  status: CameraStatus
  stream: MediaStream | null
  detections: {
    eyesClosed: boolean
    yawning: boolean
    droopyEyelids: boolean
    droopyFace: boolean
    confidence: number
    detectedClasses: string[]
  }
  metrics: {
    perclos: number
    fom: number
    blinkRate: number
    yawnCount: number
  }
  detectionInterval?: ReturnType<typeof setInterval>
}


export function ControllerMonitoringPage() {
  const { controllerId } = useParams<{ controllerId: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: controller } = useQuery({
    queryKey: ['controller', controllerId],
    queryFn: () => (controllerId ? fetchControllerById(controllerId) : null),
    enabled: !!controllerId,
  })

  const [camera, setCamera] = useState<CameraFeed>({
    id: 1,
    name: 'Primary Camera',
    status: 'idle',
    stream: null,
    detections: { eyesClosed: false, yawning: false, droopyEyelids: false, droopyFace: false, confidence: 0, detectedClasses: [] },
    metrics: { perclos: 0, fom: 0, blinkRate: 0, yawnCount: 0 },
  })

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

  const [voiceChartData, setVoiceChartData] = useState<Array<{ time: string; fatigue: number; correlation: number }>>([])

  // Initialize waveform
  useEffect(() => {
    waveformRef.current = new Array(160).fill(0)
  }, [])

  // Process frame through YOLO
  const processFrame = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      // Check if video is ready
      if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        return null
      }

      const canvas = canvasRef.current
      if (!canvas) return null

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null

      // Set canvas size to match video
      const width = videoElement.videoWidth
      const height = videoElement.videoHeight
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, width, height)

      // Convert canvas to blob and send to YOLO service
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      })

      if (!blob) return null

      // Call YOLO service (currently simulated, replace with actual API)
      return await processFrameWithYOLO(blob, 1)
    } catch (error) {
      console.error('Error processing frame:', error)
      return null
    }
  }, [])

  // Start camera feed with YOLO processing
  const startCamera = useCallback(async () => {
    setCamera((prev) => ({ ...prev, status: 'requesting' }))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        setCamera((prev) => ({ ...prev, status: 'error' }))
        return
      }

      // Set stream and wait for video to be ready
      video.srcObject = stream
      
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          resolve()
        }
        const onError = () => {
          video.removeEventListener('error', onError)
          reject(new Error('Video load error'))
        }
        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onError)
      })

      // Start playing
      try {
        await video.play()
      } catch (playError) {
        console.error('Video play error:', playError)
        stream.getTracks().forEach((track) => track.stop())
        setCamera((prev) => ({ ...prev, status: 'error' }))
        return
      }

      // Update camera state
      setCamera((prev) => ({
        ...prev,
        status: 'active',
        stream,
      }))

      // Process frames with YOLO
      const processFrameLoop = async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2 || video.paused || video.ended) {
          return
        }

        try {
          const detection = await processFrame(video)
          if (detection) {
            setCamera((prev) => {
              if (prev.status === 'active' && prev.stream) {
                return {
                  ...prev,
                  detections: {
                    eyesClosed: detection.eyesClosed,
                    yawning: detection.yawning,
                    droopyEyelids: detection.droopyEyelids,
                    droopyFace: detection.droopyFace,
                    confidence: detection.confidence,
                    detectedClasses: detection.detectedClasses,
                  },
                  metrics: {
                    perclos: detection.perclos,
                    fom: detection.fom,
                    blinkRate: detection.blinkRate,
                    yawnCount: detection.yawnCount,
                  },
                }
              }
              return prev
            })
          }
        } catch (error) {
          console.error('Frame processing error:', error)
        }
      }

      // Process frames every 500ms
      const interval = setInterval(processFrameLoop, 500)
      setCamera((prev) => ({ ...prev, detectionInterval: interval }))
    } catch (err) {
      console.error('Camera access error:', err)
      setCamera((prev) => ({ ...prev, status: 'error' }))
    }
  }, [processFrame])

  // Stop camera feed
  const stopCamera = useCallback(() => {
    setCamera((prev) => {
      // Clear interval first
      if (prev.detectionInterval) {
        clearInterval(prev.detectionInterval)
      }
      
      // Stop all tracks
      if (prev.stream) {
        prev.stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
      
      // Clear video element
      const video = videoRef.current
      if (video) {
        video.srcObject = null
        video.pause()
      }
      
      return { ...prev, status: 'idle', stream: null, detectionInterval: undefined }
    })
  }, [])

  // Voice monitoring
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
    } catch (err) {
      console.error('Microphone access error:', err)
      setVoiceStatus('error')
    }
  }, [])

  const updateVoiceMetrics = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
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
      return newData.slice(-30)
    })

    const waveform = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(waveform)
    waveformRef.current = Array.from(waveform).slice(0, 160).map((v) => (v - 128) / 128)
  }, [])

  useEffect(() => {
    if (voiceStatus === 'listening' && analyserRef.current) {
      const interval = setInterval(updateVoiceMetrics, 1000)
      return () => clearInterval(interval)
    }
  }, [voiceStatus, updateVoiceMetrics])

  const stopVoiceMonitoring = useCallback(() => {
    voiceStream?.getTracks().forEach((track) => track.stop())
    setVoiceStream(null)
    analyserRef.current = null
    setVoiceStatus('idle')
  }, [voiceStream])

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Cleanup camera
      const currentCamera = camera
      if (currentCamera.detectionInterval) {
        clearInterval(currentCamera.detectionInterval)
      }
      if (currentCamera.stream) {
        currentCamera.stream.getTracks().forEach((track) => track.stop())
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = null
      }
      
      // Cleanup voice
      if (voiceStream) {
        voiceStream.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on unmount

  // Calculate overall fatigue
  const overallFatigue = useMemo(() => {
    const perclos = camera.metrics.perclos
    const fom = camera.metrics.fom
    const voiceWeight = voiceMetrics.fatigueIndex
    return Number(Math.min(100, (perclos * 0.4 + fom * 0.4 + voiceWeight * 0.2) * 100).toFixed(1))
  }, [camera, voiceMetrics])

  const fatigueLevel = useMemo(() => {
    const score = overallFatigue
    if (score < 30) return { level: 'Normal', color: 'text-pearl-success' }
    if (score < 60) return { level: 'Monitor', color: 'text-pearl-warning' }
    return { level: 'High Fatigue', color: 'text-pearl-danger' }
  }, [overallFatigue])

  if (!controller) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading controller...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2c] via-[#1b2540] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between rounded-2xl bg-slate-900/70 p-6">
            <div className="flex items-center gap-4">
              <img src={PearlLogo} alt="PEARL" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">
                  Monitoring Demo - {controller.name}
                </h1>
                <p className="text-sm text-slate-500">{controller.id} • {controller.sectorName}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/demo')}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-pearl-primary hover:text-pearl-primary transition-all"
            >
              Back to Controllers
            </button>
          </header>

          {/* Overall Fatigue Score */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold text-slate-500 mb-4">Overall Fatigue Assessment</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Fatigue Score</p>
                <p className={`mt-2 text-5xl font-bold ${fatigueLevel.color}`}>{overallFatigue}</p>
                <p className={`mt-2 text-sm font-semibold ${fatigueLevel.color}`}>{fatigueLevel.level}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-4">Vision Metrics</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">PERCLOS</span>
                    <span className="text-slate-100">{camera.metrics.perclos.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">FOM</span>
                    <span className="text-slate-100">{camera.metrics.fom.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-4">Voice Metrics</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fatigue Index</span>
                    <span className="text-slate-100">{(voiceMetrics.fatigueIndex * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Correlation</span>
                    <span className="text-slate-100">{voiceMetrics.correlation.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Camera Section with YOLO Detection */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-500">YOLO Model Detection</h2>
                <p className="text-sm text-slate-500">Real-time vision analysis with YOLO model inference</p>
              </div>
              <button
                onClick={() => (camera.status === 'active' ? stopCamera() : startCamera())}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  camera.status === 'active'
                    ? 'border-pearl-danger bg-pearl-danger/20 text-pearl-danger'
                    : 'border-slate-400 bg-transparent text-pearl-primary hover:bg-pearl-primary/10'
                }`}
              >
                {camera.status === 'active' ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">{camera.name}</h3>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {camera.status !== 'active' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-slate-500">
                      {camera.status === 'requesting' ? 'Requesting access...' : 'Camera feed inactive'}
                    </div>
                  )}
                  {/* YOLO Detection Overlay */}
                  {camera.status === 'active' && (
                    <div className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs">
                      <div className="flex flex-wrap gap-2">
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
              </div>
              {/* Metrics */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-slate-500">Vision Metrics</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">PERCLOS</p>
                      <p className="text-lg font-semibold text-slate-100">{camera.metrics.perclos.toFixed(3)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">FOM</p>
                      <p className="text-lg font-semibold text-slate-100">{camera.metrics.fom.toFixed(3)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">Blink Rate</p>
                      <p className="text-lg font-semibold text-slate-100">{camera.metrics.blinkRate.toFixed(1)}/min</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/55 p-2">
                      <p className="text-slate-400">Yawn Count</p>
                      <p className="text-lg font-semibold text-slate-100">{camera.metrics.yawnCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Voice Analysis Model */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
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

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs text-slate-500">Al-Dana Team LRR</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

