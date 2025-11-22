import { useEffect, useState, useMemo } from 'react'
import { subscribeToSimulation } from '../../services/simulationService'
import { fetchLiveFrame } from '../../services/dataService'
import type { FatigueSnapshot } from '../../types'
import { useSessionStore } from '../../store/useSessionStore'
import { useShiftStore } from '../../store/useShiftStore'

const statusStyles: Record<FatigueSnapshot['status'], string> = {
  Normal: 'bg-pearl-success/20 text-pearl-success border border-pearl-success/40',
  Monitor: 'bg-pearl-warning/20 text-pearl-warning border border-pearl-warning/40',
  'High Fatigue': 'bg-pearl-danger/20 text-pearl-danger border border-pearl-danger/40',
}

export function ControllerDashboard() {
  const controller = useSessionStore((state) => state.controller)
  const [snapshot, setSnapshot] = useState<FatigueSnapshot | null>(null)
  
  // Shift tracking
  const {
    currentShift,
    status: shiftStatus,
    shiftTimeRemaining,
    breakTimeRemaining,
    isOnBreak,
    updateTimer,
  } = useShiftStore()

  useEffect(() => {
    if (!controller) return

    let mounted = true
    fetchLiveFrame()
      .then((frames) => {
        if (!mounted) return
        const initial = frames.find((frame) => frame.controllerId === controller.id) ?? null
        if (initial) {
          setSnapshot(initial)
        }
      })
      .catch((error) => console.error('Failed to load live frame', error))

    const unsubscribe = subscribeToSimulation((frames) => {
      if (!mounted) return
      const match = frames.find((frame) => frame.controllerId === controller.id)
      if (match) {
        setSnapshot(match)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [controller])

  const baselineFactors = useMemo(() => controller?.baselineFactors, [controller])

  // Update shift timer every second
  useEffect(() => {
    // Update immediately on mount if shift is active
    if (shiftStatus === 'active' || shiftStatus === 'break') {
      updateTimer()
      
      const interval = setInterval(() => {
        updateTimer()
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [shiftStatus, updateTimer])

  // Format time helper
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Shift Timer */}
      {(shiftStatus === 'active' || shiftStatus === 'break') && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-500">
                {isOnBreak ? 'Break Time' : `Shift ${currentShift} of 4`}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isOnBreak
                  ? 'Take a well-deserved break. Rest, hydrate, and recharge.'
                  : `Working on shift ${currentShift} of 4`}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-pearl-primary/40 bg-slate-800/80 px-8 py-6 text-center">
              <p className="text-sm uppercase tracking-wider text-slate-400 mb-2">
                {isOnBreak ? 'Break Time Remaining' : 'Shift Time Remaining'}
              </p>
              <p className="text-5xl font-mono font-bold text-pearl-primary">
                {formatTime(isOnBreak ? breakTimeRemaining : shiftTimeRemaining)}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {isOnBreak
                  ? 'Next shift starts automatically when break ends'
                  : currentShift < 4
                  ? 'Break coming soon'
                  : 'Final shift'}
              </p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-6">
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
            <p className="mt-2 text-center text-sm text-slate-400">
              {isOnBreak
                ? `Break between shift ${currentShift - 1} and ${currentShift}`
                : `Working on shift ${currentShift} of 4`}
            </p>
          </div>
        </section>
      )}

      {/* Current Fatigue Indicator - Merged with Baseline and Sector */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Current Fatigue Indicator */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-500">Current Fatigue Indicator</h2>
          <p className="mt-1 text-sm text-slate-500">
            Continuous monitoring.
          </p>
          {snapshot ? (
            <div className="mt-6 flex flex-col gap-4">
              <div className={`w-fit rounded-full px-6 py-2 text-base font-semibold ${statusStyles[snapshot.status]}`}>
                {snapshot.status === 'Normal' ? '🟢 Normal' : snapshot.status === 'Monitor' ? '🟡 Monitor' : '🔴 High Fatigue'}
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Personal readiness</p>
                <p className="mt-2 text-4xl font-semibold text-slate-100">{snapshot.readinessLevel.toFixed(2)}</p>
                <p className="mt-2 text-sm text-slate-500">Recalibrated baseline.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {snapshot.factors.map((factor) => (
                  <div key={factor.label} className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{factor.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">{factor.value}</p>
                    <p className="text-xs text-slate-500">
                      Trend:{' '}
                      {factor.trend === 'up' ? '↑' : factor.trend === 'down' ? '↓' : '→'} {factor.trend ?? 'steady'}
                    </p>
                  </div>
                ))}
              </div>

              {snapshot.recommendation ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/55 px-4 py-3 text-sm text-slate-500">
                  {snapshot.recommendation}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/55 px-4 py-8 text-center text-sm text-slate-500">
              Awaiting first capture from the Edge AI module…
            </div>
          )}
        </div>

        {/* Baseline Snapshot */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-500">Baseline snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">
            Baseline reminder.
          </p>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Baseline readiness</p>
              <p className="mt-2 text-4xl font-semibold text-slate-100">{controller.baselineReadiness.toFixed(2)}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Blink rate</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-100">{baselineFactors?.blinkRate ?? 0} / min</dd>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Speech rate</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-100">{baselineFactors?.speechRate ?? 0} wpm</dd>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Response delay</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-100">{baselineFactors?.responseDelay ?? 0}s</dd>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Tone stability</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-100">
                  {(baselineFactors?.toneStability ?? 0).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  )
}

