import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchShiftSummaries } from '../../services/dataService'
import { useSessionStore } from '../../store/useSessionStore'

// Supportive and appreciative messages for completed shifts
const appreciationMessages = [
  "Thank you for your dedication and focus throughout this shift.",
  "Your professionalism and attention to detail are truly appreciated.",
  "Well done on completing another successful shift. Your efforts make a difference.",
  "Thank you for maintaining safety and excellence. Rest well.",
  "Your commitment to precision and care is valued. Great work today.",
  "You've handled this shift with skill and composure. Well done.",
  "Thank you for your service. Your vigilance keeps everyone safe.",
  "Outstanding work today. Your expertise and dedication shine through.",
]

export function PostShiftReview() {
  const controller = useSessionStore((state) => state.controller)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  
  const { data: shiftSummaries } = useQuery({
    queryKey: ['shift-summaries', controller?.id],
    queryFn: () => fetchShiftSummaries(controller?.id),
    enabled: Boolean(controller?.id),
  })

  const latestSummary = useMemo(() => shiftSummaries?.[0], [shiftSummaries])
  const hasCompletedShift = Boolean(latestSummary)

  // Rotate appreciation messages every 20 seconds when shift is completed
  useEffect(() => {
    if (!hasCompletedShift) return
    
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % appreciationMessages.length)
    }, 20000) // Change message every 20 seconds

    return () => clearInterval(interval)
  }, [hasCompletedShift])

  // Randomly select initial message when shift is completed
  useEffect(() => {
    if (hasCompletedShift) {
      setCurrentMessageIndex(Math.floor(Math.random() * appreciationMessages.length))
    }
  }, [hasCompletedShift])

  if (!controller) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Shift Complete</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">Thank you for your shift</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your shift summary is saved privately. Rest well and see you next shift.
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <h3 className="text-lg font-semibold text-slate-500">Your Shift</h3>
          {latestSummary ? (
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-xl border border-slate-700 bg-slate-900/55 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Shift Date</p>
                <p className="text-slate-100 font-medium">{latestSummary.shiftDate}</p>
              </div>
              {latestSummary.notes ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/55 px-5 py-4">
                  <p className="text-sm text-slate-300">{latestSummary.notes}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Your shift summary will appear here after completion.</p>
          )}
        </div>

        {hasCompletedShift && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="rounded-2xl border border-pearl-primary/40 bg-pearl-primary/10 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pearl-primary/20">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-slate-100">{appreciationMessages[currentMessageIndex]}</p>
                  <p className="mt-3 text-sm text-slate-300">
                    Your commitment to safety and excellence is recognized. Rest well and see you next shift.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

