import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchControllers, fetchSectorRosters, fetchSupervisorActions, fetchLiveFrame } from '../../services/dataService'
import { subscribeToSimulation } from '../../services/simulationService'
import type { ControllerProfile, FatigueSnapshot, SupervisorAction, VoiceFatigueSample } from '../../types'
import { useVoiceFatigueStore } from '../../store/useVoiceFatigueStore'
import { FatigueNotification } from './FatigueNotification'
import { exportSupervisorActionsToCSV, exportSupervisorActionsToPDF } from './exportUtils'

const statusBadge: Record<FatigueSnapshot['status'], string> = {
  Normal: 'bg-pearl-success/15 text-pearl-success border border-pearl-success/40',
  Monitor: 'bg-pearl-warning/20 text-pearl-warning border border-pearl-warning/40',
  'High Fatigue': 'bg-pearl-danger/25 text-pearl-danger border border-pearl-danger/40',
}

export function SupervisorDashboard() {
  const { data: controllers } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => fetchControllers(),
  })

  const { data: sectorRosters } = useQuery({
    queryKey: ['sector-rosters'],
    queryFn: () => fetchSectorRosters(),
  })

  const { data: actions } = useQuery({
    queryKey: ['supervisor-actions'],
    queryFn: () => fetchSupervisorActions(),
  })

  const [frames, setFrames] = useState<FatigueSnapshot[]>([])
  const [selectedSector, setSelectedSector] = useState<string>('ALL')
  const [notifications, setNotifications] = useState<
    Array<{ id: string; controller: ControllerProfile; snapshot: FatigueSnapshot }>
  >([])
  const previousHighFatigueControllers = useRef<Set<string>>(new Set())
  const [assignedBackups, setAssignedBackups] = useState<Map<string, string>>(new Map())
  const [localActions, setLocalActions] = useState<SupervisorAction[]>([])
  const [showDropdownForController, setShowDropdownForController] = useState<string | null>(null)
  const [selectedBackupForController, setSelectedBackupForController] = useState<Map<string, string>>(new Map())
  const [actionsPanelExpanded, setActionsPanelExpanded] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sectorRosterExpanded, setSectorRosterExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchLiveFrame()
      .then((initial) => {
        if (mounted && initial.length > 0) {
          setFrames(initial)
        }
      })
      .catch((error) => {
        console.error('Failed to load initial live frame', error)
      })

    const unsubscribe = subscribeToSimulation((payload) => {
      if (mounted) {
        setFrames(payload)
      }
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const voiceLatest = useVoiceFatigueStore((state) => state.latestByController)
  const voiceAlerts = useVoiceFatigueStore((state) => state.alertLog)

  const combined = useMemo(() => {
    if (!controllers) return []
    return controllers.map((controller) => ({
      controller,
      snapshot: frames.find((frame) => frame.controllerId === controller.id) ?? null,
    }))
  }, [controllers, frames])

  const backupBySector = useMemo(() => {
    const map = new Map<string, string>()
    sectorRosters?.forEach((sector) => {
      const backup = sector.backup[0]
      if (backup) {
        map.set(sector.id, backup.name)
      }
    })
    return map
  }, [sectorRosters])

  const filterOptions = useMemo(
    () =>
      sectorRosters?.map((sector) => ({
        id: sector.id,
        label: `${sector.name} (${sector.shiftGroup})`,
      })) ?? [],
    [sectorRosters],
  )

  const filtered = useMemo(() => {
    if (selectedSector === 'ALL') return combined
    return combined.filter((row) => row.controller.sectorId === selectedSector)
  }, [combined, selectedSector])

  const activeAlerts = filtered.filter((row) => row.snapshot?.status === 'High Fatigue')
  const voiceActiveCount = useMemo(
    () => Object.values(voiceLatest).filter((sample) => Boolean(sample?.alertTriggered)).length,
    [voiceLatest],
  )
  const voiceSummaryRows = useMemo(() => {
    if (!controllers) return []
    return controllers
      .map((controller) => ({
        controller,
        sample: voiceLatest[controller.id],
      }))
      .filter(
        (entry): entry is { controller: ControllerProfile; sample: VoiceFatigueSample } =>
          Boolean(entry.sample),
      )
  }, [controllers, voiceLatest])

  // Monitor for high fatigue controllers and trigger notifications
  useEffect(() => {
    if (!controllers) return

    const currentHighFatigueControllers = new Set<string>()
    const newNotifications: Array<{ id: string; controller: ControllerProfile; snapshot: FatigueSnapshot }> = []

    combined.forEach(({ controller, snapshot }) => {
      if (snapshot?.status === 'High Fatigue') {
        currentHighFatigueControllers.add(controller.id)

        // Only show notification if this controller wasn't in high fatigue before
        if (!previousHighFatigueControllers.current.has(controller.id)) {
          newNotifications.push({
            id: `${controller.id}-${Date.now()}`,
            controller,
            snapshot,
          })
        }
      }
    })

    // Re-add backups for controllers that are no longer in high fatigue
    const controllersThatReturned = Array.from(previousHighFatigueControllers.current).filter(
      (controllerId) => !currentHighFatigueControllers.has(controllerId)
    )
    if (controllersThatReturned.length > 0) {
      setAssignedBackups((prev) => {
        const newMap = new Map(prev)
        controllersThatReturned.forEach((controllerId) => {
          newMap.delete(controllerId)
        })
        return newMap
      })
      // Close dropdown if it was open for a controller that returned
      setShowDropdownForController((prev) => {
        if (prev && controllersThatReturned.includes(prev)) {
          return null
        }
        return prev
      })
      setSelectedBackupForController((prev) => {
        const newMap = new Map(prev)
        controllersThatReturned.forEach((controllerId) => {
          newMap.delete(controllerId)
        })
        return newMap
      })
    }

    // Add new notifications
    if (newNotifications.length > 0) {
      setNotifications((prev) => [...prev, ...newNotifications])
    }

    // Remove notifications for controllers that are no longer in high fatigue
    setNotifications((prev) =>
      prev.filter((notif) => currentHighFatigueControllers.has(notif.controller.id)),
    )

    previousHighFatigueControllers.current = currentHighFatigueControllers
  }, [combined, controllers])

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }, [])

  // Also add a handler to dismiss by controller ID for when backup is already assigned
  const handleDismissNotificationByController = useCallback((controllerId: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.controller.id !== controllerId))
  }, [])

  // Get available backups for a sector (excluding assigned ones)
  const getAvailableBackups = useCallback(
    (sectorId: string): ControllerProfile[] => {
      if (!sectorRosters) return []
      const sector = sectorRosters.find((s) => s.id === sectorId)
      if (!sector) return []
      const assignedBackupIds = Array.from(assignedBackups.values())
      return sector.backup.filter((backup) => !assignedBackupIds.includes(backup.id))
    },
    [sectorRosters, assignedBackups],
  )

  // Handle backup assignment
  const handleNotifyBackup = useCallback((controllerId: string) => {
    setShowDropdownForController(controllerId)
  }, [])

  const handleBackupSelection = useCallback((controllerId: string, backupId: string) => {
    setSelectedBackupForController((prev) => {
      const newMap = new Map(prev)
      newMap.set(controllerId, backupId)
      return newMap
    })
  }, [])

  const handleConfirmBackup = useCallback(
    (controllerId: string) => {
      const backupId = selectedBackupForController.get(controllerId)
      if (!backupId || !controllers || !sectorRosters) return

      const controller = controllers.find((c) => c.id === controllerId)
      const backup = controllers.find((c) => c.id === backupId)
      if (!controller || !backup) return

      // Add to assigned backups
      setAssignedBackups((prev) => {
        const newMap = new Map(prev)
        newMap.set(controllerId, backupId)
        return newMap
      })

      // Add to local actions
      const actionMessage = `Backup assigned for Controller: ${controller.name} (${controller.id}) — Backup: ${backup.name} (${backup.id})`
      const newAction: SupervisorAction = {
        id: `local-${Date.now()}-${controllerId}`,
        controllerId,
        action: 'backup_assigned',
        message: actionMessage,
        createdAt: new Date().toISOString(),
      }
      setLocalActions((prev) => [...prev, newAction])

      // Reset UI state
      setShowDropdownForController(null)
      setSelectedBackupForController((prev) => {
        const newMap = new Map(prev)
        newMap.delete(controllerId)
        return newMap
      })

      // Dismiss notification for this controller
      setNotifications((prev) => prev.filter((notif) => notif.controller.id !== controllerId))
    },
    [selectedBackupForController, controllers, sectorRosters],
  )


  // Combine local actions with API actions
  const allActions = useMemo(() => {
    const apiActions = actions ?? []
    return [...localActions, ...apiActions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [actions, localActions])

  // Export to PDF
  const handleExportPDF = useCallback(() => {
    if (!allActions.length || !controllers) return
    exportSupervisorActionsToPDF(allActions, controllers)
    setShowExportMenu(false)
  }, [allActions, controllers])

  // Export to Excel (CSV)
  const handleExportExcel = useCallback(() => {
    if (!allActions.length || !controllers) return
    exportSupervisorActionsToCSV(allActions, controllers, frames)
    setShowExportMenu(false)
  }, [allActions, controllers, frames])

  // Handle delay action
  const handleDelayMonitoring = useCallback(
    (controllerId: string) => {
      if (!controllers) return

      const controller = controllers.find((c) => c.id === controllerId)
      if (!controller) return

      // Check if a backup is assigned for this controller
      const assignedBackupId = assignedBackups.get(controllerId)
      let actionMessage = `Monitoring delayed 10 minutes for Controller: ${controller.name} (${controller.id})`

      if (assignedBackupId) {
        const backup = controllers.find((c) => c.id === assignedBackupId)
        if (backup) {
          actionMessage += ` — Backup: ${backup.name} (${backup.id})`
        }
      }

      const newAction: SupervisorAction = {
        id: `local-${Date.now()}-${controllerId}-delay`,
        controllerId,
        action: 'delay',
        message: actionMessage,
        createdAt: new Date().toISOString(),
      }
      setLocalActions((prev) => [...prev, newAction])

      // Dismiss notification for this controller
      setNotifications((prev) => prev.filter((notif) => notif.controller.id !== controllerId))
    },
    [controllers, assignedBackups],
  )

  return (
    <>
      <div className="space-y-8">
      <header className="grid gap-6 md:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Controllers online</p>
          <p className="mt-2 text-4xl font-semibold text-slate-100 transition-transform hover:scale-105">{filtered.length}</p>
          <p className="mt-2 text-sm text-slate-500">Active</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-pearl-warning/50 hover:shadow-lg hover:shadow-pearl-warning/20">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active alerts</p>
          <p className="mt-2 text-4xl font-semibold text-pearl-warning transition-transform hover:scale-105">{activeAlerts.length}</p>
          <p className="mt-2 text-sm text-slate-500">Need attention</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-pearl-warning/50 hover:shadow-lg hover:shadow-pearl-warning/20">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Voice fatigue alerts</p>
          <p className="mt-2 text-4xl font-semibold text-pearl-warning transition-transform hover:scale-105">{voiceActiveCount}</p>
          <p className="mt-2 text-sm text-slate-500">Voice detected</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent interventions</p>
          <p className="mt-2 text-4xl font-semibold text-slate-100 transition-transform hover:scale-105">{actions?.length ?? 0}</p>
          <p className="mt-2 text-sm text-slate-500">Today</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80">
          <div className="border-b border-slate-700 px-6 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-500">Controller Status</h2>
                <p className="text-sm text-slate-500">
                  Live monitoring
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Sector</label>
                <select
                  value={selectedSector}
                  onChange={(event) => setSelectedSector(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                >
                  <option value="ALL">All sectors</option>
                  {filterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Controller</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Sector</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Fatigue Score</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-500">
                {filtered.map(({ controller, snapshot }) => {
                  const backupName = backupBySector.get(controller.sectorId)
                  return (
                  <tr key={controller.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{controller.name}</div>
                      <div className="text-xs text-slate-500">{controller.id}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="font-semibold text-slate-500">{controller.sectorName}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">{controller.rosterRole}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-lg">
                      {snapshot ? snapshot.score.toFixed(2) : <span className="text-slate-500">--</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${snapshot ? statusBadge[snapshot.status] : 'bg-slate-800/50 text-slate-500 border border-slate-700'}`}>
                        {snapshot?.status ?? 'Waiting'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>{snapshot?.recommendation ?? 'Awaiting data…'}</div>
                      {snapshot?.status === 'High Fatigue' && backupName ? (
                        <p className="mt-2 rounded-lg border border-pearl-warning/30 bg-pearl-warning/10 px-3 py-2 font-semibold text-pearl-warning">
                          Notify backup: {backupName}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <h3 className="text-lg font-semibold text-slate-500 mb-2">Action Required</h3>
          <p className="text-sm text-slate-500 mb-4">
            Immediate attention needed
          </p>
          {notifications.length > 0 ? (
            <FatigueNotification 
              notifications={notifications} 
              onDismiss={handleDismissNotification}
              onNotifyBackup={handleNotifyBackup}
              onDelayMonitoring={handleDelayMonitoring}
              availableBackups={getAvailableBackups}
              assignedBackups={assignedBackups}
              showDropdownForController={showDropdownForController}
              selectedBackupForController={selectedBackupForController}
              onBackupSelection={handleBackupSelection}
              onConfirmBackup={handleConfirmBackup}
              onDismissByController={handleDismissNotificationByController}
            />
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
              <p className="text-sm text-slate-500">No controllers require immediate action.</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-500">Latest supervisor actions</h3>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="rounded-lg border border-slate-700 bg-slate-900/55 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-pearl-primary hover:text-pearl-primary hover:bg-pearl-primary/10 transition-all transform hover:scale-105"
              >
                Export
              </button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-20 rounded-xl border border-slate-700 bg-slate-950/70 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-900/50 hover:text-pearl-primary transition-colors"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-900/50 hover:text-pearl-primary border-t border-slate-700 transition-colors"
                    >
                      Export as Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="relative mt-4">
            <ul
              className={`space-y-4 text-sm text-slate-500 ${
                actionsPanelExpanded && allActions.length > 2 ? 'max-h-[600px] overflow-y-auto pr-2' : ''
              }`}
            >
              {allActions.length > 0 ? (
                (actionsPanelExpanded ? allActions : allActions.slice(0, 2)).map((action) => (
                  <li key={action.id} className="rounded-xl border border-slate-700 bg-slate-900/55 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-slate-100">{action.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Controller ID: <span className="font-mono text-slate-500">{action.controllerId}</span>
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-500">No actions logged yet.</li>
              )}
            </ul>
            {!actionsPanelExpanded && allActions.length > 2 && (
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={() => setActionsPanelExpanded(true)}
                  className="rounded-lg bg-slate-900/50/90 backdrop-blur-sm p-2 text-slate-500 hover:text-slate-500 hover:bg-slate-900/60/90 transition-colors shadow-lg"
                  title="Show all actions"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}
            {actionsPanelExpanded && allActions.length > 2 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setActionsPanelExpanded(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-700 hover:text-slate-500"
                >
                  Show less
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {false && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-slate-500">Voice Monitoring</h3>
            <p className="mt-2 text-sm text-slate-500">
              Current voice fatigue status for all controllers
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/65 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Controller</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Fatigue</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-500">
                  {voiceSummaryRows.length > 0 ? (
                    voiceSummaryRows.map(({ controller, sample }) => (
                      <tr key={controller.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{controller.name}</div>
                          <div className="text-xs text-slate-500">{controller.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            sample?.alertTriggered 
                              ? 'bg-pearl-warning/20 text-pearl-warning border border-pearl-warning/40' 
                              : 'bg-pearl-success/20 text-pearl-success border border-pearl-success/40'
                          }`}>
                            {sample?.alertTriggered ? '⚠️ Alert' : '✓ Normal'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-semibold ${sample?.alertTriggered ? 'text-pearl-warning' : 'text-slate-500'}`}>
                          {sample ? `${Math.round(sample.fatigueIndex * 100)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {sample
                            ? new Date(sample.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-xs text-slate-500">
                        No voice samples recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {false && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-slate-500">Voice alert feed</h3>
            <p className="mt-2 text-sm text-slate-500">Most recent reminders sent to controllers (hydration/stretch) or escalated to supervisors.</p>
            <ul className="mt-4 space-y-4 text-sm text-slate-500">
              {voiceAlerts.length === 0 ? (
                <li className="text-xs text-slate-500">No voice alerts logged.</li>
              ) : (
                voiceAlerts.slice(0, 6).map((alert) => (
                  <li
                    key={`${alert.timestamp}-${alert.message}`}
                    className={`rounded-xl border px-4 py-3 ${
                      alert.level === 'critical'
                        ? 'border-pearl-danger/40 bg-pearl-danger/10 text-pearl-danger'
                        : 'border-pearl-warning/40 bg-pearl-warning/10 text-pearl-warning'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {alert.controllerId}
                    </p>
                    <p className="mt-1 text-sm">{alert.message}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </section>

      {sectorRosters ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-500">Sector roster overview</h3>
              <p className="mt-2 text-sm text-slate-500">
                Backup pools per sector for immediate coverage.
              </p>
            </div>
            <button
              onClick={() => setSectorRosterExpanded(!sectorRosterExpanded)}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 hover:border-pearl-primary hover:text-pearl-primary hover:bg-pearl-primary/10 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30 transition-all transform hover:scale-105"
            >
              {sectorRosterExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {sectorRosterExpanded && (
            <div className="mt-5 grid gap-4 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {sectorRosters.map((sector) => (
                <div key={sector.id} className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{sector.id}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{sector.name}</p>
                  <p className="text-xs text-slate-500">{sector.shiftGroup}</p>
                  {sector.description ? (
                    <p className="mt-2 text-xs text-slate-500">{sector.description}</p>
                  ) : null}
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Primary</p>
                      <ul className="mt-1 space-y-1">
                        {sector.primary.map((controller) => (
                          <li key={controller.id} className="flex items-center justify-between">
                            <span>{controller.name}</span>
                            <span className="text-xs text-slate-500">{controller.shiftGroup}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Backup</p>
                      <ul className="mt-1 space-y-1">
                        {sector.backup.length > 0 ? (
                          sector.backup.map((controller) => (
                            <li key={controller.id} className="flex items-center justify-between">
                              <span>{controller.name}</span>
                              <span className="text-xs text-slate-500">Standby</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-500">No backup assigned.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
      </div>
    </>
  )
}

