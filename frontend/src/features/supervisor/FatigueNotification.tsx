import { useEffect, useState } from 'react'
import type { ControllerProfile, FatigueSnapshot } from '../../types'

interface Notification {
  id: string
  controller: ControllerProfile
  snapshot: FatigueSnapshot
}

interface FatigueNotificationProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  onNotifyBackup: (controllerId: string) => void
  onNotifyPlanner: (controllerId: string) => void
  onDelayMonitoring: (controllerId: string) => void
  availableBackups: (sectorId: string) => ControllerProfile[]
  availablePlanners: (controllerId: string) => ControllerProfile[]
  assignedBackups: Map<string, string>
  assignedPlanners: Map<string, string>
  showDropdownForController: string | null
  showPlannerDropdownForController: string | null
  selectedBackupForController: Map<string, string>
  selectedPlannerForController: Map<string, string>
  onBackupSelection: (controllerId: string, backupId: string) => void
  onPlannerSelection: (controllerId: string, plannerId: string) => void
  onConfirmBackup: (controllerId: string) => void
  onConfirmPlanner: (controllerId: string) => void
  onDismissByController?: (controllerId: string) => void
}

export function FatigueNotification({ 
  notifications, 
  onDismiss, 
  onNotifyBackup,
  onNotifyPlanner,
  onDelayMonitoring,
  availableBackups,
  availablePlanners,
  assignedBackups,
  assignedPlanners,
  showDropdownForController,
  showPlannerDropdownForController,
  selectedBackupForController,
  selectedPlannerForController,
  onBackupSelection,
  onPlannerSelection,
  onConfirmBackup,
  onConfirmPlanner,
  onDismissByController
}: FatigueNotificationProps) {
  if (notifications.length === 0) return null

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onNotifyBackup={onNotifyBackup}
          onNotifyPlanner={onNotifyPlanner}
          onDelayMonitoring={onDelayMonitoring}
          availableBackups={availableBackups}
          availablePlanners={availablePlanners}
          assignedBackups={assignedBackups}
          assignedPlanners={assignedPlanners}
          showDropdownForController={showDropdownForController}
          showPlannerDropdownForController={showPlannerDropdownForController}
          selectedBackupForController={selectedBackupForController}
          selectedPlannerForController={selectedPlannerForController}
          onBackupSelection={onBackupSelection}
          onPlannerSelection={onPlannerSelection}
          onConfirmBackup={onConfirmBackup}
          onConfirmPlanner={onConfirmPlanner}
          onDismissByController={onDismissByController}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
  onNotifyBackup: (controllerId: string) => void
  onNotifyPlanner: (controllerId: string) => void
  onDelayMonitoring: (controllerId: string) => void
  availableBackups: (sectorId: string) => ControllerProfile[]
  availablePlanners: (controllerId: string) => ControllerProfile[]
  assignedBackups: Map<string, string>
  assignedPlanners: Map<string, string>
  showDropdownForController: string | null
  showPlannerDropdownForController: string | null
  selectedBackupForController: Map<string, string>
  selectedPlannerForController: Map<string, string>
  onBackupSelection: (controllerId: string, backupId: string) => void
  onPlannerSelection: (controllerId: string, plannerId: string) => void
  onConfirmBackup: (controllerId: string) => void
  onConfirmPlanner: (controllerId: string) => void
  onDismissByController?: (controllerId: string) => void
}

function NotificationItem({ 
  notification, 
  onDismiss, 
  onNotifyBackup,
  onNotifyPlanner,
  onDelayMonitoring,
  availableBackups,
  availablePlanners,
  assignedBackups,
  assignedPlanners,
  showDropdownForController,
  showPlannerDropdownForController,
  selectedBackupForController,
  selectedPlannerForController,
  onBackupSelection,
  onPlannerSelection,
  onConfirmBackup,
  onConfirmPlanner,
  onDismissByController
}: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    setIsVisible(true)
    // No auto-dismiss - notification stays until action is taken
  }, [notification.id])

  const handleActionTaken = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss(notification.id)
      // Also dismiss by controller ID if handler is provided
      if (onDismissByController) {
        onDismissByController(notification.controller.id)
      }
    }, 300)
  }

  const availableBackupList = availableBackups(notification.controller.sectorId)
  const availablePlannerList = availablePlanners(notification.controller.id)
  const isBackupDropdownOpen = showDropdownForController === notification.controller.id
  const isPlannerDropdownOpen = showPlannerDropdownForController === notification.controller.id
  const selectedBackupId = selectedBackupForController.get(notification.controller.id)
  const selectedPlannerId = selectedPlannerForController.get(notification.controller.id)
  const hasAssignedBackup = assignedBackups.has(notification.controller.id)
  const hasAssignedPlanner = assignedPlanners.has(notification.controller.id)

  const handleNotifyBackup = () => {
    onNotifyBackup(notification.controller.id)
  }

  const handleNotifyPlanner = () => {
    onNotifyPlanner(notification.controller.id)
  }

  const handleDelayMonitoring = () => {
    onDelayMonitoring(notification.controller.id)
    handleActionTaken()
  }

  const handleConfirmBackup = () => {
    onConfirmBackup(notification.controller.id)
    handleActionTaken()
  }

  const handleConfirmPlanner = () => {
    onConfirmPlanner(notification.controller.id)
    handleActionTaken()
  }

  // Determine if this is High Fatigue or Early Fatigue
  const isHighFatigue = notification.snapshot.status === 'High Fatigue'
  
  // Set colors and text based on fatigue type
  const borderColor = isHighFatigue ? 'border-pearl-danger/60' : 'border-pearl-warning/60'
  const ringColor = isHighFatigue ? 'ring-pearl-danger/30' : 'ring-pearl-warning/30'
  const textColor = isHighFatigue ? 'text-pearl-danger' : 'text-pearl-warning'
  const titleText = isHighFatigue 
    ? `${notification.controller.name} is showing high fatigue`
    : `${notification.controller.name} is showing early fatigue`
  const statusLabel = isHighFatigue ? 'High Fatigue' : 'Early Fatigue'

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`rounded-2xl border-2 ${borderColor} bg-slate-900/80 p-6 shadow-2xl ring-2 ${ringColor} relative`}>
        <button
          onClick={handleActionTaken}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          aria-label="Close notification"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3 pr-8">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                {notification.controller.name} has {notification.snapshot.score.toFixed(1)} fatigue
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${textColor} font-semibold`}>{statusLabel}</span>
              </div>
              {notification.snapshot.recommendation && (
                <p className="mt-2 text-sm text-slate-400">{notification.snapshot.recommendation}</p>
              )}
            </div>
          </div>
        </div>

        {!hasAssignedBackup && !hasAssignedPlanner && (
          <>
            {!isBackupDropdownOpen && !isPlannerDropdownOpen ? (
              <div className="flex flex-col gap-3">
                {isHighFatigue && (
                  <>
                    <button
                      onClick={handleNotifyBackup}
                      className={`w-full rounded-xl border border-slate-400 ${isHighFatigue ? 'bg-pearl-danger/20' : 'bg-pearl-warning/20'} px-4 py-3 text-sm font-semibold ${textColor} ${isHighFatigue ? 'hover:bg-pearl-danger/30' : 'hover:bg-pearl-warning/30'} transition-colors`}
                    >
                      Call backup
                    </button>
                    <button
                      onClick={handleNotifyPlanner}
                      className={`w-full rounded-xl border border-slate-400 ${isHighFatigue ? 'bg-pearl-danger/20' : 'bg-pearl-warning/20'} px-4 py-3 text-sm font-semibold ${textColor} ${isHighFatigue ? 'hover:bg-pearl-danger/30' : 'hover:bg-pearl-warning/30'} transition-colors`}
                    >
                      Call planner
                    </button>
                  </>
                )}
                {!isHighFatigue && (
                  <button
                    onClick={handleNotifyPlanner}
                    className={`w-full rounded-xl border border-slate-400 bg-pearl-warning/20 px-4 py-3 text-sm font-semibold ${textColor} hover:bg-pearl-warning/30 transition-colors`}
                  >
                    Call planner
                  </button>
                )}
                <button
                  onClick={handleDelayMonitoring}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
                >
                  Monitor for 10 minutes
                </button>
              </div>
            ) : isBackupDropdownOpen ? (
              <div className="space-y-3">
                <select
                  value={selectedBackupId || ''}
                  onChange={(e) => onBackupSelection(notification.controller.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                >
                  <option value="">Select backup controller...</option>
                  {availableBackupList.map((backup) => (
                    <option key={backup.id} value={backup.id}>
                      {backup.name}
                    </option>
                  ))}
                </select>
                {selectedBackupId && (
                  <button
                    onClick={handleConfirmBackup}
                    className="w-full rounded-xl border border-slate-400 bg-pearl-primary/20 px-4 py-3 text-sm font-semibold text-pearl-primary hover:bg-pearl-primary/30 transition-colors"
                  >
                    Confirm Backup Assignment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedPlannerId || ''}
                  onChange={(e) => onPlannerSelection(notification.controller.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                >
                  <option value="">Choose from planner list</option>
                  {availablePlannerList.map((planner) => (
                    <option key={planner.id} value={planner.id}>
                      {planner.name}
                    </option>
                  ))}
                </select>
                {selectedPlannerId && (
                  <button
                    onClick={handleConfirmPlanner}
                    className="w-full rounded-xl border border-slate-400 bg-pearl-primary/20 px-4 py-3 text-sm font-semibold text-pearl-primary hover:bg-pearl-primary/30 transition-colors"
                  >
                    Confirm Planner Assignment
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {(hasAssignedBackup || hasAssignedPlanner) && (
          <div className="rounded-lg border border-pearl-success/40 bg-pearl-success/10 px-4 py-3">
            <p className="text-sm text-pearl-success font-semibold">
              ✓ {hasAssignedBackup ? 'Backup' : 'Planner'} controller already assigned
            </p>
            <button
              onClick={() => {
                if (onDismissByController) {
                  onDismissByController(notification.controller.id)
                } else {
                  handleActionTaken()
                }
              }}
              className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            >
              Acknowledge
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

