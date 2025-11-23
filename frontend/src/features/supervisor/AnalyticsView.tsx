import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchShiftSummaries, fetchControllers } from '../../services/dataService'
import { FatigueEmployeeFilters } from './FatigueEmployeeFilters'
import { FatigueEmployeeChart } from './FatigueEmployeeChart'
import { FatigueWeeklyReportPopup } from './FatigueWeeklyReportPopup'
import { exportToCSV, exportToPDF } from './exportUtils'

const heatmapSlots = [
  { label: 'Morning', multiplier: 0.85 },
  { label: 'Afternoon', multiplier: 0.95 },
  { label: 'Evening', multiplier: 1.05 },
  { label: 'Night', multiplier: 1.34 },
]

export function AnalyticsView() {
  const { data: summaries } = useQuery({
    queryKey: ['shift-summaries', 'all'],
    queryFn: () => fetchShiftSummaries(),
  })

  const { data: controllers } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => fetchControllers(),
  })

  // Filter state
  const [timeRange, setTimeRange] = useState(() => {
    const now = new Date()
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last month
    return { from, to: now }
  })

  const [selectedControllerIds, setSelectedControllerIds] = useState<string[]>(() => {
    // Will be set after controllers load
    return []
  })

  // Track if we've initialized controllers (to prevent re-selecting when user deselects all)
  const hasInitialized = useRef(false)

  // Popup state
  const [popupState, setPopupState] = useState<{
    isOpen: boolean
    controllerId: string
    controllerName: string
    date: string
  }>({
    isOpen: false,
    controllerId: '',
    controllerName: '',
    date: '',
  })

  // Initialize selected controllers only once when controllers first load
  useEffect(() => {
    if (controllers && !hasInitialized.current && selectedControllerIds.length === 0) {
      setSelectedControllerIds(controllers.map((c) => c.id))
      hasInitialized.current = true
    }
  }, [controllers, selectedControllerIds.length])

  const chartData = useMemo(() => {
    if (!summaries) return []
    return summaries
      .filter((item) => {
        const itemDate = new Date(item.shiftDate)
        return itemDate >= timeRange.from && itemDate <= timeRange.to
      })
      .map((item) => ({
        date: item.shiftDate,
        peakFatigue: Number((item.peakFatigue * 100).toFixed(1)),
        postShiftDelta: Number((item.postShiftDelta * 100).toFixed(1)),
      }))
  }, [summaries, timeRange])

  const handlePointClick = (controllerId: string, date: string) => {
    const controller = controllers?.find((c) => c.id === controllerId)
    if (controller) {
      setPopupState({
        isOpen: true,
        controllerId,
        controllerName: controller.name,
        date,
      })
    }
  }

  const handleExportCSV = () => {
    if (!summaries || !controllers) return
    exportToCSV(summaries, controllers, selectedControllerIds, timeRange)
  }

  const handleExportPDF = () => {
    if (!summaries || !controllers) return
    exportToPDF(summaries, controllers, selectedControllerIds, timeRange)
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl bg-slate-900/70 p-6 animate-in fade-in slide-in-from-top-2 duration-500">
        <h2 className="text-2xl font-semibold text-slate-100">Monthly analytics preview</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fatigue patterns and trends. Export reports as CSV or PDF.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Fatigue peak timeline</h3>
            <p className="text-sm text-slate-500">
              Peak fatigue and end-of-shift patterns.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportCSV}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-pearl-primary hover:text-pearl-primary hover:bg-pearl-primary/10 transition-all transform hover:scale-105"
            >
              Export CSV
            </button>
            <button 
              onClick={handleExportPDF}
              className="rounded-xl border border-slate-400 bg-pearl-primary px-4 py-2 text-xs font-semibold text-white hover:bg-sky-300 transition-all transform hover:scale-105 shadow-lg shadow-pearl-primary/30"
            >
              Export PDF
            </button>
          </div>
        </div>
        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="peakFatigue" stroke="#38bdf8" fill="url(#colorPeak)" name="Peak fatigue %" />
              <Area
                type="monotone"
                dataKey="postShiftDelta"
                stroke="#f97316"
                fill="url(#colorDelta)"
                name="Post shift delta %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* New Per-Employee Fatigue Analytics Section */}
      {summaries && controllers && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Per-employee fatigue peaks</h3>
              <p className="text-sm text-slate-500">
                Individual controller trends. Double-click for details.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-pearl-primary hover:text-pearl-primary hover:bg-pearl-primary/10 transition-all transform hover:scale-105"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="rounded-xl border border-slate-400 bg-pearl-primary px-4 py-2 text-xs font-semibold text-white hover:bg-sky-300 transition-all transform hover:scale-105 shadow-lg shadow-pearl-primary/30"
                >
                Export PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6">
            <FatigueEmployeeFilters
              controllers={controllers}
              selectedControllerIds={selectedControllerIds}
              onControllerChange={setSelectedControllerIds}
              timeRange={timeRange}
              onTimeRangeChange={(from, to) => setTimeRange({ from, to })}
            />
          </div>

          {/* Chart */}
          <div className="mt-6">
            <FatigueEmployeeChart
              summaries={summaries}
              controllers={controllers}
              selectedControllerIds={selectedControllerIds}
              timeRange={timeRange}
              onPointClick={handlePointClick}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
        <h3 className="text-lg font-semibold text-slate-500">Shift-based fatigue multiplier</h3>
        <p className="mt-2 text-sm text-slate-500">
          Shift strain analysis. Night operations show higher fatigue load.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {heatmapSlots.map((slot) => (
            <div key={slot.label} className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{slot.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-100 transition-transform hover:scale-105">{slot.multiplier.toFixed(2)}x</p>
              <p className="mt-2 text-xs text-slate-500">Relative to baseline mornings.</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/55 p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-sm text-slate-500">
            <strong className="text-slate-100">Recommendation:</strong> rotate every 90 minutes on night shifts; hydration reminders at 60 minutes.
          </p>
        </div>
      </section>

      {/* Drill-down Popup */}
      {summaries && controllers && (
        <FatigueWeeklyReportPopup
          isOpen={popupState.isOpen}
          onClose={() => setPopupState({ isOpen: false, controllerId: '', controllerName: '', date: '' })}
          controllerId={popupState.controllerId}
          controllerName={popupState.controllerName}
          date={popupState.date}
          summaries={summaries}
          controllers={controllers}
          timeRange={timeRange}
          selectedControllerIds={selectedControllerIds}
        />
      )}
    </div>
  )
}

