import { useMemo } from 'react'
import type { ControllerProfile, ShiftSummary } from '../../types'

interface FatigueWeeklyReportPopupProps {
  isOpen: boolean
  onClose: () => void
  controllerId: string
  controllerName: string
  date: string
  summaries: ShiftSummary[]
  controllers: ControllerProfile[]
  timeRange: { from: Date; to: Date }
  selectedControllerIds: string[]
}

const FATIGUE_THRESHOLD = 0.7 // 70% fatigue threshold

// Helper function to get week range from a date
function getWeekRange(dateString: string): { start: Date; end: Date } {
  const date = new Date(dateString)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Get Monday (or Sunday if it's Sunday)
  const start = new Date(date)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function FatigueWeeklyReportPopup({
  isOpen,
  onClose,
  controllerId,
  controllerName,
  date,
  summaries,
  controllers: _controllers,
  timeRange,
  selectedControllerIds: _selectedControllerIds,
}: FatigueWeeklyReportPopupProps) {
  const reportData = useMemo(() => {
    if (!isOpen || !date) return null

    // Section 1: Selected week details
    const weekRange = getWeekRange(date)
    const weekSummaries = summaries.filter((summary) => {
      const summaryDate = new Date(summary.shiftDate)
      return (
        summary.controllerId === controllerId &&
        summaryDate >= weekRange.start &&
        summaryDate <= weekRange.end
      )
    })

    const weekNearFatigueEvents = weekSummaries
      .filter((summary) => summary.peakFatigue >= FATIGUE_THRESHOLD)
      .map((summary) => ({
        date: summary.shiftDate,
        fatigueScore: Number((summary.peakFatigue * 100).toFixed(1)),
        notes: summary.notes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Section 2: Full range summary
    const fullRangeSummaries = summaries.filter((summary) => {
      const summaryDate = new Date(summary.shiftDate)
      return (
        summary.controllerId === controllerId &&
        summaryDate >= timeRange.from &&
        summaryDate <= timeRange.to
      )
    })

    const fullRangeNearFatigueEvents = fullRangeSummaries
      .filter((summary) => summary.peakFatigue >= FATIGUE_THRESHOLD)
      .map((summary) => ({
        date: summary.shiftDate,
        fatigueScore: Number((summary.peakFatigue * 100).toFixed(1)),
        notes: summary.notes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const maxFatigueScore = fullRangeSummaries.length > 0
      ? Math.max(...fullRangeSummaries.map((s) => s.peakFatigue * 100))
      : 0

    const avgFatigueScore = fullRangeSummaries.length > 0
      ? fullRangeSummaries.reduce((sum, s) => sum + s.peakFatigue * 100, 0) / fullRangeSummaries.length
      : 0

    return {
      weekRange,
      weekSummaries,
      weekNearFatigueEvents,
      weekCount: weekNearFatigueEvents.length,
      fullRangeSummaries,
      fullRangeNearFatigueEvents,
      fullRangeCount: fullRangeNearFatigueEvents.length,
      maxFatigueScore: Number(maxFatigueScore.toFixed(1)),
      avgFatigueScore: Number(avgFatigueScore.toFixed(1)),
    }
  }, [isOpen, controllerId, date, summaries, timeRange])

  const handleExportPDF = () => {
    if (!reportData) return

    // Create HTML content for PDF
    const weekStart = reportData.weekRange.start.toLocaleDateString()
    const weekEnd = reportData.weekRange.end.toLocaleDateString()
    const rangeStart = timeRange.from.toLocaleDateString()
    const rangeEnd = timeRange.to.toLocaleDateString()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Fatigue Report - ${controllerName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #1e293b;
              background: white;
            }
            h1 {
              color: #0f172a;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 {
              color: #334155;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 5px;
            }
            .meta {
              margin-bottom: 20px;
              padding: 10px;
              background: #f1f5f9;
              border-radius: 8px;
            }
            .meta p {
              margin: 5px 0;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 12px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background: #1e293b;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .summary-box {
              background: #f1f5f9;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            }
            .summary-box p {
              margin: 5px 0;
              font-size: 14px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #cbd5e1;
              font-size: 11px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Fatigue Report for ${controllerName}</h1>
          <div class="meta">
            <p><strong>Controller:</strong> ${controllerName} (${controllerId})</p>
            <p><strong>Selected Week:</strong> ${weekStart} to ${weekEnd}</p>
            <p><strong>Full Date Range:</strong> ${rangeStart} to ${rangeEnd}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <h2>Section 1: Selected Week Details</h2>
          <div class="summary-box">
            <p><strong>Near-fatigue events in selected week:</strong> ${reportData.weekCount}</p>
          </div>
          ${reportData.weekNearFatigueEvents.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fatigue Score %</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.weekNearFatigueEvents.map(
                  (event: { date: string; fatigueScore: number; notes?: string }) => `
                  <tr>
                    <td>${event.date}</td>
                    <td>${event.fatigueScore}</td>
                    <td>${event.notes || '-'}</td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          ` : '<p>No near-fatigue events recorded during this week.</p>'}

          <h2>Section 2: Full Range Summary</h2>
          <div class="summary-box">
            <p><strong>Total near-fatigue events in full range:</strong> ${reportData.fullRangeCount}</p>
            <p><strong>Maximum fatigue score:</strong> ${reportData.maxFatigueScore}%</p>
            <p><strong>Average fatigue score:</strong> ${reportData.avgFatigueScore}%</p>
          </div>
          ${reportData.fullRangeNearFatigueEvents.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fatigue Score %</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.fullRangeNearFatigueEvents.map(
                  (event: { date: string; fatigueScore: number; notes?: string }) => `
                  <tr>
                    <td>${event.date}</td>
                    <td>${event.fatigueScore}</td>
                    <td>${event.notes || '-'}</td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          ` : '<p>No near-fatigue events recorded during the full selected range.</p>'}

          <div class="footer">
            <p>Report generated by Pearl Fatigue Management System</p>
          </div>
        </body>
      </html>
    `

    // Open print dialog for PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    }
  }

  if (!isOpen || !reportData) return null

  const weekStart = reportData.weekRange.start.toLocaleDateString()
  const weekEnd = reportData.weekRange.end.toLocaleDateString()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-slate-950/70 border-l-2 border-slate-600/60 shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/80 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-slate-100">
            Fatigue report for {controllerName}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-900/50 hover:text-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Selected Week Details */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-500">
              Section 1: Selected Week Details (Week of {weekStart} to {weekEnd})
            </h3>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 mb-4">
              <p className="text-sm text-slate-500">
                <strong className="text-slate-100">{controllerName}</strong> approached the fatigue threshold{' '}
                <strong className="text-pearl-warning">{reportData.weekCount} time{reportData.weekCount !== 1 ? 's' : ''}</strong> during
                this week.
              </p>
            </div>

            {reportData.weekNearFatigueEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/70 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Fatigue Score</th>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-500">
                    {reportData.weekNearFatigueEvents.map((event: { date: string; fatigueScore: number; notes?: string }, index: number) => (
                      <tr key={index} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3">{event.date}</td>
                        <td className="px-4 py-3 font-semibold text-pearl-warning">{event.fatigueScore}%</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{event.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
                <p className="text-sm text-slate-500">No near-fatigue events recorded during this week.</p>
              </div>
            )}
          </div>

          {/* Section 2: Full Range Summary */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-500">
              Section 2: Summary for Full Selected Range ({timeRange.from.toLocaleDateString()} to {timeRange.to.toLocaleDateString()})
            </h3>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 mb-4">
              <div className="space-y-2 text-sm text-slate-500">
                <p>
                  <strong className="text-slate-100">Total near-fatigue events in full range:</strong>{' '}
                  <strong className="text-pearl-warning">{reportData.fullRangeCount}</strong>
                </p>
                <p>
                  <strong className="text-slate-100">Maximum fatigue score:</strong>{' '}
                  <strong className="text-pearl-warning">{reportData.maxFatigueScore}%</strong>
                </p>
                <p>
                  <strong className="text-slate-100">Average fatigue score:</strong>{' '}
                  <strong className="text-slate-500">{reportData.avgFatigueScore}%</strong>
                </p>
              </div>
            </div>

            {reportData.fullRangeNearFatigueEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/70 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Fatigue Score</th>
                      <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-500">
                    {reportData.fullRangeNearFatigueEvents.map((event: { date: string; fatigueScore: number; notes?: string }, index: number) => (
                      <tr key={index} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3">{event.date}</td>
                        <td className="px-4 py-3 font-semibold text-pearl-warning">{event.fatigueScore}%</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{event.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
                <p className="text-sm text-slate-500">No near-fatigue events recorded during the full selected range.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="sticky bottom-0 border-t border-slate-700 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-slate-700 hover:text-slate-100"
            >
              Close
            </button>
            <button
              onClick={handleExportPDF}
              className="rounded-xl bg-pearl-primary px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-300"
            >
              Export report as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
