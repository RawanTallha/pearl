import { useMemo, useRef } from 'react'
import type { MouseEvent } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DotProps } from 'recharts'
import type { ControllerProfile, ShiftSummary } from '../../types'

interface FatigueEmployeeChartProps {
  summaries: ShiftSummary[]
  controllers: ControllerProfile[]
  selectedControllerIds: string[]
  timeRange: { from: Date; to: Date }
  onPointClick?: (controllerId: string, date: string) => void
}

const COLORS = [
  '#38bdf8', // sky-400
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
]

// Custom tooltip that shows per-controller information
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 shadow-lg">
        <p className="mb-2 text-sm font-semibold text-slate-500">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            className="mb-1 rounded px-2 py-1 text-xs"
            style={{ color: entry.color }}
          >
            <span className="font-semibold">{entry.name}:</span> {entry.value !== null ? `${entry.value}%` : '—'}
          </div>
        ))}
        <p className="mt-2 text-xs text-slate-500">Double-click a point to view details</p>
      </div>
    )
  }
  return null
}

export function FatigueEmployeeChart({
  summaries,
  controllers,
  selectedControllerIds,
  timeRange,
  onPointClick,
}: FatigueEmployeeChartProps) {
  // Track clicks for double-click detection
  const clickTrackerRef = useRef<Map<string, number>>(new Map())

  const handlePointClick = (controllerId: string, date: string) => {
    const key = `${controllerId}-${date}`
    const now = Date.now()
    const lastClickTime = clickTrackerRef.current.get(key) || 0

    if (now - lastClickTime < 300) {
      // Double-click detected
      onPointClick?.(controllerId, date)
      clickTrackerRef.current.delete(key)
    } else {
      // First click - store timestamp
      clickTrackerRef.current.set(key, now)
      // Clean up after timeout
      setTimeout(() => {
        clickTrackerRef.current.delete(key)
      }, 300)
    }
  }

  const chartData = useMemo(() => {
    // Filter summaries by time range
    const filtered = summaries.filter((summary) => {
      const summaryDate = new Date(summary.shiftDate)
      return summaryDate >= timeRange.from && summaryDate <= timeRange.to
    })

    // Group by date, then by controller
    const byDate = new Map<string, Map<string, number>>()

    filtered.forEach((summary) => {
      if (!selectedControllerIds.includes(summary.controllerId)) return

      const date = summary.shiftDate
      if (!byDate.has(date)) {
        byDate.set(date, new Map())
      }
      const dateMap = byDate.get(date)!
      dateMap.set(summary.controllerId, Number((summary.peakFatigue * 100).toFixed(1)))
    })

    // Convert to array format for recharts - one entry per date with all controller values
    const dates = Array.from(byDate.keys()).sort()
    return dates.map((date) => {
      const dateMap = byDate.get(date)!
      const entry: Record<string, string | number | null> = { date }
      
      // Add each selected controller's value (or null if no data for that date)
      selectedControllerIds.forEach((controllerId) => {
        entry[controllerId] = dateMap.get(controllerId) ?? null
      })
      
      return entry
    })
  }, [summaries, controllers, selectedControllerIds, timeRange])

  const visibleControllers = controllers.filter((c) => selectedControllerIds.includes(c.id))

  if (chartData.length === 0 || visibleControllers.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/55">
        <p className="text-sm text-slate-500">
          {visibleControllers.length === 0 ? 'No controllers selected' : 'No data available for the selected time range'}
        </p>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" stroke="#64748b" />
          <YAxis stroke="#64748b" domain={[0, 100]} label={{ value: 'Fatigue Peak %', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {visibleControllers.map((controller, index) => {
            const color = COLORS[index % COLORS.length]
            
            return (
              <Line
                key={controller.id}
                type="monotone"
                dataKey={controller.id}
                name={controller.name}
                stroke={color}
                strokeWidth={2}
                dot={(props: DotProps & { payload?: Record<string, unknown> }) => {
                  const { cx, cy, payload } = props
                  const value = payload ? (payload[controller.id] as number | null | undefined) : null

                  if (value === null || value === undefined) {
                    return <></>
                  }

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      cursor="pointer"
                      onClick={(event: MouseEvent<SVGCircleElement>) => {
                        event.stopPropagation()
                        const date = payload?.date as string | undefined
                        if (date) {
                          handlePointClick(controller.id, date)
                        }
                      }}
                      className="hover:opacity-80 transition-opacity"
                    />
                  )
                }}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
