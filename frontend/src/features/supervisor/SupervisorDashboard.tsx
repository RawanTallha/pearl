import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchControllers, fetchSectorRosters, fetchSupervisorActions, fetchLiveFrame, saveSupervisorAction } from '../../services/dataService'
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
  const queryClient = useQueryClient()
  
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
  const previousMonitorControllers = useRef<Set<string>>(new Set())
  const lastNotificationTime = useRef<Map<string, number>>(new Map()) // Track last notification time per controller
  const existingNotificationIds = useRef<Set<string>>(new Set()) // Track existing notification controller IDs
  const [assignedBackups, setAssignedBackups] = useState<Map<string, string>>(new Map())
  const [assignedPlanners, setAssignedPlanners] = useState<Map<string, string>>(new Map())
  const [localActions, setLocalActions] = useState<SupervisorAction[]>([])
  const [showDropdownForController, setShowDropdownForController] = useState<string | null>(null)
  const [showPlannerDropdownForController, setShowPlannerDropdownForController] = useState<string | null>(null)
  const [selectedBackupForController, setSelectedBackupForController] = useState<Map<string, string>>(new Map())
  const [selectedPlannerForController, setSelectedPlannerForController] = useState<Map<string, string>>(new Map())
  const [actionsPanelExpanded, setActionsPanelExpanded] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sectorRosterExpanded, setSectorRosterExpanded] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [responseTime, setResponseTime] = useState<number>(0) // Average response time in seconds

  useEffect(() => {
    let mounted = true
    fetchLiveFrame()
      .then((initial) => {
        if (mounted && initial.length > 0) {
          setFrames(initial)
          setLastUpdateTime(new Date())
        }
      })
      .catch((error) => {
        console.error('Failed to load initial live frame', error)
      })

    const unsubscribe = subscribeToSimulation((payload) => {
      if (mounted) {
        setFrames(payload)
        setLastUpdateTime(new Date())
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

  // Calculate performance metrics (after filtered is defined)
  const performanceMetrics = useMemo(() => {
    const totalControllers = filtered.length || 1 // Avoid division by zero
    const normalCount = filtered.filter((row) => row.snapshot?.status === 'Normal').length
    const monitorCount = filtered.filter((row) => row.snapshot?.status === 'Monitor').length
    const highFatigueCount = filtered.filter((row) => row.snapshot?.status === 'High Fatigue').length
    const avgResponseTime = actions && actions.length > 0 
      ? actions.slice(0, 10).reduce((sum, action) => {
          // Estimate response time (this would be calculated from actual timestamps in real scenario)
          return sum + 2.5 // Placeholder
        }, 0) / Math.min(actions.length, 10)
      : 0
    
    return {
      totalControllers: filtered.length,
      normalCount,
      monitorCount,
      highFatigueCount,
      healthScore: totalControllers > 0 ? Math.round((normalCount / totalControllers) * 100) : 100,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    }
  }, [filtered, actions])

  // Active alerts include both High Fatigue and Monitor (Early Fatigue) status
  const activeAlerts = useMemo(() => {
    return filtered.filter((row) => 
      row.snapshot?.status === 'High Fatigue' || row.snapshot?.status === 'Monitor'
    )
  }, [filtered])
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

  // Monitor for high fatigue and early fatigue (monitor) controllers and trigger notifications
  useEffect(() => {
    if (!controllers) return

    const currentHighFatigueControllers = new Set<string>()
    const currentMonitorControllers = new Set<string>()
    const newNotifications: Array<{ id: string; controller: ControllerProfile; snapshot: FatigueSnapshot }> = []
    const MIN_TIME_BETWEEN_NOTIFICATIONS = 5 * 60 * 1000 // 5 minutes in milliseconds

    combined.forEach(({ controller, snapshot }) => {
      if (snapshot?.status === 'High Fatigue') {
        currentHighFatigueControllers.add(controller.id)

        // Only show notification if this controller wasn't in high fatigue before
        // AND enough time has passed since last notification (if any)
        if (!previousHighFatigueControllers.current.has(controller.id)) {
          const lastNotification = lastNotificationTime.current.get(controller.id)
          const now = Date.now()
          
          // Check if enough time has passed (or no previous notification)
          if (!lastNotification || (now - lastNotification) >= MIN_TIME_BETWEEN_NOTIFICATIONS) {
            // Check if notification already exists for this controller
            if (!existingNotificationIds.current.has(controller.id)) {
              newNotifications.push({
                id: `${controller.id}-${now}`,
                controller,
                snapshot,
              })
              lastNotificationTime.current.set(controller.id, now)
              existingNotificationIds.current.add(controller.id)
            }
          }
        }
      } else if (snapshot?.status === 'Monitor') {
        currentMonitorControllers.add(controller.id)

        // Only show notification if this controller wasn't in monitor status before
        // AND enough time has passed since last notification (if any)
        if (!previousMonitorControllers.current.has(controller.id)) {
          const lastNotification = lastNotificationTime.current.get(controller.id)
          const now = Date.now()
          
          // Check if enough time has passed (or no previous notification)
          if (!lastNotification || (now - lastNotification) >= MIN_TIME_BETWEEN_NOTIFICATIONS) {
            // Check if notification already exists for this controller
            if (!existingNotificationIds.current.has(controller.id)) {
              newNotifications.push({
                id: `${controller.id}-${now}`,
                controller,
                snapshot,
              })
              lastNotificationTime.current.set(controller.id, now)
              existingNotificationIds.current.add(controller.id)
            }
          }
        }
      }
    })

    // Track controllers that returned to normal from any fatigued state
    const previousFatiguedControllers = new Set([
      ...previousHighFatigueControllers.current,
      ...previousMonitorControllers.current
    ])
    const currentFatiguedControllers = new Set([
      ...currentHighFatigueControllers,
      ...currentMonitorControllers
    ])
    const controllersThatReturned = Array.from(previousFatiguedControllers).filter(
      (controllerId) => !currentFatiguedControllers.has(controllerId)
    )
    if (controllersThatReturned.length > 0) {
      setAssignedBackups((prev) => {
        const newMap = new Map(prev)
        controllersThatReturned.forEach((controllerId) => {
          newMap.delete(controllerId)
        })
        return newMap
      })
      setAssignedPlanners((prev) => {
        const newMap = new Map(prev)
        controllersThatReturned.forEach((controllerId) => {
          newMap.delete(controllerId)
        })
        return newMap
      })
      // Close dropdowns if they were open for a controller that returned
      setShowDropdownForController((prev) => {
        if (prev && controllersThatReturned.includes(prev)) {
          return null
        }
        return prev
      })
      setShowPlannerDropdownForController((prev) => {
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
      setSelectedPlannerForController((prev) => {
        const newMap = new Map(prev)
        controllersThatReturned.forEach((controllerId) => {
          newMap.delete(controllerId)
        })
        return newMap
      })
    }

    // Sync notifications with current controller status
    setNotifications((prev) => {
      const allFatiguedControllers = new Set([...currentHighFatigueControllers, ...currentMonitorControllers])
      const updatedNotifications: Array<{ id: string; controller: ControllerProfile; snapshot: FatigueSnapshot }> = []
      
      // Update existing notifications with current snapshots and keep only those still fatigued
      prev.forEach((notif) => {
        const currentSnapshot = combined.find(
          (item) => item.controller.id === notif.controller.id
        )?.snapshot
        
        // Only keep notification if controller is still in a fatigued state
        if (allFatiguedControllers.has(notif.controller.id) && currentSnapshot) {
          // Update snapshot to reflect current status
          updatedNotifications.push({
            ...notif,
            snapshot: currentSnapshot,
          })
        } else {
          // Controller returned to normal - remove notification unless action was taken
          const hasAction = assignedBackups.has(notif.controller.id) || assignedPlanners.has(notif.controller.id)
          if (!hasAction) {
            // No action taken, remove notification
            existingNotificationIds.current.delete(notif.controller.id)
            lastNotificationTime.current.delete(notif.controller.id)
          } else {
            // Action was taken, keep notification but mark as resolved
            updatedNotifications.push(notif)
          }
        }
      })
      
      // Add new notifications (deduplicate by controller ID)
      const existingControllerIds = new Set(updatedNotifications.map(n => n.controller.id))
      const uniqueNew = newNotifications.filter(n => !existingControllerIds.has(n.controller.id))
      
      return [...updatedNotifications, ...uniqueNew]
    })

    // Update tracking sets for next comparison
    previousHighFatigueControllers.current = currentHighFatigueControllers
    previousMonitorControllers.current = currentMonitorControllers
  }, [combined, controllers, assignedBackups, assignedPlanners])

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const filtered = prev.filter((notif) => notif.id !== id)
      // Update ref to track removed notifications
      const remainingControllerIds = new Set(filtered.map(n => n.controller.id))
      existingNotificationIds.current = remainingControllerIds
      return filtered
    })
  }, [])

  // Also add a handler to dismiss by controller ID for when backup is already assigned
  const handleDismissNotificationByController = useCallback((controllerId: string) => {
    setNotifications((prev) => {
      const filtered = prev.filter((notif) => notif.controller.id !== controllerId)
      // Update ref to track removed notifications
      existingNotificationIds.current.delete(controllerId)
      return filtered
    })
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

  // Get available planners (all controllers except the one with fatigue)
  const getAvailablePlanners = useCallback(
    (controllerId: string): ControllerProfile[] => {
      if (!controllers) return []
      const assignedPlannerIds = Array.from(assignedPlanners.values())
      return controllers.filter(
        (controller) => controller.id !== controllerId && !assignedPlannerIds.includes(controller.id)
      )
    },
    [controllers, assignedPlanners],
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

      // Add to local actions and save to server
      const actionMessage = `Backup assigned for Controller: ${controller.name} (${controller.id}) — Backup: ${backup.name} (${backup.id})`
      const newAction: SupervisorAction = {
        id: `local-${Date.now()}-${controllerId}`,
        controllerId,
        action: 'backup_assigned',
        message: actionMessage,
        createdAt: new Date().toISOString(),
      }
      setLocalActions((prev) => [...prev, newAction])
      
      // Save to server and invalidate query to update sidebar count
      saveSupervisorAction(newAction).then(() => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] })
      }).catch((error) => {
        console.error('Failed to save action:', error)
      })

      // Reset UI state
      setShowDropdownForController(null)
      setSelectedBackupForController((prev) => {
        const newMap = new Map(prev)
        newMap.delete(controllerId)
        return newMap
      })

      // Dismiss notification for this controller
      setNotifications((prev) => {
        const filtered = prev.filter((notif) => notif.controller.id !== controllerId)
        existingNotificationIds.current.delete(controllerId)
        return filtered
      })
    },
    [selectedBackupForController, controllers, sectorRosters],
  )

  // Handle planner assignment
  const handleNotifyPlanner = useCallback((controllerId: string) => {
    setShowPlannerDropdownForController(controllerId)
  }, [])

  const handlePlannerSelection = useCallback((controllerId: string, plannerId: string) => {
    setSelectedPlannerForController((prev) => {
      const newMap = new Map(prev)
      newMap.set(controllerId, plannerId)
      return newMap
    })
  }, [])

  const handleConfirmPlanner = useCallback(
    (controllerId: string) => {
      const plannerId = selectedPlannerForController.get(controllerId)
      if (!plannerId || !controllers) return

      const controller = controllers.find((c) => c.id === controllerId)
      const planner = controllers.find((c) => c.id === plannerId)
      if (!controller || !planner) return

      // Add to assigned planners
      setAssignedPlanners((prev) => {
        const newMap = new Map(prev)
        newMap.set(controllerId, plannerId)
        return newMap
      })

      // Add to local actions and save to server
      const actionMessage = `Planner assigned for Controller: ${controller.name} (${controller.id}) — Planner: ${planner.name} (${planner.id})`
      const newAction: SupervisorAction = {
        id: `local-${Date.now()}-${controllerId}-planner`,
        controllerId,
        action: 'backup_assigned', // Using same action type
        message: actionMessage,
        createdAt: new Date().toISOString(),
      }
      setLocalActions((prev) => [...prev, newAction])
      
      // Save to server and invalidate query to update sidebar count
      saveSupervisorAction(newAction).then(() => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] })
      }).catch((error) => {
        console.error('Failed to save action:', error)
      })

      // Reset UI state
      setShowPlannerDropdownForController(null)
      setSelectedPlannerForController((prev) => {
        const newMap = new Map(prev)
        newMap.delete(controllerId)
        return newMap
      })

      // Dismiss notification for this controller
      setNotifications((prev) => {
        const filtered = prev.filter((notif) => notif.controller.id !== controllerId)
        existingNotificationIds.current.delete(controllerId)
        return filtered
      })
    },
    [selectedPlannerForController, controllers],
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
      
      // Save to server and invalidate query to update sidebar count
      saveSupervisorAction(newAction).then(() => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] })
      }).catch((error) => {
        console.error('Failed to save action:', error)
      })

      // Dismiss notification for this controller
      setNotifications((prev) => {
        const filtered = prev.filter((notif) => notif.controller.id !== controllerId)
        existingNotificationIds.current.delete(controllerId)
        return filtered
      })
    },
    [controllers, assignedBackups],
  )

  // Format last update time
  const lastUpdateFormatted = useMemo(() => {
    const diff = Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000)
    if (diff < 10) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [lastUpdateTime])

  return (
    <>
      <div className="space-y-8">
      {/* Enhanced Header with Live Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500/30 animate-ping"></div>
            </div>
            <span className="text-xs font-semibold text-green-400">LIVE</span>
          </div>
          <span className="text-xs text-slate-500">Last update: {lastUpdateFormatted}</span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-pearl-danger/40 bg-pearl-danger/10 px-3 py-1.5">
              <span className="text-xs font-semibold text-pearl-danger">⚠️ {notifications.length} Active Alert{notifications.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5">
            <span className="text-xs text-slate-400">Health Score: </span>
            <span className={`text-sm font-semibold ${
              performanceMetrics.healthScore >= 70 ? 'text-green-400' : 
              performanceMetrics.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {performanceMetrics.healthScore}%
            </span>
          </div>
        </div>
      </div>

      <header className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="group rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pearl-primary/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Controllers online</p>
              <span className="text-xs text-green-400">●</span>
            </div>
            <p className="mt-2 text-4xl font-semibold text-slate-100 transition-transform group-hover:scale-105">{filtered.length}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-slate-500">Active</p>
              <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pearl-primary transition-all duration-500"
                  style={{ width: `${(filtered.length / (controllers?.length ?? 10)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-pearl-warning/50 hover:shadow-lg hover:shadow-pearl-warning/20 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pearl-warning/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active alerts</p>
              {activeAlerts.length > 0 && (
                <span className="animate-pulse text-xs text-pearl-warning">⚠️</span>
              )}
            </div>
            <p className="mt-2 text-4xl font-semibold text-pearl-warning transition-transform group-hover:scale-105">{notifications.length}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-slate-500">Need attention</p>
              {activeAlerts.length > 0 && (
                <span className="text-xs text-pearl-warning font-semibold animate-pulse">Action required</span>
              )}
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-700 bg-slate-900/80 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pearl-primary/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent interventions</p>
              <span className="text-xs text-pearl-primary">✓</span>
            </div>
            <p className="mt-2 text-4xl font-semibold text-slate-100 transition-transform group-hover:scale-105">{actions?.length ?? 0}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-slate-500">Today</p>
              {performanceMetrics.avgResponseTime > 0 && (
                <span className="text-xs text-slate-400">Avg: {performanceMetrics.avgResponseTime}s</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Insights Panel with Achievements */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900/80 to-slate-800/60 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-slate-100">Crew Health Overview</h3>
              {performanceMetrics.healthScore >= 90 && (
                <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-400 border border-green-500/40">
                  ⭐ Excellent
                </span>
              )}
              {performanceMetrics.healthScore >= 70 && performanceMetrics.healthScore < 90 && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-400 border border-yellow-500/40">
                  ✓ Good
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Normal:</span>
                <span className="font-semibold text-green-400">{performanceMetrics.normalCount}</span>
                <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${performanceMetrics.totalControllers > 0 ? (performanceMetrics.normalCount / performanceMetrics.totalControllers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Monitor:</span>
                <span className="font-semibold text-yellow-400">{performanceMetrics.monitorCount}</span>
                <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500"
                    style={{ width: `${performanceMetrics.totalControllers > 0 ? (performanceMetrics.monitorCount / performanceMetrics.totalControllers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">High Fatigue:</span>
                <span className="font-semibold text-red-400">{performanceMetrics.highFatigueCount}</span>
                <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${performanceMetrics.totalControllers > 0 ? (performanceMetrics.highFatigueCount / performanceMetrics.totalControllers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Response Efficiency</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      performanceMetrics.avgResponseTime < 3 ? 'bg-green-500' : 
                      performanceMetrics.avgResponseTime < 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, 100 - (performanceMetrics.avgResponseTime * 10))}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  {performanceMetrics.avgResponseTime > 0 ? `${performanceMetrics.avgResponseTime}s` : 'N/A'}
                </span>
              </div>
            </div>
            {allActions.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Today's Actions</p>
                <p className="text-lg font-semibold text-pearl-primary">{allActions.length}</p>
                <p className="text-xs text-slate-400">Interventions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80">
          <div className="border-b border-slate-700 px-6 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-500">Controller Status</h2>
                  <p className="text-sm text-slate-500">
                    Live monitoring
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500/30 animate-ping"></div>
                  </div>
                  <span className="text-xs font-semibold text-green-400">Real-time</span>
                </div>
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
                  <tr 
                    key={controller.id} 
                    className={`hover:bg-slate-900/50 transition-colors ${
                      snapshot?.status === 'High Fatigue' ? 'bg-red-500/5 border-l-2 border-red-500' :
                      snapshot?.status === 'Monitor' ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-100">{controller.name}</div>
                        {snapshot?.status === 'High Fatigue' && (
                          <span className="text-xs animate-pulse">🔴</span>
                        )}
                        {snapshot?.status === 'Monitor' && (
                          <span className="text-xs">🟡</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{controller.id}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="font-semibold text-slate-500">{controller.sectorName}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">{controller.rosterRole}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg">
                          {snapshot ? snapshot.score.toFixed(2) : <span className="text-slate-500">--</span>}
                        </span>
                        {snapshot && (
                          <div className="h-2 w-16 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                snapshot.status === 'High Fatigue' ? 'bg-red-500' :
                                snapshot.status === 'Monitor' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${snapshot.score * 100}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${snapshot ? statusBadge[snapshot.status] : 'bg-slate-800/50 text-slate-500 border border-slate-700'}`}>
                        {snapshot?.status === 'High Fatigue' && <span className="animate-pulse">🔴</span>}
                        {snapshot?.status === 'Monitor' && <span>🟡</span>}
                        {snapshot?.status === 'Normal' && <span>🟢</span>}
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
        <div id="action-required-section" className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-500">Action Required</h3>
              {notifications.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pearl-danger/20 text-xs font-bold text-pearl-danger animate-pulse">
                  {notifications.length}
                </span>
              )}
            </div>
            <button className="rounded-xl border border-blue-500 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/30 transition-colors">
              Active Controllers: {filtered.length}
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Immediate attention needed
          </p>
           {notifications.length > 0 ? (
             <FatigueNotification 
               notifications={notifications} 
               onDismiss={handleDismissNotification}
               onNotifyBackup={handleNotifyBackup}
               onNotifyPlanner={handleNotifyPlanner}
               onDelayMonitoring={handleDelayMonitoring}
               availableBackups={getAvailableBackups}
               availablePlanners={getAvailablePlanners}
               assignedBackups={assignedBackups}
               assignedPlanners={assignedPlanners}
               showDropdownForController={showDropdownForController}
               showPlannerDropdownForController={showPlannerDropdownForController}
               selectedBackupForController={selectedBackupForController}
               selectedPlannerForController={selectedPlannerForController}
               onBackupSelection={handleBackupSelection}
               onPlannerSelection={handlePlannerSelection}
               onConfirmBackup={handleConfirmBackup}
               onConfirmPlanner={handleConfirmPlanner}
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
             <div className="flex items-center gap-3">
               <h3 className="text-lg font-semibold text-slate-500">Latest supervisor actions</h3>
               {allActions.length > 0 && (
                 <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pearl-primary/20 text-xs font-bold text-pearl-primary">
                   {allActions.length}
                 </span>
               )}
             </div>
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
                      className="w-full border-b border-slate-700 px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-900/50 hover:text-pearl-primary transition-colors"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-900/50 hover:text-pearl-primary transition-colors"
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

