import { useEffect, useState, useMemo } from 'react'
import { subscribeToSimulation } from '../../services/simulationService'
import { fetchLiveFrame } from '../../services/dataService'
import type { FatigueSnapshot } from '../../types'
import { useSessionStore } from '../../store/useSessionStore'

const statusStyles: Record<FatigueSnapshot['status'], string> = {
  Normal: 'bg-pearl-success/20 text-pearl-success border border-pearl-success/40',
  Monitor: 'bg-pearl-warning/20 text-pearl-warning border border-pearl-warning/40',
  'High Fatigue': 'bg-pearl-danger/20 text-pearl-danger border border-pearl-danger/40',
}

export function ControllerDashboard() {
  const controller = useSessionStore((state) => state.controller)
  const [snapshot, setSnapshot] = useState<FatigueSnapshot | null>(null)

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

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-8">
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

