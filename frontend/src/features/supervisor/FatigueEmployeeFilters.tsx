import { useState, useRef, useEffect } from 'react'
import type { ControllerProfile } from '../../types'

interface FatigueEmployeeFiltersProps {
  controllers: ControllerProfile[]
  selectedControllerIds: string[]
  onControllerChange: (ids: string[]) => void
  timeRange: { from: Date; to: Date }
  onTimeRangeChange: (from: Date, to: Date) => void
}

export function FatigueEmployeeFilters({
  controllers,
  selectedControllerIds,
  onControllerChange,
  timeRange,
  onTimeRangeChange,
}: FatigueEmployeeFiltersProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date(timeRange.from)
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    const date = new Date(timeRange.to)
    return date.toISOString().split('T')[0]
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking on a button inside the dropdown
      if (target.closest('button') && dropdownRef.current?.contains(target)) {
        return
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleControllerToggle = (controllerId: string) => {
    if (selectedControllerIds.includes(controllerId)) {
      onControllerChange(selectedControllerIds.filter((id) => id !== controllerId))
    } else {
      onControllerChange([...selectedControllerIds, controllerId])
    }
  }

  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onControllerChange(controllers.map((c) => c.id))
  }

  const handleDeselectAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onControllerChange([])
    // Keep dropdown open so user can see all controllers are now unchecked
  }

  const handleApplyDateRange = () => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
      onTimeRangeChange(from, to)
    }
  }

  const getControllerSummary = () => {
    if (selectedControllerIds.length === 0) {
      return 'No controllers selected'
    }
    if (selectedControllerIds.length === controllers.length) {
      return 'All controllers selected'
    }
    return `${selectedControllerIds.length} selected`
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between">
      {/* Time Range Filter - Simplified */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Time Range</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
          />
          <button
            onClick={handleApplyDateRange}
            className="rounded-xl border border-slate-400 bg-pearl-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-300"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Controller Filter - Compact Dropdown */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Controllers</label>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex min-w-[180px] items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-700 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
          >
            <span>{getControllerSummary()}</span>
            <svg
              className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div 
              className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-950/70 shadow-xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="max-h-64 overflow-y-auto p-2">
                {/* Select All / Deselect All Buttons */}
                <div className="mb-2 flex gap-2 border-b border-slate-700 pb-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    disabled={selectedControllerIds.length === controllers.length}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-900/60 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    disabled={selectedControllerIds.length === 0}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-900/60 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deselect All
                  </button>
                </div>
                {/* Controller List with Checkboxes */}
                <div className="space-y-1">
                  {controllers.map((controller) => (
                    <label
                      key={controller.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedControllerIds.includes(controller.id)}
                        onChange={() => handleControllerToggle(controller.id)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900/50 text-pearl-primary focus:ring-2 focus:ring-pearl-primary/30"
                      />
                      <span className="text-xs text-slate-500">{controller.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
