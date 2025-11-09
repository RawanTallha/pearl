import { useMemo, useState } from 'react'
import { useSessionStore } from '../../store/useSessionStore'

const sequence = [
  {
    id: 'face',
    title: 'Face Scan',
    description: '20-second capture tracks blink and yawn frequency using the calibrated camera field of view.',
    result: 'Blink frequency refreshed at 18/min. No yawns detected.',
  },
  {
    id: 'voice',
    title: 'Voice Sample',
    description: 'Recorder prompts a brief phrase to align speech rate and tone baselines for the day.',
    result: 'Speech cadence aligned at 126 wpm. Tone stability variance ±0.03.',
  },
  {
    id: 'reaction',
    title: 'Reaction-Time Challenge',
    description: '60-second cognitive reflex test monitors alertness by measuring response delays.',
    result: 'Average response delay 0.92s, within your optimum band.',
  },
  {
    id: 'health',
    title: 'Health Check-in',
    description: 'Quick self-report for sleep quality, hydration, and any medication updates.',
    result: 'Sleep quality 4/5. No medication changes flagged.',
  },
]

export function PreShiftWizard() {
  const controller = useSessionStore((state) => state.controller)
  const [stepIndex, setStepIndex] = useState(0)
  const [complete, setComplete] = useState(false)

  const step = sequence[stepIndex]

  const readinessScore = useMemo(() => {
    if (!controller) return null
    if (!complete) return controller.baselineReadiness
    return Math.min(1, controller.baselineReadiness + 0.02)
  }, [controller, complete])

  const handleContinue = () => {
    if (stepIndex < sequence.length - 1) {
      setStepIndex((prev) => prev + 1)
    } else {
      setComplete(true)
    }
  }

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-900/80 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pre-shift readiness sequence</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">Good morning, {controller.name}</h2>
          <p className="mt-2 text-sm text-slate-400">
            Follow the four-step refresh to keep the baseline calibrated before your duty window.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950 px-6 py-4 text-right">
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
                    ? 'border-pearl-primary bg-slate-900/70 shadow-lg shadow-sky-500/20'
                    : 'border-slate-800 bg-slate-950/60'
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

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-100">{step.title}</h3>
            <p className="text-sm text-slate-500">
              Step {stepIndex + 1} of {sequence.length}
            </p>
          </div>
          <p className="mt-3 text-sm text-slate-400">{step.description}</p>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <p className="font-medium text-pearl-primary">Latest capture</p>
            <p className="mt-2 text-slate-200">{step.result}</p>
            <p className="mt-3 text-xs text-slate-500">
              Media is processed locally and discarded right after the features are refreshed.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              ✓ Pre-shift completion stores the updated baseline under your Controller ID for supervisor awareness.
            </p>
            <button
              onClick={handleContinue}
              className="rounded-xl bg-pearl-primary px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              {stepIndex === sequence.length - 1 ? 'Complete baseline refresh' : 'Proceed to next activity'}
            </button>
          </div>
          {complete ? (
            <div className="mt-6 rounded-2xl border border-pearl-success/60 bg-pearl-success/10 px-4 py-3 text-sm text-pearl-success">
              Baseline Updated — Readiness {readinessScore?.toFixed(2)} (Green). You’re ready for duty.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

