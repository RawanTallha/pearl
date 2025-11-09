import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchShiftSummaries } from '../../services/dataService'
import { useSessionStore } from '../../store/useSessionStore'

export function PostShiftReview() {
  const controller = useSessionStore((state) => state.controller)
  const { data: shiftSummaries } = useQuery({
    queryKey: ['shift-summaries', controller?.id],
    queryFn: () => fetchShiftSummaries(controller?.id),
    enabled: Boolean(controller?.id),
  })

  const latestSummary = useMemo(() => shiftSummaries?.[0], [shiftSummaries])

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-900/80 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Post-shift evaluation</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">Shift wrap-up saved privately for you</h2>
          <p className="mt-2 text-sm text-slate-400">
            Compare your end-of-shift metrics with the morning baseline. Only aggregated insights are shared with
            supervisors.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950 px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Logged controller</p>
          <p className="mt-2 text-xl font-semibold text-slate-100">{controller.name}</p>
          <p className="text-xs text-slate-500">{controller.id}</p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-lg font-semibold text-slate-200">Shift summary</h3>
          {latestSummary ? (
            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shift date</span>
                <span>{latestSummary.shiftDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pre-shift readiness</span>
                <span className="font-semibold text-slate-100">{latestSummary.preShiftReadiness.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Peak fatigue</span>
                <span className="font-semibold text-slate-100">{latestSummary.peakFatigue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Post-shift deviation</span>
                <span className="font-semibold text-pearl-warning">+{latestSummary.postShiftDelta.toFixed(2)}</span>
              </div>
              {latestSummary.notes ? (
                <p className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-slate-200">
                  {latestSummary.notes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Run the post-shift check to see the comparison.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-lg font-semibold text-slate-200">Post-shift check-in</h3>
          <p className="mt-3 text-sm text-slate-400">Run the quick trio tests before you hand over the console:</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <strong className="text-slate-100">Face + voice snapshot</strong>{' '}
              <span className="text-slate-400">— detect variance in blink cadence and speech tone.</span>
            </li>
            <li className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <strong className="text-slate-100">Reaction-time wrap-up</strong>{' '}
              <span className="text-slate-400">— confirm no cognitive lag before sign-off.</span>
            </li>
            <li className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <strong className="text-slate-100">Wellness note</strong>{' '}
              <span className="text-slate-400">— flag anything that the supervisor should consider for tomorrow.</span>
            </li>
          </ul>
          <button className="mt-6 w-full rounded-xl bg-pearl-primary px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
            Save post-shift record
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Saved analytics feed into the monthly fatigue heatmap and support supervisor action logs.
          </p>
        </div>
      </section>
    </div>
  )
}

