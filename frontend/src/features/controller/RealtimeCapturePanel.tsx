import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type CaptureStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error'

const statusCopy: Record<CaptureStatus, string> = {
  idle: 'Ready to request camera and microphone access.',
  requesting: 'Awaiting permission from the device…',
  granted:
    'Live capture active. Edge AI consumes blink, yawn, and tone cues locally while only derived metrics leave the browser.',
  denied:
    'Access denied. PEARL cannot refresh the real-time indicators without camera and microphone input. Review browser settings.',
  unsupported: 'Media access is not supported in this browser.',
  error: 'An unexpected error occurred while opening the capture stream.',
}

export function RealtimeCapturePanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CaptureStatus>(() => (supportsMedia() ? 'idle' : 'unsupported'))
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const statusMessage = useMemo(() => {
    if (status === 'error' && error) return `${statusCopy[status]} (${error})`
    return statusCopy[status]
  }, [status, error])

  const requestAccess = useCallback(async () => {
    if (!supportsMedia()) {
      setStatus('unsupported')
      return
    }

    setStatus('requesting')
    setError(null)
    try {
      const capture = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })
      setStream(capture)
      setStatus('granted')

      if (videoRef.current) {
        videoRef.current.srcObject = capture
        await videoRef.current.play().catch(() => {
          setStatus('error')
          setError('Unable to start video playback.')
        })
      }
    } catch (err) {
      console.error('PEARL media permission error', err)
      const message = err instanceof Error ? err.message : 'Permission request failed.'
      setError(message)
      setStatus(message.toLowerCase().includes('denied') ? 'denied' : 'error')
      cleanupStream(stream)
      setStream(null)
    }
  }, [stream])

  const stopCapture = useCallback(() => {
    cleanupStream(stream)
    setStream(null)
    if (supportsMedia()) {
      setStatus('idle')
    }
  }, [stream])

  useEffect(() => {
    return () => {
      cleanupStream(stream)
    }
  }, [stream])

  const indicatorColor =
    status === 'granted'
      ? 'text-pearl-success'
      : status === 'requesting'
        ? 'text-pearl-warning'
        : status === 'denied' || status === 'error'
          ? 'text-pearl-danger'
          : 'text-slate-400'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Live capture interface</h3>
          <p className="text-sm text-slate-400">
            Grant camera and microphone access so the Edge AI module can continuously refresh blink, yawn, and tone
            baselines. Prototype analytics still stream from mock data while validating hardware permissions.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={requestAccess}
            className="rounded-xl border border-pearl-primary/60 px-4 py-2 text-xs font-semibold text-pearl-primary hover:border-pearl-primary"
            disabled={status === 'requesting' || status === 'granted' || status === 'unsupported'}
          >
            {status === 'requesting' ? 'Requesting…' : status === 'granted' ? 'Active' : 'Start capture'}
          </button>
          <button
            type="button"
            onClick={stopCapture}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
            disabled={!stream}
          >
            Stop
          </button>
        </div>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,360px)_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
            aria-label="Live camera preview"
          />
          {!stream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-center text-sm text-slate-400">
              <span className={`text-lg font-semibold ${indicatorColor}`}>
                {status === 'granted'
                  ? 'Capturing…'
                  : status === 'requesting'
                    ? 'Request pending…'
                    : status === 'denied'
                      ? 'Permission denied'
                      : status === 'unsupported'
                        ? 'Unsupported'
                        : 'Camera preview'}
              </span>
              <span className="max-w-[220px]">
                {status === 'idle'
                  ? 'Press “Start capture” to activate the sensor overlay.'
                  : statusMessage}
              </span>
            </div>
          ) : null}
        </div>
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <p className={`text-xs uppercase tracking-[0.25em] ${indicatorColor}`}>Status</p>
            <p className="mt-2 text-base text-slate-200">{statusMessage}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Simulation link</p>
            <p className="mt-2 text-slate-200">
              Mock fatigue scores continue to stream every 5 seconds, mimicking what the Edge AI inference would
              contribute once the sensor feed is live.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              When integrated, only derived metrics (blink cadence, pause ratio, tone stability) are stored under your
              Controller ID; raw media stays on the workstation.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Privacy reminder</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
              <li>Permission can be revoked anytime from this panel or browser settings.</li>
              <li>Media tracks shut down instantly when you press “Stop”.</li>
              <li>No video or audio leaves the control center network during simulation.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function supportsMedia() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

function cleanupStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      // ignore
    }
  })
}

