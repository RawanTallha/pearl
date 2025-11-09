import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchControllers, fetchSupervisorActions, getSimulationFrame } from '../../services/dataService'
import { subscribeToSimulation } from '../../services/simulationService'
import type { FatigueSnapshot } from '../../types'

const statusBadge: Record<FatigueSnapshot['status'], string> = {
  Normal: 'bg-pearl-success/15 text-pearl-success border border-pearl-success/40',
  Monitor: 'bg-pearl-warning/20 text-pearl-warning border border-pearl-warning/40',
  'High Fatigue': 'bg-pearl-danger/25 text-pearl-danger border border-pearl-danger/40',
}

export function SupervisorDashboard() {
  const { data: controllers } = useQuery({
    queryKey: ['controllers'],
    queryFn: fetchControllers,
  })

  const { data: actions } = useQuery({
    queryKey: ['supervisor-actions'],
    queryFn: fetchSupervisorActions,
  })

  const [frames, setFrames] = useState<FatigueSnapshot[]>(() => getSimulationFrame(0))

  useEffect(() => subscribeToSimulation(setFrames), [])

  const combined = useMemo(() => {
    if (!controllers) return []
    return controllers.map((controller) => ({
      controller,
      snapshot: frames.find((frame) => frame.controllerId === controller.id) ?? null,
    }))
  }, [controllers, frames])

  const activeAlerts = combined.filter((row) => row.snapshot?.status === 'High Fatigue')

  return (
    <div className="space-y-8">
      <header className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Controllers online</p>
          <p className="mt-2 text-4xl font-semibold text-slate-100">{controllers?.length ?? 0}</p>
          <p className="mt-2 text-sm text-slate-400">Each controller runs PEARL locally with synchronized database.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active alerts</p>
          <p className="mt-2 text-4xl font-semibold text-pearl-warning">{activeAlerts.length}</p>
          <p className="mt-2 text-sm text-slate-400">Alerts trigger micro-break suggestions once score crosses 0.70.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent interventions</p>
          <p className="mt-2 text-4xl font-semibold text-slate-100">{actions?.length ?? 0}</p>
          <p className="mt-2 text-sm text-slate-400">Every decision is logged for accountability and analytics.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-200">Live monitoring dashboard</h2>
          <p className="text-sm text-slate-400">
            Data updates every 5 seconds via the on-premise Edge AI stream. No raw media leaves the workstation.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Controller</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Fatigue Score</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Key Factors</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {combined.map(({ controller, snapshot }) => (
                <tr key={controller.id} className="hover:bg-slate-900/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-100">{controller.name}</div>
                    <div className="text-xs text-slate-500">{controller.id}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-lg">
                    {snapshot ? snapshot.score.toFixed(2) : <span className="text-slate-500">--</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${snapshot ? statusBadge[snapshot.status] : ''}`}>
                      {snapshot?.status ?? 'Waiting'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {snapshot ? (
                      <ul className="space-y-1">
                        {snapshot.factors.map((factor) => (
                          <li key={factor.label} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="font-medium text-slate-200">{factor.label}:</span> {factor.value}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">Awaiting stream…</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {snapshot?.recommendation ?? 'Listening for AI advisory…'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-lg font-semibold text-slate-200">Trend focus</h3>
          <p className="mt-2 text-sm text-slate-400">
            Select a controller to open their shift trend, baseline drift, and recommendation log. In the prototype the
            following snapshot is pre-loaded for Rawan&apos;s alert.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">Rawan • 0.73 (Red)</span> — Blink increase and two yawns
              detected. Suggested micro-break pending confirmation.
            </p>
            <button className="mt-4 rounded-xl bg-pearl-danger/20 px-4 py-2 text-xs font-semibold text-pearl-danger hover:bg-pearl-danger/30">
              Approve break notification
            </button>
            <button className="mt-2 rounded-xl border border-slate-700/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600">
              Delay and monitor 10 minutes
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-lg font-semibold text-slate-200">Latest supervisor actions</h3>
          <ul className="mt-4 space-y-4 text-sm text-slate-300">
            {actions?.map((action) => (
              <li key={action.id} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{action.createdAt}</p>
                <p className="mt-2 text-slate-100">{action.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Controller ID: <span className="font-mono text-slate-300">{action.controllerId}</span>
                </p>
              </li>
            )) ?? <li className="text-xs text-slate-500">No actions logged yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}

